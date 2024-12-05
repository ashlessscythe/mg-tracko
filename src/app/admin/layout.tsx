import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div>
      <AdminHeader />
      <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-8">{children}</div>
      </div>
    </div>
  );
}
