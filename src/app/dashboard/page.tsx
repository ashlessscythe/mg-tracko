"use client";

import { Header } from "@/components/header";
import { useAuth } from "@/lib/auth-context";

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex flex-col items-center justify-center py-10">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container flex flex-col items-center justify-center py-10">
        <div className="w-full max-w-4xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.name || user.email}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">
              Your Role: {user.role}
            </h2>
            <div className="space-y-4">
              {user.role === "ADMIN" && (
                <div>
                  <h3 className="font-medium">Admin Controls</h3>
                  <p className="text-muted-foreground">
                    Manage users and system settings
                  </p>
                </div>
              )}
              {user.role === "CUSTOMER_SERVICE" && (
                <div>
                  <h3 className="font-medium">Customer Service Tools</h3>
                  <p className="text-muted-foreground">
                    Handle customer requests and inquiries
                  </p>
                </div>
              )}
              {user.role === "WAREHOUSE" && (
                <div>
                  <h3 className="font-medium">Warehouse Operations</h3>
                  <p className="text-muted-foreground">
                    Manage inventory and shipments
                  </p>
                </div>
              )}
              {user.role === "REPORT_RUNNER" && (
                <div>
                  <h3 className="font-medium">Reports</h3>
                  <p className="text-muted-foreground">
                    Generate and view system reports
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
