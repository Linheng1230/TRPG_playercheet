// Copy this file to public-config.js for a manually provisioned test project.
// These are browser-visible values. Never put the LINE channel secret,
// Supabase privileged backend key, database password, or any private token here.
const config = Object.freeze({
  supabaseUrl: "https://PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY",
  authProvider: "custom:line"
});

export default config;
