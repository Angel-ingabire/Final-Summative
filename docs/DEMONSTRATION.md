# Demonstration walkthrough

## Local repeatable demo

Run from the root:

```powershell
npm run demo:local
```

The script deploys ephemeral contracts on Hardhat and prints the actual local addresses, transaction hashes, claimed balance, reserved liabilities, and available treasury. Clearly label every value as **local Hardhat output**, not Sepolia evidence.

The scenario is:

1. Deploy MockRWF and AmataSettle.
2. Authorize the station and deposit 1,000,000 simulated mRWF.
3. Station signs and submits Farmer A's 15-litre receipt at 500 mRWF/litre.
4. Farmer A claims 7,500 mRWF.
5. Station records a second receipt, Farmer B raises a dispute, and the resolver rejects it.
6. Station prepares a signed receipt, waits through simulated offline time, then submits it.
7. Check that the rejected payment is no longer reserved.

## Sepolia interaction

The real testnet sequence cannot be shown until a student deploys using their own Sepolia credentials. Follow [DEPLOYMENT.md](./DEPLOYMENT.md), save genuine transaction hashes, and then:

1. Connect the authorized station wallet to the dashboard.
2. Enter Farmer A's wallet, `15` litres, `500` simulated RWF/litre, and a quality grade.
3. Sign and submit the receipt. Confirm its transaction and allocation on Sepolia.
4. Connect Farmer A and claim the allocation.
5. Create a second delivery and raise a dispute from the farmer account.
6. Connect the resolver account and resolve by the actual 32-byte delivery ID.
7. To test offline queueing, disconnect connectivity only after the station wallet is connected, sign and save a receipt, reconnect, then use **Sync pending**. Do not treat a receipt as on-chain until its transaction confirms.

The station signature proves the signing key approved the typed data; it does not prove that the milk was physically measured or assessed accurately.
