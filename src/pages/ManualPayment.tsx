import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useManualPayments } from "@/hooks/useManualPayments";
import { ArrowLeft, Upload, FileText } from "lucide-react";

const ManualPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { submitPaymentProof, uploading } = useManualPayments();
  
  const transactionId = searchParams.get('transactionId');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency') || 'USD';

  const [file, setFile] = useState<File | null>(null);
  const [bankDetails, setBankDetails] = useState("");
  const [notes, setNotes] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionId) {
      return;
    }

    if (!file) {
      alert("Please select a payment proof file");
      return;
    }

    try {
      await submitPaymentProof({
        transactionId,
        file,
        bankDetails,
        notes,
      });

      navigate('/payment-dashboard');
    } catch (error) {
      console.error('Payment proof submission failed:', error);
    }
  };

  if (!transactionId) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Invalid Transaction</CardTitle>
            <CardDescription>No transaction ID provided</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Submit Payment Proof</CardTitle>
            <CardDescription>
              Upload proof of your bank transfer to complete the payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Payment Details</h3>
              <p className="text-sm text-muted-foreground">
                Amount: <span className="font-medium">{amount} {currency}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Transaction ID: <span className="font-medium">{transactionId}</span>
              </p>
            </div>

            <div className="mb-6 space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">💳 Bank Transfer</h3>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p><strong>Bank Name:</strong> Vult</p>
                  <p><strong>Account Name:</strong> SkillLink Africa</p>
                  <p><strong>Account Number:</strong> 4934920021252202</p>
                  <p><strong>Currency:</strong> SLE</p>
                  <p><strong>Reference:</strong> {transactionId}</p>
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                <h3 className="font-semibold mb-2 text-orange-900 dark:text-orange-100">📱 Orange Money</h3>
                <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                  <p><strong>Name:</strong> SkillLink Africa</p>
                  <p><strong>Number:</strong> +232 76 348 278</p>
                  <p><strong>Reference:</strong> {transactionId}</p>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <h3 className="font-semibold mb-2 text-green-900 dark:text-green-100">📱 AfriMoney</h3>
                <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <p><strong>Name:</strong> SkillLink Africa</p>
                  <p><strong>Number:</strong> +232 33 430 315</p>
                  <p><strong>Reference:</strong> {transactionId}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="file">Payment Proof (Receipt/Screenshot) *</Label>
                <div className="mt-2">
                  <Input
                    id="file"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    required
                  />
                  {file && (
                    <div className="mt-2 flex items-center text-sm text-muted-foreground">
                      <FileText className="mr-2 h-4 w-4" />
                      {file.name}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bankDetails">Bank Details Used (Optional)</Label>
                <Input
                  id="bankDetails"
                  placeholder="e.g., Bank Name, Account ending in 1234"
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about this payment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Payment Proof
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualPayment;
