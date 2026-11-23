# Validation and test cases

## Executed checks

The actual validation run completed with **38 passing Hardhat tests** on the local Hardhat network and a successful production frontend build (`tsc -b && vite build`). The tests are not Sepolia transactions. The contracts are already deployed to Sepolia (see `deployments/sepolia.json`); no new deployment was performed as part of this test run.

Run:

```powershell
npm test
npm run build:web
npm run demo:local
```

The Mocha test output is the source of the pass count. Test descriptions and expected/actual results:

| # | Test suite | Test case | Expected result | Actual result |
|---|---|---|---|---|
| 1 | AmataSettle › deployment and roles | deploys both contracts with the expected token metadata | Both deploy; token metadata and reference are correct | PASS |
| 2 | AmataSettle › deployment and roles | authorizes a station and rejects unauthorized role changes | Admin authorization event is emitted; non-admin changes are rejected | PASS |
| 3 | AmataSettle › deployment and roles | revokes a station and then rejects its submissions | Revoked station cannot submit receipts | PASS |
| 4 | AmataSettle › deployment and roles | restricts token minting to authorized minters | Only a minter can mint; zero mint is rejected | PASS |
| 5 | AmataSettle › treasury | tracks deposits, reserves, and available treasury correctly | Deposit total and token balance match; reserve accounting is consistent | PASS |
| 6 | AmataSettle › treasury | rejects zero deposits | Transaction reverts | PASS |
| 7 | AmataSettle › treasury | prevents withdrawing funds backing active allocations | Withdrawal cannot spend reserves; available amount can be withdrawn | PASS |
| 8 | AmataSettle › signed delivery receipts | records a valid receipt and calculates 15 L × 500 RWF/L as 7,500 mRWF | EIP-712 receipt is accepted and event emitted | PASS |
| 9 | AmataSettle › signed delivery receipts | rejects callers that are not authorized stations | Unauthorized account cannot submit | PASS |
| 10 | AmataSettle › signed delivery receipts | rejects malformed or forged signatures | Invalid data and unauthorized signer are rejected | PASS |
| 11 | AmataSettle › signed delivery receipts | rejects a signature created for another chain domain | Signature for another chain is rejected | PASS |
| 12 | AmataSettle › signed delivery receipts | rejects replay of a delivery ID | Duplicate delivery ID is rejected | PASS |
| 13 | AmataSettle › signed delivery receipts | rejects a zero delivery ID | Invalid identifier is rejected | PASS |
| 14 | AmataSettle › signed delivery receipts | rejects zero quantity and zero price | Both invalid deliveries are rejected | PASS |
| 15 | AmataSettle › signed delivery receipts | rejects invalid grade, zero farmer, and future delivery time | Zero farmer, grade outside 1–5, and future time are rejected | PASS |
| 16 | AmataSettle › signed delivery receipts | rejects expired signatures and allocations exceeding available treasury | Both invalid submissions are rejected | PASS |
| 17 | AmataSettle › signed delivery receipts | accepts a signed offline receipt when it is synchronized before its deadline | Previously signed, unexpired receipt is accepted later | PASS |
| 18 | AmataSettle › farmer settlement and disputes | allows only the farmer to claim once | Correct farmer receives payment once | PASS |
| 19 | AmataSettle › farmer settlement and disputes | lets a farmer dispute an allocation and restores claimability when upheld | Dispute disables claim; resolver upholds and restores claimability | PASS |
| 20 | AmataSettle › farmer settlement and disputes | blocks claims while disputed and rejects disputes from another account | Wrong account and second claim are rejected | PASS |
| 21 | AmataSettle › farmer settlement and disputes | releases reserved funds when a dispute is rejected | Reserved liability is released; claim is blocked | PASS |
| 22 | AmataSettle › farmer settlement and disputes | rejects disputes outside the window, empty reasons, and repeated resolution | Wrong farmer, empty/late/oversized reason, and repeated resolution are rejected | PASS |
| 23 | AmataSettle › farmer settlement and disputes | rejects oversized dispute reasons | Reason exceeding length limit is rejected | PASS |
| 24 | AmataSettle › farmer settlement and disputes | preserves treasury invariants across claims and rejected disputes | Balance = available + reserved through claims/dispute resolution | PASS |
| 25 | AmataSettle › emergency pause | allows an authorized administrator to pause the contract | Admin can pause; paused state becomes true | PASS |
| 26 | AmataSettle › emergency pause | allows an authorized administrator to unpause the contract | Admin can unpause; paused state becomes false | PASS |
| 27 | AmataSettle › emergency pause | prevents an unauthorized user from pausing | Non-admin pause attempt reverts | PASS |
| 28 | AmataSettle › emergency pause | prevents an unauthorized user from unpausing | Non-admin unpause attempt reverts | PASS |
| 29 | AmataSettle › emergency pause | blocks delivery recording while paused | recordDelivery reverts when paused | PASS |
| 30 | AmataSettle › emergency pause | blocks farmer payment claims while paused | claimPayment reverts when paused | PASS |
| 31 | AmataSettle › emergency pause | blocks treasury deposits while paused | depositFunds reverts when paused | PASS |
| 32 | AmataSettle › emergency pause | blocks unallocated treasury withdrawals while paused | withdrawUnallocatedFunds reverts when paused | PASS |
| 33 | AmataSettle › emergency pause | allows farmers to raise disputes while paused | Dispute creation is not blocked by pause | PASS |
| 34 | AmataSettle › emergency pause | allows authorized resolvers to resolve disputes while paused | Dispute resolution is not blocked by pause | PASS |
| 35 | AmataSettle › emergency pause | allows administrators to authorize stations while paused | Station authorization is not blocked by pause | PASS |
| 36 | AmataSettle › emergency pause | allows administrators to revoke stations while paused | Station revocation is not blocked by pause | PASS |
| 37 | AmataSettle › emergency pause | resumes normal operations after unpausing | Delivery recording, claims, deposits, and withdrawals work after unpause | PASS |
| 38 | MockRWF | mints the six-decimal test token only through an authorized minter | Only a minter can mint; zero mint is rejected | PASS |

The test file groups related invalid-input cases in a single test where useful; the table lists them together accordingly. The local offline test simulates delay and later contract submission. It does not simulate browser shutdown, IndexedDB deletion, or a real network outage.

## Scope and gaps

- Frontend type-check and production bundle were built; no live MetaMask/Sepolia browser run has been evidenced.
- The test suite creates local signed EIP-712 data using Hardhat accounts.
- Local test assertions do not establish physical milk measurement accuracy.
- A Sepolia deployment exists (see `deployments/sepolia.json`) but genuine Sepolia interaction screenshots remain to be captured by the student.
