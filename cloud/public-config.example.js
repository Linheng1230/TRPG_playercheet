// Public, browser-visible values only. Never use service-role secrets here.
// Username registration and password verification are handled by the Edge Function.
const config = Object.freeze({
  supabaseUrl: "https://PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY",
  turnstileSiteKey: "YOUR_CLOUDFLARE_TURNSTILE_SITE_KEY"
});
export default config;
