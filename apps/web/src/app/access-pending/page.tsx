import { CompleteSetupForm } from "@/components/auth/complete-setup-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { signOutAction } from "@/lib/actions/auth";
import { getSessionUser, resolvePostLoginPath } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AccessPendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const destination = await resolvePostLoginPath();
  if (destination !== "/access-pending") redirect(destination);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-sm">
        <h1 className="text-page-title">One more step</h1>
        <p className="text-page-desc mt-1">
          Landlords get a private workspace. Managers and agents need an invite
          from their landlord after signing up.
        </p>
        <p className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-sm text-muted">
          Shop tenants: use the invite link from your manager — do not pick a
          role here. If you already accepted an invite,{" "}
          <a href="/login" className="underline text-foreground">
            sign in
          </a>{" "}
          with that email and you will go straight to your tenant dashboard.
        </p>

        <div className="mt-5">
          <CompleteSetupForm email={user.email ?? user.displayName} />
        </div>

        <form action={signOutAction} className="mt-4">
          <SignOutButton />
        </form>
      </div>
    </div>
  );
}
