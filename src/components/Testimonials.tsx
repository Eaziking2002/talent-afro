import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Aminata Kamara",
    role: "UI/UX Designer",
    location: "Freetown, Sierra Leone",
    avatar: "",
    rating: 5,
    text: "SkillLink changed my life! Within 2 weeks of signing up, I landed my first remote design gig. The instant payout to my mobile money was incredible.",
    earnings: "$2,500+",
  },
  {
    name: "Kwame Asante",
    role: "Web Developer",
    location: "Accra, Ghana",
    avatar: "",
    rating: 5,
    text: "I was skeptical at first, but the escrow protection gave me confidence. Now I've completed over 30 gigs and built relationships with clients worldwide.",
    earnings: "$8,000+",
  },
  {
    name: "Fatou Diallo",
    role: "Content Writer",
    location: "Dakar, Senegal",
    avatar: "",
    rating: 5,
    text: "The verification process was so easy. My video intro helped me stand out, and employers love that I'm a verified talent. Best decision I ever made!",
    earnings: "$4,200+",
  },
  {
    name: "David Okonkwo",
    role: "Data Analyst",
    location: "Lagos, Nigeria",
    avatar: "",
    rating: 5,
    text: "From micro-gigs to a full-time remote position - SkillLink made it possible. The platform connected me with opportunities I never knew existed.",
    earnings: "$12,000+",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 md:py-32 bg-muted/30">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Success Stories from <span className="text-primary">African Talents</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Real people, real results. See how SkillLink is transforming lives across the continent.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-card-hover relative overflow-hidden"
            >
              <CardContent className="pt-6 space-y-4">
                {/* Quote Icon */}
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />
                
                {/* Rating */}
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-muted-foreground leading-relaxed italic">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role} • {testimonial.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Earned</p>
                    <p className="font-bold text-primary">{testimonial.earnings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Banner */}
        <div className="mt-16 bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-center text-primary-foreground">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl md:text-4xl font-bold">5,000+</div>
              <div className="text-sm opacity-90">Talents Hired</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold">$2M+</div>
              <div className="text-sm opacity-90">Total Paid Out</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold">15+</div>
              <div className="text-sm opacity-90">African Countries</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold">4.9★</div>
              <div className="text-sm opacity-90">Average Rating</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
