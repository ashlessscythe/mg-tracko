"use client";

import { Header } from "@/components/header";

export default function Pending() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container flex flex-col items-center justify-center py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Account Pending</h1>
            <p className="text-muted-foreground">
              Your account is pending approval. Please check back later or
              contact an administrator.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
