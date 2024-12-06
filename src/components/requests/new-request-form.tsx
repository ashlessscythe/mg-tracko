"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RequestStatus } from "@prisma/client";
import type { FormData } from "@/lib/types";

export default function NewRequestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rawPartNumbers, setRawPartNumbers] = useState("");
  const [formData, setFormData] = useState<FormData>({
    shipmentNumber: "",
    plant: "",
    partNumbers: [],
    palletCount: 1,
    routeInfo: "",
    additionalNotes: "",
    status: RequestStatus.PENDING,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Parse part numbers from the raw text
      const partNumbers = rawPartNumbers
        .split(/[\n,]/) // Split by newline or comma
        .map((pn) => pn.trim()) // Trim whitespace
        .filter((pn) => pn.length > 0); // Remove empty strings

      if (partNumbers.length === 0) {
        throw new Error("At least one part number is required");
      }

      // Validate plant number if provided
      if (formData.plant && !/^[a-zA-Z0-9]{4}$/.test(formData.plant)) {
        throw new Error("Plant must be exactly 4 alphanumeric characters");
      }

      const requestData = {
        ...formData,
        partNumbers,
      };

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create request");
      }

      toast({
        title: "Success",
        description: "Request created successfully",
      });

      router.push("/requests");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "partNumbers") {
      setRawPartNumbers(value);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "palletCount" ? parseInt(value) || 1 : value,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="shipmentNumber">Shipment Number *</Label>
        <Input
          id="shipmentNumber"
          name="shipmentNumber"
          value={formData.shipmentNumber}
          onChange={handleChange}
          required
          placeholder="Enter shipment number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plant">Plant (4 characters)</Label>
        <Input
          id="plant"
          name="plant"
          value={formData.plant || ""}
          onChange={handleChange}
          placeholder="Enter 4-character plant code"
          pattern="[a-zA-Z0-9]{4}"
          title="Plant code must be exactly 4 alphanumeric characters"
          maxLength={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="partNumbers">Part Numbers *</Label>
        <Textarea
          id="partNumbers"
          name="partNumbers"
          value={rawPartNumbers}
          onChange={handleChange}
          required
          placeholder="Paste part numbers here (one per line or comma-separated)"
          rows={5}
        />
        <p className="text-sm text-muted-foreground">
          Paste part numbers from Excel, one per line or comma-separated
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="palletCount">Pallet Count *</Label>
        <Input
          id="palletCount"
          name="palletCount"
          type="number"
          min="1"
          value={formData.palletCount}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="routeInfo">Route Information</Label>
        <Input
          id="routeInfo"
          name="routeInfo"
          value={formData.routeInfo || ""}
          onChange={handleChange}
          placeholder="Enter route information"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalNotes">Additional Notes</Label>
        <Textarea
          id="additionalNotes"
          name="additionalNotes"
          value={formData.additionalNotes || ""}
          onChange={handleChange}
          placeholder="Enter any additional notes"
          rows={4}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Creating..." : "Create Request"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
