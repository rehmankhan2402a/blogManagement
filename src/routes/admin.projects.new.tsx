import { createFileRoute } from "@tanstack/react-router";
import { ProjectEditor } from "@/components/admin/project-editor";

export const Route = createFileRoute("/admin/projects/new")({
  component: () => <ProjectEditor />,
});
