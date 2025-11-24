import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, FileText, DollarSign, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalTalents },
        { count: totalEmployers },
        { count: totalJobs },
        { count: activeContracts },
        { count: completedContracts },
        { count: openDisputes },
        { data: transactions },
        { data: recentActivity }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "talent"),
        supabase.from("employers").select("*", { count: "exact", head: true }),
        supabase.from("jobs").select("*", { count: "exact", head: true }),
        supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("disputes").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("transactions").select("amount_minor_units, created_at, type").order("created_at", { ascending: false }).limit(100),
        supabase.from("contracts").select("id, created_at, status, jobs(title)").order("created_at", { ascending: false }).limit(10)
      ]);

      const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount_minor_units || 0), 0) || 0;
      const platformFees = transactions?.filter(t => t.type === 'escrow').reduce((sum, t) => sum + Math.round((t.amount_minor_units || 0) * 0.05), 0) || 0;

      return {
        totalUsers: totalUsers || 0,
        totalTalents: totalTalents || 0,
        totalEmployers: totalEmployers || 0,
        totalJobs: totalJobs || 0,
        activeContracts: activeContracts || 0,
        completedContracts: completedContracts || 0,
        openDisputes: openDisputes || 0,
        totalRevenue: totalRevenue / 100,
        platformFees: platformFees / 100,
        transactions: transactions || [],
        recentActivity: recentActivity || []
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: userGrowth } = useQuery({
    queryKey: ["user-growth"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true });

      const monthlyData: Record<string, number> = {};
      data?.forEach(profile => {
        const month = new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      });

      return Object.entries(monthlyData).map(([month, count]) => ({ month, users: count }));
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ["revenue-data"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("amount_minor_units, created_at, type")
        .order("created_at", { ascending: true });

      const monthlyRevenue: Record<string, number> = {};
      data?.forEach(transaction => {
        const month = new Date(transaction.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (transaction.amount_minor_units / 100);
      });

      return Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }));
    },
  });

  const contractStatusData = [
    { name: "Active", value: metrics?.activeContracts || 0 },
    { name: "Completed", value: metrics?.completedContracts || 0 },
    { name: "Disputes", value: metrics?.openDisputes || 0 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FF8042'];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4 animate-pulse text-green-500" />
              Live Updates
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.totalTalents || 0} talents, {metrics?.totalEmployers || 0} employers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalJobs || 0}</div>
                <p className="text-xs text-muted-foreground">Posted on platform</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.activeContracts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.completedContracts || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics?.platformFees?.toFixed(2) || "0.00"}</div>
                <p className="text-xs text-muted-foreground">
                  ${metrics?.totalRevenue?.toFixed(2) || "0.00"} total volume
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Monthly user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>Monthly revenue trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Contract Status & System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contract Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Status</CardTitle>
                <CardDescription>Distribution of contract states</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={contractStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {contractStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Platform status monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Contracts</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${Math.min(100, (metrics?.activeContracts || 0) * 10)}%` }} />
                    </div>
                    <span className="text-sm font-medium">{metrics?.activeContracts || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Open Disputes</span>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${(metrics?.openDisputes || 0) > 5 ? 'text-red-500' : 'text-yellow-500'}`} />
                    <span className="text-sm font-medium">{metrics?.openDisputes || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">User Activity</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Healthy</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Platform Fees</span>
                  <span className="text-sm font-medium">${metrics?.platformFees?.toFixed(2) || "0.00"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Contract Activity</CardTitle>
              <CardDescription>Latest contract updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.recentActivity?.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{activity.jobs?.title || "Unknown Job"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-sm px-2 py-1 rounded ${
                      activity.status === 'active' ? 'bg-green-100 text-green-700' :
                      activity.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
