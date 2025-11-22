import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const FAQ = () => {
  const faqs = [
    {
      question: "How does the payment system work?",
      answer: "We support both manual bank transfers and PayPal payments. Funds are held in escrow until the job is completed and verified. Once approved, the talent receives payment directly to their wallet."
    },
    {
      question: "What are the platform fees?",
      answer: "We charge a 10% platform fee on all transactions. This covers payment processing, escrow services, dispute resolution, and platform maintenance."
    },
    {
      question: "How long does it take to receive payment?",
      answer: "Once a job is marked as complete and verified by the employer, funds are released instantly to the talent's wallet. Withdrawal to your bank account typically takes 1-3 business days."
    },
    {
      question: "Is my money safe in escrow?",
      answer: "Yes! All funds are held securely in escrow until the work is completed and approved. This protects both employers and talents from fraud or non-delivery."
    },
    {
      question: "Can I get a refund if I'm not satisfied?",
      answer: "If there's a dispute about the work quality, our dispute resolution team will review the case. Refunds are issued if the work doesn't meet the agreed-upon specifications."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We currently accept manual bank transfers and PayPal. Both methods support escrow protection and secure transactions."
    },
    {
      question: "How do I verify my payment proof?",
      answer: "After making a manual bank transfer, upload your payment receipt in the payment portal. Our admin team will verify it within 24 hours and release the funds to escrow."
    },
    {
      question: "Can I work on multiple jobs at once?",
      answer: "Yes! You can apply for and work on multiple jobs simultaneously. Just make sure you can meet all the deadlines and deliver quality work."
    }
  ];

  return (
    <section id="faq" className="py-20 md:py-32 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about SkillLink Africa
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-background border rounded-lg px-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold text-base">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Contact Section */}
          <div className="mt-12 text-center p-8 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-muted-foreground mb-4">
              Still have questions?
            </p>
            <p className="text-sm text-muted-foreground">
              Contact us at{" "}
              <a href="mailto:support@skilllinkafrica.com" className="text-primary font-medium hover:underline">
                support@skilllinkafrica.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
