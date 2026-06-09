import { redirect } from "next/navigation";

import pageStyles from "@/app/(public)/public.module.css";
import { LineLoginButton } from "@/components/auth/LineLoginButton";
import panelStyles from "@/components/auth/AuthPanel.module.css";
import { getCurrentSession } from "@/features/auth/session.server";
import { routes } from "@/lib/routes";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session?.user.friendFlag) {
    redirect(routes.chat);
  }

  if (session && !session.user.friendFlag) {
    redirect(routes.lineRequired);
  }

  return (
    <main className={pageStyles.centerPage}>
      <section className={panelStyles.panel}>
        <h1>Health Chatbot</h1>
        <p>
          เข้าสู่ระบบด้วย LINE และเพิ่มเพื่อนบัญชีทางการก่อนใช้งานแชทบอทสุขภาพบนเว็บนี้
        </p>
        <LineLoginButton />
      </section>
    </main>
  );
}
