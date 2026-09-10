import { createFileRoute } from "@tanstack/react-router";
import { BlogEditor } from "@/components/admin/blog-editor";

export const Route = createFileRoute("/admin/blogs/$id/edit")({
  component: () => <BlogEditor />,
});