import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TrendingUp, Users, DollarSign, Star, Award, CheckCircle, XCircle } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function AdvancedAnalytics() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [contractStats, setContractStats] = useState<any>({});
  const [talentMetrics, setTalentMetrics] = useState<any[]>([]);
  const [satisfactionData, setSatisfactionData] = useState<any>({});

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch revenue trends
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: true });

      if (transactions) {
        const revenueByMonth = transactions.reduce((acc: any, tx: any) => {
          const month = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (!acc[month]) acc[month] = 0;
          acc[month] += tx.amount_minor_units / 100;
          return acc;
        }, {});

        setRevenueData(Object.entries(revenueByMonth).map(([month, revenue]) => ({
          month,
          revenue
        })));
      }

      // Fetch contract success rates
      const { data: contracts } = await supabase
        .from("contracts")
        .select("status");

      if (contracts) {
        const statusCounts = contracts.reduce((acc: any, c: any) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {});

        setContractStats({
          total: contracts.length,
          completed: statusCounts.completed || 0,
          active: statusCounts.active || 0,
          cancelled: statusCounts.cancelled || 0,
          successRate: ((statusCounts.completed || 0) / contracts.length * 100).toFixed(1)
        });
      }

      // Fetch talent performance
      const { data: profiles } = await supabase
        .from("profiles")
        .select("full_name, average_rating, total_gigs_completed, total_reviews")
        .order("average_rating", { ascending: false })
        .limit(10);

      if (profiles) {
        setTalentMetrics(profiles);
      }

      // Fetch employer satisfaction
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating");

      if (reviews) {
        const ratingDistribution = reviews.reduce((acc: any, r: any) => {
          acc[r.rating] = (acc[r.rating] || 0) + 1;
          return acc;
        }, {});

        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        setSatisfactionData({
          averageRating: avgRating.toFixed(2),
          totalReviews: reviews.length,
          distribution: Object.entries(ratingDistribution).map(([rating, count]) => ({
            rating: `${rating} stars`,
            count
          }))
        });
      }
    } catch (error: any) {
      toast.error("Failed to load analytics: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--destructive))'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive platform metrics and insights
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${revenueData.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractStats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                {contractStats.completed} of {contractStats.total} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{satisfactionData.averageRating}</div>
              <p className="text-xs text-muted-foreground">
                From {satisfactionData.totalReviews} reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Talents</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{talentMetrics.length}</div>
              <p className="text-xs text-muted-foreground">High performers</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList>
            <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
            <TabsTrigger value="contracts">Contract Analytics</TabsTrigger>
            <TabsTrigger value="talent">Talent Performance</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfaction Scores</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Monthly revenue trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contract Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: contractStats.completed },
                          { name: 'Active', value: contractStats.active },
                          { name: 'Cancelled', value: contractStats.cancelled }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contract Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Contracts</span>
                    <span className="text-2xl font-bold">{contractStats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Completed</span>
                    <span className="text-lg text-green-600">{contractStats.completed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Active</span>
                    <span className="text-lg text-blue-600">{contractStats.active}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cancelled</span>
                    <span className="text-lg text-red-600">{contractStats.cancelled}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Success Rate</span>
                      <span className="text-2xl font-bold text-primary">
                        {contractStats.successRate}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="talent">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Talents</CardTitle>
                <CardDescription>Based on ratings and completed gigs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {talentMetrics.map((talent, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{talent.full_name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{talent.total_gigs_completed || 0} gigs</span>
                            <span>•</span>
                            <span>{talent.total_reviews || 0} reviews</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <span className="text-lg font-bold">
                          {talent.average_rating?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="satisfaction">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={satisfactionData.distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Satisfaction Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-primary mb-2">
                      {satisfactionData.averageRating}
                    </div>
                    <p className="text-muted-foreground">Average Rating</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-6 w-6 ${
                            star <= Math.round(satisfactionData.averageRating)
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground">
                      Based on <span className="font-bold">{satisfactionData.totalReviews}</span> reviews
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
