import { defineConfig, loadEnv } from "vite";

// The Supabase URL and public key can be set under any of the names Vercel and
// Supabase use (VITE_*, plain SUPABASE_*, or the NEXT_PUBLIC_* names the Supabase
// integration adds), and SITE_URL for the storefront. Only these public values
// reach the browser; any other SUPABASE_* variable, such as a service key, never does.
const URL_NAMES = ["VITE_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"];
const KEY_NAMES = ["VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const pick = (names) => names.map((n) => env[n]?.trim()).find(Boolean) || "";
  const url = pick(URL_NAMES), key = pick(KEY_NAMES), site = pick(["VITE_SITE_URL", "SITE_URL"]);
  if (command === "build") console.log(`[bolika-admin] Supabase ${url && key ? `connected (${new URL(url).host})` : "NOT set"} · photos from ${site || "the dashboard itself (default)"}`);
  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(key),
      "import.meta.env.VITE_SITE_URL": JSON.stringify(site),
    },
  };
});
