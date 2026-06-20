"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Coins, 
  Wallet, 
  ArrowLeft, 
  Plus, 
  Briefcase, 
  User, 
  Activity, 
  Clock, 
  History, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  DollarSign,
  Users,
  ShieldCheck,
  ClipboardList
} from "lucide-react";
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Input, 
  Textarea, 
  Badge, 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent, 
  Dialog, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  Skeleton,
  useToast
} from "@/components/ui-components";
import { usePayrollStore } from "@/hooks/use-payroll-store";
import { Invoice, TxTracker } from "@/types/payroll";
import { 
  usePayrollsQuery, 
  useEventsQuery, 
  useXlmBalanceQuery,
  useCreateInvoiceMutation,
  usePayInvoiceMutation,
  useReleaseEscrowMutation,
  useRefundEscrowMutation,
  useCancelInvoiceMutation
} from "@/hooks/use-payroll-queries";
import { connectWallet, disconnectWallet } from "@/lib/stellar-wallet";
import { formatAddress, formatAmount, formatTimestamp } from "@/lib/utils";

export default function Dashboard() {
  const { toast } = useToast();
  
  // Zustand State
  const address = usePayrollStore((s) => s.address);
  const balance = usePayrollStore((s) => s.balance);
  const setAddress = usePayrollStore((s) => s.setAddress);
  const clearStore = usePayrollStore((s) => s.clearStore);
  const setConnecting = usePayrollStore((s) => s.setConnecting);
  const isConnecting = usePayrollStore((s) => s.isConnecting);
  const transactions = usePayrollStore((s) => s.transactions);
  const events = usePayrollStore((s) => s.events);
  const payrolls = usePayrollStore((s) => s.payrolls);

  // Queries (Enabled only when wallet is connected)
  const isConnected = !!address;
  useXlmBalanceQuery(address);
  const { isLoading: isPayrollsLoading, refetch: refetchPayrolls } = usePayrollsQuery(isConnected);
  const { isLoading: isEventsLoading } = useEventsQuery(isConnected);

  // Mutations
  const createInvoiceMutation = useCreateInvoiceMutation();
  const payInvoiceMutation = usePayInvoiceMutation();
  const releaseEscrowMutation = useReleaseEscrowMutation();
  const refundEscrowMutation = useRefundEscrowMutation();
  const cancelInvoiceMutation = useCancelInvoiceMutation();

  // Component UI State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimPayer, setClaimPayer] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimTitle, setClaimTitle] = useState("");
  const [claimDesc, setClaimDesc] = useState("");
  const [claimEscrow, setClaimEscrow] = useState(false);

  // Dashboard Stats Calculations
  const employerWorkspace = payrolls.filter((p) => p.payer === address);
  const employeeWorkspace = payrolls.filter((p) => p.payee === address);

  const totalPaid = payrolls
    .filter((p) => p.status === "Released" && (p.payer === address || p.payee === address))
    .reduce((sum, p) => sum + p.amount, 0);

  const escrowHeld = payrolls
    .filter((p) => p.status === "Paid" && p.isEscrow && (p.payer === address || p.payee === address))
    .reduce((sum, p) => sum + p.amount, 0);

  const activeClaims = payrolls.filter(
    (p) => p.status === "Pending" && (p.payer === address || p.payee === address)
  ).length;

  const activeEmployees = new Set(
    payrolls.filter((p) => p.payer === address).map((p) => p.payee)
  ).size;

  // Handle Wallet Connection
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      toast("success", "Wallet Connected", `Successfully connected to Stellar account ${formatAddress(addr)}`);
    } catch (e: any) {
      toast("error", "Connection Failed", e.message || "Failed to establish wallet connection.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    clearStore();
    toast("info", "Wallet Disconnected", "Your session has been terminated.");
  };

  // Submit Claim (Employee)
  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimPayer || !claimAmount || !claimTitle || !claimDesc) {
      toast("warning", "Missing Fields", "Please complete all form fields.");
      return;
    }
    const amt = parseFloat(claimAmount);
    if (isNaN(amt) || amt <= 0) {
      toast("warning", "Invalid Amount", "Claim amount must be a positive number.");
      return;
    }

    try {
      setIsClaimModalOpen(false);
      
      const txPromise = createInvoiceMutation.mutateAsync({
        payer: claimPayer,
        amount: amt,
        title: claimTitle,
        description: claimDesc,
        isEscrow: claimEscrow,
      });

      toast("info", "Signing Transaction", "Please approve the transaction in your wallet.");
      const hash = await txPromise;
      toast("success", "Claim Submitted", `Timesheet claim successfully submitted. Tx: ${formatAddress(hash)}`);
      
      // Reset form
      setClaimPayer("");
      setClaimAmount("");
      setClaimTitle("");
      setClaimDesc("");
      setClaimEscrow(false);
    } catch (err: any) {
      toast("error", "Submission Failed", err.message || "Failed to create payroll claim.");
    }
  };

  // Fund Payroll (Employer)
  const handleFundPayroll = async (invoiceId: number, title: string) => {
    try {
      const txPromise = payInvoiceMutation.mutateAsync({ invoiceId });
      toast("info", "Signing Transaction", `Approving wallet signatures to fund "${title}"`);
      const hash = await txPromise;
      toast("success", "Payroll Funded", `Successfully funded payroll. Tx: ${formatAddress(hash)}`);
    } catch (err: any) {
      toast("error", "Funding Failed", err.message || "Failed to fund employee payroll.");
    }
  };

  // Release Escrow (Employer)
  const handleReleaseEscrow = async (invoiceId: number, title: string) => {
    try {
      const txPromise = releaseEscrowMutation.mutateAsync({ invoiceId });
      toast("info", "Signing Transaction", `Approving release from contract escrow for "${title}"`);
      const hash = await txPromise;
      toast("success", "Escrow Released", `Escrowed funds successfully transferred to employee. Tx: ${formatAddress(hash)}`);
    } catch (err: any) {
      toast("error", "Release Failed", err.message || "Failed to release escrowed funds.");
    }
  };

  // Refund Escrow (Employee)
  const handleRefundEscrow = async (invoiceId: number, title: string) => {
    try {
      const txPromise = refundEscrowMutation.mutateAsync({ invoiceId });
      toast("info", "Signing Transaction", `Approving refund back to employer for "${title}"`);
      const hash = await txPromise;
      toast("success", "Refund Completed", `Funds successfully returned to employer. Tx: ${formatAddress(hash)}`);
    } catch (err: any) {
      toast("error", "Refund Failed", err.message || "Failed to refund escrowed funds.");
    }
  };

  // Cancel Invoice Claim (Employee)
  const handleCancelClaim = async (invoiceId: number, title: string) => {
    try {
      const txPromise = cancelInvoiceMutation.mutateAsync({ invoiceId });
      toast("info", "Signing Transaction", `Cancelling timesheet claim for "${title}"`);
      const hash = await txPromise;
      toast("success", "Claim Cancelled", `Claim successfully cancelled. Tx: ${formatAddress(hash)}`);
    } catch (err: any) {
      toast("error", "Cancellation Failed", err.message || "Failed to cancel claim.");
    }
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    const badges = {
      Pending: <Badge variant="warning">Pending</Badge>,
      Paid: <Badge variant="info">Paid (Escrow)</Badge>,
      Released: <Badge variant="success">Released</Badge>,
      Refunded: <Badge variant="error">Refunded</Badge>,
      Cancelled: <Badge variant="secondary">Cancelled</Badge>,
    };
    return badges[status] || <Badge>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-foreground flex flex-col font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-indigo-900/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-cyan-900/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.05] bg-[#07080d]/65 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-indigo-500" />
              <span className="font-bold text-base bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                StellarPay Workspace
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full hidden sm:inline-block">
              Stellar Testnet
            </span>
          </div>

          <div className="flex items-center gap-4">
            {address ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Connected Account</span>
                  <span className="text-xs font-mono font-bold text-white">{formatAddress(address)}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-mono font-bold text-cyan-400">{formatAmount(balance)} XLM</span>
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

      {/* Main Workspace */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Unconnected Screen state */}
        {!address ? (
          <div className="flex-grow flex items-center justify-center py-20">
            <Card className="max-w-md w-full border-white/[0.08] p-8 text-center flex flex-col gap-6">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/25">
                <Wallet className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle className="text-xl">Authentication Required</CardTitle>
                <CardDescription className="text-sm">
                  Connect your Stellar wallet (Freighter, Albedo, or xBull) to enter your payroll dashboard, view claims, and sign transactions.
                </CardDescription>
              </div>
              <Button size="lg" className="w-full font-semibold" isLoading={isConnecting} onClick={handleConnect}>
                Connect Stellar Wallet
              </Button>
            </Card>
          </div>
        ) : (
          <>
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Paid Out</span>
                    <div className="text-xl font-bold text-white mt-0.5">{formatAmount(totalPaid)} XLM</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Locked in Escrow</span>
                    <div className="text-xl font-bold text-white mt-0.5">{formatAmount(escrowHeld)} XLM</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Claims</span>
                    <div className="text-xl font-bold text-white mt-0.5">{activeClaims}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">My Employees</span>
                    <div className="text-xl font-bold text-white mt-0.5">{activeEmployees}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard Tabs & Workspace Tables */}
            <div className="grid md:grid-cols-12 gap-8 items-start">
              
              {/* Left Column - Main workspaces tabs */}
              <div className="md:col-span-8 flex flex-col gap-6">
                <Tabs defaultValue="employer">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <TabsList>
                      <TabsTrigger value="employer">
                        <Briefcase className="h-4 w-4 mr-2" />
                        Employer Workspace
                      </TabsTrigger>
                      <TabsTrigger value="employee">
                        <User className="h-4 w-4 mr-2" />
                        Employee Workspace
                      </TabsTrigger>
                    </TabsList>

                    <Button size="sm" onClick={() => setIsClaimModalOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Submit Timesheet Claim
                    </Button>
                  </div>

                  {/* Employer Panel */}
                  <TabsContent value="employer">
                    <Card>
                      <CardHeader>
                        <CardTitle>Staff Payroll Demands</CardTitle>
                        <CardDescription>
                          Review timesheet claims submitted by employees. Fund them directly, or deposit them into escrow milestones.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isPayrollsLoading ? (
                          <div className="flex flex-col gap-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ) : employerWorkspace.length === 0 ? (
                          <div className="text-center py-10 flex flex-col items-center justify-center gap-3">
                            <ClipboardList className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold text-muted-foreground">No payroll items found</span>
                            <p className="text-xs text-muted-foreground/60 max-w-xs">
                              Employees must submit a timesheet claim naming your public address as the employer.
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">ID</TableHead>
                                <TableHead>Milestone / Title</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employerWorkspace.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                                  <TableCell>
                                    <div className="font-semibold text-white">{item.title}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</div>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-indigo-400">
                                    {formatAddress(item.payee)}
                                  </TableCell>
                                  <TableCell className="font-semibold font-mono text-white">
                                    {formatAmount(item.amount)} XLM
                                  </TableCell>
                                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                                  <TableCell className="text-right">
                                    {item.status === "Pending" && (
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          size="sm" 
                                          variant="secondary" 
                                          onClick={() => handleFundPayroll(item.id, item.title)}
                                          isLoading={payInvoiceMutation.isPending}
                                        >
                                          Fund Payout
                                        </Button>
                                      </div>
                                    )}
                                    {item.status === "Paid" && item.isEscrow && (
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleReleaseEscrow(item.id, item.title)}
                                        isLoading={releaseEscrowMutation.isPending}
                                      >
                                        Approve & Release
                                      </Button>
                                    )}
                                    {item.status !== "Pending" && !(item.status === "Paid" && item.isEscrow) && (
                                      <span className="text-xs text-muted-foreground select-none">Settled</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Employee Panel */}
                  <TabsContent value="employee">
                    <Card>
                      <CardHeader>
                        <CardTitle>My Timesheet Claims</CardTitle>
                        <CardDescription>
                          Timesheets and milestone payrolls you requested from employers. Click "Submit Timesheet Claim" to request a new payment.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isPayrollsLoading ? (
                          <div className="flex flex-col gap-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ) : employeeWorkspace.length === 0 ? (
                          <div className="text-center py-10 flex flex-col items-center justify-center gap-3">
                            <ClipboardList className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold text-muted-foreground">No payroll items found</span>
                            <p className="text-xs text-muted-foreground/60 max-w-xs">
                              You haven't submitted any timesheet claims yet. Click the claim button to start.
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">ID</TableHead>
                                <TableHead>Milestone / Title</TableHead>
                                <TableHead>Employer</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employeeWorkspace.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                                  <TableCell>
                                    <div className="font-semibold text-white">{item.title}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      Escrow held: {item.isEscrow ? "Yes" : "No"}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-cyan-400">
                                    {formatAddress(item.payer)}
                                  </TableCell>
                                  <TableCell className="font-semibold font-mono text-white">
                                    {formatAmount(item.amount)} XLM
                                  </TableCell>
                                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                                  <TableCell className="text-right">
                                    {item.status === "Pending" && (
                                      <Button 
                                        size="sm" 
                                        variant="danger" 
                                        onClick={() => handleCancelClaim(item.id, item.title)}
                                        isLoading={cancelInvoiceMutation.isPending}
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                    {item.status === "Paid" && item.isEscrow && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleRefundEscrow(item.id, item.title)}
                                        isLoading={refundEscrowMutation.isPending}
                                      >
                                        Refund Employer
                                      </Button>
                                    )}
                                    {item.status !== "Pending" && !(item.status === "Paid" && item.isEscrow) && (
                                      <span className="text-xs text-muted-foreground select-none">Settled</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Column - Side Panel (Real-Time activity feed & transaction tracker) */}
              <div className="md:col-span-4 flex flex-col gap-6">
                
                {/* Active Transactions Tracker */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex flex-col gap-0.5">
                      <CardTitle className="text-sm">Transaction Status</CardTitle>
                      <CardDescription className="text-[11px]">Track recent blockchain signatures</CardDescription>
                    </div>
                    <History className="h-4 w-4 text-indigo-400" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {transactions.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No transactions submitted in this session.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {transactions.map((tx) => (
                          <div 
                            key={tx.hash} 
                            className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-center justify-between gap-3 animate-in fade-in"
                          >
                            <div className="min-w-0 flex-grow">
                              <h4 className="text-xs font-semibold text-white truncate">{tx.title}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                                <span className="font-mono">{formatAddress(tx.hash)}</span>
                                <span>&bull;</span>
                                <Link 
                                  href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                                  target="_blank"
                                  className="hover:text-indigo-400 flex items-center gap-0.5 transition-colors"
                                >
                                  Explorer
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              {tx.status === "pending" && (
                                <Badge variant="warning" className="animate-pulse">Pending</Badge>
                              )}
                              {tx.status === "success" && (
                                <Badge variant="success" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Success
                                </Badge>
                              )}
                              {tx.status === "failed" && (
                                <Badge variant="error" className="gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Failed
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Real-Time Decoded Events Feed */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex flex-col gap-0.5">
                      <CardTitle className="text-sm">Live Activity Feed</CardTitle>
                      <CardDescription className="text-[11px]">Decoded events streaming from contract</CardDescription>
                    </div>
                    <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.04] px-6">
                      {isEventsLoading && events.length === 0 ? (
                        <div className="py-6 flex flex-col gap-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : events.length === 0 ? (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                          No recent contract events detected.
                        </div>
                      ) : (
                        events.map((ev) => (
                          <div key={ev.id} className="py-3.5 flex flex-col gap-1 text-xs">
                            <div className="flex justify-between items-start">
                              <span className="font-semibold text-white">
                                {ev.type === "invoice_created" && "Payroll Claim Created"}
                                {ev.type === "invoice_paid" && "Payroll Funded"}
                                {ev.type === "escrow_released" && "Escrow Released"}
                                {ev.type === "escrow_refunded" && "Escrow Refunded"}
                                {ev.type === "invoice_cancelled" && "Claim Cancelled"}
                                {ev.type === "unknown" && "Contract Event"}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {formatTimestamp(ev.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {ev.type === "invoice_created" && `Employee ${formatAddress(ev.actor)} claimed payroll #${ev.invoiceId} of `}
                              {ev.type === "invoice_paid" && `Employer ${formatAddress(ev.actor)} funded payroll #${ev.invoiceId} of `}
                              {ev.type === "escrow_released" && `Funds for payroll #${ev.invoiceId} were released to ${formatAddress(ev.actor)}: `}
                              {ev.type === "escrow_refunded" && `Funds for payroll #${ev.invoiceId} were refunded to employer ${formatAddress(ev.actor)}: `}
                              {ev.type === "invoice_cancelled" && `Employee ${formatAddress(ev.actor)} cancelled claim #${ev.invoiceId} of `}
                              <span className="font-semibold font-mono text-cyan-400">{formatAmount(ev.amount)} XLM</span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </>
        )}
      </main>

      {/* Claim Submission Dialog Modal */}
      <Dialog 
        isOpen={isClaimModalOpen} 
        onClose={() => setIsClaimModalOpen(false)} 
        title="Submit Timesheet Payroll Claim"
      >
        <form onSubmit={handleCreateClaim} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Employer Public Address</label>
            <Input 
              type="text" 
              placeholder="G..." 
              value={claimPayer} 
              onChange={(e) => setClaimPayer(e.target.value)}
              className="font-mono text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Amount (XLM)</label>
              <Input 
                type="number" 
                step="0.0001" 
                placeholder="100.00" 
                value={claimAmount} 
                onChange={(e) => setClaimAmount(e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Milestone Type</label>
              <label className="flex items-center gap-2 h-10 px-3 border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 select-none transition-colors">
                <input 
                  type="checkbox" 
                  checked={claimEscrow} 
                  onChange={(e) => setClaimEscrow(e.target.checked)}
                  className="rounded border-white/10 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-medium text-white">Escrow Backed</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Milestone / Title</label>
            <Input 
              type="text" 
              placeholder="e.g. Software Engineer - June 2026 Milestone 2" 
              value={claimTitle} 
              onChange={(e) => setClaimTitle(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Timesheet Details / Comments</label>
            <Textarea 
              rows={3} 
              placeholder="e.g. Implemented custom auth hooks, set up Zustand state slices, integrated Stellar SDK query client..." 
              value={claimDesc} 
              onChange={(e) => setClaimDesc(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full mt-2 font-semibold" 
            isLoading={createInvoiceMutation.isPending}
          >
            Submit Claim
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
