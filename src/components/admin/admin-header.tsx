"use client";

import { APP_NAME } from "@/lib/config";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminHeader() {
  const pathname = usePathname();

  const adminLinks = [
    { href: "/", label: `${APP_NAME}` },
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/reports", label: "Reports" },
  ];

  return (
    <div className="border-b">
      <div className="container flex h-14 items-center">
        <nav className="flex gap-6">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
