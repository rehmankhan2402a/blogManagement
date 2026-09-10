import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/components/admin/product-editor";

export const Route = createFileRoute("/admin/products/new")({
  component: () => <ProductEditor />,
});
