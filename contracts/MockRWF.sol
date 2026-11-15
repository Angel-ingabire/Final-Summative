// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title MockRWF
/// @notice Six-decimal test token representing simulated Rwandan francs only.
contract MockRWF is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    error ZeroAddress();
    error ZeroAmount();

    /// @notice Grants the deployer administrative and mint permissions.
    constructor() ERC20("Mock Rwandan Franc", "mRWF") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /// @notice Uses six decimal places to support fractional simulated RWF amounts.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mints simulated tokens; callers must have MINTER_ROLE.
    function mint(address account, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(account, amount);
    }
}
