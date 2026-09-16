import Link from "next/link";
import Image from "next/image";

import { UserMenu } from "@/components/layout/UserMenu";
import { routes } from "@/lib/routes";

import styles from "./AppHeader.module.css";

type AppHeaderProps = {
  user: {
    displayName?: string | null;
    pictureUrl?: string | null;
  };
};

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href={routes.chat}>
        <span className={styles.brandMark} aria-hidden="true">
          <Image
            src="/images/health-chatbot-profile.png"
            alt=""
            width={42}
            height={42}
            priority
          />
        </span>
        <span className={styles.brandCopy}>
          <strong>Health Chatbot</strong>
          <span>ผู้ช่วยดูแลสุขภาพของคุณ</span>
        </span>
      </Link>
      <UserMenu user={user} />
    </header>
  );
}
