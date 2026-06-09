import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";

import buttonStyles from "@/components/ui/Button.module.css";
import { routes } from "@/lib/routes";

import styles from "./UserMenu.module.css";

type UserMenuProps = {
  user: {
    displayName?: string | null;
    pictureUrl?: string | null;
  };
};

export function UserMenu({ user }: UserMenuProps) {
  const secondaryIconButton = `${buttonStyles.iconButton} ${buttonStyles.secondary}`;

  return (
    <div className={styles.menu}>
      {user.pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.avatar} src={user.pictureUrl} alt="" />
      ) : (
        <span className={styles.avatar} aria-hidden="true" />
      )}
      <span>{user.displayName ?? "LINE user"}</span>
      <Link className={secondaryIconButton} href={routes.profile} title="Profile">
        <UserRound size={17} aria-hidden="true" />
      </Link>
      <form action={routes.apiLogout} method="post">
        <button className={secondaryIconButton} type="submit" title="Logout">
          <LogOut size={17} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
