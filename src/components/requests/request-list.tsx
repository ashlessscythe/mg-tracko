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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { RequestDetail } from "@/lib/types";
import { useSession } from "next-auth/react";

type SortableField = keyof Pick<
  RequestDetail,
  | "shipmentNumber"
  | "plant"
  | "trailerNumber"
  | "palletCount"
  | "status"
  | "createdAt"
>;

type FilterStatus = RequestStatus | "ALL" | "DELETED";

export default function RequestList() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [requests, setRequests] = useState<RequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [sortField, setSortField] = useState<SortableField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "ADMIN";

  const fetchRequests = useCallback(async () => {
    try {
      let url = "/api/requests";
      if (statusFilter === "DELETED") {
        url += "?includeDeleted=true";
      } else if (statusFilter !== "ALL") {
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

  const handleDeleteClick = (id: string) => {
    setRequestToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;

    try {
      const response = await fetch(`/api/requests/${requestToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete request");
      }

      toast({
        title: "Success",
        description: "Request deleted successfully",
      });

      // Reset dialog state
      setDeleteDialogOpen(false);
      setRequestToDelete(null);

      // Refresh the requests list
      fetchRequests();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUndelete = async (id: string) => {
    try {
      const response = await fetch(`/api/requests/${id}/undelete`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to restore request");
      }

      toast({
        title: "Success",
        description: "Request restored successfully",
      });

      // Refresh the requests list
      fetchRequests();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to restore request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const sortedRequests = [...requests]
    .sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case "shipmentNumber":
          compareResult = a.shipmentNumber.localeCompare(b.shipmentNumber);
          break;
        case "plant":
          compareResult = (a.plant || "").localeCompare(b.plant || "");
          break;
        case "trailerNumber":
          compareResult = (a.trailerNumber || "").localeCompare(
            b.trailerNumber || ""
          );
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
    })
    .filter((request) => {
      if (statusFilter === "DELETED") {
        return request.deleted;
      }
      if (statusFilter === "ALL") {
        return !request.deleted;
      }
      return !request.deleted && request.status === statusFilter;
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
        {isAdmin && (
          <Button
            variant={statusFilter === "DELETED" ? "default" : "outline"}
            onClick={() => setStatusFilter("DELETED")}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Deleted
          </Button>
        )}
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
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("plant")}
            >
              Plant
            </TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("trailerNumber")}
            >
              Trailer #
            </TableHead>
            <TableHead>Parts</TableHead>
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
              <TableCell>{request.plant || "-"}</TableCell>
              <TableCell>{request.trailerNumber || "-"}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {request.partDetails.map((part, index) => (
                    <div key={index} className="text-sm">
                      {part.partNumber} ({part.quantity})
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
              <TableCell className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/requests/${request.id}`)}
                >
                  View
                </Button>
                {isAdmin && !request.deleted && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(request.id)}
                  >
                    Delete
                  </Button>
                )}
                {isAdmin && request.deleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUndelete(request.id)}
                  >
                    Restore
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action can be
              undone later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
