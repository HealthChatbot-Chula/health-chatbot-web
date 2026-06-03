import { redirect } from "next/navigation";

import { FriendRequiredPanel } from "@/components/auth/FriendRequiredPanel";
import { getCurrentSession } from "@/features/auth/session.server";
import { routes } from "@/lib/routes";

export default async function LineRequiredPage() {
  const session = await getCurrentSession();

  if (session?.user.friendFlag) {
    redirect(routes.chat);
  }

  return (
    <main className="center-page">
      <FriendRequiredPanel isLoggedIn={Boolean(session)} />
    </main>
  );
}
