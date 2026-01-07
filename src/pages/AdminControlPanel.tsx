import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Users, Briefcase, DollarSign, Shield, Ban, CheckCircle, 
  XCircle, Eye, Edit, Trash2, RefreshCw, Download, AlertTriangle,
  Award, Star, Clock, TrendingUp, Settings, Database, Activity
} from "lucide-react";
import BlockedIPsManager from "@/components/BlockedIPsManager";

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: string[];
  status: 'active' | 'suspended' | 'banned';
}

interface Job {
  id: string;
  title: string;
  company_name: string;
  status: string;
  verification_status: string;
  is_featured: boolean;
  created_at: string;
  source: string;
}

interface Transaction {
  id: string;
  amount_minor_units: number;
  currency: string;
  type: string;
  status: string;
  created_at: string;
  from_user_id: string;
  to_user_id: string;
}

export default function AdminControlPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAggregating, setIsAggregating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  async function checkAdminStatus() {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!data || data.length === 0) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchAllData();
  }

  async function fetchAllData() {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchJobs(), fetchTransactions()]);
    setLoading(false);
  }

  async function fetchUsers() {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email, created_at")
      .order("created_at", { ascending: false });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const usersWithRoles = profiles?.map(profile => ({
      id: profile.user_id,
      email: profile.email || 'N/A',
      full_name: profile.full_name,
      created_at: profile.created_at,
      roles: roles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [],
      status: 'active' as const
    })) || [];

    setUsers(usersWithRoles);
  }

  async function fetchJobs() {
    const { data } = await supabase
      .from("jobs")
      .select("id, title, company_name, status, verification_status, is_featured, created_at, source")
      .order("created_at", { ascending: false })
      .limit(500);

    setJobs(data || []);
  }

  async function fetchTransactions() {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    setTransactions(data || []);
  }

  async function runJobAggregator() {
    setIsAggregating(true);
    try {
      const { data, error } = await supabase.functions.invoke('job-aggregator');
      
      if (error) throw error;
      
      toast.success(`Jobs aggregated: ${data.jobs_created} created, ${data.jobs_rejected} rejected`);
      fetchJobs();
    } catch (error) {
      console.error("Aggregator error:", error);
      toast.error("Failed to run job aggregator");
    } finally {
      setIsAggregating(false);
    }
  }

  async function updateJobStatus(jobId: string, status: string) {
    const { error } = await supabase
      .from("jobs")
      .update({ verification_status: status })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to update job status");
    } else {
      toast.success(`Job ${status}`);
      fetchJobs();
    }
  }

  async function deleteJob(jobId: string) {
    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to delete job");
    } else {
      toast.success("Job deleted");
      fetchJobs();
    }
  }

  async function toggleUserRole(userId: string, role: 'admin' | 'talent' | 'employer', add: boolean) {
    if (add) {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error && !error.message.includes('duplicate')) {
        toast.error("Failed to add role");
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) {
        toast.error("Failed to remove role");
        return;
      }
    }
    
    toast.success(`Role ${add ? 'added' : 'removed'}`);
    fetchUsers();
  }

  async function issueBadge(talentId: string, badgeType: string, badgeLevel: string) {
    if (!user) return;

    // First get the profile id from user_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", talentId)
      .single();

    if (!profile) {
      toast.error("User profile not found");
      return;
    }

    const { error } = await supabase
      .from("verification_badges")
      .insert({
        talent_id: profile.id,
        badge_type: badgeType,
        badge_level: badgeLevel,
        issued_by: user.id,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      });

    if (error) {
      toast.error("Failed to issue badge");
    } else {
      toast.success("Badge issued successfully");
    }
  }

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredJobs = jobs.filter(j => 
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalUsers: users.length,
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.status === 'open').length,
    pendingJobs: jobs.filter(j => j.verification_status === 'unverified').length,
    totalTransactions: transactions.length,
    totalVolume: transactions.reduce((sum, t) => sum + (t.amount_minor_units || 0), 0) / 100,
    platformFees: transactions.filter(t => t.type === 'escrow').reduce((sum, t) => sum + Math.round((t.amount_minor_units || 0) * 0.05), 0) / 100
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Admin Control Panel</h1>
              <p className="text-muted-foreground mt-2">Complete platform management and oversight</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchAllData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={runJobAggregator} disabled={isAggregating}>
                {isAggregating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Aggregating...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Aggregate Jobs
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-xs text-muted-foreground">Total Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Briefcase className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <div className="text-2xl font-bold">{stats.totalJobs}</div>
                <div className="text-xs text-muted-foreground">Total Jobs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
                <div className="text-2xl font-bold">{stats.activeJobs}</div>
                <div className="text-xs text-muted-foreground">Active Jobs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                <div className="text-2xl font-bold">{stats.pendingJobs}</div>
                <div className="text-xs text-muted-foreground">Pending Review</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                <div className="text-xs text-muted-foreground">Transactions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <div className="text-2xl font-bold">${stats.totalVolume.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Total Volume</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                <div className="text-2xl font-bold">${stats.platformFees.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Platform Fees</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex gap-4">
            <Input
              placeholder="Search users, jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="jobs">
                <Briefcase className="h-4 w-4 mr-2" />
                Jobs
              </TabsTrigger>
              <TabsTrigger value="payments">
                <DollarSign className="h-4 w-4 mr-2" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="badges">
                <Award className="h-4 w-4 mr-2" />
                Badges
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredUsers.slice(0, 50).map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{u.full_name}</div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                          <div className="flex gap-1 mt-1">
                            {u.roles.map(role => (
                              <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Shield className="h-4 w-4 mr-1" />
                                Roles
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manage Roles for {u.full_name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                {(['admin', 'talent', 'employer'] as const).map(role => (
                                  <div key={role} className="flex items-center justify-between">
                                    <span className="capitalize">{role}</span>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant={u.roles.includes(role) ? "default" : "outline"}
                                        onClick={() => toggleUserRole(u.id, role, !u.roles.includes(role))}
                                      >
                                        {u.roles.includes(role) ? 'Remove' : 'Add'}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Award className="h-4 w-4 mr-1" />
                                Badge
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Issue Badge to {u.full_name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Select onValueChange={(value) => {
                                  const [type, level] = value.split(':');
                                  issueBadge(u.id, type, level);
                                }}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select badge" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="identity:verified">Identity Verified ✓</SelectItem>
                                    <SelectItem value="skills:expert">Skills Expert ⭐</SelectItem>
                                    <SelectItem value="premium:gold">Premium Gold 🏆</SelectItem>
                                    <SelectItem value="trusted:blue">Blue Tick ✔</SelectItem>
                                    <SelectItem value="top_rated:platinum">Top Rated Platinum 💎</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Jobs Tab */}
            <TabsContent value="jobs">
              <Card>
                <CardHeader>
                  <CardTitle>Job Moderation</CardTitle>
                  <CardDescription>Review, approve, and manage job listings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredJobs.slice(0, 50).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{job.title}</div>
                          <div className="text-sm text-muted-foreground">{job.company_name}</div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                            <Badge variant={
                              job.verification_status === 'verified' ? 'default' :
                              job.verification_status === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {job.verification_status}
                            </Badge>
                            {job.is_featured && <Badge className="bg-yellow-500">Featured</Badge>}
                            {job.source && <Badge variant="outline">{job.source}</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {job.verification_status !== 'verified' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateJobStatus(job.id, 'verified')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                          )}
                          {job.verification_status !== 'rejected' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateJobStatus(job.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Oversight</CardTitle>
                  <CardDescription>View all transactions and manage payouts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.slice(0, 50).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">
                            ${(tx.amount_minor_units / 100).toFixed(2)} {tx.currency}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge>{tx.type}</Badge>
                            <Badge variant={
                              tx.status === 'completed' ? 'default' :
                              tx.status === 'pending' ? 'outline' : 'destructive'
                            }>
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>From: {tx.from_user_id?.slice(0, 8)}...</div>
                          <div>To: {tx.to_user_id?.slice(0, 8)}...</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Badges Tab */}
            <TabsContent value="badges">
              <Card>
                <CardHeader>
                  <CardTitle>Badge Management</CardTitle>
                  <CardDescription>Issue and manage verification badges for users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border-2 border-blue-500">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">✔</div>
                        <div className="font-bold">Blue Tick</div>
                        <div className="text-sm text-muted-foreground">Verified identity and trusted user</div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-yellow-500">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">🏆</div>
                        <div className="font-bold">Premium Gold</div>
                        <div className="text-sm text-muted-foreground">Top performer status</div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-purple-500">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">💎</div>
                        <div className="font-bold">Platinum Elite</div>
                        <div className="text-sm text-muted-foreground">Highest tier recognition</div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-green-500">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">✓</div>
                        <div className="font-bold">Identity Verified</div>
                        <div className="text-sm text-muted-foreground">ID documents verified</div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-orange-500">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">⭐</div>
                        <div className="font-bold">Skills Expert</div>
                        <div className="text-sm text-muted-foreground">Verified skill expertise</div>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-red-500">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">🔥</div>
                        <div className="font-bold">Rising Star</div>
                        <div className="text-sm text-muted-foreground">Fast-growing reputation</div>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    To issue a badge, go to the Users tab and click "Badge" next to any user.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <BlockedIPsManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
