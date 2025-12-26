import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Instagram, Facebook, Send, Target, Users, Globe, Briefcase } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ezekielPhoto from "@/assets/ezekiel-sesay.jpg";

const About = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Message Sent!",
        description: "Thank you for reaching out. We'll get back to you soon."
      });

      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const skills = [
    "Information Systems & IT Support",
    "Website & Platform Development",
    "Canva Design & Digital Branding",
    "Social Media Management",
    "Content Writing & Blogging",
    "Marketing Strategy & Online Growth",
    "ChatGPT & AI-Powered Tools",
    "Remote Work & Digital Operations"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About Ezekiel Sesay | SkillLink Africa Founder</title>
        <meta name="description" content="Meet Ezekiel Sesay (Eazi), founder of SkillLink Africa. IT professional, digital creator, and tech entrepreneur connecting Africans to global opportunities." />
      </Helmet>
      
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="relative">
            <div className="w-64 h-64 md:w-80 md:h-80 mx-auto rounded-full overflow-hidden border-4 border-primary shadow-xl">
              <img 
                src={ezekielPhoto} 
                alt="Ezekiel Sesay - Founder of SkillLink Africa" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
              <Badge className="text-lg px-4 py-2">Founder & Developer</Badge>
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">Ezekiel Sesay</h1>
            <p className="text-xl text-primary font-medium">Known as "Eazi"</p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A passionate Information Systems professional, digital creator, and tech-driven entrepreneur from <strong>Sierra Leone</strong>. 
              Currently pursuing a Bachelor's Degree in Information Systems at the Institute of Public Administration and Management (IPAM), 
              University of Sierra Leone.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:sesayezekiel81@gmail.com" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" /> sesayezekiel81@gmail.com
              </a>
              <span className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-5 h-5" /> +232 31 570010
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-5 h-5" /> Sierra Leone
              </span>
            </div>
            <div className="flex gap-4">
              <a href="https://instagram.com/eaziking2" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                <Instagram className="w-6 h-6 text-primary" />
              </a>
              <a href="https://facebook.com/eaziking" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                <Facebook className="w-6 h-6 text-primary" />
              </a>
            </div>
          </div>
        </section>

        {/* SkillLink Africa Mission */}
        <section className="mb-16">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">SkillLink Africa Mission</h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  Empowering Africans through technology and connecting them to global opportunities
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-background rounded-xl">
                  <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Our Vision</h3>
                  <p className="text-sm text-muted-foreground">To be the leading platform connecting African talent to global digital opportunities</p>
                </div>
                <div className="text-center p-6 bg-background rounded-xl">
                  <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Youth Empowerment</h3>
                  <p className="text-sm text-muted-foreground">Creating access to remote jobs, micro-gigs, and internships for young Africans</p>
                </div>
                <div className="text-center p-6 bg-background rounded-xl">
                  <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Global Access</h3>
                  <p className="text-sm text-muted-foreground">Breaking geographical barriers to connect Sierra Leoneans with worldwide opportunities</p>
                </div>
                <div className="text-center p-6 bg-background rounded-xl">
                  <Briefcase className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Digital Transformation</h3>
                  <p className="text-sm text-muted-foreground">Driving digital innovation and transformation across Africa</p>
                </div>
              </div>
              
              <p className="text-center mt-8 text-lg max-w-4xl mx-auto leading-relaxed">
                Through <strong>SkillLink Africa</strong> and <strong>SkillConnect Africa</strong>, we are building platforms designed to 
                connect Africans—especially Sierra Leoneans—to remote jobs, micro-gigs, internships, and global digital opportunities. 
                Our mission is to use technology to empower young people, create access to global income opportunities, 
                and drive digital transformation across Africa.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Skills & Experience */}
        <section className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-6">Skills & Expertise</h2>
            <div className="flex flex-wrap gap-3">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-sm py-2 px-4">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-6">Work Experience</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium">Social Media Manager & Canva Designer</p>
                  <p className="text-sm text-muted-foreground">UK-Based Marketing Company</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium">Blogger / Content Writer</p>
                  <p className="text-sm text-muted-foreground">Born 2 Blog</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium">IT Manager / IT Officer</p>
                  <p className="text-sm text-muted-foreground">Construction & Enterprise Companies</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium">Data Entry & System Operations</p>
                  <p className="text-sm text-muted-foreground">Various Organizations</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-2 text-center">Get In Touch</h2>
              <p className="text-muted-foreground text-center mb-8">
                Interested in collaborations, remote opportunities, partnerships, or innovative projects? Reach out!
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input 
                      id="name" 
                      placeholder="John Doe" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input 
                    id="subject" 
                    placeholder="How can I help you?" 
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell me about your project or opportunity..." 
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required 
                  />
                </div>
                
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
