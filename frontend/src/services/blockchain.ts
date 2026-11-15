import { BrowserProvider, Contract, formatUnits } from "ethers";
import { settlementAbi, tokenAbi } from "../contracts/abis";

export const chainId = Number(import.meta.env.VITE_CHAIN_ID || "11155111");
export const settlementAddress = import.meta.env.VITE_AMATASETTLE_ADDRESS || "";
export const tokenAddress = import.meta.env.VITE_MOCKRWF_ADDRESS || "";

export function contracts(provider: BrowserProvider): {
  settlement: Contract;
  token: Contract;
} {
  if (!settlementAddress || !tokenAddress) {
    throw new Error("Contract addresses are not configured. See the deployment guide.");
  }
  return {
    settlement: new Contract(settlementAddress, settlementAbi, provider),
    token: new Contract(tokenAddress, tokenAbi, provider)
  };
}

export function formatRwf(baseUnits: bigint | string): string {
  return `${Number(formatUnits(baseUnits, 6)).toLocaleString(undefined, {
    maximumFractionDigits: 2
  })} mRWF`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function explainError(error: unknown): string {
  if (typeof error === "object" && error !== null && "shortMessage" in error) {
    return String(error.shortMessage);
  }
  if (error instanceof Error) return error.message;
  return "The request failed. Check the wallet, network, and transaction details.";
}
