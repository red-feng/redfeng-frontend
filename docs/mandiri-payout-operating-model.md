# Model Operasional Payout Mandiri Red Feng

Dokumen ini menjelaskan model operasional payout Red Feng jika rekening escrow utama berada di Bank Mandiri dan fasilitas bank menggunakan skema `maker` dan `approval`.

## Tujuan

- menjaga separation of duties pada pencairan dana merchant
- memastikan payout merchant selalu berangkat dari data sistem, bukan transfer manual lepas
- memberi jalur pertumbuhan dari operasi awal yang masih semi-manual sampai skala yang lebih besar

## Prinsip Dasar

- semua dana customer masuk dan ditahan dulu di rekening Red Feng
- admin operasional tidak mentransfer uang
- finance hanya memproses payout yang sudah lolos alur bisnis sistem
- tidak boleh satu orang memegang fungsi input transfer dan persetujuan transfer sekaligus
- audit trail sistem harus cocok dengan audit trail bank

## Rekomendasi Pemegang Akses Bank

- akun `maker` Mandiri dipegang oleh role `finance`
- akun `approval` Mandiri dipegang oleh role `finance_manager`
- `superadmin` tidak menjadi approver harian, hanya emergency override

Alasan:

- `maker` adalah fungsi eksekusi: menyiapkan transfer, batch, dan instruksi payout
- `approval` adalah fungsi kontrol: memverifikasi lalu menyetujui atau menolak transfer
- model ini paling sesuai dengan struktur role Red Feng saat ini

## Alur Operasional Target

1. customer membayar dan dana masuk ke rekening Red Feng
2. sistem menahan dana sampai flow pickup selesai
3. admin handoff booking ke finance
4. sistem membuat `payout_request`
5. `finance_manager` memeriksa dasar payout dan memberi keputusan `approve` atau `reject`
6. setelah `approved`, `finance` sebagai `maker` menyiapkan transfer di Mandiri
7. `finance_manager` sebagai `approval` menyetujui transfer di Mandiri
8. setelah dana benar-benar terkirim, `finance` menandai `paid` di sistem dengan referensi transfer
9. audit log sistem dan bukti bank dicocokkan saat rekonsiliasi

## Model Bertahap

### Tahap 1: Early Stage

Dipakai saat volume payout masih rendah.

Ciri:

- payout queue berasal dari sistem internal
- `finance_manager` membaca queue lalu approve di sistem
- `finance` login ke Mandiri Corporate sebagai maker
- `finance_manager` login ke Mandiri Corporate sebagai approval
- `finance` menyalin nominal dan rekening dari queue sistem ke portal bank
- sesudah transfer sukses, `finance` menandai `processing` lalu `paid` di sistem

Kontrol minimum:

- payout hanya boleh berangkat dari record `payout_requests`
- setiap transfer wajib punya referensi payout
- approval bank tidak boleh dilakukan oleh akun maker
- nominal final yang ditransfer harus sama dengan `amount` di queue

### Tahap 2: Growing Stage

Dipakai saat volume payout mulai rutin dan butuh efisiensi.

Ciri:

- `finance` mengekspor batch payout dari sistem
- file batch diunggah ke Mandiri Corporate
- `finance_manager` menyetujui batch di Mandiri
- sistem menyimpan nomor batch, tanggal upload, dan status rekonsiliasi

Tambahan kontrol:

- satu batch punya daftar payout yang jelas
- satu batch punya nominal total yang bisa direkonsiliasi
- reject atau reversal di bank harus dipantulkan lagi ke sistem

### Tahap 3: Scale-Up

Dipakai saat volume payout tinggi dan waktu proses harus makin singkat.

Ciri:

- sistem Red Feng terhubung ke bank via API atau host-to-host
- sistem mengirim instruksi payout secara terstruktur
- approval tetap mengikuti skema maker-checker-approver di bank
- callback status transfer masuk kembali ke sistem otomatis

Tambahan kontrol:

- reference id bank tersimpan per payout
- rekonsiliasi nominal dan status dilakukan otomatis
- exception queue dipisahkan dari queue normal

## Matriks Wewenang Payout Mandiri

| Area | Finance | Finance Manager | Superadmin |
|---|---:|---:|---:|
| Lihat payout queue | Ya | Ya | Ya |
| Lihat breakdown payout | Ya | Ya | Ya |
| Approve payout di sistem | Tidak ideal | Ya | Ya |
| Reject payout di sistem | Tidak ideal | Ya | Ya |
| Siapkan transfer sebagai maker Mandiri | Ya | Tidak | Darurat saja |
| Approve transfer di Mandiri | Tidak | Ya | Darurat saja |
| Mark `processing` di sistem | Ya | Tidak | Ya |
| Mark `paid` di sistem | Ya | Tidak | Ya |
| Ubah `Finance Settings` | Tidak | Ya | Ya |
| Rekonsiliasi bukti transfer | Ya | Ya | Ya |
| Override darurat | Tidak | Tidak | Ya |

## Pencocokan Dengan Sistem Saat Ini

Yang sudah cocok:

- `finance` sudah memegang `processing` dan `paid`
- `finance_manager` sudah bisa melihat seluruh payout queue
- `finance_manager` sudah menjadi owner `Finance Settings`
- `finance_manager` sudah mengelola akun `finance`
- `superadmin` tetap menjadi override tertinggi

Yang masih campuran:

- tidak ada lagi celah approval di role `finance`
- approval sistem sekarang sudah sejalan dengan owner approval bank

Artinya:

- model bank Mandiri yang sehat adalah `finance = maker`, `finance_manager = approval`
- model sistem Red Feng sekarang sudah selaras dengan itu

## Rekomendasi Sistem

Jika ingin benar-benar sejajar dengan model Mandiri:

1. `finance_manager` menjadi satu-satunya role approval sistem untuk `approve/reject`
2. `finance` hanya boleh menjalankan `processing/paid`
3. tombol approval di UI `finance` disembunyikan
4. audit log payout menyimpan siapa approver sistem dan siapa executor transfer
5. field referensi transfer bank dibuat wajib saat status `paid`

## Aturan Operasional Harian

- maker tidak boleh membuat payout di luar queue sistem
- approval tidak boleh menyetujui transfer tanpa cek nominal dan rekening tujuan
- perubahan rekening merchant harus selesai sebelum payout masuk tahap `approved`
- bila approver tidak tersedia, `superadmin` hanya dipakai sebagai jalur darurat
- tidak disarankan memakai m-banking pribadi untuk operasi payout harian

## Kesimpulan

Untuk Red Feng, model paling sehat adalah:

- `finance` = maker dan executor transfer
- `finance_manager` = approval dan quality control
- `superadmin` = emergency override

Model ini paling cocok untuk rekening Mandiri corporate yang memakai skema `maker` dan `approval`, dan paling mudah dikembangkan dari operasi awal menuju batch payout lalu integrasi bank di tahap scale-up.
