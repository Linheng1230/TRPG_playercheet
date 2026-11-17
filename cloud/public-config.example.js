// Browser-visible values only; copy to public-config.js when explicitly authorized.
// Email OTP uses Supabase Auth; never place LINE secrets, service-role keys,
// SMTP credentials, or other private tokens in browser configuration.
const config = Object.freeze({
  supabaseUrl: "https://PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
});

export default config;
