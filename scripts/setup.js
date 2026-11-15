import "dotenv/config";
import { network } from "hardhat";

const { ethers } = await network.getOrCreate();
const stationAddress = process.env.DEMO_STATION_ADDRESS;
if (!stationAddress || !ethers.isAddress(stationAddress)) {
  throw new Error("Set DEMO_STATION_ADDRESS to the authorized station wallet in .env.");
}

const settlementAddress = process.env.AMATASETTLE_ADDRESS;
const tokenAddress = process.env.MOCKRWF_ADDRESS;
if (!settlementAddress || !tokenAddress) {
  throw new Error("Set AMATASETTLE_ADDRESS and MOCKRWF_ADDRESS in .env after deployment.");
}

const demoAmount = ethers.parseUnits(process.env.DEMO_TREASURY_RWF ?? "1000000", 6);
const token = await ethers.getContractAt("MockRWF", tokenAddress);
const settlement = await ethers.getContractAt("AmataSettle", settlementAddress);

await (await settlement.authorizeStation(stationAddress)).wait();
await (await token.mint((await ethers.getSigners())[0].address, demoAmount)).wait();
await (await token.approve(settlementAddress, demoAmount)).wait();
await (await settlement.depositFunds(demoAmount)).wait();

console.log(`Authorized station: ${stationAddress}`);
console.log(`Deposited ${ethers.formatUnits(demoAmount, 6)} simulated RWF.`);
