import { forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ReceiptProps {
  transaction: {
    id: string;
    created_at: string;
    amount_minor_units: number;
    platform_fee_minor_units: number;
    net_amount_minor_units: number;
    currency: string;
    type: string;
    status: string;
    description: string;
    external_reference?: string;
    jobs?: { title: string };
  };
  userEmail?: string;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ transaction, userEmail }, ref) => {
    const formatAmount = (amount: number, currency: string) => {
      return `${(amount / 100).toFixed(2)} ${currency}`;
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleString();
    };

    return (
      <div ref={ref} className="receipt-content p-8 bg-background max-w-2xl mx-auto">
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-3xl font-bold">Payment Receipt</CardTitle>
            <div className="text-muted-foreground">
              <p className="text-sm">Transaction ID: {transaction.id}</p>
              <p className="text-sm">Date: {formatDate(transaction.created_at)}</p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Separator />
            
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Status:</span>
                <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                  {transaction.status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Type:</span>
                <Badge variant="outline">{transaction.type.toUpperCase()}</Badge>
              </div>
              
              {transaction.jobs?.title && (
                <div className="flex justify-between items-start">
                  <span className="font-semibold">Job:</span>
                  <span className="text-right max-w-xs">{transaction.jobs.title}</span>
                </div>
              )}
              
              {transaction.description && (
                <div className="flex justify-between items-start">
                  <span className="font-semibold">Description:</span>
                  <span className="text-right max-w-xs">{transaction.description}</span>
                </div>
              )}

              {transaction.external_reference && (
                <div className="flex justify-between items-start">
                  <span className="font-semibold">Reference:</span>
                  <span className="text-right text-sm">{transaction.external_reference}</span>
                </div>
              )}

              {userEmail && (
                <div className="flex justify-between items-start">
                  <span className="font-semibold">Email:</span>
                  <span className="text-right">{userEmail}</span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Subtotal:</span>
                <span>{formatAmount(transaction.amount_minor_units, transaction.currency)}</span>
              </div>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Platform Fee (10%):</span>
                <span>-{formatAmount(transaction.platform_fee_minor_units, transaction.currency)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-xl font-bold">
                <span>Net Amount:</span>
                <span>{formatAmount(transaction.net_amount_minor_units, transaction.currency)}</span>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground pt-4">
              <p>Thank you for using our platform!</p>
              <p className="mt-2">For support, please contact support@platform.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";
