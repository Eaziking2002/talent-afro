import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PaymentMethodSelectorProps {
  onSelectMethod?: (method: 'manual' | 'paypal') => void;
}

const PaymentMethodSelector = ({ onSelectMethod }: PaymentMethodSelectorProps) => {
  const navigate = useNavigate();

  const handleManualPayment = () => {
    if (onSelectMethod) {
      onSelectMethod('manual');
    } else {
      navigate('/manual-payment');
    }
  };

  const handlePayPalPayment = () => {
    if (onSelectMethod) {
      onSelectMethod('paypal');
    } else {
      // PayPal integration coming soon
      alert('PayPal integration coming soon!');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {/* Manual Bank Transfer */}
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleManualPayment}>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary/10">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Bank Transfer</CardTitle>
          </div>
          <CardDescription>
            Direct bank transfer with manual verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Secure escrow protection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Upload payment proof</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Verified within 24 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>No additional fees</span>
            </li>
          </ul>
          <Button className="w-full" onClick={(e) => { e.stopPropagation(); handleManualPayment(); }}>
            Pay with Bank Transfer
          </Button>
        </CardContent>
      </Card>

      {/* PayPal */}
      <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75" onClick={handlePayPalPayment}>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-secondary/10">
              <CreditCard className="w-6 h-6 text-secondary" />
            </div>
            <CardTitle>PayPal</CardTitle>
          </div>
          <CardDescription>
            Fast and secure online payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-secondary">✓</span>
              <span>Instant payment processing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary">✓</span>
              <span>Buyer protection included</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary">✓</span>
              <span>Automatic escrow release</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-secondary">✓</span>
              <span>International payments</span>
            </li>
          </ul>
          <Button variant="secondary" className="w-full" onClick={(e) => { e.stopPropagation(); handlePayPalPayment(); }} disabled>
            Pay with PayPal (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethodSelector;
