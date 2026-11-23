# Security notes

## Implemented controls

- Role separation for default administration, delivery stations, and dispute resolvers.
- Emergency pause mechanism: only `DEFAULT_ADMIN_ROLE` may call `pause()` or `unpause()`. While paused, deposits, withdrawals, delivery recording, and farmer payment claims are blocked; dispute creation, dispute resolution, and role management remain available.
- Station signatures use EIP-712 domain separation (contract name, version, chain ID, and verifying contract) and OpenZeppelin ECDSA recovery.
- A station must be authorized and the submitting account must match the recovered station signer.
- Unique delivery IDs, signature deadlines, strict input validation, and explicit status checks prevent replay and invalid transitions.
- Settlement uses SafeERC20, checks the amount received on deposit, and protects token-moving entry points with ReentrancyGuard.
- Allocated and disputed funds remain reserved; only the farmer can claim, and only a resolver can decide a dispute.
- Admin withdrawals cannot consume reserved liabilities.

## Important limitations

- The test asset is not RWF, a stablecoin, or redeemable money.
- EIP-712 cannot verify physical measurements or quality assessments.
- A compromised or unavailable station signing key can falsify or interrupt receipt issuance.
- The dispute resolver and administrator are trusted roles; production governance should consider a multisig, timelocks, audited policies, and key rotation.
- The offline queue is local to one browser profile and can be lost when browser data is removed. It should not be treated as an archival system.
- No production audit, oracle, identity proof, privacy-preserving analytics, or mainnet deployment is included.

Never put private keys, seed phrases, RPC secrets, or API keys in frontend code, screenshots, Git history, or shared documents. MetaMask should manage user keys; deployment secrets belong in a local ignored `.env` or a managed secret store.
