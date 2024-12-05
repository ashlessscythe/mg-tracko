import { Metadata } from "next";
import { Header } from "@/components/header";
import RequestList from "@/components/requests/request-list";
import { NewRequestButton } from "@/components/requests/new-request-button";

export const metadata: Metadata = {
  title: "Requests | Expi-Trako",
  description: "View and manage must-go requests",
};

export default function RequestsPage() {
  return (
    <>
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Must-Go Requests</h1>
          <NewRequestButton />
        </div>
        <RequestList />
      </div>
    </>
  );
}
