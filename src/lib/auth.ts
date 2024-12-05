import { headers } from "next/headers";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  role: Role;
}

export async function getAuthUser(): Promise<AuthUser> {
  const headersList = await headers();

  const userId = headersList.get("x-user-id");
  const userRole = headersList.get("x-user-role") as Role;

  if (!userId || !userRole) {
    throw new Error("User not authenticated");
  }

  return {
    id: userId,
    role: userRole,
  };
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === "ADMIN";
}

export function isWarehouse(user: AuthUser): boolean {
  return user.role === "WAREHOUSE" || user.role === "ADMIN";
}

export function isCustomerService(user: AuthUser): boolean {
  return user.role === "CUSTOMER_SERVICE" || user.role === "ADMIN";
}

// Helper to check if user has permission to access a resource
export function hasPermission(user: AuthUser, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(user.role) || user.role === "ADMIN";
}
