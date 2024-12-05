"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RequestStatus } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { RequestDetail } from "@/lib/types";

type SortableField = keyof Pick<
  RequestDetail,
  "shipmentNumber" | "palletCount" | "status" | "createdAt"
>;

export default function RequestList() {
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">(
    "ALL"
  );
  const [sortField, setSortField] = useState<SortableField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchRequests = useCallback(async () => {
    try {
      let url = "/api/requests";
      if (statusFilter !== "ALL") {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }

      const data = await response.json();
      setRequests(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load requests";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSort = (field: SortableField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedRequests = [...requests].sort((a, b) => {
    let compareResult = 0;

    switch (sortField) {
      case "shipmentNumber":
        compareResult = a.shipmentNumber.localeCompare(b.shipmentNumber);
        break;
      case "palletCount":
        compareResult = a.palletCount - b.palletCount;
        break;
      case "status":
        compareResult = a.status.localeCompare(b.status);
        break;
      case "createdAt":
        compareResult =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return sortDirection === "asc" ? compareResult : -compareResult;
  });

  const getStatusBadgeColor = (status: RequestStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500";
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={statusFilter === "ALL" ? "default" : "outline"}
          onClick={() => setStatusFilter("ALL")}
        >
          All
        </Button>
        {Object.values(RequestStatus).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status)}
          >
            {status.replace("_", " ")}
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("shipmentNumber")}
            >
              Shipment #
            </TableHead>
            <TableHead>Part Numbers</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("palletCount")}
            >
              Pallets
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("status")}
            >
              Status
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("createdAt")}
            >
              Created
            </TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.shipmentNumber}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {request.partNumbers.map((pn, index) => (
                    <div key={index} className="text-sm">
                      {pn}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{request.palletCount}</TableCell>
              <TableCell>
                <Badge className={getStatusBadgeColor(request.status)}>
                  {request.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(request.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {request.creator.name}
                <span className="block text-sm text-gray-500">
                  {request.creator.role}
                </span>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/requests/${request.id}`)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
