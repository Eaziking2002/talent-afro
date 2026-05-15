import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: May 15, 2026</p>

        <p>SkillLink Africa ("we", "our", "us") respects your privacy. This policy explains what data we collect, why, and how we protect it.</p>

        <h2>Information we collect</h2>
        <ul>
          <li>Account details: email, password (hashed), phone (optional).</li>
          <li>Profile data: name, bio, skills, location, portfolio, CV.</li>
          <li>Application data: cover letters, salary expectations, status history.</li>
          <li>Usage data: pages viewed, jobs viewed, device/browser metadata.</li>
        </ul>

        <h2>How we use your data</h2>
        <ul>
          <li>To match you with jobs and employers.</li>
          <li>To process applications and contracts.</li>
          <li>To prevent fraud and abuse.</li>
          <li>To improve and secure the platform.</li>
        </ul>

        <h2>Data sharing</h2>
        <p>We do not sell your data. Profile and application data is shared only with employers you apply to, and with admins for moderation. Contact information is gated by active contract relationships.</p>

        <h2>Security</h2>
        <p>We use Row-Level Security on every table, AES-256 encryption for sensitive financial fields, secure file storage, and IP-based abuse blocking.</p>

        <h2>Your rights</h2>
        <p>You may request export or deletion of your data at any time by emailing <a href="mailto:skilllinkafrica01@gmail.com">skilllinkafrica01@gmail.com</a>.</p>

        <h2>Contact</h2>
        <p>Questions? Email us at <a href="mailto:skilllinkafrica01@gmail.com">skilllinkafrica01@gmail.com</a>.</p>
      </main>
      <Footer />
    </div>
  );
}
