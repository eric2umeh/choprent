import { resolvePostLoginPath } from "@/lib/auth/session";
import { redirect } from "next/navigation";

/** Server Component — reads session cookies reliably (Route Handlers can miss them). */
export default async function AuthRedirectPage() {
  const path = await resolvePostLoginPath();
  redirect(path);
}
