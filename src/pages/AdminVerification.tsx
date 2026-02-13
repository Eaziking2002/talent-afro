import Header from "@/components/Header";
import AdminVerificationReview from "@/components/verification/AdminVerificationReview";

export default function AdminVerification() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Verification Management</h1>
          <p className="text-muted-foreground">
            Review and approve identity verification submissions
          </p>
        </div>
        <AdminVerificationReview />
      </div>
    </div>
  );
}
