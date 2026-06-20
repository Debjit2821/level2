# StellarPay - Decentralized Web3 Payroll & Escrow Milestones

StellarPay is a production-grade decentralized payroll management application built on Stellar Soroban smart contracts. It implements an end-to-end milestone settlement and timesheet payout system, ensuring secure, non-custodial transactions for Web3 organizations and their workforce.

## Overview
StellarPay adapts a decentralized payment manager contract to a payroll workflow. Employees submit detailed timesheet claims specifying their employer as the payer, payment amount, and milestone scope. Employers can then inspect these requests, and choose to settle them instantly (direct payout) or lock the funds securely in the contract (escrow payout). Escrowed salaries are held by the smart contract until milestones are satisfied and approved by the employer.

---

## Features

### 🔑 Wallet Integration
* **Multi-Wallet Support**: Full integration with `@creit.tech/stellar-wallets-kit`, enabling Freighter, Albedo, and xBull wallet selection.
* **Responsive Auth Modal**: Clean, interactive modal to connect, show public address, and view live XLM balance in real-time.
* **Friendly Error Messages**: Clear toast warnings for common faults (User rejected transaction, wallet extensions not found/installed, and insufficient account balance).

### 📝 Smart Contract Integration
* **Invoice State Reads**: Live queries for invoice records and cumulative counts on Stellar Testnet.
* **Secure Payout Writes**: Direct contract calls for claim creation, direct funding, escrow holding, escrow releases, refunds, and cancellations.
* **Simulate & Prepare**: Transaction builder automatically runs contract simulations to estimate gas fees and append footprint resources before requesting signatures.

### 📡 Real-Time Synchronizations & Events
* **Decoded Event Loops**: Periodically poll Stellar ledger logs via RPC and parse base64 XDR events into a readable stream.
* **Instant Feed**: Users see live updates (milestones created, funded, released, refunded) without refreshing the page.

### 📊 Payout Metrics & History Tracking
* **Metrics Cards**: Summarizes total paid out volume, escrow held volume, pending claims, and staff employee headcount.
* **Transaction Status Tracker**: Panel displays all signatures in progress (Pending, Success, Failed) alongside hashes and links to Stellar Expert Explorer.

---

## Tech Stack
* **Framework**: Next.js 15 (App Router, TypeScript)
* **Styling**: Tailwind CSS & Lucide Icons
* **Wallet Management**: StellarWalletsKit
* **Blockchain Core**: `@stellar/stellar-sdk` (Soroban RPC, Horizon, XDR parsers)
* **State Store**: Zustand
* **Async Queries**: TanStack Query (React Query)

---

## Folder Structure
```text
/app               # Next.js Pages and Workspace Dashboards
/components        # Theme Providers & Custom Styled UI Design Elements
/contracts         # PaymentManager Rust contract source files & tests
/hooks             # Zustand store states & TanStack Query mutations
/lib               # Configuration files, wallet kits, contract API clients
/scripts           # Automation deployment scripts
/types             # TypeScript type definitions
/public            # Static icons, SVG assets
```

---

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Deployed Contract ID on Stellar Testnet
NEXT_PUBLIC_CONTRACT_ID=CONTRACT_ADDRESS_HERE

# Stellar network configurations
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

For this project, the contract address is:
**CONTRACT_ADDRESS_HERE**: `CCLSPGZGNAPW7H7UPZETSVJ33XI3QYFRV2T2SJCQTK4655LEM3FFKZO7`

---

## Wallet Setup

1. Install a compatible Stellar browser extension:
   * [Freighter Wallet](https://www.freighter.app/)
   * [Albedo Link](https://albedo.link/)
   * [xBull Wallet](https://xbull.app/)
2. Switch your wallet network to **Testnet**.
3. Fund your account with Testnet XLM using the Stellar Friendbot on the [Stellar Laboratory](https://lab.stellar.org/#account-creator?network=testnet) or by clicking Connect inside the StellarPay app.

---

## Contract Deployment

The Soroban smart contract is written in Rust. To compile and deploy it yourself:

1. **Build the WASM Binary**:
   ```bash
   cd contracts/payment_manager
   stellar contract build
   ```
2. **Execute Deployment Script**:
   ```bash
   node scripts/deploy.js
   ```
   This script generates a deployer key pair on testnet, requests Friendbot funding, deploys the WASM to Testnet, and writes the resulting address to `.env.local` and `lib/config.json`.

---

## Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) on your browser.

---

## Deployment (Vercel)

Deploy this app to Vercel in seconds:

1. Push your code repository to GitHub/GitLab.
2. Link your repository inside the Vercel Dashboard.
3. Configure the environment variables (`NEXT_PUBLIC_CONTRACT_ID`, `NEXT_PUBLIC_STELLAR_NETWORK`, `NEXT_PUBLIC_SOROBAN_RPC_URL`).
4. Click **Deploy**.

---

## Example Transaction Hash

Recent contract deployment transaction on testnet:
**TRANSACTION_HASH_HERE**: `c4515e3bdc0897f21cc5dbec8c82cf0a936d4741cb74a8e158eb51b9fb00411a`
