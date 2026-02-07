import { Sparkles, Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import ezekielPhoto from "@/assets/ezekiel-sesay.jpg";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Footer = () => {
  return (
    <footer className="border-t bg-muted/30 pb-20 md:pb-0">
      <div className="container px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-hero-gradient shadow-md">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">
                Skill<span className="text-primary">Link</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting Africa's best talent with remote opportunities and instant payouts.
            </p>
            <a
              href="mailto:skilllinkafrica01@gmail.com"
              className="text-sm text-primary hover:underline"
            >
              skilllinkafrica01@gmail.com
            </a>
          </div>

          {/* For Talent */}
          <div>
            <h3 className="font-semibold mb-4">For Talent</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/jobs" className="hover:text-foreground transition-colors">Find Jobs</Link></li>
              <li><Link to="/marketplace" className="hover:text-foreground transition-colors">Marketplace</Link></li>
              <li><Link to="/verification" className="hover:text-foreground transition-colors">Get Verified</Link></li>
              <li><Link to="/skill-gap-analysis" className="hover:text-foreground transition-colors">Skill Gap Analysis</Link></li>
              <li><Link to="/certifications" className="hover:text-foreground transition-colors">Certifications</Link></li>
            </ul>
          </div>

          {/* For Employers */}
          <div>
            <h3 className="font-semibold mb-4">For Employers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/talents" className="hover:text-foreground transition-colors">Find Talent</Link></li>
              <li><Link to="/employer/dashboard" className="hover:text-foreground transition-colors">Post a Job</Link></li>
              <li><Link to="/bulk-contracts" className="hover:text-foreground transition-colors">Bulk Import</Link></li>
              <li><Link to="/templates" className="hover:text-foreground transition-colors">Contract Templates</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><a href="/#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="/#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              <li><a href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
              <li><Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link to="/referrals" className="hover:text-foreground transition-colors">Referral Program</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link></li>
              <li><Link to="/analytics" className="hover:text-foreground transition-colors">Analytics</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Section */}
        <div className="mt-8 pt-8 border-t">
          <h3 className="font-semibold mb-4 text-lg">Developer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="flex justify-center md:justify-start">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary shadow-lg">
                <img
                  src={ezekielPhoto}
                  alt="Ezekiel Sesay - Developer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Ezekiel Sesay (Eazi)</span> — Information Systems Professional, Digital Creator & Tech Entrepreneur from Sierra Leone. Founder of SkillLink Africa, connecting Africans to remote jobs and digital opportunities.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">IT & Systems</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">Web Development</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">Digital Marketing</span>
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">Content Creation</span>
              </div>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Hire Me / Collaborate</p>
              <ul className="space-y-1">
                <li>📧 <a href="mailto:sesayezekiel81@gmail.com" className="hover:text-primary transition-colors">sesayezekiel81@gmail.com</a></li>
                <li>📞 +232 31 570010 / +23233430315</li>
                <li className="flex gap-3 pt-1">
                  <a href="https://instagram.com/eaziking2" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a href="https://facebook.com/eaziking" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    <Facebook className="w-4 h-4" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 SkillLink Africa. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="https://www.facebook.com/profile.php?id=61584774670112" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Facebook"><Facebook className="w-5 h-5" /></a>
              <a href="https://x.com/SkilllinkA68742" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="X (Twitter)"><Twitter className="w-5 h-5" /></a>
              <a href="https://www.instagram.com/skilllink_africa/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Instagram"><Instagram className="w-5 h-5" /></a>
              <a href="https://www.linkedin.com/in/skilllink-africa-a06008394/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="LinkedIn"><Linkedin className="w-5 h-5" /></a>
              <a href="https://www.tiktok.com/@skilllink_africa" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="TikTok"><TikTokIcon className="w-5 h-5" /></a>
              <a href="http://www.youtube.com/@SkillLinkAfrica-d1e" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="YouTube"><Youtube className="w-5 h-5" /></a>
              <a href="https://wa.me/23233430315" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="WhatsApp"><WhatsAppIcon className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
