<h1 align="center">StellarPay Dashboard</h1>

<p align="center">
  A polished Next.js frontend for a Soroban smart contract that lets organizations manage decentralized payroll, register timesheet claims, secure milestone payouts using escrow, and track real-time blockchain event streams.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-0b1220?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Next.js-15-0b1220?style=for-the-badge&logo=nextdotjs" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/Stellar-Soroban%20Testnet-0b1220?style=for-the-badge&logo=stellar" alt="Stellar Soroban Testnet" />
  <img src="https://img.shields.io/badge/StellarWalletsKit-v2-0b1220?style=for-the-badge" alt="StellarWalletsKit" />
</p>

## Live Demo & Explorer

- **Live Vercel Demo**: https://level2-lilac.vercel.app
- **Stellar Expert Explorer**: https://stellar.expert/explorer/testnet/contract/CCLSPGZGNAPW7H7UPZETSVJ33XI3QYFRV2T2SJCQTK4655LEM3FFKZO7
- **Contract ID**: `CCLSPGZGNAPW7H7UPZETSVJ33XI3QYFRV2T2SJCQTK4655LEM3FFKZO7`

## Freighter wallet address

- Freighter wallet ID: `GDT37UGSKAIKDUGC73VHAI6HASL27O5YTCHONKRIIH7AJBMBIQPWRVX3`

## Overview

This project combines:

- A Soroban smart contract (`PaymentManager`) for secure payment routing, claim registration, and escrow milestones
- A Next.js 15 dashboard for interacting with the contract
- StellarWalletsKit integration for authenticated write actions across multiple browsers and wallets
- Read-only contract calls for timesheet invoice lookups, activity event stream, and total invoices count

The current frontend is designed as a clean operator console with live status output, wallet visibility, escrow milestone summaries, and responsive cards for desktop and mobile.

## What You Can Do

- **Register a new Claim/Invoice**: Payees can create invoices detailing the payer address, payment amount, title, and description.
- **Pay directly (Instantly)**: Payers can directly settle a pending invoice, transferring XLM tokens instantly to the payee.
- **Fund Escrow (Milestone Lock)**: Payers can lock the funds in the smart contract escrow instead of paying directly, mapping the salary to milestone goals.
- **Release Escrow**: Payer can release locked escrow funds directly to the payee upon successful verification of milestones.
- **Refund/Cancel Claims**: Payees can cancel their pending invoices before funding. Payers can refund locked escrows back to their account under agreed cancellation conditions.
- **Inspect Live Event Stream**: Decodes event logs from the contract and updates the dashboard instantly.

## Smart Contract Behavior

The Soroban contract stores each invoice with:

- `id`
- `payee`
- `payer`
- `amount`
- `token`
- `status` (Pending, Paid, Released, Refunded, Cancelled)
- `is_escrow`
- `title`
- `description`
- `created_at`

Exposed contract methods:

- `create_invoice`
- `pay_invoice`
- `fund_escrow`
- `release_escrow`
- `refund_escrow`
- `cancel_invoice`
- `get_invoice`
- `get_invoices`
- `get_total_invoices`

## Frontend Highlights

- StellarWalletsKit connect flow supporting multiple wallets (Freighter, Albedo, xBull):

  ![Wallet Options](public/wallet-options.png)
- Live contract response panel displaying transaction hash, status, and Explorer link
- Human-readable timesheet summary formatting and transaction metrics
- Auto-sync of active payroll count on load and after execution
- Responsive dashboard layout with separate setup, action forms, wallet dashboard, and real-time logs panels

## Tech Stack

- React 19 / Next.js 15
- Tailwind CSS
- `@stellar/stellar-sdk`
- `@creit.tech/stellar-wallets-kit`
- Zustand State Management
- TanStack Query
- Soroban smart contract in Rust

## Project Structure

```text
.
|-- app/
|   |-- dashboard/
|   |   `-- page.tsx
|   |-- layout.tsx
|   |-- page.tsx
|   `-- globals.css
|-- components/
|   |-- ui-components.tsx
|   |-- providers.tsx
|   `-- theme-provider.tsx
|-- contracts/
|   |-- payment_manager/
|   |   |-- src/
|   |   |   `-- lib.rs
|   |   `-- Cargo.toml
|-- hooks/
|   |-- use-payroll-store.ts
|   `-- use-payroll-queries.ts
|-- lib/
|   |-- config.json
|   |-- stellar-contract.ts
|   |-- stellar-wallet.ts
|   `-- utils.ts
|-- scripts/
|   `-- deploy.js
|-- types/
|   `-- payroll.ts
|-- README.md
`-- package.json
```

## Local Setup

### Prerequisites

- Node.js installed
- npm installed
- Freighter or other compatible Stellar wallet extension
- Access to Stellar Soroban testnet

### Install

```bash
npm install
```

### Run The App

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_CONTRACT_ID=CCLSPGZGNAPW7H7UPZETSVJ33XI3QYFRV2T2SJCQTK4655LEM3FFKZO7
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## How The App Talks To Stellar

Write actions are simulated and then signed using StellarWalletsKit:

- `create_invoice`
- `pay_invoice`
- `fund_escrow`
- `release_escrow`
- `refund_escrow`
- `cancel_invoice`

Read actions are simulated directly against the configured Soroban RPC endpoint:

- `get_invoice`
- `get_invoices`
- `get_total_invoices`

Configuration currently lives in [`lib/config.json`](./lib/config.json) and [`lib/stellar-contract.ts`](./lib/stellar-contract.ts).

## User Flow

1. Connect a wallet using StellarWalletsKit.
2. Underfunded accounts can fund via Friendbot if connected.
3. Employee/Payee creates a Timesheet Claim specifying the Employer/Payer address, amount, title, and description.
4. Employer connects wallet, views Pending claims, and chooses to either Pay directly or Lock in Escrow.
5. Payer releases the escrow to the Payee when milestones are completed.
6. The activity feed polls ledger logs to display the real-time event updates.
