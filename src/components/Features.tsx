import { Card, CardContent } from "@/components/ui/card";
import { Zap, Shield, Clock, DollarSign } from "lucide-react";
import paymentIcon from "@/assets/payment-icon.png";
import verifiedIcon from "@/assets/verified-icon.png";
import gigsIcon from "@/assets/gigs-icon.png";

const features = [
  {
    icon: gigsIcon,
    title: "Micro-Gigs & Remote Jobs",
    description: "Browse thousands of short-term gigs and full remote positions across tech, creative, and business roles.",
    highlight: "2-8 hour projects",
  },
  {
    icon: verifiedIcon,
    title: "Quick Verification",
    description: "30-second video intro and phone verification get you started. Optional ID verification for premium opportunities.",
    highlight: "Start in 2 minutes",
  },
  {
    icon: paymentIcon,
    title: "Instant Payouts",
    description: "Receive payments directly to your mobile money wallet, bank account, or card. Most payouts arrive within minutes.",
    highlight: "Mobile money ready",
  },
  {
    icon: <Shield className="w-12 h-12 text-secondary" />,
    title: "Escrow Protection",
    description: "All payments are held in escrow until work is delivered and approved. Your earnings are always protected.",
    highlight: "100% secure",
  },
];

const additionalFeatures = [
  {
    icon: <Zap className="w-6 h-6 text-accent" />,
    title: "Free Micro-Courses",
    description: "Earn certificates in 2-8 hours and boost your profile ranking.",
  },
  {
    icon: <Clock className="w-6 h-6 text-accent" />,
    title: "Trial Internships",
    description: "Get paid to prove your skills with short trial periods.",
  },
  {
    icon: <DollarSign className="w-6 h-6 text-accent" />,
    title: "Transparent Fees",
    description: "Clear pricing with no hidden charges. See exactly what you'll earn.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Everything You Need to <span className="text-primary">Succeed</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Built specifically for African talent and employers. Fast, secure, and accessible on any device.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-card-hover group"
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  {typeof feature.icon === 'string' ? (
                    <img 
                      src={feature.icon} 
                      alt={feature.title}
                      className="w-16 h-16 object-contain transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="transition-transform group-hover:scale-110">
                      {feature.icon}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {feature.highlight}
                  </span>
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {additionalFeatures.map((feature, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="flex-shrink-0 p-2 bg-accent/10 rounded-lg">
                {feature.icon}
              </div>
              <div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
