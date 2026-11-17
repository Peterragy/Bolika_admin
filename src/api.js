import { createClient } from "@supabase/supabase-js";

/* The same Supabase project as the Bolika app and website (.env.local):
     VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
     VITE_SITE_URL — optional: where product photos saved as paths ("/catalog/…") live */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const SITE = (import.meta.env.VITE_SITE_URL || "").replace(/\/$/, "");
export const configured = !!(url && key);
export const sb = configured ? createClient(url, key) : null;

/** Product photos are either full storage URLs or paths (served by the site, or by this dashboard). */
export const img = (src) => (!src ? "" : /^https?:/.test(src) ? src : `${SITE}${src}`);

/** Throw a readable error from a Supabase response, otherwise return its data. */
export function ok({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

export async function uploadImage(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  ok(await sb.storage.from("product-images").upload(path, file, { cacheControl: "31536000", contentType: file.type }));
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
