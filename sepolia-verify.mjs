import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const rpc = env.SEPOLIA_RPC_URL;
if (!rpc) { console.error("SEPOLIA_RPC_URL missing"); process.exit(1); }

const meta = JSON.parse(readFileSync("deployments/sepolia.json", "utf8"));
const dep = meta[0];

const MOCKRWF = dep.mockRwf;
const AMATASETTLE = dep.amataSettle;
const DEPLOYER = dep.deployer;
const MOCKRWF_TX = dep.transactionHashes.mockRwf;
const AMATASETTLE_TX = dep.transactionHashes.amataSettle;

const provider = new ethers.JsonRpcProvider(rpc, 11155111);

const ERC20_ABI = ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)", "function balanceOf(address account) view returns (uint256)"];

async function main() {
  const network = await provider.getNetwork();
  console.log("Connected network:", network.name, "chainId:", Number(network.chainId));

  const codeM = await provider.getCode(MOCKRWF);
  const codeA = await provider.getCode(AMATASETTLE);
  console.log("MockRWF bytecode present:", codeM.length > 2, "length:", codeM.length);
  console.log("AmataSettle bytecode present:", codeA.length > 2, "length:", codeA.length);

  for (const [label, tx] of [["MockRWF", MOCKRWF_TX], ["AmataSettle", AMATASETTLE_TX]]) {
    try {
      const receipt = await provider.getTransactionReceipt(tx);
      const txn = await provider.getTransaction(tx);
      console.log(`${label} deployment tx:`, tx);
      console.log(`${label} receipt found:`, !!receipt, "| status:", receipt ? (receipt.status === 1 ? "success (1)" : "FAILED (0)") : "n/a",
        "| block:", receipt ? receipt.blockNumber : "n/a",
        "| from:", txn ? txn.from : "n/a",
        "| to:", txn ? txn.to : "n/a",
        "| contractAddress:", receipt ? receipt.contractAddress : "n/a");
      console.log(`${label} deployed address matches metadata:`, receipt ? receipt.contractAddress.toLowerCase() === (label === "MockRWF" ? MOCKRWF : AMATASETTLE).toLowerCase() : false);
    } catch (e) {
      console.log(`${label} deployment tx lookup failed:`, e.message);
    }
  }

  const settle = new ethers.Contract(AMATASETTLE, [
    "function settlementToken() view returns (address)",
    "function disputePeriod() view returns (uint64)",
    "function paused() view returns (bool)",
    "function getTreasuryBalance() view returns (uint256)",
    "function getAvailableTreasury() view returns (uint256)",
    "function getReservedFunds() view returns (uint256)",
    "function totalDeposited() view returns (uint256)",
    "function totalSettlements() view returns (uint256)",
    "function STATION_ROLE() view returns (bytes32)",
    "function RESOLVER_ROLE() view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "function hasRole(bytes32 role, address account) view returns (bool)"
  ], provider);

  const token = new ethers.Contract(MOCKRWF, ERC20_ABI, provider);

  console.log("AmataSettle.settlementToken():", await settle.settlementToken());
  console.log("Matches MockRWF:", (await settle.settlementToken()).toLowerCase() === MOCKRWF.toLowerCase());
  console.log("disputePeriod():", String(await settle.disputePeriod()), "seconds (expect 604800 = 7 days)");
  console.log("paused():", await settle.paused());
  console.log("getTreasuryBalance():", String(await settle.getTreasuryBalance()));
  console.log("getAvailableTreasury():", String(await settle.getAvailableTreasury()));
  console.log("getReservedFunds():", String(await settle.getReservedFunds()));
  console.log("totalDeposited():", String(await settle.totalDeposited()));
  console.log("totalSettlements():", String(await settle.totalSettlements()));
  const bal = await settle.getTreasuryBalance();
  const av = await settle.getAvailableTreasury();
  const res = await settle.getReservedFunds();
  console.log("invariant balance == available + reserved:", bal === av + res);

  console.log("MockRWF.name():", await token.name());
  console.log("MockRWF.symbol():", await token.symbol());
  console.log("MockRWF.decimals():", Number(await token.decimals()));

  const adminRole = await settle.DEFAULT_ADMIN_ROLE();
  console.log("Deployer has DEFAULT_ADMIN_ROLE:", await settle.hasRole(adminRole, DEPLOYER));

  const tokenBalance = await token.balanceOf(AMATASETTLE);
  console.log("MockRWF balance of AmataSettle:", String(tokenBalance), "matches treasury balance:", tokenBalance === bal);
}
main().then(() => process.exit(0)).catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
