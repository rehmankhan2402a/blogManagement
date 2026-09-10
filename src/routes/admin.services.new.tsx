import { createFileRoute } from "@tanstack/react-router";
import { ServiceEditor } from "@/components/admin/service-editor";

export const Route = createFileRoute("/admin/services/new")({
  component: () => <ServiceEditor />,
});
