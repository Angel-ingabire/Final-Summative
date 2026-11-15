# AmataSettle

**AmataSettle: An Offline-Ready Blockchain-Based Micro-Settlement Infrastructure for Rwanda's Dairy Supply Chain**

AmataSettle is an academic Ethereum prototype for station-signed dairy delivery receipts and cooperative settlement allocations. It uses Solidity, OpenZeppelin, EIP-712, Hardhat 3, ethers 6, React, and IndexedDB.

> **Prototype notice:** `mRWF` is a six-decimal test token with no monetary value or redemption. This repository has not been deployed to Sepolia. No Sepolia addresses, transaction hashes, screenshots, or deployment evidence are claimed.

## What is implemented

- `MockRWF`: admin-controlled six-decimal ERC-20 test token.
- `AmataSettle`: role-managed station receipts, EIP-712 verification, treasury reserves, farmer claims, and dispute resolution.
- 25 Hardhat tests for roles, validation, signatures, accounting, claims, disputes, and offline receipt submission after reconnection.
- A React dashboard that reads live contracts, uses MetaMask, stores signed receipts in IndexedDB, and retries pending receipts after connectivity returns.
- Deployment scripts, documentation, a PDF report, and a 15-slide presentation.

## Quick start (local tests)

Requirements: Node.js 22+ and npm.

```powershell
npm install
npm test
npm run demo:local
npm install --prefix frontend
npm run build:web
```

`demo:local` runs a self-contained Hardhat simulation. Its transaction hashes and addresses are local only and must not be presented as Sepolia evidence.

## Sepolia deployment

Read [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md). Deployment requires your own Sepolia RPC endpoint, a funded testnet deployer wallet, and an authorized station wallet. Keep private keys in a local ignored `.env`; never share them in source files or chat.

## Documentation

- [Project report](./REPORT.md) and [PDF report](./REPORT.pdf)
- [Deployment guide](./docs/DEPLOYMENT.md)
- [Testing and results](./docs/TESTING.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Security notes](./docs/SECURITY.md)
- [Demonstration walkthrough](./docs/DEMONSTRATION.md)
- [Oral defense guide](./docs/ORAL_DEFENSE.md)
- [Presentation](./AmataSettle_Presentation.pptx)

## Mission

The project advances the mission of using software engineering to develop secure, accessible and reliable financial systems for underserved Rwandan communities and businesses. Its prototype focuses on verifiable delivery records, transparent obligations, and offline-first receipt capture. These are design objectives, not claims of measured real-world impact.
