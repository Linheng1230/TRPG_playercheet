import { setupConvexAuth } from "@convex-dev/auth/server";
import { setupUsernamePassword } from "@convex-dev/auth/methods/username-password/server";
import { setupGoogle } from "@convex-dev/auth/methods/google/server";
import { components, internal } from "./_generated/api";

const auth = setupConvexAuth({ component: components.auth });

export const { signOut, refreshSession, isAuthenticated } = auth;

export const {
  signUpWithUsernamePassword,
  signInWithUsernamePassword,
  changePassword,
} = setupUsernamePassword(auth, {
  component: components.authPassword,
  usernameComponent: components.authUsername,
}).attachUserCallbacks({ createUser: internal.users.createUser });

// Add a provider to the SAME auth component and user table; no second data
// store, automatic legacy account merge, or internal component account write.
export const { startSignInWithGoogle, completeSignInWithGoogle } = setupGoogle(auth, {
  component: components.authGoogle,
  allowedRedirectOrigins: [
    "https://linheng1230.github.io",
    // Only the exact local QA backend may return to the local test app.
    ...(process.env.CONVEX_SITE_URL === "http://127.0.0.1:3211" ? ["http://127.0.0.1:5199","http://127.0.0.1:5200"] : []),
  ],
}).attachUserCallbacks({ createUser: internal.users.createUserGoogle });
