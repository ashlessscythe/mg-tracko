import { Metadata } from "next";
import { Header } from "@/components/header";
import RequestDetail from "@/components/requests/request-detail";

export const metadata: Metadata = {
  title: "Request Details | Expi-Trako",
  description: "View and manage request details",
};

export default function RequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <>
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <RequestDetail id={params.id} />
        </div>
      </div>
    </>
  );
}
