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

interface PartInput {
  partNumber: string;
  quantity: number;
}

export default function NewRequestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rawPartInput, setRawPartInput] = useState("");
  const [formData, setFormData] = useState<FormData>({
    shipmentNumber: "",
    plant: "",
    trailers: [
      {
        trailerNumber: "",
        parts: [],
      },
    ],
    palletCount: 1,
    routeInfo: "",
    additionalNotes: "",
    status: RequestStatus.PENDING,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Parse part numbers and quantities from the raw text
      const parts: PartInput[] = rawPartInput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [partNumber, quantityStr] = line
            .split(/[,\t]/)
            .map((s) => s.trim());
          const quantity = parseInt(quantityStr) || 1;
          if (!partNumber) {
            throw new Error("Each line must contain a part number");
          }
          return { partNumber, quantity };
        });

      if (parts.length === 0) {
        throw new Error("At least one part number is required");
      }

      // Validate plant number if provided
      if (formData.plant && !/^[a-zA-Z0-9]{4}$/.test(formData.plant)) {
        throw new Error("Plant must be exactly 4 alphanumeric characters");
      }

      // Validate trailer number since it's required in the new schema
      if (!formData.trailers[0].trailerNumber) {
        throw new Error("Trailer number is required");
      }

      const requestData = {
        ...formData,
        trailers: [
          {
            ...formData.trailers[0],
            parts,
          },
        ],
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

      // Navigate to the new request's detail page
      router.refresh(); // Refresh all server components
      router.push(`/requests/${data.id}`);
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
    if (name === "parts") {
      setRawPartInput(value);
    } else if (name === "trailerNumber") {
      setFormData((prev) => ({
        ...prev,
        trailers: [
          {
            ...prev.trailers[0],
            trailerNumber: value,
          },
        ],
      }));
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
        <Label htmlFor="trailerNumber">Trailer Number *</Label>
        <Input
          id="trailerNumber"
          name="trailerNumber"
          value={formData.trailers[0].trailerNumber}
          onChange={handleChange}
          required
          placeholder="Enter trailer number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parts">Part Numbers and Quantities *</Label>
        <Textarea
          id="parts"
          name="parts"
          value={rawPartInput}
          onChange={handleChange}
          required
          placeholder="Enter part numbers and quantities (one per line, separated by comma or tab)&#10;Example:&#10;35834569, 6&#10;35834578, 12"
          rows={5}
        />
        <p className="text-sm text-muted-foreground">
          Format: Part Number, Quantity (one per line)
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
