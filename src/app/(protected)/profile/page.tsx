import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  MessageCircleHeart,
  UserRound
} from "lucide-react";

import { getCurrentSession } from "@/features/auth/session.server";
import { routes } from "@/lib/routes";

import styles from "./ProfilePage.module.css";

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect(routes.login);
  }

  const lastLoginAt = session.user.lastLoginAt;

  return (
    <section className={styles.page}>
      <article className={styles.card}>
        <header className={styles.profileHeader}>
          <div className={styles.avatarFrame}>
            {session.user.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.pictureUrl} alt="รูปโปรไฟล์ LINE" />
            ) : (
              <UserRound size={36} strokeWidth={1.7} aria-hidden="true" />
            )}
          </div>
          <span className={styles.eyebrow}>บัญชีผู้ใช้งาน</span>
          <h1>โปรไฟล์ของคุณ</h1>
          <p>ข้อมูลบัญชี LINE ที่เชื่อมต่อกับ Health Chatbot</p>
        </header>

        <dl className={styles.details}>
          <div className={styles.row}>
            <span className={styles.detailIcon} aria-hidden="true">
              <UserRound size={20} />
            </span>
            <div className={styles.detailCopy}>
              <dt>ชื่อ LINE</dt>
              <dd>{session.user.displayName ?? "ไม่ระบุชื่อ"}</dd>
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.detailIcon} aria-hidden="true">
              <CheckCircle2 size={20} />
            </span>
            <div className={styles.detailCopy}>
              <dt>สถานะเพื่อน LINE</dt>
              <dd>
                <span
                  className={
                    session.user.friendFlag ? styles.statusActive : styles.statusInactive
                  }
                >
                  {session.user.friendFlag ? "เพิ่มเพื่อนแล้ว" : "ยังไม่ได้เพิ่มเพื่อน"}
                </span>
              </dd>
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.detailIcon} aria-hidden="true">
              <Clock3 size={20} />
            </span>
            <div className={styles.detailCopy}>
              <dt>เข้าสู่ระบบล่าสุด</dt>
              <dd>
                {lastLoginAt ? (
                  <time dateTime={lastLoginAt.toISOString()}>
                    {lastLoginAt.toLocaleString("th-TH")}
                  </time>
                ) : (
                  "ไม่มีข้อมูล"
                )}
              </dd>
            </div>
          </div>
        </dl>

        <Link className={styles.chatButton} href={routes.chat}>
          <MessageCircleHeart size={20} aria-hidden="true" />
          กลับไปที่แชต
        </Link>
      </article>
    </section>
  );
}
