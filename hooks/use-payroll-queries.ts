import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getTotalInvoices, 
  getInvoices, 
  getXlmBalance, 
  getContractEvents, 
  prepareWriteTx, 
  submitAndTrackTx, 
  XLM_TOKEN_CONTRACT
} from "@/lib/stellar-contract";
import { signTx } from "@/lib/stellar-wallet";
import { usePayrollStore } from "./use-payroll-store";
import { rpc, nativeToScVal, Address, xdr } from "@stellar/stellar-sdk";

/**
 * Hook to query and sync user XLM balance.
 */
export function useXlmBalanceQuery(address: string | null) {
  const setBalance = usePayrollStore((s) => s.setBalance);
  return useQuery({
    queryKey: ["xlmBalance", address],
    queryFn: async () => {
      if (!address) return "0.0000000";
      const bal = await getXlmBalance(address);
      setBalance(bal);
      return bal;
    },
    enabled: !!address,
    refetchInterval: 10000, // Sync every 10 seconds
  });
}

/**
 * Hook to query and sync payroll invoices list.
 */
export function usePayrollsQuery(enabled: boolean) {
  const setPayrolls = usePayrollStore((s) => s.setPayrolls);
  return useQuery({
    queryKey: ["payrolls"],
    queryFn: async () => {
      const total = await getTotalInvoices();
      if (total === 0) {
        setPayrolls([]);
        return [];
      }
      const list = await getInvoices(1, total);
      setPayrolls(list);
      return list;
    },
    enabled,
    refetchInterval: 8000, // Sync list state automatically
  });
}

/**
 * Hook to query and sync contract events.
 */
export function useEventsQuery(enabled: boolean) {
  const setEvents = usePayrollStore((s) => s.setEvents);
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const list = await getContractEvents();
      setEvents(list);
      return list;
    },
    enabled,
    refetchInterval: 8000, // Event polling real-time strategy
  });
}

/**
 * Helper to wrap contract mutations with status tracking and signing.
 */
function useContractMutation(
  functionName: string,
  txTitle: string,
  argsBuilder: (params: any, callerAddress: string) => xdr.ScVal[]
) {
  const queryClient = useQueryClient();
  const address = usePayrollStore((s) => s.address);
  const addTransaction = usePayrollStore((s) => s.addTransaction);
  const updateTransactionStatus = usePayrollStore((s) => s.updateTransactionStatus);

  return useMutation({
    mutationFn: async (params: any) => {
      if (!address) {
        throw new Error("Wallet is not connected.");
      }

      // 1. Build ScVal args array
      const args = argsBuilder(params, address);

      // 2. Prepare XDR transaction envelope (calculates footprint & fee)
      const rawXdr = await prepareWriteTx(functionName, args, address);

      // 3. Request user signature via Wallet Kit
      const signedXdr = await signTx(rawXdr, address);

      // 4. Submit to RPC node
      const txHash = submitAndTrackTx(signedXdr);

      // 5. Track pending transaction
      // Wait for promise to resolve, but immediately push to history feed
      return txHash.then(
        async (hash) => {
          addTransaction(hash, txTitle);
          // Start tracing
          try {
            await submitAndTrackTx(signedXdr); // resolves when completed
            updateTransactionStatus(hash, "success");
            return hash;
          } catch (e) {
            updateTransactionStatus(hash, "failed");
            throw e;
          }
        }
      );
    },
    onSuccess: () => {
      // Invalidate queries to trigger instant update
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["xlmBalance", address] });
    },
  });
}

/**
 * Mutation to submit a new timesheet payroll claim (invoice creation).
 */
export function useCreateInvoiceMutation() {
  return useContractMutation(
    "create_invoice",
    "Submit Timesheet Claim",
    (params: { amount: number; title: string; description: string; isEscrow: boolean; payer: string }, caller) => {
      // Convert amount back to stroops (7 decimal places)
      const stroops = BigInt(Math.floor(params.amount * 10000000));
      return [
        nativeToScVal(new Address(caller.trim())), // payee
        nativeToScVal(new Address(params.payer.trim())), // payer
        nativeToScVal(stroops, { type: "i128" }), // amount
        nativeToScVal(new Address(XLM_TOKEN_CONTRACT.trim())), // token
        nativeToScVal(params.title), // title
        nativeToScVal(params.description), // description
        nativeToScVal(params.isEscrow), // is_escrow
      ];
    }
  );
}

/**
 * Mutation to pay/fund an employee's payroll.
 */
export function usePayInvoiceMutation() {
  return useContractMutation(
    "pay_invoice",
    "Fund Employee Payroll",
    (params: { invoiceId: number }, caller) => {
      return [
        xdr.ScVal.scvU64(new xdr.Uint64(params.invoiceId)),
        nativeToScVal(new Address(caller.trim())), // payer
      ];
    }
  );
}

/**
 * Mutation to approve and release escrowed salary.
 */
export function useReleaseEscrowMutation() {
  return useContractMutation(
    "release_escrow",
    "Release Escrow Salary",
    (params: { invoiceId: number }, caller) => {
      return [
        xdr.ScVal.scvU64(new xdr.Uint64(params.invoiceId)),
        nativeToScVal(new Address(caller.trim())), // caller
      ];
    }
  );
}

/**
 * Mutation to agree refunding escrow back to employer.
 */
export function useRefundEscrowMutation() {
  return useContractMutation(
    "refund_escrow",
    "Refund Escrow to Employer",
    (params: { invoiceId: number }, caller) => {
      return [
        xdr.ScVal.scvU64(new xdr.Uint64(params.invoiceId)),
        nativeToScVal(new Address(caller.trim())), // caller
      ];
    }
  );
}

/**
 * Mutation to cancel a pending claim.
 */
export function useCancelInvoiceMutation() {
  return useContractMutation(
    "cancel_invoice",
    "Cancel Timesheet Claim",
    (params: { invoiceId: number }, caller) => {
      return [
        xdr.ScVal.scvU64(new xdr.Uint64(params.invoiceId)),
        nativeToScVal(new Address(caller.trim())), // caller
      ];
    }
  );
}
