"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface RequestTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestTypeModal({
  open,
  onOpenChange,
}: RequestTypeModalProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Create New Request</h2>
        </div>
        <div className="flex flex-col p-0">
          <Button
            onClick={() => {
              onOpenChange(false);
              router.push("/requests/new");
            }}
            variant="ghost"
            className="w-full p-4 h-auto justify-start rounded-none hover:bg-gray-50"
          >
            <div className="text-left">
              <div className="font-medium">Single Request</div>
              <div className="text-sm text-muted-foreground">
                Create a single request using the form
              </div>
            </div>
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              router.push("/bulk-upload");
            }}
            variant="ghost"
            className="w-full p-4 h-auto justify-start rounded-none hover:bg-gray-50 border-t"
          >
            <div className="text-left">
              <div className="font-medium">Bulk Upload</div>
              <div className="text-sm text-muted-foreground">
                Create multiple requests using file upload or direct input
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
