"use client";

import { useState } from "react";
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
        return "bg-yellow-500";
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-green-500";
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
            <TableRow key={request.id}>
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
