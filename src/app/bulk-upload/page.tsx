"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ProcessResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
}

export default function BulkUploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
    type: "file" | "text"
  ) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process upload");
      }

      setResult(data);
      setShowResultModal(true);

      if (data.success) {
        toast({
          title: "Success",
          description: `Successfully processed ${data.successfulRows} out of ${data.totalRows} requests`,
        });
      } else {
        toast({
          title: "Warning",
          description: `Processed with errors: ${data.failedRows} failed rows`,
          variant: "destructive",
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process upload";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCloseModal() {
    setShowResultModal(false);
    if (result?.success) {
      router.push("/requests");
    }
  }

  return (
    <>
      <Header />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">
          Bulk Upload Must Go Requests
        </h1>

        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-2">
              Upload Excel/CSV File
            </h2>
            <form onSubmit={(e) => handleSubmit(e, "file")}>
              <div className="mb-4">
                <input
                  type="file"
                  name="file"
                  accept=".xlsx,.xls,.csv"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : "Upload File"}
              </Button>
            </form>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-2">Paste Data</h2>
            <form onSubmit={(e) => handleSubmit(e, "text")}>
              <div className="mb-4">
                <Textarea
                  name="text"
                  placeholder="Paste your data here..."
                  className="min-h-[200px]"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : "Process Text"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Expected Format:</h3>
          <p>
            For Excel/CSV files or pasted text, please ensure the following
            columns are present:
          </p>
          <ul className="list-disc list-inside mt-2">
            <li>SHIPMENT (required)</li>
            <li>PLANT</li>
            <li>DELPHI P/N (required)</li>
            <li>MG QTY (required)</li>
            <li>1ST truck # or 2ND truck # (for trailer number)</li>
          </ul>
        </div>

        <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {result?.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Upload Complete
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    Upload Completed with Issues
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">Total Requests</p>
                    <p className="font-medium">{result?.totalRows || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Successfully Created
                    </p>
                    <p className="font-medium text-green-600">
                      {result?.successfulRows || 0}
                    </p>
                  </div>
                  {result?.failedRows ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">Failed</p>
                      <p className="font-medium text-red-600">
                        {result.failedRows}
                      </p>
                    </div>
                  ) : null}
                </div>

                {result?.errors && result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Issues Found:</p>
                    <div className="max-h-[200px] overflow-y-auto">
                      <ul className="list-disc list-inside space-y-2">
                        {result.errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-600">
                            Row {error.row}: {error.errors.join(", ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCloseModal}>
                {result?.success ? "Go to Requests" : "Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
