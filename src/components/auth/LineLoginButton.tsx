'use client';

import { MessageCircle } from "lucide-react";
import buttonStyles from "@/components/ui/Button.module.css";
import { routes } from "@/lib/routes";

export function LineLoginButton() {
  return (
    <a className={buttonStyles.button} href={routes.apiLineStart}>
      <MessageCircle size={18} aria-hidden="true" />
      เข้าสู่ระบบด้วย LINE
    </a>
  );
}