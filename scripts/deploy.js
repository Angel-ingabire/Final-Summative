import { mkdir, readFile, writeFile } from "node:fs/promises";
import { network } from "hardhat";

const { ethers, networkName } = await network.getOrCreate();
const disputePeriodSeconds = 7n * 24n * 60n * 60n;
const tokenFactory = await ethers.getContractFactory("MockRWF");
const token = await tokenFactory.deploy();
await token.waitForDeployment();

const settlementFactory = await ethers.getContractFactory("AmataSettle");
const settlement = await settlementFactory.deploy(
  await token.getAddress(),
  disputePeriodSeconds
);
await settlement.waitForDeployment();

const chain = await ethers.provider.getNetwork();
const deployment = {
  network: networkName,
  chainId: Number(chain.chainId),
  deployedAt: new Date().toISOString(),
  deployer: (await ethers.getSigners())[0].address,
  mockRwf: await token.getAddress(),
  amataSettle: await settlement.getAddress(),
  disputePeriodSeconds: Number(disputePeriodSeconds),
  transactionHashes: {
    mockRwf: token.deploymentTransaction()?.hash ?? null,
    amataSettle: settlement.deploymentTransaction()?.hash ?? null
  }
};

await mkdir("deployments", { recursive: true });
const filename = `deployments/${networkName}.json`;
let deployments = [];
try {
  deployments = JSON.parse(await readFile(filename, "utf8"));
  if (!Array.isArray(deployments)) deployments = [deployments];
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
deployments.push(deployment);
await writeFile(filename, `${JSON.stringify(deployments, null, 2)}\n`);

console.log(`Network: ${deployment.network} (chain ${deployment.chainId})`);
console.log(`MockRWF: ${deployment.mockRwf}`);
console.log(`AmataSettle: ${deployment.amataSettle}`);
console.log(`MockRWF tx: ${deployment.transactionHashes.mockRwf}`);
console.log(`AmataSettle tx: ${deployment.transactionHashes.amataSettle}`);
console.log(`Saved deployment metadata: ${filename}`);
