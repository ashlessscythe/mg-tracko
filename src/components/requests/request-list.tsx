"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RequestStatus } from "@prisma/client";
import { useAuth } from "@/lib/auth-context";

interface RequestCreator {
  id: string;
  name: string;
  role: string;
}

interface Request {
  id: string;
  shipmentNumber: string;
  plant: string | null;
  routeInfo: string | null;
  palletCount: number;
  status: RequestStatus;
  creator: RequestCreator;
  createdAt: string;
  deleted: boolean;
}

interface RequestListProps {
  requests: Request[];
  showActions?: boolean;
}

export default function RequestList({
  requests = [],
  showActions = true,
}: RequestListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add auto-refresh functionality with a more reasonable interval (30 seconds)
  useEffect(() => {
    // Initial refresh to ensure we have fresh data
    router.refresh();

    // Set up interval for periodic refreshes
    const intervalId = setInterval(() => {
      router.refresh();
    }, 30000); // Refresh every 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [router]);

  if (!user) {
    return null;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete request");
      }

      toast({
        title: "Success",
        description: "Request deleted successfully",
      });
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleUndelete = async (id: string) => {
    if (!confirm("Are you sure you want to restore this request?")) return;

    setDeleting(id);
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
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to restore request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadgeColor = (status: RequestStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500"; // Waiting to be processed
      case "APPROVED":
        return "bg-emerald-500"; // Request approved, ready to proceed
      case "REJECTED":
        return "bg-red-500"; // Request not approved
      case "IN_PROGRESS":
        return "bg-blue-500"; // Being worked on
      case "LOADING":
        return "bg-indigo-500"; // Parts being loaded
      case "IN_TRANSIT":
        return "bg-purple-500"; // Shipment on the way
      case "ARRIVED":
        return "bg-teal-500"; // Reached destination
      case "COMPLETED":
        return "bg-green-500"; // Successfully finished
      case "ON_HOLD":
        return "bg-orange-500"; // Temporarily paused
      case "CANCELLED":
        return "bg-slate-500"; // Request cancelled
      case "FAILED":
        return "bg-rose-500"; // Critical failure
      default:
        return "bg-gray-500";
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No requests found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shipment Number</TableHead>
            <TableHead>Plant</TableHead>
            <TableHead>Route Info</TableHead>
            <TableHead>Pallet Count</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Created At</TableHead>
            {showActions && user?.role === "ADMIN" && (
              <TableHead>Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow
              key={request.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors duration-150"
            >
              <TableCell>
                <Link
                  href={`/requests/${request.id}`}
                  className="text-blue-500 hover:underline"
                >
                  {request.shipmentNumber}
                </Link>
              </TableCell>
              <TableCell>{request.plant || "-"}</TableCell>
              <TableCell>{request.routeInfo || "-"}</TableCell>
              <TableCell>{request.palletCount}</TableCell>
              <TableCell>
                <Badge className={getStatusBadgeColor(request.status)}>
                  {request.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                {request.creator.name}
                <br />
                <span className="text-sm text-muted-foreground">
                  {request.creator.role}
                </span>
              </TableCell>
              <TableCell>
                {new Date(request.createdAt).toLocaleString()}
              </TableCell>
              {showActions && user?.role === "ADMIN" && (
                <TableCell>
                  {request.deleted ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUndelete(request.id)}
                      disabled={deleting === request.id}
                    >
                      {deleting === request.id ? "Restoring..." : "Restore"}
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(request.id)}
                      disabled={deleting === request.id}
                    >
                      {deleting === request.id ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
