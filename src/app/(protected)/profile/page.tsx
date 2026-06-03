import { redirect } from "next/navigation";

import { getCurrentSession } from "@/features/auth/session.server";
import { routes } from "@/lib/routes";

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect(routes.login);
  }

  return (
    <section className="profile-page">
      <div className="profile-card">
        <h1>Profile</h1>
        <dl>
          <div className="profile-row">
            <dt>LINE name</dt>
            <dd>{session.user.displayName ?? "-"}</dd>
          </div>
          <div className="profile-row">
            <dt>Friend status</dt>
            <dd>{session.user.friendFlag ? "Added" : "Not added"}</dd>
          </div>
          <div className="profile-row">
            <dt>Last login</dt>
            <dd>{session.user.lastLoginAt?.toLocaleString("th-TH") ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
