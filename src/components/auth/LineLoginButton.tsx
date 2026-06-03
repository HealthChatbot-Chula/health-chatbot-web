import { MessageCircle } from "lucide-react";

import { routes } from "@/lib/routes";

export function LineLoginButton() {
  return (
    <a className="button" href={routes.apiLineStart}>
      <MessageCircle size={18} aria-hidden="true" />
      เข้าสู่ระบบด้วย LINE
    </a>
  );
}
