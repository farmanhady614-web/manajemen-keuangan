# Aplikasi Manajemen Keuangan Pribadi

Aplikasi web untuk mengelola keuangan pribadi dengan fitur lengkap.

## Fitur

### Fitur Utama
- ✅ Dashboard ringkasan saldo, pemasukan, dan pengeluaran
- ✅ Form input transaksi dengan pilihan jenis, kategori, nominal, tanggal, dan keterangan
- ✅ Daftar riwayat transaksi dengan warna berbeda (hijau pemasukan, merah pengeluaran)
- ✅ Hapus transaksi dengan update saldo otomatis

### Fitur Lanjutan
- ✅ Sistem Login/Register dengan Email/Password dan Google
- ✅ Kategori transaksi (Makanan, Transportasi, Tagihan, dll)
- ✅ Grafik pie chart untuk visualisasi pengeluaran
- ✅ Filter pencarian berdasarkan kata kunci, bulan, dan jenis transaksi
- ✅ Real-time data sync dengan Firebase
- ✅ Responsive design untuk mobile & desktop

## Cara Install

1. Clone repository ini
2. Buat project di [Firebase Console](https://console.firebase.google.com/)
3. Aktifkan Authentication (Email/Password dan Google)
4. Buat Firestore Database
5. Copy konfigurasi Firebase ke `js/firebase-config.js`
6. Deploy ke GitHub Pages

## Cara Penggunaan

1. Register akun baru atau Login
2. Tambahkan transaksi pemasukan/pengeluaran
3. Lihat ringkasan di dashboard
4. Filter riwayat transaksi sesuai kebutuhan
5. Hapus transaksi jika diperlukan

## Teknologi

- HTML5
- CSS3 (Responsive Design)
- JavaScript (ES6+)
- Firebase (Authentication & Firestore)
- Chart.js
- Font Awesome

## Struktur Database Firestore

Collection: `transactions`
- `userId` (string)
- `jenis` (string: 'pemasukan'/'pengeluaran')
- `kategori` (string)
- `nominal` (number)
- `tanggal` (timestamp)
- `keterangan` (string)
- `createdAt` (timestamp)