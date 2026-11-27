import {ConvexReactClient} from "convex/react";
export const syncEnabled=import.meta.env.VITE_ENABLE_GOOGLE_AUTH==="true";
const endpoint=String(import.meta.env.VITE_CONVEX_URL||"").trim();
export const connected=/^https:\/\/[a-z0-9.-]+$/i.test(endpoint)||
  (import.meta.env.DEV&&import.meta.env.VITE_LOCAL_CONVEX_QA==="true"&&endpoint==="http://127.0.0.1:3210");
export const client=connected?new ConvexReactClient(endpoint):null;
