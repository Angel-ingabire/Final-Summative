# Deployment and interaction guide

## Current deployment status

AmataSettle has been deployed to Ethereum Sepolia (chain ID 11155111) on November 23, 2026. The deployed contracts and their deployment transaction hashes are recorded in `deployments/sepolia.json`:

| Item | Value |
|------|-------|
| Deployer | `0x55D23cA45Eace7E4497C780f89eac62f61421B3E` |
| AmataSettle | [`0x21ffE6b376cF3BCBae2326e12967d40BA3a5d9B6`](https://sepolia.etherscan.io/address/0x21ffE6b376cF3BCBae2326e12967d40BA3a5d9B6) |
| MockRWF | [`0x96db7708B29Ff274DA4672B10a2C1D873E8e2a8f`](https://sepolia.etherscan.io/address/0x96db7708B29Ff274DA4672B10a2C1D873E8e2a8f) |
| Dispute period | 604,800 seconds (7 days) |
| MockRWF deployment tx | [`0x6cec7761b36de64fef9153807eeb0d4cb1b97e730ad4eeec0956a90f198ce6a5`](https://sepolia.etherscan.io/tx/0x6cec7761b36de64fef9153807eeb0d4cb1b97e730ad4eeec0956a90f198ce6a5) |
| AmataSettle deployment tx | [`0x82f92708bdd0138e3de02eb441aeaa119ca31da24493a24eeef408c0202d045f`](https://sepolia.etherscan.io/tx/0x82f92708bdd0138e3de02eb441aeaa119ca31da24493a24eeef408c0202d045f) |

Contract source verification on Etherscan has not been independently confirmed and is not claimed here.

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
