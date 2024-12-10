import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { Header } from "@/components/header";
import RequestList from "@/components/requests/request-list";
import { NewRequestButton } from "@/components/requests/new-request-button";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Requests | Expi-Trako",
  description: "View and manage must-go requests",
};

async function getRequests(userId: string, role: string) {
  // Only filter by creator for customer service
  // Admin and warehouse see all requests
  const where = {
    ...(role === "CUSTOMER_SERVICE" && { createdBy: userId }),
    deleted: false,
  };

  console.log("Query where:", where); // Debug log

  const requests = await prisma.mustGoRequest.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      trailers: {
        include: {
          trailer: true,
        },
      },
      partDetails: true,
      logs: {
        include: {
          performer: {
            select: {
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Format dates to strings
  return requests.map((request) => ({
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    deletedAt: request.deletedAt?.toISOString() || null,
  }));
}

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  console.log("User role:", session.user.role); // Debug log
  const requests = await getRequests(session.user.id, session.user.role);
  console.log("Found requests:", requests.length); // Debug log

  return (
    <>
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Must-Go Requests</h1>
          <NewRequestButton />
        </div>
        <RequestList requests={requests} />
      </div>
    </>
  );
}
