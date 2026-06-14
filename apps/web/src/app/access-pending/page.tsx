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
          Tell us your role at the plaza so we can open the right dashboard for you.
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
