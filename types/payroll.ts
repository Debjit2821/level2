export interface Invoice {
  id: number;
  payee: string;
  payer: string;
  amount: number;
  token: string;
  status: "Pending" | "Paid" | "Released" | "Refunded" | "Cancelled";
  isEscrow: boolean;
  title: string;
  description: string;
  createdAt: number;
}

export interface ActivityEvent {
  id: string;
  type: "invoice_created" | "invoice_paid" | "escrow_released" | "escrow_refunded" | "invoice_cancelled" | "unknown";
  invoiceId: number;
  actor: string;
  amount: number;
  timestamp: number;
}

export interface TxTracker {
  hash: string;
  title: string;
  status: "pending" | "success" | "failed";
  timestamp: number;
}
