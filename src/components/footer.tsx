import { APP_NAME } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm leading-7 text-muted-foreground">
            Built with care for efficient expedite request management.
          </p>
          <p className="text-sm leading-7 text-muted-foreground">
            © 2024 {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
