import type { Translations } from "./en";

const tl: Translations = {
  nav: { units: "Mga Unit", workOrders: "Mga Work Order", tasks: "Aking Mga Gawain" },
  status: { available: "Available", occupied: "Occupied", maintenance: "Maintenance", cleaning: "Paglilinis", pending: "Nakabinbin", inProgress: "In Progress", completed: "Tapos na", cancelled: "Nakansela", verified: "Napatunayan" },
  priority: { urgent: "Apurahan", high: "Mataas", medium: "Katamtaman", low: "Mababa" },
  dashboard: { appSubtitle: "Staff Dashboard", totalUnits: "Kabuuang Mga Unit", allProperties: "Lahat ng Ari-arian", logout: "Mag-logout" },
  workOrders: { title: "Mga Work Order", subtitle: "Aking mga Work Order", pending: "Nakabinbin", inProgress: "In Progress", done: "Tapos", all: "Lahat", startWork: "Simulan ang Trabaho", complete: "Tapusin", completedDone: "Tapos na", empty: "Walang Work Orders", emptyDesc: "Walang work order na naatasan", failedLoad: "Nabigo ang pag-load", retry: "Subukan Ulit", toastStarted: "Nagsimula", toastCompleted: "Tapos na", toastFailed: "Nabigo ang update" },
  tasks: { title: "Aking Mga Kasalukuyang Gawain", pending: "Nakabinbin", active: "Aktibo", done: "Tapos", startTask: "Simulan ang Gawain", endTask: "Tapusin ang Gawain", awaitingApproval: "Naghihintay ng Pag-apruba", completedAwaiting: "Tapos — Naghihintay ng Pag-apruba", approved: "Naaprobahan", completeTask: "Tapusin ang Gawain", taskLabel: "Gawain", completionPhoto: "Larawan ng Pagkumpleto", tapPhoto: "I-tap para kumuha ng larawan", gpsLocation: "GPS na Lokasyon", locationGetting: "Kinukuha ang iyong lokasyon...", locationDone: "Naitala ang lokasyon", locationFailed: "Hindi makuha ang lokasyon", allowLocation: "Mangyaring payagan ang lokasyon sa mga setting ng browser", retryGps: "Subukan Ulit", requirements: "Mga Kinakailangan", photo: "Larawan", submitReport: "Isumite ang Ulat", submitting: "Isinusumite...", cancel: "Kanselahin" },
  unitDetail: { unitStatus: "Status ng Unit", financialData: "Financial Data", serviceRequests: "Mga Kahilingan sa Serbisyo", setStatus: "Itakda ang status", type: "Uri", capacity: "Kapasidad", rate: "Rate", status: "Status", amountDue: "Halagang Dapat Bayaran", dueDate: "Takdang Petsa", checkIn: "Check-In", checkOut: "Check-Out", saveChanges: "I-save ang Mga Pagbabago", noFinancial: "Walang financial data", addFinancial: "Magdagdag ng Financial Data", noRequests: "Walang mga kahilingan para sa unit na ito", resolve: "Resolbahin", qrTitle: "Service Request QR", copyLink: "Kopyahin ang Link", copied: "Nakopya ang link!", guests: "mga bisita", perNight: "/gabi", loading: "Naglo-load…", edit: "I-edit", cancel: "Kanselahin", new: "bago", offline: "Offline — isi-sync kapag nakakonekta na" },
  lang: { select: "Wika" },
};

export default tl;
