import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // GEM CC packages
      "@gem/ui": path.resolve(__dirname, "src/gem/ui"),
      "@gem/types": path.resolve(__dirname, "src/gem/types"),
      "@gem/services": path.resolve(__dirname, "src/gem/services"),
      "@gem/hooks": path.resolve(__dirname, "src/gem/hooks"),
      // Next.js shims
      "next/navigation": path.resolve(__dirname, "src/gem/adapters/next-compat.jsx"),
      "next/link": path.resolve(__dirname, "src/gem/adapters/next-compat.jsx"),
      "next/font/google": path.resolve(__dirname, "src/gem/adapters/next-font-compat.js"),
      // Supabase shim
      "@supabase/ssr": path.resolve(__dirname, "src/gem/adapters/supabase-compat.js"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        ws: true,
      },
    },
  },
});
