import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(file: File): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from("blog-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("blog-media").getPublicUrl(path);
  const url = data.publicUrl;

  // Track in media table (best effort)
  await supabase.from("media").insert({
    url,
    path,
    filename: file.name,
    mime: file.type,
    size_bytes: file.size,
    uploaded_by: uid,
  });

  return url;
}

export async function deleteMedia(id: string, path: string) {
  await supabase.storage.from("blog-media").remove([path]);
  await supabase.from("media").delete().eq("id", id);
}