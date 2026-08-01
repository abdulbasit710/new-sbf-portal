"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import AdminCrmPanel from "@/components/admin/AdminCrmPanel";
import { useSession } from "@/lib/session";

export default function AdminOS() {
  const { session } = useSession();

  if (session && session.role !== "admin") {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
          ✕
        </div>
        <h2 className="text-lg font-medium text-chalk">Access Restricted</h2>
        <p className="mt-1.5 text-sm text-muted">
          The Admin OS requires administrator privileges.
        </p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-5">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return <AdminCrmPanel />;
}
