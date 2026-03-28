# Role Matrix Internal Red Feng

Dokumen ini menjadi acuan resmi untuk pembagian wewenang internal antara `admin`, `operations_manager`, dan `superadmin` di portal admin Red Feng.

## Tujuan

- Menjaga pemisahan tugas antara eksekusi operasional dan pengawasan manajerial.
- Mencegah wewenang `admin` dan `operations_manager` menjadi sama.
- Menjadi acuan untuk pengembangan permission, audit log, dan UI ke depan.

## Struktur Hierarki

- `admin` berada di bawah `operations_manager`.
- `operations_manager` berada di bawah `superadmin`.
- `finance` dan `finance_manager` berada pada jalur terpisah dari tim admin operasional.

## Definisi Peran

### Admin

Peran eksekutor operasional harian.

Fokus utama:
- review merchant
- review package
- validasi status booking
- handoff booking ke finance
- pengisian note operasional

### Operations Manager

Peran pengawas operasional dan pemimpin tim admin.

Fokus utama:
- memantau SLA, backlog, dan kualitas kerja admin
- mengelola akun `admin`
- membaca audit log
- memberi arahan prioritas dan eskalasi
- mengirim laporan operasional ke `superadmin`

### Superadmin

Peran pengendali tertinggi lintas fungsi.

Fokus utama:
- mengawasi manager operasional dan manager finance
- mengelola akun manager dan superadmin
- memiliki akses override lintas area sesuai kebutuhan bisnis

## Matriks Wewenang

| Modul | Aksi | Admin | Operations Manager | Superadmin |
|---|---|---:|---:|---:|
| Merchant | Lihat data merchant | Ya | Ya | Ya |
| Merchant | Approve merchant | Ya | Tidak | Ya |
| Merchant | Reject merchant | Ya | Tidak | Ya |
| Merchant | Nonaktifkan merchant | Ya | Tidak | Ya |
| Merchant | Aktifkan kembali merchant | Ya | Tidak | Ya |
| Merchant | Cabut akses merchant anomali | Ya | Tidak | Ya |
| Package | Lihat queue/review paket | Ya | Ya | Ya |
| Package | Approve package | Ya | Tidak | Ya |
| Package | Reject package | Ya | Tidak | Ya |
| Package | Hapus permanen package | Tidak | Tidak | Ya |
| Booking | Lihat Booking Center | Ya | Ya | Ya |
| Booking | Tambah/update internal note | Ya | Tidak | Ya |
| Booking | Handoff booking ke finance | Ya | Tidak | Ya |
| Admin Accounts | Lihat akun admin | Ya, bila diperlukan | Ya | Ya |
| Admin Accounts | Buat akun admin | Tidak | Ya | Ya |
| Admin Accounts | Reset password admin | Tidak | Ya | Ya |
| Admin Accounts | Hapus akun admin | Tidak | Ya | Ya |
| Ops Manager Accounts | Buat akun operations manager | Tidak | Tidak | Ya |
| Ops Manager Accounts | Reset/hapus operations manager | Tidak | Tidak | Ya |
| Audit Log | Lihat log operasional | Ya | Ya | Ya |
| Audit Log | Lihat log account management | Ya | Ya | Ya |
| Reporting | Kirim laporan operasional | Tidak | Ya | Ya |
| Oversight | Pantau SLA/backlog/overdue | Tidak | Ya | Ya |
| Oversight | Tetapkan prioritas kerja tim | Tidak | Ya | Ya |
| Oversight | Eskalasi ke superadmin | Ya, per kasus | Ya | Ya |

## Kewajiban Admin Kepada Operations Manager

Admin wajib:

- menjalankan SOP review merchant, package, dan booking
- mematuhi prioritas kerja yang ditetapkan operations manager
- menjaga SLA harian
- mengisi note operasional yang jelas pada kasus penting
- melaporkan blocker, anomali, dan kasus sensitif secepatnya
- melakukan eskalasi saat kasus macet, berisiko, atau perlu keputusan manajerial
- menjaga kualitas keputusan approve, reject, dan handoff

## Kewenangan Tambahan Operations Manager Yang Disarankan

Operations manager sebaiknya dapat:

- melihat ringkasan performa tim admin
- melihat item overdue dan queue yang menumpuk
- memantau histori keputusan admin lewat audit log
- memberi arahan prioritas dan fokus tindak lanjut
- mengelola lifecycle akun `admin`
- mengirim laporan operasional resmi ke `superadmin`

Operations manager sebaiknya tidak menjalankan secara rutin:

- approve atau reject merchant
- approve atau reject package
- handoff booking ke finance
- keputusan payout atau approval finansial

## Guardrails Implementasi

Untuk menjaga pemisahan peran tetap sehat:

- server action eksekusi bisnis harus dibatasi ke `admin` dan `superadmin`
- `operations_manager` boleh mengelola akun `admin`, tetapi aksi tersebut wajib masuk audit log
- jalur finance harus tetap terpisah dari jalur admin operasional
- penghapusan permanen data sensitif sebaiknya tetap dibatasi ke `superadmin`
- UI harus menampilkan mode read-only untuk `operations_manager` pada modul eksekusi bisnis

## Prinsip Organisasi

Model kerja yang dipakai:

- `admin` adalah operator eksekusi
- `operations_manager` adalah pengawas mutu, kapasitas, prioritas, dan eskalasi
- `superadmin` adalah pengambil keputusan lintas fungsi

Dokumen ini harus diperbarui setiap kali ada perubahan permission yang memengaruhi role internal.

## Dokumen Terkait

- checklist implementasi teknis: `docs/role-matrix-checklist.md`
- lifecycle akun internal: `docs/internal-account-lifecycle.md`
- audit role finance: `docs/finance-role-audit.md`
- diagram role dan lifecycle akun: `docs/role-account-lifecycle-diagram.md`
- bahasa visual dashboard: `docs/dashboard-visual-language.md`
