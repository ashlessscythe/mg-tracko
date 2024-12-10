"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { isCustomerService, isAdmin } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RequestTypeModal } from "./request-type-modal";

export function NewRequestButton() {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  // Only render if user has permission
  if (!user) return null;

  const authUser: AuthUser = {
    id: user.id,
    role: user.role,
  };

  const canCreateRequest = isCustomerService(authUser) || isAdmin(authUser);

  if (!canCreateRequest) return null;

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        size="lg"
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 h-11"
      >
        <Plus className="w-5 h-5 mr-2" />
        New Request
      </Button>

      <RequestTypeModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
