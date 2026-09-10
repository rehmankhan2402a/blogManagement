import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";

function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center mb-4 text-primary text-2xl font-bold">
        404
      </div>
      <h2 className="text-xl font-bold text-foreground">Admin Page Not Found</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The admin route you requested does not exist or has been relocated.
      </p>
      <div className="mt-6">
        <Link
          to="/admin"
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  notFoundComponent: AdminNotFound,
});
