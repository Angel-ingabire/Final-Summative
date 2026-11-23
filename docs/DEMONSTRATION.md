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

## Completed Sepolia demonstration

AmataSettle has been deployed to Ethereum Sepolia (chain ID 11155111) on November 23, 2026. The following demonstration actions were performed against the deployed contracts:

**Confirmed on-chain evidence** (addresses and hashes from `deployments/sepolia.json`):

| Item | Value |
|------|-------|
| AmataSettle | [`0x21ffE6b376cF3BCBae2326e12967d40BA3a5d9B6`](https://sepolia.etherscan.io/address/0x21ffE6b376cF3BCBae2326e12967d40BA3a5d9B6) |
| MockRWF | [`0x96db7708B29Ff274DA4672B10a2C1D873E8e2a8f`](https://sepolia.etherscan.io/address/0x96db7708B29Ff274DA4672B10a2C1D873E8e2a8f) |
| MockRWF deployment tx | [`0x6cec7761b36de64fef9153807eeb0d4cb1b97e730ad4eeec0956a90f198ce6a5`](https://sepolia.etherscan.io/tx/0x6cec7761b36de64fef9153807eeb0d4cb1b97e730ad4eeec0956a90f198ce6a5) |
| AmataSettle deployment tx | [`0x82f92708bdd0138e3de02eb441aeaa119ca31da24493a24eeef408c0202d045f`](https://sepolia.etherscan.io/tx/0x82f92708bdd0138e3de02eb441aeaa119ca31da24493a24eeef408c0202d045f) |

**User-reported demonstration results** (transaction hashes not recorded; do not treat as independently verifiable on-chain evidence):

1. Minted simulated mRWF tokens through the authorized minter role.
2. Deposited 50,000 mRWF into the cooperative treasury.
3. Authorized a collection station wallet to submit signed receipts.
4. Registered a 15-litre delivery at 500 mRWF/litre, allocating 7,500 mRWF to the farmer.
5. Registered a 10-litre delivery at 500 mRWF/litre, allocating 5,000 mRWF to the farmer.
6. Claimed farmer payments for allocated deliveries.
7. Raised a dispute on the second (10-litre) delivery and upheld the payment through the resolver role.
8. Paused the contract through the administrator Pause Contract button, confirming that deposits, withdrawals, delivery recording, and farmer claims were blocked.
9. Resumed the contract through the administrator Resume Contract button, confirming that normal operations resumed.

The paused state was read directly from the deployed contract via the `paused()` view function. Dispute creation, dispute resolution, and role management remained available while the contract was paused.

## Sepolia interaction (for future verification)

The following steps can be repeated and verified on Sepolia Etherscan:

1. Connect the authorized station wallet to the dashboard.
2. Enter Farmer A's wallet, `15` litres, `500` simulated RWF/litre, and a quality grade.
3. Sign and submit the receipt. Confirm its transaction and allocation on Sepolia.
4. Connect Farmer A and claim the allocation.
5. Create a second delivery and raise a dispute from the farmer account.
6. Connect the resolver account and resolve by the actual 32-byte delivery ID.
7. To test offline queueing, disconnect connectivity only after the station wallet is connected, sign and save a receipt, reconnect, then use **Sync pending**. Do not treat a receipt as on-chain until its transaction confirms.
8. Connect the administrator wallet and use **Pause Contract**, then **Resume Contract** to verify the emergency pause mechanism.

The station signature proves the signing key approved the typed data; it does not prove that the milk was physically measured or assessed accurately.
