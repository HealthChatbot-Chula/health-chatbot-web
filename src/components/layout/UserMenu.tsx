import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";

import { routes } from "@/lib/routes";

type UserMenuProps = {
  user: {
    displayName?: string | null;
    pictureUrl?: string | null;
  };
};

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="user-menu">
      {user.pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="avatar" src={user.pictureUrl} alt="" />
      ) : (
        <span className="avatar" aria-hidden="true" />
      )}
      <span>{user.displayName ?? "LINE user"}</span>
      <Link className="icon-button secondary" href={routes.profile} title="Profile">
        <UserRound size={17} aria-hidden="true" />
      </Link>
      <form action={routes.apiLogout} method="post">
        <button className="icon-button secondary" type="submit" title="Logout">
          <LogOut size={17} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
