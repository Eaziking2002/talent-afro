import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
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
import TalentDashboard from "./pages/TalentDashboard";
import EmployerAnalytics from "./pages/EmployerAnalytics";
import EmployerDashboard from "./pages/EmployerDashboard";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

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
            <Route path="/messages" element={<Messages />} />
            <Route path="/admin/jobs" element={<AdminJobManagement />} />
            <Route path="/admin/employers" element={<AdminEmployerVerification />} />
            <Route path="/admin/disputes" element={<AdminDisputeResolution />} />
            <Route path="/analytics" element={<ContractAnalytics />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/templates" element={<ContractTemplates />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/referrals" element={<ReferralRewards />} />
            <Route path="/certifications" element={<TalentCertifications />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
