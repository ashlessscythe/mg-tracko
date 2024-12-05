"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RequestStatus } from "@prisma/client";
import { useAuth } from "@/lib/auth-context";

interface RequestDetail {
  id: string;
  shipmentNumber: string;
  partNumber: {
    partNumber: string;
    description?: string | null;
  };
  palletCount: number;
  status: RequestStatus;
  routeInfo?: string | null;
  additionalNotes?: string | null;
  createdAt: string;
  creator: {
    name: string;
    email: string;
    role: string;
  };
  logs: {
    id: string;
    action: string;
    timestamp: string;
    performer: {
      name: string;
      role: string;
    };
  }[];
}

interface RequestDetailProps {
  id: string;
}

export default function RequestDetail({ id }: RequestDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<RequestStatus | "">("");
  const [statusNote, setStatusNote] = useState("");

  const fetchRequest = useCallback(async () => {
    try {
      const response = await fetch(`/api/requests/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch request");
      }

      const data = await response.json();
      setRequest(data);
      setNewStatus(data.status);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load request details";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      router.push("/requests");
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === request?.status) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      const updatedRequest = await response.json();
      setRequest(updatedRequest);
      setStatusNote("");
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update request status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!request) {
    return <div>Request not found</div>;
  }

  const canUpdateStatus = user?.role === "WAREHOUSE" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Request Details</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">
                Shipment Number
              </div>
              <div className="font-medium">{request.shipmentNumber}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Part Number</div>
              <div className="font-medium">
                {request.partNumber.partNumber}
                {request.partNumber.description && (
                  <span className="block text-sm text-muted-foreground">
                    {request.partNumber.description}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Pallet Count</div>
              <div className="font-medium">{request.palletCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge className={getStatusBadgeColor(request.status)}>
                {request.status.replace("_", " ")}
              </Badge>
            </div>
            {request.routeInfo && (
              <div>
                <div className="text-sm text-muted-foreground">Route Info</div>
                <div className="font-medium">{request.routeInfo}</div>
              </div>
            )}
            {request.additionalNotes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="font-medium">{request.additionalNotes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Created By</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{request.creator.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Role</div>
              <div className="font-medium">{request.creator.role}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">
                {new Date(request.createdAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {canUpdateStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Update Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={newStatus}
              onValueChange={(value: string) =>
                setNewStatus(value as RequestStatus)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RequestStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Add a note about this status update"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
            />
            <Button
              onClick={handleStatusUpdate}
              disabled={updating || !newStatus || newStatus === request.status}
            >
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {request.logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between border-b pb-4 last:border-0"
              >
                <div>
                  <div className="font-medium">{log.action}</div>
                  <div className="text-sm text-muted-foreground">
                    By {log.performer.name} ({log.performer.role})
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
