import styles from "./SafetyNotice.module.css";

export function SafetyNotice() {
  return (
    <div className={styles.notice}>
      ข้อมูลจากแชทบอทเป็นข้อมูลสุขภาพเบื้องต้น ไม่ใช่การวินิจฉัยหรือคำสั่งรักษา หากมีอาการรุนแรงหรือฉุกเฉินควรติดต่อแพทย์ทันที
    </div>
  );
}
