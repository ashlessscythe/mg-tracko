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
import { isWarehouse } from "@/lib/auth";
import type { AuthUser, RequestDetail as RequestDetailType } from "@/lib/types";

interface RequestDetailProps {
  id: string;
}

export default function RequestDetail({ id }: RequestDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [request, setRequest] = useState<RequestDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<RequestStatus | "">("");
  const [note, setNote] = useState("");

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

  const handleUpdate = async () => {
    if (!note && !newStatus) return;
    if (newStatus === request?.status && !note) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(newStatus !== request?.status && { status: newStatus }),
          ...(note && { note }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update request");
      }

      setRequest(data);
      setNote("");
      toast({
        title: "Success",
        description:
          newStatus !== request?.status
            ? "Request status updated successfully"
            : "Note added successfully",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update request";
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

  // Create AuthUser from session user if available
  const authUser: AuthUser | null = user
    ? {
        id: user.id,
        role: user.role,
      }
    : null;

  // Use the consistent role check helpers
  const canUpdateStatus = authUser ? isWarehouse(authUser) : false;

  // Initialize notes array if undefined
  const notes = request.notes || [];

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
              <div className="text-sm text-muted-foreground">Part Numbers</div>
              <div className="font-medium space-y-1">
                {request.partNumbers.map((pn, index) => (
                  <div key={index} className="bg-muted px-2 py-1 rounded">
                    {pn}
                  </div>
                ))}
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
            <CardTitle>Update Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Status</div>
              <Select
                value={newStatus}
                onValueChange={(value: string) =>
                  setNewStatus(value as RequestStatus)
                }
              >
                <SelectTrigger className="bg-background text-foreground border border-border shadow-sm rounted-md">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground border border-border shadow-sm rounted-md">
                  {Object.values(RequestStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Add Note</div>
              <Textarea
                placeholder="Add a note (optional)"
                value={note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setNote(e.target.value)
                }
                rows={4}
              />
            </div>

            <Button
              onClick={handleUpdate}
              disabled={
                updating ||
                (!note && (!newStatus || newStatus === request.status))
              }
              className="w-full"
            >
              {updating ? "Updating..." : "Update Request"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notes.length > 0 ? (
              notes.map((note, index) => (
                <div key={index} className="bg-muted p-3 rounded">
                  {note}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No notes yet</div>
            )}
          </div>
        </CardContent>
      </Card>

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
