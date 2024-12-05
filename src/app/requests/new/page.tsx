import { Metadata } from "next";
import NewRequestForm from "@/components/requests/new-request-form";

export const metadata: Metadata = {
  title: "New Request | Expi-Trako",
  description: "Create a new must-go request",
};

export default function NewRequestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Request</h1>
        <NewRequestForm />
      </div>
    </div>
  );
}
