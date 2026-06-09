import { redirect } from "next/navigation";

import { getCurrentSession } from "@/features/auth/session.server";
import { routes } from "@/lib/routes";

import styles from "./ProfilePage.module.css";

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect(routes.login);
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <h1>Profile</h1>
        <dl>
          <div className={styles.row}>
            <dt>LINE name</dt>
            <dd>{session.user.displayName ?? "-"}</dd>
          </div>
          <div className={styles.row}>
            <dt>Friend status</dt>
            <dd>{session.user.friendFlag ? "Added" : "Not added"}</dd>
          </div>
          <div className={styles.row}>
            <dt>Last login</dt>
            <dd>{session.user.lastLoginAt?.toLocaleString("th-TH") ?? "-"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
