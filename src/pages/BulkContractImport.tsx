import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Download, FileText, CheckCircle, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ContractRow {
  talent_email: string;
  job_title: string;
  amount: number;
  start_date?: string;
  end_date?: string;
  terms?: string;
  status?: "pending" | "success" | "error";
  error?: string;
}

export default function BulkContractImport() {
  const [file, setFile] = useState<File | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ContractRow[]>([]);

  const downloadTemplate = () => {
    const template = `talent_email,job_title,amount,start_date,end_date,terms
john@example.com,Web Development Project,5000,2024-01-01,2024-03-01,Complete website redesign
jane@example.com,Logo Design,500,2024-01-15,2024-02-15,Create brand identity`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contract_import_template.csv";
    a.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      toast.error("Please upload a valid CSV file");
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim());
      
      const parsed = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return {
          talent_email: row.talent_email,
          job_title: row.job_title,
          amount: parseFloat(row.amount),
          start_date: row.start_date,
          end_date: row.end_date,
          terms: row.terms,
          status: "pending" as const
        };
      });
      
      setContracts(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (contracts.length === 0) {
      toast.error("No contracts to import");
      return;
    }

    setProcessing(true);
    const processedResults: ContractRow[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get employer profile
      const { data: employerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employerProfile) throw new Error("Employer profile not found");

      for (const contract of contracts) {
        try {
          // Find talent by email
          const { data: talentProfile, error: talentError } = await supabase
            .from("profiles")
            .select("id, user_id")
            .eq("email", contract.talent_email)
            .single();

          if (talentError || !talentProfile) {
            processedResults.push({
              ...contract,
              status: "error",
              error: "Talent not found"
            });
            continue;
          }

          // Create job
          const { data: job, error: jobError } = await supabase
            .from("jobs")
            .insert({
              title: contract.job_title,
              description: contract.terms || "Imported contract",
              budget_min: contract.amount,
              budget_max: contract.amount,
              status: "open",
              employer_id: employerProfile.id
            })
            .select()
            .single();

          if (jobError || !job) {
            processedResults.push({
              ...contract,
              status: "error",
              error: "Failed to create job"
            });
            continue;
          }

          // Create application
          const { data: application, error: appError } = await supabase
            .from("applications")
            .insert({
              job_id: job.id,
              applicant_id: talentProfile.id,
              proposal_text: "Bulk import application",
              status: "accepted"
            })
            .select()
            .single();

          if (appError || !application) {
            processedResults.push({
              ...contract,
              status: "error",
              error: "Failed to create application"
            });
            continue;
          }

          // Create contract
          const { error: contractError } = await supabase
            .from("contracts")
            .insert({
              job_id: job.id,
              application_id: application.id,
              employer_id: user.id,
              talent_id: talentProfile.user_id,
              total_amount_minor_units: Math.round(contract.amount * 100),
              currency: "USD",
              status: "draft",
              terms: contract.terms || "",
              start_date: contract.start_date,
              end_date: contract.end_date
            });

          if (contractError) {
            processedResults.push({
              ...contract,
              status: "error",
              error: "Failed to create contract"
            });
            continue;
          }

          processedResults.push({
            ...contract,
            status: "success"
          });
        } catch (error: any) {
          processedResults.push({
            ...contract,
            status: "error",
            error: error.message
          });
        }
      }

      setResults(processedResults);
      const successCount = processedResults.filter(r => r.status === "success").length;
      toast.success(`Imported ${successCount} out of ${contracts.length} contracts`);
    } catch (error: any) {
      toast.error("Failed to import contracts: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Bulk Contract Import</h1>
          <p className="text-muted-foreground">
            Import multiple contracts at once using a CSV file
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                Upload a CSV file with contract details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              {contracts.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">
                      {contracts.length} contracts ready
                    </span>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <Button
                    onClick={handleImport}
                    disabled={processing}
                    className="w-full"
                  >
                    {processing ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Contracts
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Review contracts before importing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 && results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Upload a CSV file to preview contracts
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Talent</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Dates</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(results.length > 0 ? results : contracts).map((contract, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {contract.status === "success" ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Success
                              </Badge>
                            ) : contract.status === "error" ? (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Error
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {contract.talent_email}
                          </TableCell>
                          <TableCell>{contract.job_title}</TableCell>
                          <TableCell>${contract.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {contract.start_date && contract.end_date
                              ? `${contract.start_date} - ${contract.end_date}`
                              : "Not specified"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {results.some(r => r.error) && (
                    <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                      <p className="font-medium mb-2">Errors:</p>
                      <ul className="text-sm space-y-1">
                        {results
                          .filter(r => r.error)
                          .map((r, i) => (
                            <li key={i}>
                              {r.talent_email}: {r.error}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
