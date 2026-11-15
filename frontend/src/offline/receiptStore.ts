import { get, set } from "idb-keyval";

export type ReceiptStatus = "pending" | "failed" | "synchronized";

export interface QueuedReceipt {
  delivery: {
    deliveryId: string;
    farmer: string;
    quantityMilliLitres: string;
    pricePerLitre: string;
    qualityGrade: number;
    deliveredAt: string;
    deadline: string;
  };
  signature: string;
  status: ReceiptStatus;
  createdAt: string;
  transactionHash?: string;
  error?: string;
}

const STORE_KEY = "amatasettle-signed-receipts-v1";

export async function listReceipts(): Promise<QueuedReceipt[]> {
  return (await get<QueuedReceipt[]>(STORE_KEY)) ?? [];
}

export async function saveReceipt(receipt: QueuedReceipt): Promise<void> {
  const receipts = await listReceipts();
  const index = receipts.findIndex(
    (item) => item.delivery.deliveryId === receipt.delivery.deliveryId
  );
  if (index < 0) receipts.unshift(receipt);
  else receipts[index] = receipt;
  await set(STORE_KEY, receipts);
}

export async function updateReceipt(
  deliveryId: string,
  update: Partial<QueuedReceipt>
): Promise<void> {
  const receipts = await listReceipts();
  const index = receipts.findIndex((item) => item.delivery.deliveryId === deliveryId);
  if (index < 0) throw new Error("Receipt is missing from the local synchronization queue.");
  receipts[index] = { ...receipts[index], ...update };
  await set(STORE_KEY, receipts);
}
