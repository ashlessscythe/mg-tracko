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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RequestStatus } from "@prisma/client";
import { useAuth } from "@/lib/auth-context";
import { isWarehouse } from "@/lib/auth";
import type {
  AuthUser,
  RequestDetail as RequestDetailType,
  PartDetail,
  FormData,
} from "@/lib/types";

interface RequestDetailProps {
  id: string;
}

interface PartsByTrailer {
  [trailerNumber: string]: {
    trailerId: string;
    parts: PartDetail[];
  };
}

interface TrailerParts {
  trailerNumber: string;
  parts: { partNumber: string; quantity: number }[];
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<FormData>({
    shipmentNumber: "",
    plant: "",
    palletCount: 0,
    routeInfo: "",
    additionalNotes: "",
    trailers: [],
  });

  const fetchRequest = useCallback(async () => {
    try {
      const response = await fetch(`/api/requests/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch request");
      }

      const data = (await response.json()) as RequestDetailType;
      setRequest(data);
      setNewStatus(data.status);

      // Group parts by trailer
      const partsByTrailer = (data.partDetails || []).reduce(
        (acc: PartsByTrailer, part: PartDetail) => {
          const trailerNumber = part.trailer?.trailerNumber || "Unknown";
          if (!acc[trailerNumber]) {
            acc[trailerNumber] = {
              trailerId: part.trailer?.id || "",
              parts: [],
            };
          }
          acc[trailerNumber].parts.push(part);
          return acc;
        },
        {}
      );

      // Set edit form with grouped parts
      setEditForm({
        shipmentNumber: data.shipmentNumber,
        plant: data.plant || "",
        palletCount: data.palletCount,
        routeInfo: data.routeInfo || "",
        additionalNotes: data.additionalNotes || "",
        trailers: Object.entries(partsByTrailer).map(
          ([trailerNumber, { parts }]): TrailerParts => ({
            trailerNumber,
            parts: parts.map((part) => ({
              partNumber: part.partNumber,
              quantity: part.quantity,
            })),
          })
        ),
      });
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

  const handleEdit = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update request");
      }

      setRequest(data);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Request updated successfully",
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

  const handlePartChange = (
    trailerIndex: number,
    partIndex: number,
    field: "partNumber" | "quantity",
    value: string
  ) => {
    const newTrailers = [...editForm.trailers];
    const newParts = [...newTrailers[trailerIndex].parts];
    if (field === "quantity") {
      newParts[partIndex] = {
        ...newParts[partIndex],
        [field]: parseInt(value) || 0,
      };
    } else {
      newParts[partIndex] = { ...newParts[partIndex], [field]: value };
    }
    newTrailers[trailerIndex] = {
      ...newTrailers[trailerIndex],
      parts: newParts,
    };
    setEditForm({ ...editForm, trailers: newTrailers });
  };

  const addPart = (trailerIndex: number) => {
    const newTrailers = [...editForm.trailers];
    newTrailers[trailerIndex].parts.push({ partNumber: "", quantity: 0 });
    setEditForm({ ...editForm, trailers: newTrailers });
  };

  const removePart = (trailerIndex: number, partIndex: number) => {
    const newTrailers = [...editForm.trailers];
    newTrailers[trailerIndex].parts = newTrailers[trailerIndex].parts.filter(
      (_, i) => i !== partIndex
    );
    setEditForm({ ...editForm, trailers: newTrailers });
  };

  const addTrailer = () => {
    setEditForm({
      ...editForm,
      trailers: [...editForm.trailers, { trailerNumber: "", parts: [] }],
    });
  };

  const removeTrailer = (index: number) => {
    const newTrailers = editForm.trailers.filter((_, i) => i !== index);
    setEditForm({ ...editForm, trailers: newTrailers });
  };

  const handleTrailerNumberChange = (index: number, value: string) => {
    const newTrailers = [...editForm.trailers];
    newTrailers[index] = { ...newTrailers[index], trailerNumber: value };
    setEditForm({ ...editForm, trailers: newTrailers });
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

  const authUser: AuthUser | null = user
    ? {
        id: user.id,
        role: user.role,
      }
    : null;

  const canUpdateStatus = authUser
    ? isWarehouse(authUser) && !request.deleted
    : false;
  const canEdit = authUser
    ? (authUser.role === "ADMIN" ||
        isWarehouse(authUser) ||
        (authUser.role === "CUSTOMER_SERVICE" &&
          request.creator.id === authUser.id)) &&
      !request.deleted
    : false;
  const notes = request.notes || [];

  // Group parts by trailer
  const partsByTrailer = (request.partDetails || []).reduce(
    (acc: PartsByTrailer, part: PartDetail) => {
      const trailerNumber = part.trailer?.trailerNumber || "Unknown";
      if (!acc[trailerNumber]) {
        acc[trailerNumber] = {
          trailerId: part.trailer?.id || "",
          parts: [],
        };
      }
      acc[trailerNumber].parts.push(part);
      return acc;
    },
    {}
  );

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Edit Request</h1>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updating}>
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Shipment Number</Label>
              <Input
                value={editForm.shipmentNumber}
                onChange={(e) =>
                  setEditForm({ ...editForm, shipmentNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Plant (4 characters)</Label>
              <Input
                value={editForm.plant || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, plant: e.target.value })
                }
                maxLength={4}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Trailers and Parts</Label>
                <Button onClick={addTrailer} variant="outline" size="sm">
                  Add Trailer
                </Button>
              </div>
              {editForm.trailers.map((trailer, trailerIndex) => (
                <Card key={trailerIndex}>
                  <CardHeader className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Trailer Number</Label>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTrailer(trailerIndex)}
                      >
                        Remove Trailer
                      </Button>
                    </div>
                    <Input
                      value={trailer.trailerNumber}
                      onChange={(e) =>
                        handleTrailerNumberChange(trailerIndex, e.target.value)
                      }
                      placeholder="Enter trailer number"
                    />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Parts</Label>
                      <Button
                        onClick={() => addPart(trailerIndex)}
                        variant="outline"
                        size="sm"
                      >
                        Add Part
                      </Button>
                    </div>
                    {trailer.parts.map((part, partIndex) => (
                      <div key={partIndex} className="flex gap-2">
                        <Input
                          placeholder="Part Number"
                          value={part.partNumber}
                          onChange={(e) =>
                            handlePartChange(
                              trailerIndex,
                              partIndex,
                              "partNumber",
                              e.target.value
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={part.quantity}
                          onChange={(e) =>
                            handlePartChange(
                              trailerIndex,
                              partIndex,
                              "quantity",
                              e.target.value
                            )
                          }
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removePart(trailerIndex, partIndex)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Pallet Count</Label>
              <Input
                type="number"
                value={editForm.palletCount}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    palletCount: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Route Info</Label>
              <Input
                value={editForm.routeInfo || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, routeInfo: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={editForm.additionalNotes || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, additionalNotes: e.target.value })
                }
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Request Details</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          {canEdit && (
            <Button onClick={() => setIsEditing(true)}>Edit Request</Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
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
            {request.deleted && request.deletedAt && (
              <div>
                <div className="text-sm text-muted-foreground">Deleted At</div>
                <div className="font-medium text-destructive">
                  {new Date(request.deletedAt).toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
            {request.plant && (
              <div>
                <div className="text-sm text-muted-foreground">Plant</div>
                <div className="font-medium">{request.plant}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">
                Parts by Trailer
              </div>
              <div className="space-y-4">
                {Object.entries(partsByTrailer).map(
                  ([trailerNumber, { parts }]) => (
                    <Card key={trailerNumber}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Trailer: {trailerNumber}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {parts.map((part, index) => (
                            <div
                              key={index}
                              className="bg-muted px-2 py-1 rounded flex justify-between"
                            >
                              <span>{part.partNumber}</span>
                              <span className="text-muted-foreground">
                                Qty: {part.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Pallet Count</div>
              <div className="font-medium">{request.palletCount}</div>
            </div>
            <div className="flex gap-2 items-center">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge className={getStatusBadgeColor(request.status)}>
                  {request.status.replace("_", " ")}
                </Badge>
              </div>
              {request.deleted && <Badge variant="destructive">Deleted</Badge>}
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
                notes.map((note: string, index: number) => (
                  <div key={index} className="bg-muted p-3 rounded">
                    {note}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No notes yet
                </div>
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
    </div>
  );
}
