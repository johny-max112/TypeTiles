import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { devApiProxy, localAdminGuard } from "./devApiProxy";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react(), ...(command === "serve" ? [localAdminGuard()] : [])],
    server: {
      host: "localhost",
      port: 5174,
      strictPort: true,
      proxy: command === "serve" ? { "/api": devApiProxy(env.VITE_API_URL || "http://localhost:3001/api") } : undefined,
    },
  };
});
