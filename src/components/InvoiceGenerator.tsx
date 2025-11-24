import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  contractId: string;
  jobTitle: string;
  employerName: string;
  talentName: string;
  currency: string;
  milestones: Array<{
    title: string;
    amount_minor_units: number;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  totalAmount: number;
  startDate: string;
  endDate: string;
  platformFee: number;
}

interface InvoiceGeneratorProps {
  invoiceData: InvoiceData;
}

export const InvoiceGenerator = ({ invoiceData }: InvoiceGeneratorProps) => {
  const { toast } = useToast();

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", pageWidth / 2, 20, { align: "center" });
      
      // Contract Info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 14, 35);
      doc.text(`Contract ID: ${invoiceData.contractId}`, 14, 40);
      
      // Parties
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("From:", 14, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(invoiceData.talentName, 14, 60);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("To:", 14, 75);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(invoiceData.employerName, 14, 80);
      
      // Project Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Project:", 14, 95);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(invoiceData.jobTitle, 14, 100);
      doc.text(`Period: ${new Date(invoiceData.startDate).toLocaleDateString()} - ${new Date(invoiceData.endDate).toLocaleDateString()}`, 14, 105);
      
      // Milestones Table
      const milestoneData = invoiceData.milestones.map((m, index) => [
        index + 1,
        m.title,
        m.status,
        new Date(m.updated_at).toLocaleDateString(),
        `${(m.amount_minor_units / 100).toFixed(2)} ${invoiceData.currency}`,
      ]);
      
      autoTable(doc, {
        startY: 115,
        head: [["#", "Milestone", "Status", "Completed", "Amount"]],
        body: milestoneData,
        theme: "striped",
        headStyles: { fillColor: [139, 92, 246] },
      });
      
      // Summary
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const subtotal = invoiceData.totalAmount;
      const platformFee = invoiceData.platformFee;
      const taxRate = 0.1; // 10% tax
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const summaryX = pageWidth - 70;
      doc.text("Subtotal:", summaryX, finalY);
      doc.text(`${(subtotal / 100).toFixed(2)} ${invoiceData.currency}`, pageWidth - 14, finalY, { align: "right" });
      
      doc.text("Platform Fee:", summaryX, finalY + 7);
      doc.text(`${(platformFee / 100).toFixed(2)} ${invoiceData.currency}`, pageWidth - 14, finalY + 7, { align: "right" });
      
      doc.text("Tax (10%):", summaryX, finalY + 14);
      doc.text(`${(tax / 100).toFixed(2)} ${invoiceData.currency}`, pageWidth - 14, finalY + 14, { align: "right" });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Total:", summaryX, finalY + 24);
      doc.text(`${(total / 100).toFixed(2)} ${invoiceData.currency}`, pageWidth - 14, finalY + 24, { align: "right" });
      
      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);
      doc.text("Thank you for your business!", pageWidth / 2, doc.internal.pageSize.height - 20, { align: "center" });
      doc.text("Generated via SkillLink Africa Platform", pageWidth / 2, doc.internal.pageSize.height - 15, { align: "center" });
      
      // Save
      doc.save(`invoice-${invoiceData.contractId}.pdf`);
      
      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Button onClick={generatePDF} variant="outline" className="gap-2">
      <Download className="w-4 h-4" />
      Download Invoice
    </Button>
  );
};

export default InvoiceGenerator;
