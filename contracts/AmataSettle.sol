// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title AmataSettle
/// @notice Signed milk-delivery receipts with reserved cooperative token settlements.
/// @dev Price is whole simulated RWF/litre; token amounts use MockRWF's 6 decimals.
contract AmataSettle is AccessControl, EIP712, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant STATION_ROLE = keccak256("STATION_ROLE");
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");
    bytes32 private constant DELIVERY_TYPEHASH = keccak256(
        "Delivery(bytes32 deliveryId,address farmer,uint256 quantityMilliLitres,uint256 pricePerLitre,uint8 qualityGrade,uint64 deliveredAt,uint256 deadline)"
    );
    uint256 private constant TOKEN_SCALE = 1_000_000;
    uint8 public constant MAX_QUALITY_GRADE = 5;

    enum DeliveryStatus {
        None,
        Allocated,
        Disputed,
        Claimed,
        Rejected
    }

    struct Delivery {
        bytes32 deliveryId;
        address farmer;
        uint256 quantityMilliLitres;
        uint256 pricePerLitre;
        uint8 qualityGrade;
        uint64 deliveredAt;
        uint256 deadline;
    }

    struct DeliveryRecord {
        Delivery delivery;
        uint256 payment;
        address signer;
        uint64 recordedAt;
        DeliveryStatus status;
    }

    IERC20 public immutable settlementToken;
    uint64 public immutable disputePeriod;
    uint256 public totalDeposited;
    uint256 public reservedFunds;
    uint256 public totalSettlements;

    mapping(bytes32 deliveryId => DeliveryRecord) private deliveries;
    mapping(address farmer => bytes32[]) private farmerDeliveryIds;
    mapping(address farmer => uint256) private claimableAmount;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidDeliveryId();
    error DeliveryAlreadyExists();
    error InvalidFarmer();
    error InvalidQuantity();
    error InvalidPrice();
    error InvalidQualityGrade();
    error InvalidDeliveryTime();
    error ExpiredSignature();
    error InvalidStationSigner();
    error InvalidSignature();
    error InsufficientTreasury();
    error InsufficientAvailableFunds();
    error InvalidDeliveryState();
    error DisputeWindowClosed();
    error EmptyDisputeReason();
    error DisputeReasonTooLong();
    error InsufficientTokenBalance();

    event FundsDeposited(address indexed account, uint256 amount);
    event UnallocatedFundsWithdrawn(address indexed recipient, uint256 amount);
    event StationAuthorizationChanged(address indexed station, bool authorized);
    event ResolverAuthorizationChanged(address indexed resolver, bool authorized);
    event DeliveryRecorded(
        bytes32 indexed deliveryId,
        address indexed farmer,
        uint256 quantityMilliLitres,
        uint256 payment,
        address indexed signer
    );
    event PaymentAllocated(bytes32 indexed deliveryId, address indexed farmer, uint256 amount);
    event PaymentClaimed(bytes32 indexed deliveryId, address indexed farmer, uint256 amount);
    event DisputeRaised(bytes32 indexed deliveryId, address indexed farmer, string reason);
    event DisputeResolved(bytes32 indexed deliveryId, bool paymentUpheld, uint256 releasedAmount);

    /// @param token Address of the six-decimal settlement ERC-20.
    /// @param disputePeriodSeconds Time allowed to dispute after the receipt is recorded on-chain.
    constructor(IERC20 token, uint64 disputePeriodSeconds) EIP712("AmataSettle", "1") {
        if (address(token) == address(0)) revert ZeroAddress();
        if (disputePeriodSeconds == 0) revert ZeroAmount();
        settlementToken = token;
        disputePeriod = disputePeriodSeconds;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RESOLVER_ROLE, msg.sender);
    }

    /// @notice Pauses new deliveries and financial operations during an emergency.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Resumes normal operations after an emergency pause.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Adds a collection station that may submit its own signed receipts.
    function authorizeStation(address station) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (station == address(0)) revert ZeroAddress();
        _grantRole(STATION_ROLE, station);
        emit StationAuthorizationChanged(station, true);
    }

    /// @notice Revokes collection-station submission permission.
    function revokeStation(address station) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (station == address(0)) revert ZeroAddress();
        _revokeRole(STATION_ROLE, station);
        emit StationAuthorizationChanged(station, false);
    }

    /// @notice Adds an authorized dispute resolver.
    function authorizeResolver(address resolver) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (resolver == address(0)) revert ZeroAddress();
        _grantRole(RESOLVER_ROLE, resolver);
        emit ResolverAuthorizationChanged(resolver, true);
    }

    /// @notice Revokes dispute-resolution permission.
    function revokeResolver(address resolver) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (resolver == address(0)) revert ZeroAddress();
        _revokeRole(RESOLVER_ROLE, resolver);
        emit ResolverAuthorizationChanged(resolver, false);
    }

    /// @notice Transfers cooperative funds into the settlement treasury.
    function depositFunds(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        uint256 beforeBalance = settlementToken.balanceOf(address(this));
        settlementToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = settlementToken.balanceOf(address(this)) - beforeBalance;
        if (received != amount) revert InsufficientTokenBalance();
        totalDeposited += received;
        emit FundsDeposited(msg.sender, received);
    }

    /// @notice Current ERC-20 balance held by this contract.
    function getTreasuryBalance() external view returns (uint256) {
        return settlementToken.balanceOf(address(this));
    }

    /// @notice Treasury balance not already reserved for farmer obligations.
    function getAvailableTreasury() public view returns (uint256) {
        uint256 balance = settlementToken.balanceOf(address(this));
        if (balance < reservedFunds) revert InsufficientTokenBalance();
        return balance - reservedFunds;
    }

    /// @notice Returns outstanding, reserved farmer liabilities.
    function getReservedFunds() external view returns (uint256) {
        return reservedFunds;
    }

    /// @notice Admin may withdraw only tokens not backing active allocations.
    function withdrawUnallocatedFunds(address recipient, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > getAvailableTreasury()) revert InsufficientAvailableFunds();
        settlementToken.safeTransfer(recipient, amount);
        emit UnallocatedFundsWithdrawn(recipient, amount);
    }

    /// @notice Verifies and allocates an EIP-712 receipt signed by this station.
    /// @dev Payment is floor(quantity mL * whole RWF/litre / 1000), scaled to 6 token decimals.
    function recordDelivery(Delivery calldata delivery, bytes calldata signature)
        external
        onlyRole(STATION_ROLE)
        whenNotPaused
    {
        if (delivery.deliveryId == bytes32(0)) revert InvalidDeliveryId();
        if (deliveries[delivery.deliveryId].status != DeliveryStatus.None) {
            revert DeliveryAlreadyExists();
        }
        if (delivery.farmer == address(0)) revert InvalidFarmer();
        if (delivery.quantityMilliLitres == 0) revert InvalidQuantity();
        if (delivery.pricePerLitre == 0) revert InvalidPrice();
        if (delivery.qualityGrade == 0 || delivery.qualityGrade > MAX_QUALITY_GRADE) {
            revert InvalidQualityGrade();
        }
        if (delivery.deliveredAt > block.timestamp) revert InvalidDeliveryTime();
        if (delivery.deadline < block.timestamp) revert ExpiredSignature();

        bytes32 structHash = keccak256(
            abi.encode(
                DELIVERY_TYPEHASH,
                delivery.deliveryId,
                delivery.farmer,
                delivery.quantityMilliLitres,
                delivery.pricePerLitre,
                delivery.qualityGrade,
                delivery.deliveredAt,
                delivery.deadline
            )
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        if (!hasRole(STATION_ROLE, signer)) revert InvalidStationSigner();
        if (signer != msg.sender) revert InvalidSignature();

        uint256 payment = _calculatePayment(delivery.quantityMilliLitres, delivery.pricePerLitre);
        if (payment == 0) revert ZeroAmount();
        if (payment > getAvailableTreasury()) revert InsufficientTreasury();

        DeliveryRecord storage record = deliveries[delivery.deliveryId];
        record.delivery = delivery;
        record.payment = payment;
        record.signer = signer;
        record.recordedAt = uint64(block.timestamp);
        record.status = DeliveryStatus.Allocated;
        farmerDeliveryIds[delivery.farmer].push(delivery.deliveryId);
        claimableAmount[delivery.farmer] += payment;
        reservedFunds += payment;
        totalSettlements += payment;

        emit DeliveryRecorded(
            delivery.deliveryId,
            delivery.farmer,
            delivery.quantityMilliLitres,
            payment,
            signer
        );
        emit PaymentAllocated(delivery.deliveryId, delivery.farmer, payment);
    }

    /// @notice Claims an eligible allocation; only its farmer may call.
    function claimPayment(bytes32 deliveryId) external nonReentrant whenNotPaused {
        DeliveryRecord storage record = deliveries[deliveryId];
        if (record.status != DeliveryStatus.Allocated) revert InvalidDeliveryState();
        if (record.delivery.farmer != msg.sender) revert InvalidFarmer();

        record.status = DeliveryStatus.Claimed;
        claimableAmount[msg.sender] -= record.payment;
        reservedFunds -= record.payment;
        settlementToken.safeTransfer(msg.sender, record.payment);
        emit PaymentClaimed(deliveryId, msg.sender, record.payment);
    }

    /// @notice Farmer raises a dispute before the recorded dispute deadline.
    function raiseDispute(bytes32 deliveryId, string calldata reason) external {
        DeliveryRecord storage record = deliveries[deliveryId];
        if (record.status != DeliveryStatus.Allocated) revert InvalidDeliveryState();
        if (record.delivery.farmer != msg.sender) revert InvalidFarmer();
        if (block.timestamp > uint256(record.recordedAt) + disputePeriod) {
            revert DisputeWindowClosed();
        }
        bytes calldata reasonBytes = bytes(reason);
        if (reasonBytes.length == 0) revert EmptyDisputeReason();
        if (reasonBytes.length > 500) revert DisputeReasonTooLong();

        record.status = DeliveryStatus.Disputed;
        claimableAmount[msg.sender] -= record.payment;
        emit DisputeRaised(deliveryId, msg.sender, reason);
    }

    /// @notice Resolver upholds an allocation or rejects it and releases its reserve.
    function resolveDispute(bytes32 deliveryId, bool upholdPayment)
        external
        onlyRole(RESOLVER_ROLE)
    {
        DeliveryRecord storage record = deliveries[deliveryId];
        if (record.status != DeliveryStatus.Disputed) revert InvalidDeliveryState();
        uint256 releasedAmount;
        if (upholdPayment) {
            record.status = DeliveryStatus.Allocated;
            claimableAmount[record.delivery.farmer] += record.payment;
        } else {
            record.status = DeliveryStatus.Rejected;
            reservedFunds -= record.payment;
            releasedAmount = record.payment;
        }
        emit DisputeResolved(deliveryId, upholdPayment, releasedAmount);
    }

    /// @notice Returns delivery IDs belonging to a farmer.
    function getFarmerDeliveries(address farmer) external view returns (bytes32[] memory) {
        return farmerDeliveryIds[farmer];
    }

    /// @notice Returns the signed data, settlement state, signer, and chain-recorded time.
    function getDeliveryDetails(bytes32 deliveryId)
        external
        view
        returns (
            Delivery memory delivery,
            uint256 payment,
            DeliveryStatus status,
            address signer,
            uint64 recordedAt
        )
    {
        DeliveryRecord storage record = deliveries[deliveryId];
        return (record.delivery, record.payment, record.status, record.signer, record.recordedAt);
    }

    /// @notice Returns the sum of undisputed, currently claimable allocations.
    function getClaimableAmount(address farmer) external view returns (uint256) {
        return claimableAmount[farmer];
    }

    function _calculatePayment(uint256 quantityMilliLitres, uint256 pricePerLitre)
        private
        pure
        returns (uint256)
    {
        uint256 wholeRwf = Math.mulDiv(quantityMilliLitres, pricePerLitre, 1000);
        return Math.mulDiv(wholeRwf, TOKEN_SCALE, 1);
    }
}
