import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath} from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {rollupOptions:{input:{vault:fileURLToPath(new URL("./index.html",import.meta.url)),creatorBridge:fileURLToPath(new URL("./creator-bridge.html",import.meta.url))}}},
});
