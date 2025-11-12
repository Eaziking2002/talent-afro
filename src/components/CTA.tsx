import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-hero-gradient opacity-5" />
      
      <div className="container px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary to-secondary rounded-3xl p-8 md:p-12 lg:p-16 text-center shadow-2xl">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-foreground/20 mb-8">
              <Smartphone className="w-10 h-10 text-primary-foreground" />
            </div>

            {/* Content */}
            <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
              Ready to Start Earning?
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of African talents already earning from micro-gigs and remote jobs. 
              Sign up now and get matched with your first opportunity.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="xl" 
                variant="secondary"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl group"
              >
                Create Talent Profile
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                size="xl" 
                variant="outline"
                className="border-2 border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Post a Job
              </Button>
            </div>

            {/* Trust Badge */}
            <div className="mt-8 pt-8 border-t border-primary-foreground/20">
              <p className="text-sm text-primary-foreground/80">
                🔒 Secure payments • 💯 Escrow protected • ⚡ Instant payouts
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
