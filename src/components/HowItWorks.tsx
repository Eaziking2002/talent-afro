import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Search, FileCheck, Wallet } from "lucide-react";

const steps = [
  {
    icon: <UserPlus className="w-8 h-8" />,
    step: "01",
    title: "Sign Up in 2 Minutes",
    description: "Enter your phone number, verify with OTP, add your skills, and record a quick 30-second video intro.",
  },
  {
    icon: <Search className="w-8 h-8" />,
    step: "02",
    title: "Browse & Apply",
    description: "Filter jobs by skills, budget, and duration. Apply with one tap or get invited by employers.",
  },
  {
    icon: <FileCheck className="w-8 h-8" />,
    step: "03",
    title: "Deliver Work",
    description: "Chat with employers in the workroom, submit your deliverables, and request revisions if needed.",
  },
  {
    icon: <Wallet className="w-8 h-8" />,
    step: "04",
    title: "Get Paid Instantly",
    description: "Once approved, funds move to your wallet. Withdraw to mobile money, bank, or card within minutes.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            How <span className="bg-trust-gradient bg-clip-text text-transparent">SkillLink</span> Works
          </h2>
          <p className="text-lg text-muted-foreground">
            From signup to payout in four simple steps. Start earning today.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection Line (Desktop) */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-20" />
          
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="border-2 hover:border-secondary transition-all duration-300 h-full">
                <CardContent className="pt-6 space-y-4">
                  {/* Step Number */}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-2xl shadow-lg">
                    {step.step}
                  </div>
                  
                  {/* Icon */}
                  <div className="text-secondary">
                    {step.icon}
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
