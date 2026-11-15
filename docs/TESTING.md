# Validation and test cases

## Executed checks

The actual validation run completed with **25 passing Hardhat tests** on the local Hardhat network and a successful production frontend build (`tsc -b && vite build`). The tests are not Sepolia transactions. No Sepolia deployment was performed.

Run:

```powershell
npm test
npm run build:web
npm run demo:local
```

The Mocha test output is the source of the pass count. Test descriptions and expected/actual results:

| # | Test case | Expected result | Actual result |
|---|---|---|---|
| 1 | Deploy token and settlement contracts | Both deploy; token metadata and reference are correct | PASS |
| 2 | Authorize a collection station | Admin authorization event is emitted | PASS |
| 3 | Reject unauthorized role changes | Non-admin cannot authorize a station | PASS |
| 4 | Revoke station permission | Revoked station cannot submit receipts | PASS |
| 5 | Restrict token minting | Only a minter can mint; zero mint is rejected | PASS |
| 6 | Deposit cooperative funds | Deposit total and token balance match | PASS |
| 7 | Reject zero deposit | Transaction reverts | PASS |
| 8 | Preserve reserved funds on withdrawal | Withdrawal cannot spend reserves; available amount can be withdrawn | PASS |
| 9 | Record signed 15 L receipt | EIP-712 receipt is accepted and event emitted | PASS |
| 10 | Verify payment calculation | 15,000 mL × 500 / 1,000 = 7,500 RWF, scaled to 6 decimals | PASS |
| 11 | Reject non-station caller | Unauthorized account cannot submit | PASS |
| 12 | Reject malformed or forged signature | Invalid data and unauthorized signer are rejected | PASS |
| 13 | Reject wrong EIP-712 chain domain | Signature for another chain is rejected | PASS |
| 14 | Prevent replay | Duplicate delivery ID is rejected | PASS |
| 15 | Reject zero delivery ID | Invalid identifier is rejected | PASS |
| 16 | Reject zero quantity and zero price | Both invalid deliveries are rejected | PASS |
| 17 | Validate farmer, grade, and timestamp | Zero farmer, grade outside 1–5, and future time are rejected | PASS |
| 18 | Reject expired signature and underfunded allocation | Both invalid submissions are rejected | PASS |
| 19 | Submit offline-created receipt after reconnection | Previously signed, unexpired receipt is accepted later | PASS |
| 20 | Farmer claims payment | Correct farmer receives payment once | PASS |
| 21 | Prevent unauthorized and duplicate claims | Wrong account and second claim are rejected | PASS |
| 22 | Raise and uphold a dispute | Dispute disables claim; resolver upholds and restores claimability | PASS |
| 23 | Reject payment after a dispute | Reserved liability is released; claim is blocked | PASS |
| 24 | Enforce dispute rules | Wrong farmer, empty/late/oversized reason, and repeated resolution are rejected | PASS |
| 25 | Check accounting invariants after activity | Balance = available + reserved through claims/dispute resolution | PASS |

The test file groups related invalid-input cases in a single test where useful; the table lists them together accordingly. The local offline test simulates delay and later contract submission. It does not simulate browser shutdown, IndexedDB deletion, or a real network outage.

## Scope and gaps

- Frontend type-check and production bundle were built; no live MetaMask/Sepolia browser run has been evidenced.
- The test suite creates local signed EIP-712 data using Hardhat accounts.
- Local test assertions do not establish physical milk measurement accuracy.
- A Sepolia deployment and genuine screenshots remain to be completed by the student.
