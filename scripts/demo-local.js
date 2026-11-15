import { network } from "hardhat";

const { ethers } = await network.getOrCreate();
const [admin, station, farmerA, farmerB] = await ethers.getSigners();
const token = await (await ethers.getContractFactory("MockRWF")).deploy();
await token.waitForDeployment();
const settlement = await (
  await ethers.getContractFactory("AmataSettle")
).deploy(await token.getAddress(), 7n * 24n * 60n * 60n);
await settlement.waitForDeployment();

await (await settlement.authorizeStation(station.address)).wait();
const treasuryDeposit = ethers.parseUnits("1000000", 6);
await (await token.mint(admin.address, treasuryDeposit)).wait();
await (await token.approve(await settlement.getAddress(), treasuryDeposit)).wait();
const depositTx = await settlement.depositFunds(treasuryDeposit);
await depositTx.wait();

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

async function createReceipt(label, farmer, quantityMilliLitres, pricePerLitre) {
  const block = await ethers.provider.getBlock("latest");
  const delivery = {
    deliveryId: ethers.id(label),
    farmer: farmer.address,
    quantityMilliLitres,
    pricePerLitre,
    qualityGrade: 4,
    deliveredAt: BigInt(block.timestamp),
    deadline: BigInt(block.timestamp + 3600)
  };
  const signature = await station.signTypedData(
    {
      name: "AmataSettle",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await settlement.getAddress()
    },
    types,
    delivery
  );
  return { delivery, signature };
}

const receiptA = await createReceipt("local-demo-farmer-a", farmerA, 15_000n, 500n);
const deliveryATx = await settlement
  .connect(station)
  .recordDelivery(receiptA.delivery, receiptA.signature);
await deliveryATx.wait();
const claimTx = await settlement.connect(farmerA).claimPayment(receiptA.delivery.deliveryId);
await claimTx.wait();

const receiptB = await createReceipt("local-demo-farmer-b-dispute", farmerB, 20_000n, 500n);
const deliveryBTx = await settlement
  .connect(station)
  .recordDelivery(receiptB.delivery, receiptB.signature);
await deliveryBTx.wait();
const disputeTx = await settlement
  .connect(farmerB)
  .raiseDispute(receiptB.delivery.deliveryId, "Demonstration quantity review");
await disputeTx.wait();
const resolutionTx = await settlement
  .connect(admin)
  .resolveDispute(receiptB.delivery.deliveryId, false);
await resolutionTx.wait();

const offlineReceipt = await createReceipt("local-demo-offline-sync", farmerA, 10_000n, 500n);
await ethers.provider.send("evm_increaseTime", [600]);
await ethers.provider.send("evm_mine", []);
const offlineSyncTx = await settlement
  .connect(station)
  .recordDelivery(offlineReceipt.delivery, offlineReceipt.signature);
await offlineSyncTx.wait();

console.log("LOCAL HARDHAT DEMONSTRATION (not Sepolia)");
console.log(`MockRWF: ${await token.getAddress()}`);
console.log(`AmataSettle: ${await settlement.getAddress()}`);
console.log(`Treasury deposit tx: ${depositTx.hash}`);
console.log(`Farmer A allocation tx: ${deliveryATx.hash}`);
console.log(`Farmer A claim tx: ${claimTx.hash}`);
console.log(`Farmer B disputed allocation tx: ${deliveryBTx.hash}`);
console.log(`Farmer B dispute tx: ${disputeTx.hash}`);
console.log(`Dispute resolution tx: ${resolutionTx.hash}`);
console.log(`Offline receipt sync tx: ${offlineSyncTx.hash}`);
console.log(`Farmer A claimed: ${ethers.formatUnits(await token.balanceOf(farmerA.address), 6)} mRWF`);
console.log(`Reserved after rejection: ${ethers.formatUnits(await settlement.getReservedFunds(), 6)} mRWF`);
console.log(`Available treasury: ${ethers.formatUnits(await settlement.getAvailableTreasury(), 6)} mRWF`);
