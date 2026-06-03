import { LineLoginButton } from "@/components/auth/LineLoginButton";

export function FriendRequiredPanel({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="panel">
      <h1>กรุณาเพิ่มเพื่อนใน LINE ก่อน</h1>
      <p>
        ระบบนี้ให้ LINE ใช้สำหรับยืนยันตัวตนและตรวจสถานะเพื่อนเท่านั้น หลังจากเพิ่มเพื่อนแล้วจะคุยกับแชทบอทผ่านหน้าเว็บนี้
      </p>
      <LineLoginButton />
      {isLoggedIn ? (
        <p className="status-text" style={{ marginTop: 16 }}>
          ถ้าเพิ่งเพิ่มเพื่อนแล้ว ให้กดเข้าสู่ระบบด้วย LINE อีกครั้งเพื่อให้ระบบตรวจสถานะใหม่
        </p>
      ) : null}
    </section>
  );
}
