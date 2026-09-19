import { resolvePostLoginPath } from "@/lib/auth/session";
import { AuthRedirectClient } from "@/components/auth/auth-redirect-client";

/** Resolves destination on the server (cookies), then replaces history on the client. */
export default async function AuthRedirectPage() {
  const path = await resolvePostLoginPath();
  return <AuthRedirectClient path={path} />;
}
