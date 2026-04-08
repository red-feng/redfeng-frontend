# Internal Terminology Glossary

Dokumen ini menjadi acuan istilah internal RedFeng untuk portal `admin`, `finance`, `merchant`, dan `superadmin`.

## Prinsip Umum

- Gunakan Bahasa Indonesia sebagai bahasa dasar UI internal.
- Istilah teknis yang sudah menjadi nama status sistem boleh dipertahankan dalam bentuk Inggris jika memang dipakai di database atau audit log.
- Hindari mencampur dua istilah untuk satu fase yang sama, misalnya `queue` dan `antrean` dalam konteks UI yang sama.
- Untuk tombol aksi, gunakan kata kerja yang jelas dan konsisten.

## Istilah Utama

| Konteks | Istilah Baku | Hindari Jika Bisa |
| --- | --- | --- |
| queue | antrean | queue |
| request | permintaan | request |
| review | review | pemeriksaan, tinjau, review queue campur |
| approval | persetujuan | approval |
| reject | penolakan / tolak | reject |
| processing | diproses / sedang diproses | processing |
| paid | dibayar / sudah dibayar | paid |
| closed | ditutup | closed |
| source | sumber | source |
| snapshot | ringkasan | snapshot |
| handoff | handoff | serah terima, handoff manual campur |

## Tombol Aksi

| Status / Aksi | Label Tombol |
| --- | --- |
| approve payout | `Setujui payout` |
| reject payout | `Tolak payout` |
| mark processing payout | `Tandai sedang diproses` |
| mark paid payout | `Tandai sudah dibayar` |
| approve refund | `Setujui refund` |
| reject refund | `Tolak refund` |
| mark refund under review | `Tandai masuk review` |
| mark refund processing via Midtrans | `Tandai diproses via Midtrans` |
| mark refund processing via bank | `Tandai diproses via bank` |
| mark refund paid | `Tandai sudah dibayar` |
| mark refund failed | `Tandai gagal` |
| close refund | `Tutup refund` |
| sync gateway status | `Sinkronkan status gateway` |
| admin handoff to finance | `Kirim ke Finance Manual` |

## Judul dan Panel

| Area | Label Baku |
| --- | --- |
| finance payouts | `Kontrol Payout Finance` |
| finance payout snapshot | `Ringkasan payout` |
| finance refunds | `Antrean Refund Finance` |
| finance refund snapshot | `Ringkasan refund` |
| queue filter | `Filter antrean` |
| create request | `Buat permintaan` |
| payout source | `Sumber` |
| finance readiness | `Siap ke finance` |
| review queue | `Antrean review` |
| finance handoff | `Handoff finance` |

## Status Naratif

| Fase | Narasi UI |
| --- | --- |
| payment not settled | `Menunggu customer melunasi pembayaran` |
| waiting for merchant arrived | `Menunggu merchant klik Arrived` |
| waiting for customer pickup | `Menunggu customer klik Picked up` |
| waiting for merchant go | `Menunggu merchant klik Go` |
| awaiting admin handoff | `Menunggu admin kirim ke finance` |
| finance review | `Sedang di review finance` |
| finance processing | `Sedang diproses finance` |
| payout completed | `Payout selesai` |

## Nama Status Sistem

Nama status sistem ini boleh tetap dalam Inggris di level database, audit log, atau developer/debug UI:

- `awaiting_admin_handoff`
- `finance_review`
- `finance_processing`
- `payout_completed`
- `paid_out`
- `refund_under_review`
- `refund_approved`
- `refund_processing_midtrans`
- `refund_processing_bank`
- `refund_paid`
- `refund_reconciled`
- `refund_closed`

## Catatan Implementasi

- Jika satu label tampil ke user internal, utamakan istilah baku di dokumen ini.
- Jika satu string menyebut nama status DB dan label UI sekaligus, tampilkan label UI yang mudah dibaca, lalu simpan status DB hanya untuk badge teknis, debug, atau audit.
- Untuk portal multi-bahasa, jadikan dokumen ini sebagai source wording Bahasa Indonesia sebelum diterjemahkan ke English dan Chinese.
