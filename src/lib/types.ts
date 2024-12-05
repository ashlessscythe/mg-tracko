import { Role } from "@prisma/client";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type RequestStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type MustGoRequest = {
  id: string;
  shipmentNumber: string;
  partNumberId: string;
  palletCount: number;
  status: RequestStatus;
  routeInfo?: string;
  additionalNotes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PartNumber = {
  id: string;
  partNumber: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RequestLog = {
  id: string;
  mustGoRequestId: string;
  action: string;
  performedBy: string;
  timestamp: Date;
};
