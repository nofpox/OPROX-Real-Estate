import type { Translations } from "./en";

const id: Translations = {
  nav: { units: "Unit", workOrders: "Perintah Kerja", tasks: "Tugas Saya" },
  status: { available: "Tersedia", occupied: "Terisi", maintenance: "Pemeliharaan", cleaning: "Pembersihan", pending: "Tertunda", inProgress: "Sedang Berjalan", completed: "Selesai", cancelled: "Dibatalkan", verified: "Terverifikasi" },
  priority: { urgent: "Mendesak", high: "Tinggi", medium: "Sedang", low: "Rendah" },
  dashboard: { appSubtitle: "Dasbor Staf", totalUnits: "Total Unit", allProperties: "Semua Properti", logout: "Keluar" },
  workOrders: { title: "Perintah Kerja", subtitle: "Perintah Kerja Saya", pending: "Tertunda", inProgress: "Sedang Berjalan", done: "Selesai", all: "Semua", startWork: "Mulai Pekerjaan", complete: "Selesaikan", completedDone: "Selesai", empty: "Tidak Ada Perintah Kerja", emptyDesc: "Tidak ada perintah kerja yang ditetapkan", failedLoad: "Gagal memuat", retry: "Coba Lagi", toastStarted: "Dimulai", toastCompleted: "Selesai", toastFailed: "Pembaruan gagal" },
  tasks: { title: "Tugas Saya Saat Ini", pending: "Tertunda", active: "Aktif", done: "Selesai", startTask: "Mulai Tugas", endTask: "Akhiri Tugas", awaitingApproval: "Menunggu Persetujuan", completedAwaiting: "Selesai — Menunggu Persetujuan", approved: "Disetujui", completeTask: "Selesaikan Tugas", taskLabel: "Tugas", completionPhoto: "Foto Penyelesaian", tapPhoto: "Ketuk untuk mengambil foto", gpsLocation: "Lokasi GPS", locationGetting: "Mendapatkan lokasi Anda...", locationDone: "Lokasi tercatat", locationFailed: "Tidak dapat mendapatkan lokasi", allowLocation: "Harap izinkan akses lokasi di pengaturan browser", retryGps: "Coba Lagi", requirements: "Persyaratan", photo: "Foto", submitReport: "Kirim Laporan", submitting: "Mengirim...", cancel: "Batal" },
  unitDetail: { unitStatus: "Status Unit", financialData: "Data Keuangan", serviceRequests: "Permintaan Layanan", setStatus: "Atur status", type: "Jenis", capacity: "Kapasitas", rate: "Tarif", status: "Status", amountDue: "Jumlah Terutang", dueDate: "Tanggal Jatuh Tempo", checkIn: "Check-In", checkOut: "Check-Out", saveChanges: "Simpan Perubahan", noFinancial: "Tidak ada data keuangan", addFinancial: "Tambah Data Keuangan", noRequests: "Tidak ada permintaan untuk unit ini", resolve: "Selesaikan", qrTitle: "QR Permintaan Layanan", copyLink: "Salin Tautan", copied: "Tautan disalin!", guests: "tamu", perNight: "/malam", loading: "Memuat…", edit: "Edit", cancel: "Batal", new: "baru", offline: "Offline — akan disinkronkan saat terhubung" },
  lang: { select: "Bahasa" },
};

export default id;
