import type { Translations } from "./en";

const th: Translations = {
  nav: { units: "ยูนิต", workOrders: "ใบสั่งงาน", tasks: "งานของฉัน" },
  status: { available: "ว่าง", occupied: "ไม่ว่าง", maintenance: "ซ่อมบำรุง", cleaning: "ทำความสะอาด", pending: "รอดำเนินการ", inProgress: "กำลังดำเนินการ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก", verified: "ยืนยันแล้ว" },
  priority: { urgent: "เร่งด่วน", high: "สูง", medium: "ปานกลาง", low: "ต่ำ" },
  dashboard: { appSubtitle: "แดชบอร์ดพนักงาน", totalUnits: "ยูนิตทั้งหมด", allProperties: "ทรัพย์สินทั้งหมด", logout: "ออกจากระบบ" },
  workOrders: { title: "ใบสั่งงาน", subtitle: "ใบสั่งงานของฉัน", pending: "รอดำเนินการ", inProgress: "กำลังดำเนินการ", done: "เสร็จสิ้น", all: "ทั้งหมด", startWork: "เริ่มงาน", complete: "เสร็จสิ้น", completedDone: "เสร็จสิ้น", empty: "ไม่มีใบสั่งงาน", emptyDesc: "ไม่มีใบสั่งงานที่ได้รับมอบหมาย", failedLoad: "โหลดล้มเหลว", retry: "ลองใหม่", toastStarted: "เริ่มแล้ว", toastCompleted: "เสร็จสิ้น", toastFailed: "อัปเดตล้มเหลว" },
  tasks: { title: "งานปัจจุบันของฉัน", pending: "รอดำเนินการ", active: "กำลังดำเนินการ", done: "เสร็จสิ้น", startTask: "เริ่มงาน", endTask: "สิ้นสุดงาน", awaitingApproval: "รอการอนุมัติ", completedAwaiting: "เสร็จสิ้น — รอการอนุมัติ", approved: "ได้รับอนุมัติ", completeTask: "ทำงานให้เสร็จ", taskLabel: "งาน", completionPhoto: "รูปภาพการทำงานเสร็จ", tapPhoto: "แตะเพื่อถ่ายรูป", gpsLocation: "ตำแหน่ง GPS", locationGetting: "กำลังรับตำแหน่งของคุณ...", locationDone: "บันทึกตำแหน่งแล้ว", locationFailed: "ไม่สามารถรับตำแหน่งได้", allowLocation: "โปรดอนุญาตการเข้าถึงตำแหน่งในการตั้งค่าเบราว์เซอร์", retryGps: "ลองใหม่", requirements: "ข้อกำหนด", photo: "รูปภาพ", submitReport: "ส่งรายงาน", submitting: "กำลังส่ง...", cancel: "ยกเลิก" },
  unitDetail: { unitStatus: "สถานะยูนิต", financialData: "ข้อมูลทางการเงิน", serviceRequests: "คำขอบริการ", setStatus: "ตั้งค่าสถานะ", type: "ประเภท", capacity: "ความจุ", rate: "อัตรา", status: "สถานะ", amountDue: "จำนวนที่ค้างชำระ", dueDate: "วันครบกำหนด", checkIn: "เช็คอิน", checkOut: "เช็คเอาท์", saveChanges: "บันทึกการเปลี่ยนแปลง", noFinancial: "ไม่มีข้อมูลทางการเงิน", addFinancial: "เพิ่มข้อมูลทางการเงิน", noRequests: "ไม่มีคำขอสำหรับยูนิตนี้", resolve: "แก้ไข", qrTitle: "QR คำขอบริการ", copyLink: "คัดลอกลิงก์", copied: "คัดลอกลิงก์แล้ว!", guests: "แขก", perNight: "/คืน", loading: "กำลังโหลด…", edit: "แก้ไข", cancel: "ยกเลิก", new: "ใหม่", offline: "ออฟไลน์ — จะซิงค์เมื่อเชื่อมต่อ" },
  lang: { select: "ภาษา" },
};

export default th;
