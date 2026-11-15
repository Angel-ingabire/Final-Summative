export const settlementAbi = [
  "function STATION_ROLE() view returns (bytes32)",
  "function RESOLVER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function authorizeStation(address station)",
  "function revokeStation(address station)",
  "function getTreasuryBalance() view returns (uint256)",
  "function getAvailableTreasury() view returns (uint256)",
  "function getReservedFunds() view returns (uint256)",
  "function totalDeposited() view returns (uint256)",
  "function totalSettlements() view returns (uint256)",
  "function depositFunds(uint256 amount)",
  "function withdrawUnallocatedFunds(address recipient,uint256 amount)",
  "function recordDelivery((bytes32 deliveryId,address farmer,uint256 quantityMilliLitres,uint256 pricePerLitre,uint8 qualityGrade,uint64 deliveredAt,uint256 deadline) delivery,bytes signature)",
  "function getFarmerDeliveries(address farmer) view returns (bytes32[])",
  "function getDeliveryDetails(bytes32 deliveryId) view returns ((bytes32 deliveryId,address farmer,uint256 quantityMilliLitres,uint256 pricePerLitre,uint8 qualityGrade,uint64 deliveredAt,uint256 deadline) delivery,uint256 payment,uint8 status,address signer,uint64 recordedAt)",
  "function getClaimableAmount(address farmer) view returns (uint256)",
  "function claimPayment(bytes32 deliveryId)",
  "function raiseDispute(bytes32 deliveryId,string reason)",
  "function resolveDispute(bytes32 deliveryId,bool upholdPayment)",
  "function pause()",
  "function unpause()",
  "function paused() view returns (bool)"
] as const;

export const tokenAbi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function mint(address account,uint256 amount)"
] as const;

export const deliveryTypes = {
  Delivery: [
    { name: "deliveryId", type: "bytes32" },
    { name: "farmer", type: "address" },
    { name: "quantityMilliLitres", type: "uint256" },
    { name: "pricePerLitre", type: "uint256" },
    { name: "qualityGrade", type: "uint8" },
    { name: "deliveredAt", type: "uint64" },
    { name: "deadline", type: "uint256" }
  ]
};
