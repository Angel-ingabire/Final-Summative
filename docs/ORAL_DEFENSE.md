# Oral defense guide

## Short project summary

AmataSettle is an Ethereum-based prototype for dairy delivery settlements. An authorized collection station signs typed receipt data. The contract verifies the signature and treasury balance, records a payment obligation in a six-decimal test token, and reserves funds until the farmer claims or a dispute resolver rejects the obligation. A browser IndexedDB queue lets a station preserve signed receipts when offline and retry the same receipt later.

## Likely questions

**Why use blockchain instead of a normal database?**  
The prototype targets shared, verifiable settlement records across participants. A permissioned station signature and public contract state let participants independently verify authorization and payment state. A conventional database may be cheaper and more private; blockchain is justified only when independent shared verification is valuable.

**What does EIP-712 add?**  
It gives the signed receipt a structured typed-data representation and domain separation by application name, version, chain ID, and contract address. This helps users inspect what is being signed and prevents signatures from being reused unchanged on a different deployment or chain.

**Does the signature prove the milk quantity or quality?**  
No. It proves that the station's authorized key signed those fields and that the fields were not modified. Physical measurement, calibration, staff procedures, and disputes remain off-chain trust problems.

**How is the payment calculated?**  
Quantity is millilitres and price is whole simulated RWF per litre. The contract floors `quantityMilliLitres × pricePerLitre / 1000` to whole RWF, then multiplies by `10^6` for token base units. For 15,000 mL at 500 RWF/L, that is 7,500 RWF or 7,500,000,000 base units.

**How are reserved funds protected?**  
`reservedFunds` tracks unpaid allocations, including disputed payments. Available funds equal the contract's token balance minus reserves. Claims decrease the token balance and reserve together; rejected disputes decrease the reserve; withdrawals cannot exceed the available amount.

**What happens if connectivity is lost?**  
The browser stores the original typed data and station signature in IndexedDB, preserving its delivery ID. After reconnecting, it submits that same data and waits for confirmation. A browser-local queue is not a shared backup and can be lost when browser data is removed.

**Who can resolve disputes?**  
Only accounts with `RESOLVER_ROLE`. That role is trusted in this prototype; production governance should consider multisignature administration, transparent policies, review evidence, and role rotation.

**Is mRWF a real stablecoin?**  
No. It is an admin-mintable test ERC-20 and is not backed, redeemable, or pegged to Rwandan francs.

**Has it been deployed to Sepolia?**  
Not yet. The local contracts, tests, and deployment scripts are implemented. The student must supply a private RPC endpoint and funded testnet wallet, deploy, and record genuine explorer evidence. No address or hash in the local demo should be described as a Sepolia result.

## Limitations worth mentioning

This is an academic prototype, not a production payment service. It does not solve key custody, identity, physical measurement verification, privacy, user support, liquidity, legal compliance, or governance. A production system would need an independent security audit, policy and privacy review, usability studies, operational monitoring, recovery procedures, and clearly defined legal arrangements.
