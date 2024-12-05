"use client";

import {
  SessionProvider,
  useSession,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const signOut = async () => {
    await nextAuthSignOut({ redirect: false });
    router.push("/");
  };

  // Debug session
  console.log("Auth context session:", {
    session,
    sessionUser: session?.user,
  });

  // Ensure we return a properly typed user
  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as Role,
      }
    : null;

  return {
    user,
    loading: status === "loading",
    signOut,
  };
}
