# Audit Role Finance

Dokumen ini mengaudit pemisahan tugas antara `finance`, `finance_manager`, dan `superadmin` pada workspace finance Red Feng.

## Kesimpulan Singkat

Pemisahan `finance_manager` vs `finance` saat ini sudah lebih rapi daripada jalur operasional yang sebelumnya bermasalah.

Yang sudah jelas:

- `finance_manager` memimpin tim, memonitor queue, membaca performa, dan mengirim laporan ke `superadmin`
- `finance_manager` dapat mengelola akun `finance`, tetapi tidak dapat membuat atau mengambil alih `finance_manager`
- `finance` menjalankan eksekusi transfer dan penutupan payout
- `superadmin` tetap menjadi override tertinggi
- `finance_manager` memegang approval / reject payout
- `finance` hanya memegang `processing` dan `paid`

Artinya, model sekarang sudah lebih sejajar dengan skema `maker` dan `approval` di bank.

## Area Yang Sudah Terpisah Dengan Baik

### 1. Pengelolaan akun finance

- `finance_manager` dan `superadmin` bisa masuk ke `/finance/team-accounts`
- `finance_manager` hanya boleh membuat, reset password, dan menghapus akun `finance`
- hanya `superadmin` yang boleh membuat atau mengelola akun `finance_manager`
- semua aksi lifecycle akun finance masuk audit log

Referensi implementasi:

- `app/finance/(protected)/team-accounts/page.tsx`
- `app/finance/(protected)/team-accounts/finance-actions.ts`

### 2. Reporting manager

- hanya `finance_manager` dan `superadmin` yang bisa mengirim laporan manager
- laporan disimpan dengan `author_role = finance_manager`
- dashboard manager memang disiapkan untuk aging, outstanding, blocker, dan performa tim

Referensi implementasi:

- `app/finance/(protected)/dashboard/actions.ts`
- `app/finance/(protected)/dashboard/page.tsx`

### 3. Settings payout

- `finance_manager` menjadi owner utama `Finance Settings`
- `superadmin` memegang hak override
- `finance` hanya melihat parameter tanpa mengubahnya

Referensi implementasi:

- `app/finance/(protected)/settings/page.tsx`
- `lib/internal-roles.ts`

### 4. Eksekusi transfer

- `processing` dan `paid` hanya boleh oleh `finance` atau `superadmin`
- UI payout sudah menahan `finance_manager` dari tombol transfer flow

Referensi implementasi:

- `app/finance/(protected)/payouts/actions.ts`
- `app/finance/(protected)/payouts/page.tsx`

## Temuan Audit

### Temuan 1

Tidak ada celah seperti jalur `operations_manager -> admin` yang membuat dua role menjadi praktis sama.

Alasan:

- `finance_manager` tidak bisa menjalankan `processing` atau `paid`
- `finance` tidak bisa mengelola akun `finance_manager`
- `finance` tidak bisa mengirim laporan manager

Status: `Aman`

### Temuan 2

Model payout sekarang lebih sehat untuk jalur Mandiri:

- `finance_manager` memegang `approve/reject`
- `finance` memegang `processing/paid`
- `superadmin` tetap override

Implikasinya:

- approval internal sudah berada di level manager
- executor transfer tidak lagi bisa menyetujui payout sendiri
- separation of duties lebih kuat

Status: `Sudah selaras`

### Temuan 3

Jika Red Feng memakai Mandiri dengan skema `maker` dan `approval`, maka model organisasi yang paling sehat adalah:

- `finance` = maker
- `finance_manager` = approval
- `superadmin` = jalur darurat

Dalam konteks ini, model sistem sekarang sudah cocok dengan model bank yang ideal.

Status: `Sudah selaras`

## Rekomendasi Organisasi

Definisi perannya sekarang sebaiknya ditulis seperti ini:

- `finance` = maker dan executor transfer
- `finance_manager` = approval, quality control, backlog oversight, dan pelapor ke superadmin
- `superadmin` = override lintas tim

Model ini sekarang sudah dipakai di codebase.

## Matriks Ringkas Finance

| Area | Finance | Finance Manager | Superadmin |
|---|---:|---:|---:|
| Lihat payout queue | Ya | Ya | Ya |
| Approve payout | Tidak | Ya | Ya |
| Reject payout | Tidak | Ya | Ya |
| Mark processing | Ya | Tidak | Ya |
| Mark paid | Ya | Tidak | Ya |
| Ubah finance settings | Tidak | Ya | Ya |
| Lihat finance settings | Ya | Ya | Ya |
| Buat akun finance | Tidak | Ya | Ya |
| Reset/hapus akun finance | Tidak | Ya | Ya |
| Buat/reset/hapus finance manager | Tidak | Tidak | Ya |
| Kirim laporan manager | Tidak | Ya | Ya |
| Lihat performa team finance | Terbatas | Ya | Ya |

## Catatan Implementasi

Copy dashboard finance sudah dirapikan agar konsisten dengan struktur saat ini:

- `finance_manager` mengelola akun finance team
- `superadmin` mengelola struktur finance manager

Dokumen operasional payout Mandiri:

- `docs/mandiri-payout-operating-model.md`

Dokumen ini perlu diperbarui bila model approval payout finance diubah.
