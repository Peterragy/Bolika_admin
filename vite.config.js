import { defineConfig, loadEnv } from "vite";

// The dashboard only needs the Bolika server's address: VITE_API_URL (or API_URL on Vercel).
export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const api = (env.VITE_API_URL || env.API_URL || "").trim();
  if (command === "build") console.log(`[bolika-admin] API ${api || "NOT set (defaults to http://localhost:3340)"}`);
  return { define: { "import.meta.env.VITE_API_URL": JSON.stringify(api) } };
});
