import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import About from "./pages/About";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import PaymentDashboard from "./pages/PaymentDashboard";
import Wallet from "./pages/Wallet";
import ManualPayment from "./pages/ManualPayment";
import AdminPaymentVerification from "./pages/AdminPaymentVerification";
import JobBoard from "./pages/JobBoard";
import AdminJobManagement from "./pages/AdminJobManagement";
import AdminEmployerVerification from "./pages/AdminEmployerVerification";
import AdminDisputeResolution from "./pages/AdminDisputeResolution";
import ContractAnalytics from "./pages/ContractAnalytics";
import Leaderboard from "./pages/Leaderboard";
import ContractTemplates from "./pages/ContractTemplates";
import ResetPassword from "./pages/ResetPassword";
import ReferralRewards from "./pages/ReferralRewards";
import TalentCertifications from "./pages/TalentCertifications";
import AdminDashboard from "./pages/AdminDashboard";
import AdminControlPanel from "./pages/AdminControlPanel";
import TalentShowcase from "./pages/TalentShowcase";
import NotificationCenter from "./pages/NotificationCenter";
import SkillsMarketplace from "./pages/SkillsMarketplace";
import MyServices from "./pages/MyServices";
import BulkContractImport from "./pages/BulkContractImport";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import TalentVerification from "./pages/TalentVerification";
import AdminVerification from "./pages/AdminVerification";
import ChatRoom from "./pages/ChatRoom";
import ChatRooms from "./pages/ChatRooms";
import SkillGapAnalysis from "./pages/SkillGapAnalysis";
import TalentDashboard from "./pages/TalentDashboard";
import EmployerAnalytics from "./pages/EmployerAnalytics";
import EmployerDashboard from "./pages/EmployerDashboard";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Documentation from "./pages/Documentation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/payment-dashboard" element={<PaymentDashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/manual-payment" element={<ManualPayment />} />
            <Route path="/admin/payment-verification" element={<AdminPaymentVerification />} />
            <Route path="/jobs" element={<JobBoard />} />
            <Route path="/dashboard" element={<TalentDashboard />} />
            <Route path="/employer/analytics" element={<EmployerAnalytics />} />
            <Route path="/employer/dashboard" element={<EmployerDashboard />} />
            <Route path="/messages" element={<ChatRooms />} />
            <Route path="/chat" element={<ChatRoom />} />
            <Route path="/admin/jobs" element={<AdminJobManagement />} />
            <Route path="/admin/employers" element={<AdminEmployerVerification />} />
            <Route path="/admin/disputes" element={<AdminDisputeResolution />} />
            <Route path="/analytics" element={<ContractAnalytics />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/templates" element={<ContractTemplates />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/referrals" element={<ReferralRewards />} />
            <Route path="/certifications" element={<TalentCertifications />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/control" element={<AdminControlPanel />} />
            <Route path="/talents" element={<TalentShowcase />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="/marketplace" element={<SkillsMarketplace />} />
            <Route path="/my-services" element={<MyServices />} />
            <Route path="/bulk-contracts" element={<BulkContractImport />} />
            <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
            <Route path="/verification" element={<TalentVerification />} />
            <Route path="/admin/verification" element={<AdminVerification />} />
            <Route path="/skill-gap-analysis" element={<SkillGapAnalysis />} />
            <Route path="/docs" element={<Documentation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
