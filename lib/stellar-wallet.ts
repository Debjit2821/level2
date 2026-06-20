import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";

let isInitialized = false;

export function getWalletKit(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!isInitialized) {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: defaultModules(),
    });
    isInitialized = true;
  }
}

/**
 * Custom error class to represent friendly wallet-related errors.
 */
export class WalletError extends Error {
  constructor(public code: "NOT_FOUND" | "REJECTED" | "INSUFFICIENT_BALANCE" | "UNKNOWN", message: string) {
    super(message);
    this.name = "WalletError";
  }
}

/**
 * Helper to parse typical Stellar wallet errors into user-friendly messages.
 */
export function parseWalletError(error: any): WalletError {
  console.error("Original wallet error details:", error);
  const errMsg = error?.message || error?.toString() || "";

  if (
    errMsg.toLowerCase().includes("reject") || 
    errMsg.toLowerCase().includes("cancel") ||
    errMsg.toLowerCase().includes("declined") ||
    error === "blocked"
  ) {
    return new WalletError("REJECTED", "Transaction was rejected by the user.");
  }

  if (
    errMsg.toLowerCase().includes("install") || 
    errMsg.toLowerCase().includes("not found") || 
    errMsg.toLowerCase().includes("not installed")
  ) {
    return new WalletError("NOT_FOUND", "The selected wallet extension was not found or is not installed.");
  }

  if (
    errMsg.toLowerCase().includes("insufficient") || 
    errMsg.toLowerCase().includes("balance") || 
    errMsg.toLowerCase().includes("underfunded")
  ) {
    return new WalletError("INSUFFICIENT_BALANCE", "Insufficient balance to cover the transaction amount or gas fees.");
  }

  return new WalletError("UNKNOWN", errMsg || "An unexpected error occurred during the wallet operation.");
}

/**
 * Connect the user's wallet. Opens the wallet selection modal.
 * Returns the public address of the connected account.
 */
export async function connectWallet(): Promise<string> {
  getWalletKit();
  try {
    const { address } = await StellarWalletsKit.authModal();
    if (!address) {
      throw new Error("No address returned from wallet connection.");
    }
    return address;
  } catch (error) {
    throw parseWalletError(error);
  }
}

/**
 * Disconnect the current wallet session.
 */
export async function disconnectWallet(): Promise<void> {
  getWalletKit();
  try {
    await StellarWalletsKit.disconnect();
  } catch (error) {
    console.error("Disconnect error:", error);
  }
}

/**
 * Sign a transaction XDR with the connected wallet.
 * Returns the signed transaction XDR.
 */
export async function signTx(xdr: string, address: string): Promise<string> {
  getWalletKit();
  try {
    const result = await StellarWalletsKit.signTransaction(xdr, {
      address,
      networkPassphrase: "Test Stellar Public Network ; September 2015", // Testnet passphrase
    });
    return result.signedTxXdr;
  } catch (error) {
    throw parseWalletError(error);
  }
}
