import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LayoutDashboard,
  Briefcase,
  ShieldCheck,
  BarChart3,
  FileText,
  Wallet,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  Trophy,
  Award,
  Users,
  ChevronDown,
  Upload,
  TrendingUp,
  Eye,
  Gavel,
  SlidersHorizontal,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileDropdownProps {
  isAdmin: boolean;
}

const ProfileDropdown = ({ isAdmin }: ProfileDropdownProps) => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="hidden lg:inline text-sm max-w-[120px] truncate">
            {user.email?.split("@")[0]}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Core navigation */}
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Talent Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/employer/dashboard" className="cursor-pointer">
            <Briefcase className="mr-2 h-4 w-4" />
            Employer Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/my-services" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            My Services
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Activity */}
        <DropdownMenuItem asChild>
          <Link to="/messages" className="cursor-pointer">
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wallet" className="cursor-pointer">
            <Wallet className="mr-2 h-4 w-4" />
            Wallet
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="cursor-pointer">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Tools */}
        <DropdownMenuItem asChild>
          <Link to="/verification" className="cursor-pointer">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Verification
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/skill-gap-analysis" className="cursor-pointer">
            <TrendingUp className="mr-2 h-4 w-4" />
            Skill Gap Analysis
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/bulk-contracts" className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/certifications" className="cursor-pointer">
            <Award className="mr-2 h-4 w-4" />
            Certifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/talents" className="cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            Talent Showcase
          </Link>
        </DropdownMenuItem>

        {/* Admin section */}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              Admin
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/admin/control" className="cursor-pointer">
                <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium text-primary">Control Panel</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/dashboard" className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/jobs" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Manage Jobs
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/disputes" className="cursor-pointer">
                <Gavel className="mr-2 h-4 w-4" />
                Disputes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/employers" className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" />
                Employer Verification
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/verification" className="cursor-pointer">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verification Review
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/analytics" className="cursor-pointer">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/advanced-analytics" className="cursor-pointer">
                <TrendingUp className="mr-2 h-4 w-4" />
                Advanced Analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/leaderboard" className="cursor-pointer">
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/templates" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Templates
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/referrals" className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                Referrals
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
