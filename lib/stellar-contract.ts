import {
  rpc,
  Horizon,
  TransactionBuilder,
  Account,
  Operation,
  Networks,
  Address,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import config from "./config.json";

// Native XLM Token Contract Address on Stellar Testnet
export const XLM_TOKEN_CONTRACT = "CACUJUEJWSNL544KHIGNSVBPRR33ZY3RGMRQHIMAK3VBFSTDPLYAC3T7";

// Initialize RPC server
export const server = new rpc.Server(config.rpcUrl, {
  allowHttp: config.network === "local" || config.network === "standalone",
});

// Initialize Horizon server (for asset balance loading)
export const horizon = new Horizon.Server(
  config.network === "testnet"
    ? "https://horizon-testnet.stellar.org"
    : "https://horizon.stellar.org"
);

import { Invoice, ActivityEvent } from "@/types/payroll";

const statusMap: Record<number, Invoice["status"]> = {
  0: "Pending",
  1: "Paid",
  2: "Released",
  3: "Refunded",
  4: "Cancelled",
};

/**
 * Fetch native XLM balance of an account in Stellar Testnet.
 */
export async function getXlmBalance(address: string): Promise<string> {
  try {
    const account = await horizon.loadAccount(address);
    const balance = account.balances.find((b) => b.asset_type === "native");
    return balance ? balance.balance : "0.0000000";
  } catch (error) {
    console.error("Failed to load XLM balance:", error);
    return "0.0000000";
  }
}

/**
 * Parses raw contract invoice structure into a JS object.
 */
function parseInvoice(invoiceNative: any): Invoice {
  return {
    id: Number(invoiceNative.id),
    payee: invoiceNative.payee,
    payer: invoiceNative.payer,
    amount: Number(invoiceNative.amount) / 10000000, // convert stroops back to standard decimals (7 decimal places)
    token: invoiceNative.token,
    status: statusMap[invoiceNative.status] || "Pending",
    isEscrow: invoiceNative.is_escrow,
    title: invoiceNative.title,
    description: invoiceNative.description,
    createdAt: Number(invoiceNative.created_at),
  };
}

/**
 * Read the total count of invoices created.
 */
export async function getTotalInvoices(): Promise<number> {
  try {
    const dummySource = new Account("GCNF6QIYA6N3RWEQVON7Q4ECM6G652SB7Z7ES4REDWADGJNEDW4WQJBD", "0");
    const tx = new TransactionBuilder(dummySource, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: config.contractId,
          function: "get_total_invoices",
          args: [],
        })
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      const native = scValToNative(sim.result.retval);
      return Number(native);
    }
    return 0;
  } catch (e) {
    console.error("Error fetching total invoices count:", e);
    return 0;
  }
}

/**
 * Fetch invoices in index range.
 */
export async function getInvoices(fromId: number, toId: number): Promise<Invoice[]> {
  if (toId < fromId) return [];
  try {
    const dummySource = new Account("GCNF6QIYA6N3RWEQVON7Q4ECM6G652SB7Z7ES4REDWADGJNEDW4WQJBD", "0");
    const tx = new TransactionBuilder(dummySource, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: config.contractId,
          function: "get_invoices",
          args: [
            xdr.ScVal.scvU64(new xdr.Uint64(fromId)),
            xdr.ScVal.scvU64(new xdr.Uint64(toId)),
          ],
        })
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      const nativeArr = scValToNative(sim.result.retval);
      if (Array.isArray(nativeArr)) {
        return nativeArr.map(parseInvoice).reverse(); // Return newer first
      }
    }
    return [];
  } catch (e) {
    console.error("Error fetching invoices:", e);
    return [];
  }
}

/**
 * Fetch a single invoice by ID.
 */
export async function getInvoice(id: number): Promise<Invoice | null> {
  try {
    const dummySource = new Account("GCNF6QIYA6N3RWEQVON7Q4ECM6G652SB7Z7ES4REDWADGJNEDW4WQJBD", "0");
    const tx = new TransactionBuilder(dummySource, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: config.contractId,
          function: "get_invoice",
          args: [xdr.ScVal.scvU64(new xdr.Uint64(id))],
        })
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      const native = scValToNative(sim.result.retval);
      return native ? parseInvoice(native) : null;
    }
    return null;
  } catch (e) {
    console.error(`Error fetching invoice ${id}:`, e);
    return null;
  }
}

/**
 * Prepare a write transaction. Fetches current account sequence and prepares footprint/fees via simulation.
 */
export async function prepareWriteTx(
  functionName: string,
  args: xdr.ScVal[],
  sourceAddress: string
): Promise<string> {
  // 1. Fetch current sequence number of the signing account
  const sourceAccount = await server.getAccount(sourceAddress);

  // 2. Build standard contract invocation transaction
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100", // Will be overridden/padded by prepareTransaction
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: config.contractId,
        function: functionName,
        args,
      })
    )
    .setTimeout(30)
    .build();

  // 3. Prepare transaction (simulate and append footprint, disk resource, storage fee & CPU fee)
  const preparedTx = await server.prepareTransaction(tx);
  
  // 4. Return transaction envelope XDR string to be signed by the wallet
  return preparedTx.toXDR();
}

/**
 * Submit signed transaction XDR and poll for its status.
 */
export async function submitAndTrackTx(signedTxXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${response.errorResult || "Unknown submission error"}`
    );
  }

  // Poll for completion
  const hash = response.hash;
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    const statusRes = await server.getTransaction(hash);
    if (statusRes.status === "SUCCESS") {
      return hash;
    }
    if (statusRes.status === "FAILED") {
      throw new Error(`Transaction failed: ${statusRes.resultXdr || "Execution failed on-chain"}`);
    }
    // Wait 1.5 seconds before polling again
    await new Promise((r) => setTimeout(r, 1500));
    attempts++;
  }

  throw new Error(`Transaction pending status timeout. Hash: ${hash}`);
}

/**
 * Fetch and decode activity events directly from contract logs.
 */
export async function getContractEvents(): Promise<ActivityEvent[]> {
  try {
    const latestLedgerRes = await server.getLatestLedger();
    const startLedger = latestLedgerRes.sequence - 1500; // Look back last ~2 hours

    const res = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [config.contractId],
        },
      ],
      limit: 100,
    });

    const parsedEvents: ActivityEvent[] = [];

    for (const rawEv of res.events) {
      try {
        const topics = rawEv.topic.map((t) => scValToNative(t));
        const value = scValToNative(rawEv.value);

        const eventTypeSymbol = topics[0];
        const invoiceId = Number(topics[1]);
        const actor = topics[2]; // address of payee, payer, etc.
        const amount = Number(value) / 10000000; // convert back to standard decimal

        let type: ActivityEvent["type"] = "unknown";
        if (eventTypeSymbol === "invoice_created") type = "invoice_created";
        else if (eventTypeSymbol === "invoice_paid") type = "invoice_paid";
        else if (eventTypeSymbol === "escrow_released") type = "escrow_released";
        else if (eventTypeSymbol === "escrow_refunded") type = "escrow_refunded";
        else if (eventTypeSymbol === "invoice_cancelled") type = "invoice_cancelled";

        parsedEvents.push({
          id: rawEv.id,
          type,
          invoiceId,
          actor,
          amount,
          timestamp: Math.floor(new Date(rawEv.ledgerClosedAt).getTime() / 1000),
        });
      } catch (err) {
        // Skip malformed events
        console.warn("Error parsing individual event:", err);
      }
    }

    // Sort by timestamp descending
    return parsedEvents.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}
