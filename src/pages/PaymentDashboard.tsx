import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Clock, CheckCircle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import Header from "@/components/Header";
import { Receipt } from "@/components/Receipt";

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

const PaymentDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalCommission: 0,
    pendingPayments: 0,
    completedPayments: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('payment-dashboard-transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `from_user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Transaction change:', payload);
            fetchTransactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          jobs (title)
        `)
        .eq("from_user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTransactions(data || []);

      // Calculate stats
      const totalPaid = data?.reduce((sum, t) => 
        t.type === 'escrow' && t.status === 'completed' ? sum + t.amount_minor_units : sum, 0) || 0;
      const totalCommission = data?.reduce((sum, t) => 
        t.status === 'completed' ? sum + t.platform_fee_minor_units : sum, 0) || 0;
      const pendingPayments = data?.filter(t => t.status === 'pending').length || 0;
      const completedPayments = data?.filter(t => 
        t.type === 'escrow' && t.status === 'completed').length || 0;

      setStats({ totalPaid, totalCommission, pendingPayments, completedPayments });
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingData(false);
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
          <h1 className="text-4xl font-bold mb-2">Payment Dashboard</h1>
          <p className="text-muted-foreground">
            Track your payments, commissions, and transaction history
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(stats.totalPaid, "USD")}
              </div>
              <p className="text-xs text-muted-foreground">
                All completed payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(stats.totalCommission, "USD")}
              </div>
              <p className="text-xs text-muted-foreground">
                10% commission on transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedPayments}</div>
              <p className="text-xs text-muted-foreground">
                Successfully processed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              View all your payment transactions and their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="escrow">Escrow</TabsTrigger>
                <TabsTrigger value="release">Released</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No transactions yet
                  </p>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeBadge(transaction.type)}
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="font-medium">
                          {transaction.jobs?.title || transaction.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          {formatAmount(transaction.amount_minor_units, transaction.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Platform fee: {formatAmount(transaction.platform_fee_minor_units, transaction.currency)}
                        </p>
                        <p className="text-sm font-medium text-primary">
                          Net: {formatAmount(transaction.net_amount_minor_units, transaction.currency)}
                        </p>
                        <div className="mt-2">
                          <ReceiptDialog transaction={transaction} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="escrow" className="space-y-4">
                {transactions.filter(t => t.type === 'escrow').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No escrow transactions
                  </p>
                ) : (
                  transactions
                    .filter(t => t.type === 'escrow')
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(transaction.status)}
                          </div>
                          <p className="font-medium">
                            {transaction.jobs?.title || transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {formatAmount(transaction.amount_minor_units, transaction.currency)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Fee: {formatAmount(transaction.platform_fee_minor_units, transaction.currency)}
                          </p>
                          <div className="mt-2">
                            <ReceiptDialog transaction={transaction} />
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </TabsContent>

              <TabsContent value="release" className="space-y-4">
                {transactions.filter(t => t.type === 'release').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No released transactions
                  </p>
                ) : (
                  transactions
                    .filter(t => t.type === 'release')
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {transaction.jobs?.title || transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            {formatAmount(transaction.net_amount_minor_units, transaction.currency)}
                          </p>
                          <p className="text-sm text-muted-foreground">Released to talent</p>
                          <div className="mt-2">
                            <ReceiptDialog transaction={transaction} />
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                {transactions.filter(t => t.status === 'pending').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No pending transactions
                  </p>
                ) : (
                  transactions
                    .filter(t => t.status === 'pending')
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeBadge(transaction.type)}
                          </div>
                          <p className="font-medium">
                            {transaction.jobs?.title || transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {formatAmount(transaction.amount_minor_units, transaction.currency)}
                          </p>
                          <div className="mt-2">
                            <ReceiptDialog transaction={transaction} />
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentDashboard;
