import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, Clock, AlertTriangle, DollarSign } from "lucide-react";

interface AnalyticsData {
  totalContracts: number;
  completedContracts: number;
  activeContracts: number;
  totalDisputes: number;
  avgMilestoneTime: number;
  totalPayments: number;
  disputeRate: number;
  completionRate: number;
}

const ContractAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [milestoneData, setMilestoneData] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch contracts
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select("*")
        .or(`employer_id.eq.${user.id},talent_id.eq.${user.id}`);

      if (contractsError) throw contractsError;

      // Fetch milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestones")
        .select("*, contracts!inner(employer_id, talent_id)")
        .or(`contracts.employer_id.eq.${user.id},contracts.talent_id.eq.${user.id}`);

      if (milestonesError) throw milestonesError;

      // Fetch disputes
      const contractIds = contracts?.map((c) => c.id) || [];
      const { data: disputes, error: disputesError } = await supabase
        .from("disputes")
        .select("*")
        .in("contract_id", contractIds);

      if (disputesError) throw disputesError;

      // Fetch transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;

      // Calculate analytics
      const totalContracts = contracts?.length || 0;
      const completedContracts = contracts?.filter((c) => c.status === "completed").length || 0;
      const activeContracts = contracts?.filter((c) => c.status === "active").length || 0;
      const totalDisputes = disputes?.length || 0;

      // Calculate average milestone completion time
      const completedMilestones = milestones?.filter((m) => m.status === "approved") || [];
      const avgMilestoneTime = completedMilestones.length > 0
        ? completedMilestones.reduce((acc, m) => {
            const created = new Date(m.created_at).getTime();
            const updated = new Date(m.updated_at).getTime();
            return acc + (updated - created);
          }, 0) / completedMilestones.length / (1000 * 60 * 60 * 24)
        : 0;

      // Calculate total payments
      const totalPayments = transactions
        ?.filter((t) => t.type === "release" && t.status === "completed")
        .reduce((acc, t) => acc + t.amount_minor_units, 0) || 0;

      const disputeRate = totalContracts > 0 ? (totalDisputes / totalContracts) * 100 : 0;
      const completionRate = totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0;

      setAnalytics({
        totalContracts,
        completedContracts,
        activeContracts,
        totalDisputes,
        avgMilestoneTime,
        totalPayments,
        disputeRate,
        completionRate,
      });

      // Prepare milestone status data
      const milestonesByStatus = [
        { name: "Pending", value: milestones?.filter((m) => m.status === "pending").length || 0 },
        { name: "In Progress", value: milestones?.filter((m) => m.status === "in_progress").length || 0 },
        { name: "Submitted", value: milestones?.filter((m) => m.status === "submitted").length || 0 },
        { name: "Approved", value: milestones?.filter((m) => m.status === "approved").length || 0 },
        { name: "Rejected", value: milestones?.filter((m) => m.status === "rejected").length || 0 },
      ];
      setMilestoneData(milestonesByStatus);

      // Prepare payment history data
      const paymentData = transactions?.slice(0, 7).reverse().map((t) => ({
        date: new Date(t.created_at).toLocaleDateString(),
        amount: t.amount_minor_units / 100,
        type: t.type,
      })) || [];
      setPaymentHistory(paymentData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Contract Analytics</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.completionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.completedContracts} of {analytics?.totalContracts} contracts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Milestone Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.avgMilestoneTime.toFixed(1)} days</div>
              <p className="text-xs text-muted-foreground">Average completion time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dispute Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.disputeRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.totalDisputes} disputes raised
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${((analytics?.totalPayments || 0) / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total released funds</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Milestone Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={milestoneData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {milestoneData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={paymentHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: "Active", value: analytics?.activeContracts || 0 },
                    { name: "Completed", value: analytics?.completedContracts || 0 },
                    { name: "Total", value: analytics?.totalContracts || 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Strong Completion Rate</p>
                  <p className="text-sm text-muted-foreground">
                    {analytics?.completionRate.toFixed(1)}% of contracts are successfully completed
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Milestone Efficiency</p>
                  <p className="text-sm text-muted-foreground">
                    Average {analytics?.avgMilestoneTime.toFixed(1)} days per milestone
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium">Dispute Frequency</p>
                  <p className="text-sm text-muted-foreground">
                    {analytics?.disputeRate.toFixed(1)}% of contracts have disputes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ContractAnalytics;
