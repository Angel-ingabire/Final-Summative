import { expect } from "chai";
import { network } from "hardhat";
import { expectEvent, expectRevert } from "./helpers.js";

const { ethers } = await network.getOrCreate();
const TOKEN = ethers.parseUnits("1000000", 6);
const PAYMENT = ethers.parseUnits("7500", 6);
let nextDeliveryNumber = 0;
const types = {
  Delivery: [
    { name: "deliveryId", type: "bytes32" },
    { name: "farmer", type: "address" },
    { name: "quantityMilliLitres", type: "uint256" },
    { name: "pricePerLitre", type: "uint256" },
    { name: "qualityGrade", type: "uint8" },
    { name: "deliveredAt", type: "uint64" },
    { name: "deadline", type: "uint256" }
  ]
};

describe("AmataSettle", function () {
  let admin;
  let station;
  let farmer;
  let other;
  let resolver;
  let token;
  let settle;

  async function latestTimestamp() {
    return Number((await ethers.provider.getBlock("latest")).timestamp);
  }

  async function makeSignedDelivery(overrides = {}, signer = station) {
    const now = await latestTimestamp();
    const delivery = {
      deliveryId: ethers.id(`delivery-${++nextDeliveryNumber}`),
      farmer: farmer.address,
      quantityMilliLitres: 15_000n,
      pricePerLitre: 500n,
      qualityGrade: 1,
      deliveredAt: BigInt(now),
      deadline: BigInt(now + 3600),
      ...overrides
    };
    const domain = {
      name: "AmataSettle",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await settle.getAddress()
    };
    const signature = await signer.signTypedData(domain, types, delivery);
    return { delivery, signature };
  }

  async function record(overrides = {}) {
    const signed = await makeSignedDelivery(overrides);
    await settle.connect(station).recordDelivery(signed.delivery, signed.signature);
    return signed.delivery;
  }

  beforeEach(async function () {
    [admin, station, farmer, other, resolver] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockRWF");
    token = await Token.deploy();
    await token.waitForDeployment();

    const Settlement = await ethers.getContractFactory("AmataSettle");
    settle = await Settlement.deploy(await token.getAddress(), 7 * 24 * 60 * 60);
    await settle.waitForDeployment();

    await settle.authorizeStation(station.address);
    await settle.authorizeResolver(resolver.address);
    await token.mint(admin.address, TOKEN);
    await token.approve(await settle.getAddress(), TOKEN);
    await settle.depositFunds(TOKEN);
  });

  describe("deployment and roles", function () {
    it("deploys both contracts with the expected token metadata", async function () {
      expect(await token.name()).to.equal("Mock Rwandan Franc");
      expect(await token.symbol()).to.equal("mRWF");
      expect(await token.decimals()).to.equal(6n);
      expect(await settle.settlementToken()).to.equal(await token.getAddress());
    });

    it("authorizes a station and rejects unauthorized role changes", async function () {
      await expectEvent(
        settle.authorizeStation(other.address),
        settle,
        "StationAuthorizationChanged",
        [other.address, true]
      );
      await expectRevert(
        settle.connect(other).authorizeStation(other.address),
        settle,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("revokes a station and then rejects its submissions", async function () {
      await settle.revokeStation(station.address);
      const { delivery, signature } = await makeSignedDelivery();
      await expectRevert(
        settle.connect(station).recordDelivery(delivery, signature),
        settle,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("restricts token minting to authorized minters", async function () {
      await expectRevert(
        token.connect(other).mint(other.address, 1n),
        token,
        "AccessControlUnauthorizedAccount"
      );
      await expectRevert(token.mint(other.address, 0n), token, "ZeroAmount");
    });
  });

  describe("treasury", function () {
    it("tracks deposits, reserves, and available treasury correctly", async function () {
      expect(await settle.totalDeposited()).to.equal(TOKEN);
      expect(await settle.getTreasuryBalance()).to.equal(TOKEN);
      expect(await settle.getReservedFunds()).to.equal(0n);
      expect(await settle.getAvailableTreasury()).to.equal(TOKEN);
    });

    it("rejects zero deposits", async function () {
      await expectRevert(settle.depositFunds(0n), settle, "ZeroAmount");
    });

    it("prevents withdrawing funds backing active allocations", async function () {
      await record();
      await expectRevert(
        settle.withdrawUnallocatedFunds(admin.address, TOKEN),
        settle,
        "InsufficientAvailableFunds"
      );
      await expectEvent(
        settle.withdrawUnallocatedFunds(admin.address, TOKEN - PAYMENT),
        settle,
        "UnallocatedFundsWithdrawn",
        [admin.address, TOKEN - PAYMENT]
      );
      expect(await settle.getTreasuryBalance()).to.equal(PAYMENT);
      expect(await settle.getReservedFunds()).to.equal(PAYMENT);
    });
  });

  describe("signed delivery receipts", function () {
    it("records a valid receipt and calculates 15 L × 500 RWF/L as 7,500 mRWF", async function () {
      const { delivery, signature } = await makeSignedDelivery();
      await expectEvent(
        settle.connect(station).recordDelivery(delivery, signature),
        settle,
        "DeliveryRecorded",
        [delivery.deliveryId, farmer.address, 15_000n, PAYMENT, station.address]
      );
      const details = await settle.getDeliveryDetails(delivery.deliveryId);
      expect(details.payment).to.equal(PAYMENT);
      expect(details.status).to.equal(1n);
      expect(await settle.getClaimableAmount(farmer.address)).to.equal(PAYMENT);
      expect(await settle.getReservedFunds()).to.equal(PAYMENT);
      expect(await settle.getAvailableTreasury()).to.equal(TOKEN - PAYMENT);
      expect(await settle.getFarmerDeliveries(farmer.address)).to.deep.equal([delivery.deliveryId]);
    });

    it("rejects callers that are not authorized stations", async function () {
      const { delivery, signature } = await makeSignedDelivery();
      await expectRevert(
        settle.connect(other).recordDelivery(delivery, signature),
        settle,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("rejects malformed or forged signatures", async function () {
      const { delivery } = await makeSignedDelivery();
      await expectRevert(settle.connect(station).recordDelivery(delivery, "0x1234"));
      const forged = await makeSignedDelivery({}, other);
      await expectRevert(
        settle.connect(station).recordDelivery(forged.delivery, forged.signature),
        settle,
        "InvalidStationSigner"
      );
    });

    it("rejects a signature created for another chain domain", async function () {
      const { delivery } = await makeSignedDelivery();
      const signature = await station.signTypedData(
        {
          name: "AmataSettle",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId + 1n,
          verifyingContract: await settle.getAddress()
        },
        types,
        delivery
      );
      await expectRevert(
        settle.connect(station).recordDelivery(delivery, signature),
        settle,
        "InvalidStationSigner"
      );
    });

    it("rejects replay of a delivery ID", async function () {
      const { delivery, signature } = await makeSignedDelivery();
      await settle.connect(station).recordDelivery(delivery, signature);
      await expectRevert(
        settle.connect(station).recordDelivery(delivery, signature),
        settle,
        "DeliveryAlreadyExists"
      );
    });

    it("rejects a zero delivery ID", async function () {
      const { delivery, signature } = await makeSignedDelivery({
        deliveryId: ethers.ZeroHash
      });
      await expectRevert(
        settle.connect(station).recordDelivery(delivery, signature),
        settle,
        "InvalidDeliveryId"
      );
    });

    it("rejects zero quantity and zero price", async function () {
      let signed = await makeSignedDelivery({ quantityMilliLitres: 0n });
      await expectRevert(
        settle.connect(station).recordDelivery(signed.delivery, signed.signature),
        settle,
        "InvalidQuantity"
      );
      signed = await makeSignedDelivery({ pricePerLitre: 0n });
      await expectRevert(
        settle.connect(station).recordDelivery(signed.delivery, signed.signature),
        settle,
        "InvalidPrice"
      );
    });

    it("rejects invalid grade, zero farmer, and future delivery time", async function () {
      const cases = [
        [{ qualityGrade: 0 }, "InvalidQualityGrade"],
        [{ qualityGrade: 6 }, "InvalidQualityGrade"],
        [{ farmer: ethers.ZeroAddress }, "InvalidFarmer"],
        [{ deliveredAt: BigInt((await latestTimestamp()) + 3600) }, "InvalidDeliveryTime"]
      ];
      for (const [overrides, error] of cases) {
        const signed = await makeSignedDelivery(overrides);
        await expectRevert(
          settle.connect(station).recordDelivery(signed.delivery, signed.signature),
          settle,
          error
        );
      }
    });

    it("rejects expired signatures and allocations exceeding available treasury", async function () {
      let now = await latestTimestamp();
      let signed = await makeSignedDelivery({ deadline: BigInt(now - 1) });
      await expectRevert(
        settle.connect(station).recordDelivery(signed.delivery, signed.signature),
        settle,
        "ExpiredSignature"
      );

      now = await latestTimestamp();
      signed = await makeSignedDelivery({ pricePerLitre: 100_000_000n });
      await expectRevert(
        settle.connect(station).recordDelivery(signed.delivery, signed.signature),
        settle,
        "InsufficientTreasury"
      );
    });

    it("accepts a signed offline receipt when it is synchronized before its deadline", async function () {
      const { delivery, signature } = await makeSignedDelivery();
      await ethers.provider.send("evm_increaseTime", [600]);
      await ethers.provider.send("evm_mine", []);
      await expectEvent(
        settle.connect(station).recordDelivery(delivery, signature),
        settle,
        "PaymentAllocated",
        [delivery.deliveryId, farmer.address, PAYMENT]
      );
    });
  });

  describe("farmer settlement and disputes", function () {
    it("allows only the farmer to claim once", async function () {
      const delivery = await record();
      await expectRevert(
        settle.connect(other).claimPayment(delivery.deliveryId),
        settle,
        "InvalidFarmer"
      );
      await expectEvent(
        settle.connect(farmer).claimPayment(delivery.deliveryId),
        settle,
        "PaymentClaimed",
        [delivery.deliveryId, farmer.address, PAYMENT]
      );
      await expectRevert(
        settle.connect(farmer).claimPayment(delivery.deliveryId),
        settle,
        "InvalidDeliveryState"
      );
      expect(await token.balanceOf(farmer.address)).to.equal(PAYMENT);
      expect(await settle.getReservedFunds()).to.equal(0n);
      expect(await settle.getClaimableAmount(farmer.address)).to.equal(0n);
    });

    it("lets a farmer dispute an allocation and restores claimability when upheld", async function () {
      const delivery = await record();
      await expectEvent(
        settle.connect(farmer).raiseDispute(delivery.deliveryId, "Quantity review"),
        settle,
        "DisputeRaised"
      );
      expect(await settle.getClaimableAmount(farmer.address)).to.equal(0n);
      expect(await settle.getReservedFunds()).to.equal(PAYMENT);
      await expectRevert(
        settle.connect(other).resolveDispute(delivery.deliveryId, true),
        settle,
        "AccessControlUnauthorizedAccount"
      );
      await expectEvent(
        settle.connect(resolver).resolveDispute(delivery.deliveryId, true),
        settle,
        "DisputeResolved",
        [delivery.deliveryId, true, 0n]
      );
      expect(await settle.getClaimableAmount(farmer.address)).to.equal(PAYMENT);
      await settle.connect(farmer).claimPayment(delivery.deliveryId);
    });

    it("blocks claims while disputed and rejects disputes from another account", async function () {
      const delivery = await record();
      await expectRevert(
        settle.connect(other).raiseDispute(delivery.deliveryId, "Not my delivery"),
        settle,
        "InvalidFarmer"
      );
      await settle.connect(farmer).raiseDispute(delivery.deliveryId, "Review requested");
      await expectRevert(
        settle.connect(farmer).claimPayment(delivery.deliveryId),
        settle,
        "InvalidDeliveryState"
      );
      expect(await settle.getReservedFunds()).to.equal(PAYMENT);
    });

    it("releases reserved funds when a dispute is rejected", async function () {
      const delivery = await record();
      await settle.connect(farmer).raiseDispute(delivery.deliveryId, "Incorrect measured volume");
      await expectEvent(
        settle.connect(resolver).resolveDispute(delivery.deliveryId, false),
        settle,
        "DisputeResolved",
        [delivery.deliveryId, false, PAYMENT]
      );
      const details = await settle.getDeliveryDetails(delivery.deliveryId);
      expect(details.status).to.equal(4n);
      expect(await settle.getReservedFunds()).to.equal(0n);
      expect(await settle.getAvailableTreasury()).to.equal(TOKEN);
      await expectRevert(
        settle.connect(farmer).claimPayment(delivery.deliveryId),
        settle,
        "InvalidDeliveryState"
      );
    });

    it("rejects disputes outside the window, empty reasons, and repeated resolution", async function () {
      const delivery = await record();
      await expectRevert(
        settle.connect(farmer).raiseDispute(delivery.deliveryId, ""),
        settle,
        "EmptyDisputeReason"
      );
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      await expectRevert(
        settle.connect(farmer).raiseDispute(delivery.deliveryId, "Late"),
        settle,
        "DisputeWindowClosed"
      );

      const second = await record();
      await settle.connect(farmer).raiseDispute(second.deliveryId, "Review");
      await settle.connect(resolver).resolveDispute(second.deliveryId, true);
      await expectRevert(
        settle.connect(resolver).resolveDispute(second.deliveryId, false),
        settle,
        "InvalidDeliveryState"
      );
    });

    it("rejects oversized dispute reasons", async function () {
      const delivery = await record();
      await expectRevert(
        settle.connect(farmer).raiseDispute(delivery.deliveryId, "x".repeat(501)),
        settle,
        "DisputeReasonTooLong"
      );
    });

    it("preserves treasury invariants across claims and rejected disputes", async function () {
      const first = await record();
      const second = await record();
      const third = await record();
      expect(await settle.getReservedFunds()).to.equal(PAYMENT * 3n);
      expect(await settle.getAvailableTreasury()).to.equal(TOKEN - PAYMENT * 3n);

      await settle.connect(farmer).claimPayment(first.deliveryId);
      await settle.connect(farmer).raiseDispute(second.deliveryId, "Quantity differs");
      await settle.connect(resolver).resolveDispute(second.deliveryId, false);
      expect(await settle.getReservedFunds()).to.equal(PAYMENT);
      expect(await settle.getAvailableTreasury()).to.equal(TOKEN - PAYMENT * 2n);
      await settle.connect(farmer).claimPayment(third.deliveryId);
      expect(await settle.getReservedFunds()).to.equal(0n);
      expect(await settle.getTreasuryBalance()).to.equal(TOKEN - PAYMENT * 2n);
      expect(
        (await settle.getAvailableTreasury()) + (await settle.getReservedFunds())
      ).to.equal(await settle.getTreasuryBalance());
    });
  });

  describe("emergency pause", function () {
    it("allows an authorized administrator to pause the contract", async function () {
      expect(await settle.paused()).to.equal(false);
      await expectEvent(settle.pause(), settle, "Paused", [admin.address]);
      expect(await settle.paused()).to.equal(true);
    });

    it("allows an authorized administrator to unpause the contract", async function () {
      await settle.pause();
      expect(await settle.paused()).to.equal(true);
      await expectEvent(settle.unpause(), settle, "Unpaused", [admin.address]);
      expect(await settle.paused()).to.equal(false);
    });

    it("prevents an unauthorized user from pausing", async function () {
      await expectRevert(
        settle.connect(other).pause(),
        settle,
        "AccessControlUnauthorizedAccount"
      );
      expect(await settle.paused()).to.equal(false);
    });

    it("prevents an unauthorized user from unpausing", async function () {
      await settle.pause();
      await expectRevert(
        settle.connect(other).unpause(),
        settle,
        "AccessControlUnauthorizedAccount"
      );
      expect(await settle.paused()).to.equal(true);
    });

    it("blocks delivery recording while paused", async function () {
      await settle.pause();
      const signed = await makeSignedDelivery();
      await expectRevert(
        settle.connect(station).recordDelivery(signed.delivery, signed.signature),
        settle,
        "EnforcedPause"
      );
      // Verify no delivery was recorded
      const details = await settle.getDeliveryDetails(signed.delivery.deliveryId);
      expect(details.status).to.equal(0n);
      expect(await settle.getReservedFunds()).to.equal(0n);
    });

    it("blocks farmer payment claims while paused", async function () {
      const delivery = await record();
      await settle.pause();
      await expectRevert(
        settle.connect(farmer).claimPayment(delivery.deliveryId),
        settle,
        "EnforcedPause"
      );
      // Verify allocation remains intact and unclaimed
      const details = await settle.getDeliveryDetails(delivery.deliveryId);
      expect(details.status).to.equal(1n);
      expect(await settle.getClaimableAmount(farmer.address)).to.equal(PAYMENT);
      expect(await settle.getReservedFunds()).to.equal(PAYMENT);
      expect(await token.balanceOf(farmer.address)).to.equal(0n);
    });

    it("blocks treasury deposits while paused", async function () {
      await settle.pause();
      await expectRevert(settle.depositFunds(PAYMENT), settle, "EnforcedPause");
      // Verify no additional tokens were deposited
      expect(await settle.totalDeposited()).to.equal(TOKEN);
    });

    it("blocks unallocated treasury withdrawals while paused", async function () {
      await settle.pause();
      await expectRevert(
        settle.withdrawUnallocatedFunds(admin.address, PAYMENT),
        settle,
        "EnforcedPause"
      );
      // Verify no tokens left the treasury
      expect(await settle.getTreasuryBalance()).to.equal(TOKEN);
    });

    it("allows farmers to raise disputes while paused", async function () {
      const delivery = await record();
      await settle.pause();
      await expectEvent(
        settle.connect(farmer).raiseDispute(delivery.deliveryId, "Paused dispute"),
        settle,
        "DisputeRaised"
      );
      // Verify dispute state was applied
      const details = await settle.getDeliveryDetails(delivery.deliveryId);
      expect(details.status).to.equal(2n);
      expect(await settle.getClaimableAmount(farmer.address)).to.equal(0n);
      expect(await settle.getReservedFunds()).to.equal(PAYMENT);
    });

    it("allows authorized resolvers to resolve disputes while paused", async function () {
      const delivery = await record();
      await settle.connect(farmer).raiseDispute(delivery.deliveryId, "Review");
      await settle.pause();
      await expectEvent(
        settle.connect(resolver).resolveDispute(delivery.deliveryId, false),
        settle,
        "DisputeResolved",
        [delivery.deliveryId, false, PAYMENT]
      );
      // Verify funds were released
      const details = await settle.getDeliveryDetails(delivery.deliveryId);
      expect(details.status).to.equal(4n);
      expect(await settle.getReservedFunds()).to.equal(0n);
      expect(await settle.getAvailableTreasury()).to.equal(TOKEN);
    });

    it("allows administrators to authorize stations while paused", async function () {
      await settle.pause();
      await expectEvent(
        settle.authorizeStation(other.address),
        settle,
        "StationAuthorizationChanged",
        [other.address, true]
      );
      // Verify station role was actually granted
      const STATION_ROLE = await settle.STATION_ROLE();
      expect(await settle.hasRole(STATION_ROLE, other.address)).to.equal(true);
    });

    it("allows administrators to revoke stations while paused", async function () {
      const STATION_ROLE = await settle.STATION_ROLE();
      expect(await settle.hasRole(STATION_ROLE, station.address)).to.equal(true);
      await settle.pause();
      await expectEvent(
        settle.revokeStation(station.address),
        settle,
        "StationAuthorizationChanged",
        [station.address, false]
      );
      // Verify station role was actually revoked
      expect(await settle.hasRole(STATION_ROLE, station.address)).to.equal(false);
    });

    it("resumes normal operations after unpausing", async function () {
      await settle.pause();
      // Confirm paused blocks operations
      const signed = await makeSignedDelivery();
      await expectRevert(
        settle.connect(station).recordDelivery(signed.delivery, signed.signature),
        settle,
        "EnforcedPause"
      );
      // Unpause and verify operations resume
      await settle.unpause();
      expect(await settle.paused()).to.equal(false);
      await expectEvent(
        settle.connect(station).recordDelivery(signed.delivery, signed.signature),
        settle,
        "DeliveryRecorded",
        [signed.delivery.deliveryId, farmer.address, 15_000n, PAYMENT, station.address]
      );
      // Verify state changes occurred
      expect(await settle.getClaimableAmount(farmer.address)).to.equal(PAYMENT);
      expect(await settle.getReservedFunds()).to.equal(PAYMENT);
      // Verify claim works after unpause
      await expectEvent(
        settle.connect(farmer).claimPayment(signed.delivery.deliveryId),
        settle,
        "PaymentClaimed",
        [signed.delivery.deliveryId, farmer.address, PAYMENT]
      );
      expect(await token.balanceOf(farmer.address)).to.equal(PAYMENT);
      expect(await settle.getReservedFunds()).to.equal(0n);
    });
  });
});
