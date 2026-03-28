# Audit Role Finance

Dokumen ini mengaudit pemisahan tugas antara `finance`, `finance_manager`, dan `superadmin` pada workspace finance Red Feng.

## Kesimpulan Singkat

Pemisahan `finance_manager` vs `finance` saat ini sudah lebih rapi daripada jalur operasional yang sebelumnya bermasalah.

Yang sudah jelas:

- `finance_manager` memimpin tim, memonitor queue, membaca performa, dan mengirim laporan ke `superadmin`
- `finance_manager` dapat mengelola akun `finance`, tetapi tidak dapat membuat atau mengambil alih `finance_manager`
- `finance` menjalankan eksekusi transfer dan penutupan payout
- `superadmin` tetap menjadi override tertinggi

Yang masih perlu disadari sebagai keputusan desain:

- role `finance` saat ini bisa sekaligus `approve/reject` dan mengeksekusi `processing/paid`
- role `finance_manager` hanya memegang `approve/reject`, bukan eksekusi transfer

Artinya, model sekarang bukan "manager harus lebih kuat dari executor", tetapi "manager mengawasi dan bisa menilai, sedangkan executor menyelesaikan transfer".

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

- `finance_manager` dapat memantau parameter keuangan
- perubahan setting hanya boleh oleh `finance` eksekusi atau `superadmin`

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

Ada asimetri kewenangan pada payout approval:

- `finance` bisa `approve/reject`
- `finance_manager` juga bisa `approve/reject`
- tetapi hanya `finance` yang bisa mengeksekusi `processing/paid`

Ini bukan bug permission, tetapi keputusan organisasi yang perlu disadari.

Implikasinya:

- executor finance saat ini secara teknis memegang siklus payout yang lebih lengkap daripada manager
- manager berperan sebagai quality control, monitoring, dan escalation point, bukan penanda akhir transfer

Status: `Perlu diputuskan secara bisnis, bukan error teknis`

## Rekomendasi Organisasi

Jika ingin mempertahankan model sekarang, definisi perannya sebaiknya ditulis seperti ini:

- `finance` = operator payout end-to-end
- `finance_manager` = pengawas kualitas, backlog, approval oversight, dan pelapor ke superadmin
- `superadmin` = override lintas tim

Jika suatu hari ingin separation of duties lebih ketat, ada dua opsi:

1. `finance_manager` hanya monitor dan tidak ikut `approve/reject`
2. `finance_manager` memegang `approve/reject`, sedangkan `finance` hanya `processing/paid`

Saat ini codebase masih memakai model campuran: manager boleh approve, executor juga boleh approve.

## Matriks Ringkas Finance

| Area | Finance | Finance Manager | Superadmin |
|---|---:|---:|---:|
| Lihat payout queue | Ya | Ya | Ya |
| Approve payout | Ya | Ya | Ya |
| Reject payout | Ya | Ya | Ya |
| Mark processing | Ya | Tidak | Ya |
| Mark paid | Ya | Tidak | Ya |
| Ubah finance settings | Ya | Tidak | Ya |
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

Dokumen ini perlu diperbarui bila model approval payout finance diubah.
