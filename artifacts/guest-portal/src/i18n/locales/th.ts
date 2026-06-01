import type { Translations } from "./en";

const th: Translations = {
  request: {
    serviceRequest: "คำขอบริการ",
    requestType: "ประเภทคำขอ",
    description: "คำอธิบาย",
    descPlaceholder: "อธิบายปัญหาโดยย่อ…",
    submit: "ส่งคำขอ",
    submitting: "กำลังส่ง...",
    unitNotFound: "ไม่พบยูนิต",
    errorGeneric: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง",
    types: {
      electrical: "ไฟฟ้า",
      plumbing: "ระบบน้ำ",
      ac: "แอร์ / เครื่องทำความร้อน",
      cleaning: "ทำความสะอาด",
      maintenance: "ซ่อมบำรุง",
      noise: "เสียงดัง",
      other: "อื่นๆ",
    },
    success: {
      title: "ได้รับคำขอแล้ว",
      subtitle: "ได้รับคำขอของคุณแล้ว",
      refCode: "รหัสอ้างอิง",
      keepCode: "เก็บรหัสอ้างอิงเพื่อติดตาม",
      newRequest: "คำขอใหม่",
    },
  },
  lang: { select: "ภาษา" },
};

export default th;
