import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { getCurrentSession } from "@/features/auth/session.server";
import { routes } from "@/lib/routes";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect(routes.login);
  }

  if (!session.user.friendFlag) {
    redirect(routes.lineRequired);
  }

  return (
    <div className="page-shell">
      <AppHeader
        user={{
          displayName: session.user.displayName,
          pictureUrl: session.user.pictureUrl
        }}
      />
      <main className="protected-main">{children}</main>
    </div>
  );
}
