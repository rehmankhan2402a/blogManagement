import { createFileRoute } from "@tanstack/react-router";
import { ProjectEditor } from "@/components/admin/project-editor";

export const Route = createFileRoute("/admin/projects/$id/edit")({
  component: () => <ProjectEditor />,
});
