import { create } from "zustand";
import { Invoice, ActivityEvent, TxTracker } from "@/types/payroll";

interface PayrollState {
  address: string | null;
  balance: string;
  isConnecting: boolean;
  transactions: TxTracker[];
  events: ActivityEvent[];
  payrolls: Invoice[];
  
  // Actions
  setAddress: (address: string | null) => void;
  setBalance: (balance: string) => void;
  setConnecting: (val: boolean) => void;
  addTransaction: (hash: string, title: string) => void;
  updateTransactionStatus: (hash: string, status: TxTracker["status"]) => void;
  setEvents: (events: ActivityEvent[]) => void;
  setPayrolls: (payrolls: Invoice[]) => void;
  clearStore: () => void;
}

export const usePayrollStore = create<PayrollState>((set) => ({
  address: null,
  balance: "0.0000000",
  isConnecting: false,
  transactions: [],
  events: [],
  payrolls: [],

  setAddress: (address) => set({ address }),
  setBalance: (balance) => set({ balance }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  
  addTransaction: (hash, title) =>
    set((state) => ({
      transactions: [
        { hash, title, status: "pending", timestamp: Date.now() },
        ...state.transactions.slice(0, 19), // limit to last 20 transactions
      ],
    })),

  updateTransactionStatus: (hash, status) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.hash === hash ? { ...tx, status } : tx
      ),
    })),

  setEvents: (events) => set({ events }),
  setPayrolls: (payrolls) => set({ payrolls }),
  
  clearStore: () =>
    set({
      address: null,
      balance: "0.0000000",
      transactions: [],
      events: [],
      payrolls: [],
    }),
}));
