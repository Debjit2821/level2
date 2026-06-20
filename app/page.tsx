"use client";

import Link from "next/link";
import { 
  Shield, 
  Wallet, 
  Activity, 
  Zap, 
  ArrowRight, 
  Coins, 
  Clock, 
  Briefcase 
} from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui-components";
import { connectWallet, disconnectWallet } from "@/lib/stellar-wallet";
import { usePayrollStore } from "@/hooks/use-payroll-store";
import { formatAddress } from "@/lib/utils";
import config from "@/lib/config.json";

export default function Home() {
  const address = usePayrollStore((s) => s.address);
  const setAddress = usePayrollStore((s) => s.setAddress);
  const clearStore = usePayrollStore((s) => s.clearStore);
  const setConnecting = usePayrollStore((s) => s.setConnecting);
  const isConnecting = usePayrollStore((s) => s.isConnecting);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr);
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    clearStore();
  };

  return (
    <div className="relative min-h-screen bg-[#07080d] overflow-hidden flex flex-col font-sans">
      {/* Background Neon Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.05] bg-[#07080d]/65 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-indigo-500 animate-pulse" />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              StellarPay
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="https://developers.stellar.org/docs/build/smart-contracts/overview" 
              target="_blank"
              className="hidden sm:inline-block text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Soroban Docs
            </Link>
            
            {address ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground">Connected</span>
                  <span className="text-xs font-mono font-semibold text-cyan-400">{formatAddress(address)}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button size="sm" isLoading={isConnecting} onClick={handleConnect}>
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-12 md:py-24 flex flex-col md:grid md:grid-cols-12 gap-12 items-center">
        {/* Left Intro Text */}
        <div className="md:col-span-7 flex flex-col gap-6 text-center md:text-left">
          <div className="inline-flex self-center md:self-start items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/10 bg-indigo-500/5 text-xs font-semibold text-indigo-400">
            <Shield className="h-3.5 w-3.5" />
            Smart Contract Payroll Management (Stellar Level 2)
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight text-white">
            Decentralized Payroll for the{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Web3 Workspace
            </span>
          </h1>
          
          <p className="text-base md:text-lg text-muted-foreground max-w-xl">
            Streamline employee payments, deploy secure escrow-backed milestones, and log transparent payout event records in real-time. Built entirely on Stellar Soroban contracts.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center md:justify-start mt-2">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto font-semibold">
                Launch Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            
            {!address && (
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-muted-foreground" onClick={handleConnect}>
                Connect Stellar Wallet
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 max-w-md mx-auto md:mx-0 border-t border-white/[0.05]">
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Non-Custodial</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">&lt; 3s</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Block Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">10k+</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">TPS Cap</div>
            </div>
          </div>
        </div>

        {/* Right Preview Graphical Interface */}
        <div className="md:col-span-5 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur-3xl opacity-10 pointer-events-none" />
          
          <Card className="relative border-white/[0.08] bg-[#0c0d12]/75 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />
            
            <CardContent className="p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Stellar Node Health</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Testnet Online
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Deployed Contract ID</span>
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.05] text-xs font-mono font-semibold text-indigo-400 break-all select-all">
                  {config.contractId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <Briefcase className="h-4 w-4 text-indigo-400 mb-1" />
                  <span className="text-[10px] text-muted-foreground">Timesheet Claims</span>
                  <div className="text-lg font-bold text-white mt-0.5">Active</div>
                </div>
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <Clock className="h-4 w-4 text-cyan-400 mb-1" />
                  <span className="text-[10px] text-muted-foreground">Escrow Payouts</span>
                  <div className="text-lg font-bold text-white mt-0.5">Milestones</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs text-foreground font-semibold">Ledger Events</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">
                  Decoded Live
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Features Overview Grid */}
      <section className="bg-black/40 border-t border-white/[0.05] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Full-Featured Web3 Payout Suite</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Everything required to administer decentralized salary schedules and timesheet logs without third party intermediaries.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c0d12]/40 hover:bg-[#0c0d12]/60 hover:border-white/[0.08] transition-all flex flex-col gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
                <Shield className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="font-bold text-sm text-white">Secure Escrow Accounts</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hold salary in contract escrow, releasing funds only when specific project milestones are completed and validated.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c0d12]/40 hover:bg-[#0c0d12]/60 hover:border-white/[0.08] transition-all flex flex-col gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:scale-105 transition-transform">
                <Wallet className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="font-bold text-sm text-white">StellarWalletsKit</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect and transact seamlessly across multiple major wallet extensions, including Freighter, Albedo, and xBull.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c0d12]/40 hover:bg-[#0c0d12]/60 hover:border-white/[0.08] transition-all flex flex-col gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="font-bold text-sm text-white">Real-Time Event Stream</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Decoded contract event loops monitor payment transactions, claims, and releases automatically without page refreshing.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.05] bg-[#0c0d12]/40 hover:bg-[#0c0d12]/60 hover:border-white/[0.08] transition-all flex flex-col gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:scale-105 transition-transform">
                <Zap className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="font-bold text-sm text-white">Stellar Speed & Fees</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Leverage sub-second transaction completion speeds and fraction-of-a-cent fees to execute micro-transactions easily.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] bg-[#07080d] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>&copy; 2026 StellarPay DApp. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="https://stellar.org" target="_blank" className="hover:text-foreground transition-colors">
              Stellar Foundation
            </Link>
            <Link href="https://soroban.stellar.org" target="_blank" className="hover:text-foreground transition-colors">
              Soroban Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
