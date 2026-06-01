import type { Translations } from "./en";

const id: Translations = {
  request: {
    serviceRequest: "Permintaan Layanan",
    requestType: "Jenis Permintaan",
    description: "Deskripsi",
    descPlaceholder: "Jelaskan masalah secara singkat…",
    submit: "Kirim Permintaan",
    submitting: "Mengirim...",
    unitNotFound: "Unit tidak ditemukan",
    invalidUnit: "Masukkan nomor unit yang valid.",
    errorGeneric: "Terjadi kesalahan. Silakan coba lagi.",
    types: {
      electrical: "Kelistrikan",
      plumbing: "Pipa/Saluran",
      ac: "AC / Pemanas",
      cleaning: "Kebersihan",
      maintenance: "Pemeliharaan",
      noise: "Kebisingan",
      other: "Lainnya",
    },
    success: {
      title: "Permintaan Diterima",
      subtitle: "Permintaan Anda telah diterima.",
      refCode: "Kode Referensi",
      keepCode: "Simpan kode referensi Anda untuk tindak lanjut",
      newRequest: "Permintaan Baru",
    },
  },
  landing: {
    accessUnit: "Akses Unit Anda",
    enterUnit: "Masukkan nomor unit Anda untuk memulai",
    accessPortal: "Akses Portal",
    submitRequests: "Kirim Permintaan",
    rateStay: "Nilai Masa Inap Anda",
    unitDetails: "Detail Unit",
  },
  lang: { select: "Bahasa" },
};

export default id;
