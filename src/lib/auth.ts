import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export interface AuthUser {
  id: string;
  role: Role;
}

export async function getAuthUser(): Promise<AuthUser> {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  return {
    id: session.user.id,
    role: session.user.role as Role,
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

export function hasPermission(user: AuthUser, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(user.role) || user.role === "ADMIN";
}
