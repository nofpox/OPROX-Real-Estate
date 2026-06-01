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
    invalidUnit: "โปรดป้อนหมายเลขยูนิตที่ถูกต้อง",
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
    timeSlot: "ช่วงเวลาที่ต้องการ",
    timeSlotPlaceholder: "เลือกช่วงเวลา",
    timeSlotHint: "กรุณาอยู่ในสถานที่ในช่วงเวลาที่เลือกเพื่อให้ทีมของเราให้ความช่วยเหลือ",
    success: {
      title: "ได้รับคำขอแล้ว",
      subtitle: "ได้รับคำขอของคุณแล้ว",
      refCode: "รหัสอ้างอิง",
      keepCode: "เก็บรหัสอ้างอิงเพื่อติดตาม",
      newRequest: "คำขอใหม่",
    },
  },
  landing: {
    accessUnit: "เข้าถึงยูนิตของคุณ",
    enterUnit: "ป้อนหมายเลขยูนิตของคุณเพื่อเริ่มต้น",
    accessPortal: "เข้าสู่พอร์ทัล",
    submitRequests: "ส่งคำขอ",
    rateStay: "ให้คะแนนการเข้าพัก",
    unitDetails: "รายละเอียดยูนิต",
  },
  lang: { select: "ภาษา" },
};

export default th;
