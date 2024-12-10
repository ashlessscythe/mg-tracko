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

export interface PartDetail {
  id: string;
  partNumber: string;
  quantity: number;
  requestId: string;
  trailerId: string;
  trailer: {
    id: string;
    trailerNumber: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Trailer {
  id: string;
  trailerNumber: string;
  partDetails: PartDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestTrailer {
  id: string;
  requestId: string;
  trailerId: string;
  trailer: Trailer;
  createdAt: string;
}

export interface RequestCreator {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface RequestDetail {
  id: string;
  shipmentNumber: string;
  plant?: string | null;
  trailers: RequestTrailer[];
  partDetails: PartDetail[];
  palletCount: number;
  status: RequestStatus;
  routeInfo?: string | null;
  additionalNotes?: string | null;
  notes: string[];
  deleted: boolean;
  deletedAt: string;
  createdAt: string;
  creator: RequestCreator;
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
  trailers: Array<{
    trailerNumber: string;
    parts: Array<{
      partNumber: string;
      quantity: number;
    }>;
  }>;
  palletCount: number;
  routeInfo?: string | null;
  additionalNotes?: string | null;
  status?: RequestStatus;
}

export interface UpdateRequestData {
  status?: RequestStatus;
  note?: string;
}
