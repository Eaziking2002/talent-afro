import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { usePayments } from "@/hooks/usePayments";
import Header from "@/components/Header";
import { toast } from "@/hooks/use-toast";
import { Receipt } from "@/components/Receipt";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
  id: string;
  created_at: string;
  amount_minor_units: number;
  platform_fee_minor_units: number;
  net_amount_minor_units: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  jobs?: { title: string };
}

interface WalletData {
  balance_minor_units: number;
  currency: string;
}

const Wallet = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { withdrawPayout } = usePayments();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  // Withdrawal form state
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountBank, setAccountBank] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchTransactions();
      
      // Set up real-time subscriptions
      const walletChannel = supabase
        .channel('wallet-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Wallet change:', payload);
            fetchWalletData();
          }
        )
        .subscribe();

      const transactionsChannel = supabase
        .channel('wallet-transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `to_user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Transaction change:', payload);
            fetchTransactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(walletChannel);
        supabase.removeChannel(transactionsChannel);
      };
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Wallet doesn't exist, create one
          const { data: newWallet, error: createError } = await supabase
            .from("wallets")
            .insert({ user_id: user?.id })
            .select()
            .single();

          if (createError) throw createError;
          setWallet(newWallet);
        } else {
          throw error;
        }
      } else {
        setWallet(data);
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          jobs (title)
        `)
        .eq("to_user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount) * 100; // Convert to minor units
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!wallet || withdrawAmount > wallet.balance_minor_units) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds to withdraw",
        variant: "destructive",
      });
      return;
    }

    if (!accountNumber || !accountBank) {
      toast({
        title: "Missing Information",
        description: "Please provide account number and bank code",
        variant: "destructive",
      });
      return;
    }

    setWithdrawing(true);
    try {
      await withdrawPayout({
        amount: withdrawAmount,
        accountNumber,
        accountBank,
        currency: wallet.currency,
      });

      // Refresh wallet data
      await fetchWalletData();
      await fetchTransactions();
      
      // Reset form
      setAmount("");
      setAccountNumber("");
      setAccountBank("");
    } catch (error) {
      console.error("Withdrawal error:", error);
    } finally {
      setWithdrawing(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      completed: "default",
      failed: "destructive",
      cancelled: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("Transaction History", 14, 20);
    
    // Add wallet info
    doc.setFontSize(12);
    doc.text(`Wallet Balance: ${formatAmount(wallet?.balance_minor_units || 0, wallet?.currency || 'USD')}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 37);
    
    // Prepare table data
    const tableData = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.type.toUpperCase(),
      formatAmount(t.amount_minor_units, t.currency),
      t.status.toUpperCase(),
      t.jobs?.title || 'N/A',
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Date', 'Type', 'Amount', 'Status', 'Job']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    // Save PDF
    doc.save(`transactions_${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: "Your transaction history has been exported successfully.",
    });
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      escrow: "default",
      release: "secondary",
      payout: "outline",
      refund: "destructive",
    };
    return (
      <Badge variant={variants[type] || "outline"}>
        {type}
      </Badge>
    );
  };

  const ReceiptDialog = ({ transaction }: { transaction: Transaction }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = useReactToPrint({
      contentRef: receiptRef,
    });

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Receipt
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
          </DialogHeader>
          <Receipt ref={receiptRef} transaction={transaction} userEmail={user?.email} />
          <div className="flex justify-end pt-4">
            <Button onClick={handlePrint}>
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Wallet</h1>
          <p className="text-muted-foreground">
            Manage your earnings and withdraw funds
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Wallet Balance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5" />
                Available Balance
              </CardTitle>
              <CardDescription>Your current wallet balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold mb-4">
                {wallet ? formatAmount(wallet.balance_minor_units, wallet.currency) : "0.00 USD"}
              </div>
              <p className="text-sm text-muted-foreground">
                Withdraw your earnings to your bank account anytime
              </p>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAmount(
                    transactions
                      .filter(t => t.type === 'release' && t.status === 'completed')
                      .reduce((sum, t) => sum + t.net_amount_minor_units, 0),
                    wallet?.currency || "USD"
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Withdrawn</CardTitle>
                <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAmount(
                    transactions
                      .filter(t => t.type === 'payout' && t.status === 'completed')
                      .reduce((sum, t) => sum + t.amount_minor_units, 0),
                    wallet?.currency || "USD"
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {transactions.filter(t => t.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Withdrawal Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>
                Transfer money to your bank account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Max: {wallet ? formatAmount(wallet.balance_minor_units, wallet.currency) : "0.00"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountBank">Bank Code</Label>
                  <Input
                    id="accountBank"
                    type="text"
                    placeholder="e.g., 058 (GTBank)"
                    value={accountBank}
                    onChange={(e) => setAccountBank(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Flutterwave bank code for your bank
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={withdrawing || !wallet || wallet.balance_minor_units === 0}
                >
                  {withdrawing ? "Processing..." : "Withdraw"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Your earnings and withdrawal history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={exportToPDF} 
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No transactions yet
                  </p>
                ) : (
                  transactions.map((transaction, index) => (
                    <div key={transaction.id}>
                      <div className="flex items-start justify-between py-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {transaction.type === 'release' ? (
                              <ArrowDownToLine className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowUpFromLine className="h-4 w-4 text-orange-600" />
                            )}
                            <span className="font-medium">
                              {transaction.type === 'release' ? 'Received' : 'Withdrawn'}
                            </span>
                            {getStatusBadge(transaction.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.jobs?.title || transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="text-right space-y-2">
                          <p className={`text-lg font-bold ${
                            transaction.type === 'release' ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {transaction.type === 'release' ? '+' : '-'}
                            {formatAmount(
                              transaction.type === 'release' 
                                ? transaction.net_amount_minor_units 
                                : transaction.amount_minor_units, 
                              transaction.currency
                            )}
                          </p>
                          {transaction.type === 'release' && (
                            <p className="text-xs text-muted-foreground">
                              After 10% fee
                            </p>
                          )}
                          <ReceiptDialog transaction={transaction} />
                        </div>
                      </div>
                      {index < transactions.length - 1 && <Separator />}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Wallet;
