import Link from "next/link";

import { UserMenu } from "@/components/layout/UserMenu";
import { routes } from "@/lib/routes";

type AppHeaderProps = {
  user: {
    displayName?: string | null;
    pictureUrl?: string | null;
  };
};

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link className="brand" href={routes.chat}>
        <strong>Health Chatbot</strong>
        <span>Web chat with LINE friend gate</span>
      </Link>
      <UserMenu user={user} />
    </header>
  );
}
