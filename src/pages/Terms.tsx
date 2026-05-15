import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Terms &amp; Conditions</h1>
        <p className="text-muted-foreground">Last updated: May 15, 2026</p>

        <h2>1. Acceptance</h2>
        <p>By accessing SkillLink Africa you agree to these Terms.</p>

        <h2>2. Eligibility</h2>
        <p>You must be at least 16 years old and capable of forming a binding contract.</p>

        <h2>3. Accounts &amp; roles</h2>
        <p>You select Talent or Employer at signup. Roles are locked thereafter except by admin action. Provide accurate information and keep credentials secure.</p>

        <h2>4. Acceptable use</h2>
        <ul>
          <li>No fraud, misrepresentation, harassment, or spam.</li>
          <li>No scraping, reverse engineering, or interfering with the platform.</li>
          <li>No illegal jobs, discriminatory postings, or off-platform payment requests for escrow work.</li>
        </ul>

        <h2>5. Payments</h2>
        <p>Payments use manual proof verification (Bank Transfer, AfriMoney, Orange Money). All escrow disputes are resolved by SkillLink admins.</p>

        <h2>6. Liability</h2>
        <p>The platform is provided "as is". We are not liable for outcomes of contracts between Talents and Employers but will mediate disputes in good faith.</p>

        <h2>7. Termination</h2>
        <p>We may suspend accounts that violate these terms. You may close your account at any time.</p>

        <h2>8. Contact</h2>
        <p>Email <a href="mailto:skilllinkafrica01@gmail.com">skilllinkafrica01@gmail.com</a>.</p>
      </main>
      <Footer />
    </div>
  );
}
