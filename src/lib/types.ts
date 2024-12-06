import { RequestStatus, Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

export interface AuthUser {
  id: string;
  role: Role;
}

export interface RequestDetail {
  id: string;
  shipmentNumber: string;
  plant?: string | null;
  partNumbers: string[];
  palletCount: number;
  status: RequestStatus;
  routeInfo?: string | null;
  additionalNotes?: string | null;
  notes: string[];
  createdAt: string;
  creator: {
    name: string;
    email: string;
    role: string;
  };
  logs: RequestLog[];
}

export interface RequestLog {
  id: string;
  action: string;
  timestamp: string;
  performer: {
    name: string;
    role: string;
  };
}

export interface FormData {
  shipmentNumber: string;
  plant?: string | null;
  partNumbers: string[];
  palletCount: number;
  routeInfo?: string | null;
  additionalNotes?: string | null;
  status?: RequestStatus;
}

export interface UpdateRequestData {
  status?: RequestStatus;
  note?: string;
}
