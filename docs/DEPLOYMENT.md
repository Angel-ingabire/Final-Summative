# Deployment and interaction guide

## Current deployment status

The contracts and scripts are ready for deployment, but **AmataSettle has not been deployed to Sepolia**. The repository intentionally contains no invented address, transaction hash, or screenshot. A deployment needs a funded Sepolia wallet and RPC access controlled by the student.

## Prerequisites

- Node.js 22 or later and npm.
- MetaMask, set to Sepolia.
- Sepolia ETH from a faucet for gas (testnet ETH has no intended real-world value).
- A Sepolia RPC URL and a dedicated deployment account.
- A separate station wallet address for the demonstration. It must have Sepolia ETH for transaction gas.

Never send a private key, seed phrase, or RPC credential to anyone or commit it to Git.

## 1. Install and configure

From the repository root in PowerShell:

```powershell
npm install
npm install --prefix frontend
Copy-Item .env.example .env
```

Edit `.env` locally and set:

- `SEPOLIA_RPC_URL`: your Sepolia JSON-RPC endpoint.
- `DEPLOYER_PRIVATE_KEY`: the dedicated deployment account private key. Do not use a wallet holding real funds.
- `ETHERSCAN_API_KEY`: optional; not used by the deployment scripts.

Do not print `.env` to the terminal or include it in screenshots. `.env` is ignored by Git.

## 2. Run local validation

```powershell
npm run compile
npm test
npm run demo:local
```

The local demo deploys ephemeral contracts, deposits simulated tokens, records and claims a 15-litre receipt, rejects a disputed second receipt, and submits a receipt after simulated offline time. The resulting addresses/hashes exist only on the local Hardhat network.

## 3. Deploy to Sepolia

```powershell
npm run deploy:sepolia
```

The script deploys `MockRWF` and then `AmataSettle` with a seven-day dispute window. It waits for deployment and appends the network, chain ID, addresses, block transaction hashes, and timestamp to `deployments/sepolia.json`. Confirm these transactions independently on [Sepolia Etherscan](https://sepolia.etherscan.io/).

Copy the printed contract addresses into `.env`:

```text
MOCKRWF_ADDRESS=<deployed MockRWF address>
AMATASETTLE_ADDRESS=<deployed AmataSettle address>
DEMO_STATION_ADDRESS=<station wallet address>
DEMO_TREASURY_RWF=1000000
```

Then configure the roles and demo treasury:

```powershell
npm run setup:sepolia
```

This script authorizes the station, mints simulated mRWF to the deployer, approves the settlement contract, and deposits the configured amount. Each transaction must confirm. It does not create farmer accounts or sign delivery records.

## 4. Configure and run the frontend

```powershell
Copy-Item frontend\.env.example frontend\.env.local
```

Set `VITE_AMATASETTLE_ADDRESS`, `VITE_MOCKRWF_ADDRESS`, and `VITE_CHAIN_ID=11155111` in `frontend/.env.local`. These addresses are public deployment identifiers; do not put secret keys in Vite environment variables.

```powershell
npm run build:web
npm run dev:web
```

Open the local Vite URL and connect MetaMask on Sepolia. The browser requests wallet signatures and transactions from MetaMask. It never asks for a pasted private key. Give the station wallet access by authorizing its address as above; connect using that wallet to create station receipts. The administrator, farmer, and resolver views depend on the roles and account connected.

## 5. Verify contract source

Source verification is optional and is not automated by this repository. Use Etherscan's Sepolia contract verification interface with the exact compiler (`0.8.28`), optimizer settings (enabled, 200 runs), source code, and constructor arguments. Verify `AmataSettle` with the deployed MockRWF address and `604800` dispute-period seconds. Do not publish any private key or RPC URL during verification.

## 6. Capture genuine evidence

After deployment and interaction, capture:

1. Sepolia explorer pages showing both verified contracts and deployment transactions.
2. The dashboard connected to Sepolia with actual on-chain treasury and delivery data.
3. The 15 L / 500 mRWF-per-litre allocation and farmer claim.
4. A disputed delivery and resolver decision.
5. A locally queued receipt followed by its confirmed transaction after reconnection.
6. `npm test` and local demonstration output, clearly labelled as local.

Store only evidence that you personally observed. See [screenshots/README.md](../screenshots/README.md) for suggested filenames. Do not use local Hardhat addresses or hashes as Sepolia evidence.
