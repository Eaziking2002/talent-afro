import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackWidget from "@/components/FeedbackWidget";
import { 
  BookOpen, Users, Briefcase, CreditCard, Shield, MessageSquare, 
  FileText, Award, BarChart3, Bell, Search, ChevronRight, 
  CheckCircle2, ArrowRight, Wallet, Star, Globe, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "getting-started", label: "Getting Started", icon: ArrowRight },
  { id: "for-talent", label: "For Talent", icon: Users },
  { id: "for-employers", label: "For Employers", icon: Briefcase },
  { id: "jobs", label: "Job Board", icon: Search },
  { id: "contracts", label: "Contracts & Milestones", icon: FileText },
  { id: "payments", label: "Payments & Wallet", icon: CreditCard },
  { id: "messaging", label: "Messaging", icon: MessageSquare },
  { id: "verification", label: "Verification & Trust", icon: Shield },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
];

const Documentation = () => {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">Documentation</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              SkillLink Africa Documentation
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about using the platform to connect African talent with global opportunities.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:w-64 shrink-0">
              <nav className="sticky top-24 space-y-1 bg-card rounded-lg border border-border p-4">
                <p className="text-sm font-semibold text-foreground mb-3">Contents</p>
                {sections.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                      activeSection === id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 max-w-4xl space-y-16">
              
              {/* Overview */}
              <section id="overview" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-primary" />
                  Overview
                </h2>
                <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
                  <p>
                    <strong className="text-foreground">SkillLink Africa</strong> is a comprehensive freelance marketplace 
                    designed to connect talented professionals across Africa with employers worldwide. Our platform 
                    provides a secure, transparent, and efficient way to find work, hire talent, and manage projects.
                  </p>
                  
                  <div className="bg-card border border-border rounded-lg p-6 my-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Key Features</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        "AI-Powered Job Matching",
                        "Secure Escrow Payments",
                        "Milestone-Based Contracts",
                        "Real-Time Messaging",
                        "Identity Verification",
                        "Skill Certifications",
                        "Advanced Analytics",
                        "Multi-Currency Support"
                      ].map((feature) => (
                        <div key={feature} className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p>
                    Whether you're a developer, designer, writer, or any skilled professional, SkillLink Africa 
                    provides the tools and opportunities you need to grow your career and connect with clients globally.
                  </p>
                </div>
              </section>

              {/* Getting Started */}
              <section id="getting-started" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <ArrowRight className="h-8 w-8 text-primary" />
                  Getting Started
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-4">1. Create Your Account</h3>
                    <p className="text-muted-foreground mb-4">
                      Visit the signup page and choose your account type:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span><strong className="text-foreground">Talent:</strong> If you're looking for freelance work opportunities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span><strong className="text-foreground">Employer:</strong> If you want to hire skilled professionals</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-4">2. Complete Your Profile</h3>
                    <p className="text-muted-foreground mb-4">
                      A complete profile increases your visibility and credibility:
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Add a professional photo
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Write a compelling bio
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        List your skills and experience
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Upload portfolio samples
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Complete identity verification
                      </li>
                    </ul>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-4">3. Start Exploring</h3>
                    <p className="text-muted-foreground">
                      Browse the job board, connect with employers or talent, and begin your journey on SkillLink Africa!
                    </p>
                  </div>
                </div>
              </section>

              {/* For Talent */}
              <section id="for-talent" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  For Talent
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    As a talent on SkillLink Africa, you have access to a wide range of opportunities and tools to grow your freelance career.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">Dashboard</h4>
                      <p className="text-sm">View your active contracts, earnings, pending applications, and performance metrics all in one place.</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">Job Matching</h4>
                      <p className="text-sm">Our AI analyzes your skills and experience to recommend the most relevant job opportunities.</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">Skill Gap Analysis</h4>
                      <p className="text-sm">Identify areas for improvement and get personalized learning recommendations.</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">Portfolio Showcase</h4>
                      <p className="text-sm">Display your best work with images, videos, and detailed project descriptions.</p>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-2">💡 Pro Tip</h4>
                    <p className="text-sm">
                      Complete your profile verification to appear higher in search results and increase your chances of landing jobs. 
                      Verified profiles receive up to 3x more views!
                    </p>
                  </div>
                </div>
              </section>

              {/* For Employers */}
              <section id="for-employers" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Briefcase className="h-8 w-8 text-primary" />
                  For Employers
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    Employers can post jobs, browse talent, and manage projects with our comprehensive suite of tools.
                  </p>

                  <div className="space-y-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                      <h4 className="font-semibold text-foreground mb-3">Posting a Job</h4>
                      <ol className="space-y-2 list-decimal list-inside">
                        <li>Navigate to your Employer Dashboard</li>
                        <li>Click "Post a New Job"</li>
                        <li>Fill in job details (title, description, budget, timeline)</li>
                        <li>Add required skills and experience level</li>
                        <li>Set payment type (fixed price or hourly)</li>
                        <li>Submit for review or publish directly</li>
                      </ol>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6">
                      <h4 className="font-semibold text-foreground mb-3">Hiring Process</h4>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary mb-1">1</div>
                          <p className="text-sm">Review Applications</p>
                        </div>
                        <div className="flex-1 text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary mb-1">2</div>
                          <p className="text-sm">Interview Candidates</p>
                        </div>
                        <div className="flex-1 text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary mb-1">3</div>
                          <p className="text-sm">Create Contract</p>
                        </div>
                        <div className="flex-1 text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary mb-1">4</div>
                          <p className="text-sm">Fund Escrow</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Job Board */}
              <section id="jobs" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Search className="h-8 w-8 text-primary" />
                  Job Board
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    The job board is the central hub for finding and posting opportunities on SkillLink Africa.
                  </p>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">Search & Filter Options</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="font-medium text-foreground text-sm mb-2">By Category</p>
                        <ul className="text-sm space-y-1">
                          <li>• Web Development</li>
                          <li>• Mobile Apps</li>
                          <li>• Design & Creative</li>
                          <li>• Writing & Content</li>
                          <li>• Marketing</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm mb-2">By Budget</p>
                        <ul className="text-sm space-y-1">
                          <li>• Under $500</li>
                          <li>• $500 - $1,000</li>
                          <li>• $1,000 - $5,000</li>
                          <li>• $5,000+</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm mb-2">By Type</p>
                        <ul className="text-sm space-y-1">
                          <li>• Fixed Price</li>
                          <li>• Hourly Rate</li>
                          <li>• Long-term</li>
                          <li>• Short-term</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-3">Job Alerts</h4>
                    <p className="text-sm mb-3">
                      Set up custom job alerts to get notified when new opportunities match your criteria:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>• Define your preferred skills and categories</li>
                      <li>• Set minimum budget requirements</li>
                      <li>• Choose notification frequency (instant, daily, weekly)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Contracts & Milestones */}
              <section id="contracts" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  Contracts & Milestones
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    Contracts protect both parties and ensure clear expectations. Milestones break projects into manageable phases with linked payments.
                  </p>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">Contract Lifecycle</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-sm font-bold">1</div>
                        <div>
                          <p className="font-medium text-foreground">Draft</p>
                          <p className="text-sm">Terms are being negotiated</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-sm font-bold">2</div>
                        <div>
                          <p className="font-medium text-foreground">Active</p>
                          <p className="text-sm">Work is in progress, escrow is funded</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-sm font-bold">3</div>
                        <div>
                          <p className="font-medium text-foreground">Completed</p>
                          <p className="text-sm">All milestones approved, payments released</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-3">Milestone Features</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                        <span><strong className="text-foreground">Dependencies:</strong> Set milestones that must complete before others can start</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                        <span><strong className="text-foreground">Deliverables:</strong> Upload files and documentation for each milestone</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                        <span><strong className="text-foreground">Automatic Payment:</strong> Funds are released automatically upon approval</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Payments & Wallet */}
              <section id="payments" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Wallet className="h-8 w-8 text-primary" />
                  Payments & Wallet
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    SkillLink Africa uses a secure escrow system to protect both employers and talent. All payments are held safely until work is approved.
                  </p>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">Payment Methods</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="font-medium text-foreground mb-2">🏦 Bank Transfer</p>
                        <p className="text-sm">Direct transfer to your bank account (2-5 business days)</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="font-medium text-foreground mb-2">📱 Mobile Money</p>
                        <p className="text-sm">AfriMoney, Orange Money (instant)</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">How Escrow Works</h4>
                    <ol className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</span>
                        <span>Employer funds the contract amount into escrow</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</span>
                        <span>Funds are held securely during project work</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</span>
                        <span>Talent submits deliverables for approval</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</span>
                        <span>Upon approval, funds are released to talent's wallet</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-3">Wallet Features</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• View balance and transaction history</li>
                      <li>• Withdraw funds to your preferred payment method</li>
                      <li>• Download receipts and invoices</li>
                      <li>• Set up automatic withdrawals</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Messaging */}
              <section id="messaging" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <MessageSquare className="h-8 w-8 text-primary" />
                  Messaging
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    Real-time messaging enables seamless communication between employers and talent throughout the project lifecycle.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">Direct Messages</h4>
                      <p className="text-sm">One-on-one conversations with employers or talent</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">Contract Chat</h4>
                      <p className="text-sm">Project-specific discussions attached to contracts</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">File Sharing</h4>
                      <p className="text-sm">Share documents, images, and other files securely</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">Real-Time Updates</h4>
                      <p className="text-sm">Instant notifications for new messages</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Verification & Trust */}
              <section id="verification" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  Verification & Trust
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    Our multi-level verification system builds trust and helps you stand out from the crowd.
                  </p>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">Verification Levels</h4>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                          <Star className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Basic</p>
                          <p className="text-sm">Email verified, profile complete</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-blue-500/10 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Verified</p>
                          <p className="text-sm">ID verified, phone number confirmed</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-yellow-500/10 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <Award className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Premium</p>
                          <p className="text-sm">Background check complete, video intro uploaded</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-3">Trust Score</h4>
                    <p className="text-sm">
                      Your trust score is calculated based on verification level, completed projects, 
                      client ratings, response time, and overall activity on the platform.
                    </p>
                  </div>
                </div>
              </section>

              {/* Certifications */}
              <section id="certifications" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Award className="h-8 w-8 text-primary" />
                  Certifications
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    Earn certifications to validate your skills and stand out to potential employers.
                  </p>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">Available Certifications</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 border border-border rounded-lg">
                        <p className="font-medium text-foreground">Technical Skills</p>
                        <p className="text-sm mt-1">Web Development, Mobile Apps, Data Science, etc.</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="font-medium text-foreground">Creative Skills</p>
                        <p className="text-sm mt-1">Graphic Design, UI/UX, Video Editing, etc.</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="font-medium text-foreground">Business Skills</p>
                        <p className="text-sm mt-1">Project Management, Marketing, Writing, etc.</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="font-medium text-foreground">Platform Certifications</p>
                        <p className="text-sm mt-1">SkillLink Pro, Trusted Seller, Top Rated, etc.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Analytics */}
              <section id="analytics" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  Analytics
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    Track your performance with detailed analytics and insights.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">For Talent</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Profile views and impressions</li>
                        <li>• Application success rate</li>
                        <li>• Earnings over time</li>
                        <li>• Client satisfaction scores</li>
                      </ul>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-foreground mb-2">For Employers</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Job posting performance</li>
                        <li>• Application volume trends</li>
                        <li>• Hiring success metrics</li>
                        <li>• Budget utilization</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Notifications */}
              <section id="notifications" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Bell className="h-8 w-8 text-primary" />
                  Notifications
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    Stay informed with customizable notifications for all platform activity.
                  </p>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">Notification Types</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• New job matches based on your skills</li>
                      <li>• Application status updates</li>
                      <li>• Contract and milestone updates</li>
                      <li>• Payment confirmations and releases</li>
                      <li>• Messages from employers/talent</li>
                      <li>• Profile views and engagement</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Security */}
              <section id="security" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Lock className="h-8 w-8 text-primary" />
                  Security
                </h2>
                
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    We take security seriously to protect your data, payments, and identity.
                  </p>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-4">Security Features</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground text-sm">Strong Password Requirements</p>
                          <p className="text-xs">8+ characters, uppercase, lowercase, numbers, symbols</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground text-sm">Secure Escrow</p>
                          <p className="text-xs">All payments protected until work is approved</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground text-sm">Rate Limiting</p>
                          <p className="text-xs">Protection against abuse and spam</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground text-sm">Identity Verification</p>
                          <p className="text-xs">Multi-level verification for trust</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                    <h4 className="font-semibold text-foreground mb-2">⚠️ Stay Safe</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Never share your password with anyone</li>
                      <li>• Always communicate through the platform</li>
                      <li>• Report suspicious activity immediately</li>
                      <li>• Use escrow for all payments</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Contact & Support */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">Need More Help?</h3>
                <p className="text-muted-foreground mb-4">
                  Contact our support team for any questions or issues.
                </p>
                <p className="text-primary font-medium">skilllinkafrica01@gmail.com</p>
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
      <FeedbackWidget />
    </div>
  );
};

export default Documentation;
