# Customer Merchant Chat Engine Design

Dokumen ini merancang engine chat customer-merchant yang terpisah tegas dari:

- `internal chat` untuk akun internal
- `merchant support` untuk merchant ke admin/support

Tujuan utamanya bukan hanya membuat fitur chat seperti Shopee, tetapi mengunci boundary agar masalah lama tidak terulang: domain chat tercampur, policy akses melebar, route reuse yang salah, dan coupling berlebihan ke status paket/booking.

## 1. Prinsip Utama

1. Setiap domain chat punya engine, tabel, endpoint, realtime channel, storage path, dan policy sendiri.
2. UI boleh terasa mirip, tetapi backend contract tidak boleh berbagi room atau message table lintas domain.
3. Akses ditentukan oleh `conversation_type + participant binding`, bukan hanya oleh login.
4. Customer-merchant chat adalah domain transaksi eksternal, bukan turunan dari internal support.
5. Escalation ke admin dilakukan lewat event/ticket terpisah, bukan dengan memasukkan admin ke room customer-merchant.

## 2. Masalah Lama Yang Harus Dikunci

Dari struktur repo saat ini, ada beberapa pola yang layak kita kunci:

- Engine `package_chat` dulu terlalu dekat ke `package_id` dan kemudian berkembang ke `booking_id`, lalu di-split pre/post booking.
- Room customer-merchant pernah menjadi artefak dari domain paket, padahal kebutuhan bisnis sebenarnya adalah percakapan transaksi/customer care.
- Internal chat dan merchant support sudah lebih aman karena masing-masing punya tabel, endpoint, dan role policy khusus.
- Pengulangan masalah paling berisiko terjadi jika customer chat baru dibangun dengan menyalin tabel/route dari merchant support atau internal chat lalu hanya mengganti label role.

Kesimpulan desain:

- jangan hidupkan lagi `package_chat_*`
- jangan menaruh customer-merchant chat di engine `internal-chat`
- jangan menaruh admin/support sebagai participant langsung di room customer-merchant

## 3. Target Arsitektur

Pisahkan menjadi tiga engine eksplisit:

### A. `commerce-chat`

Untuk customer <-> merchant terkait tanya paket, negosiasi, follow-up order, dan komunikasi pasca transaksi.

Karakter:

- external-facing
- dua pihak utama: `customer`, `merchant`
- boleh punya konteks bisnis seperti inquiry/order, tetapi room tidak identik dengan tabel paket
- tidak boleh diakses admin sebagai participant biasa

### B. `merchant-support`

Untuk merchant <-> admin/support.

Karakter:

- operational support
- participant: `merchant`, `admin`
- satu inbox merchant, dapat di-escalate internal

### C. `internal-chat`

Untuk komunikasi akun internal.

Karakter:

- internal only
- participant internal roles only
- DM atau grup internal bila nanti diperlukan

## 4. Batas Domain Yang Wajib Permanen

Setiap engine wajib punya isolasi penuh pada layer berikut:

- tabel utama
- view/materialized view bila ada
- route API
- helper library
- realtime channel prefix
- attachment bucket/path prefix
- unread counter
- audit event
- retention policy
- regression tests

Contoh naming yang aman:

- `commerce_chat_*`
- `merchant_support_*`
- `internal_chat_*`

Jangan gunakan nama generik seperti:

- `chat_rooms`
- `chat_messages`
- `support_messages`

Nama generik membuat reuse lintas domain terlalu mudah dan rawan salah query.

## 5. Data Model Yang Disarankan

### 5.1 Room model

Room customer-merchant sebaiknya menjadi entity mandiri:

```text
commerce_chat_threads
  id
  thread_type             -- inquiry | order | post_order
  subject_package_id      -- nullable
  subject_order_id        -- nullable
  customer_user_id
  merchant_id
  merchant_user_id
  status                  -- open | archived | blocked | resolved
  source_context          -- public_package | checkout | booking | reorder
  created_at
  updated_at
  last_message_at
  last_message_sender_role
  customer_last_read_at
  merchant_last_read_at
  safety_state            -- normal | flagged | frozen
```

Kenapa `merchant_id` dan `merchant_user_id` keduanya disimpan:

- `merchant_id` mengikat identitas bisnis
- `merchant_user_id` mengikat actor login aktif
- validasi akses merchant jadi bisa memverifikasi user masih pemilik merchant yang sah

### 5.2 Participant binding

Untuk fase awal, model 1 customer + 1 merchant per thread paling aman.

Kalau nanti perlu ekspansi ke multi-agent merchant, jangan mengubah room inti dulu. Tambahkan tabel member terpisah:

```text
commerce_chat_thread_members
  thread_id
  user_id
  actor_role             -- customer | merchant_agent
  merchant_id            -- nullable
  joined_at
  left_at
  last_read_at
```

Namun rekomendasi implementasi v1:

- tetap simpan model fixed pair
- jangan buka multi-member sebelum audit trail dan assignment matang

### 5.3 Message model

```text
commerce_chat_messages
  id
  thread_id
  sender_user_id
  sender_role            -- customer | merchant | system
  message_type           -- text | attachment | system_event
  body
  attachment_url
  attachment_name
  attachment_mime_type
  moderation_state       -- clean | flagged | blocked
  client_message_id      -- idempotency key dari client
  created_at
```

Tambahkan unique index pada kombinasi berikut:

- `(thread_id, client_message_id)` jika `client_message_id` tidak null

Ini penting untuk mencegah double-send saat retry/reconnect.

## 6. Strategi Pembentukan Thread

Masalah lama datang dari room yang terlalu bergantung pada `package_id` atau `booking_id`. Supaya aman, gunakan aturan pembentukan thread seperti ini:

### Rule v1

1. Inquiry sebelum checkout:
   satu thread unik per `customer_user_id + merchant_id + package_id + thread_type=inquiry`
2. Setelah order/booking berhasil:
   buat thread baru `thread_type=order` yang mengacu ke `subject_order_id`
3. Jika inquiry perlu dilanjutkan ke order:
   hubungkan dengan `source_thread_id`, tetapi jangan ubah inquiry room menjadi order room secara diam-diam

Kenapa begitu:

- history pre-order dan post-order tetap jelas
- akses rule order bisa lebih ketat tanpa merusak thread inquiry
- menghindari bug lama "reuse room yang salah konteks"

## 7. Access Control Model

### 7.1 Customer access

Customer hanya boleh akses thread bila:

- `customer_user_id = auth.uid()`

Tidak boleh ada akses berdasarkan package ownership, booking visibility, atau query longgar lain.

### 7.2 Merchant access

Merchant hanya boleh akses thread bila semua benar:

- `merchant_user_id = auth.uid()`
- thread `merchant_id` masih terhubung ke merchant yang dimiliki user itu
- merchant account masih aktif dan tidak dibekukan

Artinya, pola validasi seperti di `lib/chat/package-chat-access.ts` perlu dipertahankan, tetapi dipindah ke engine baru dengan nama domain yang tepat.

### 7.3 Admin/internal access

Admin tidak menjadi participant langsung.

Kalau admin perlu investigasi:

- baca data lewat view/audit admin khusus
- atau lewat escalation ticket
- bukan lewat policy `or admin role can read all`

Ini guardrail paling penting agar chat customer tidak berubah menjadi chat internal terselubung.

## 8. RLS Policy Yang Disarankan

Policy customer-merchant harus eksplisit dan ketat.

### `commerce_chat_threads`

- `select`: hanya customer pemilik thread atau merchant pemilik thread
- `insert`: hanya actor sah, dengan pasangan participant valid
- `update`: sangat terbatas, idealnya via server action/api saja

### `commerce_chat_messages`

- `select`: hanya participant thread
- `insert`: `sender_user_id = auth.uid()` dan sender_role cocok dengan actor thread
- `update/delete`: nonaktifkan untuk user biasa

Rekomendasi:

- jangan izinkan update message body setelah terkirim
- jika perlu edit, simpan sebagai revision/event terpisah

## 9. API Boundary

Pisahkan route jelas seperti engine lain:

```text
/api/commerce-chat/threads
/api/commerce-chat/thread
/api/commerce-chat/messages
/api/commerce-chat/send
/api/commerce-chat/unread-count
/api/commerce-chat/thread-meta
```

Jangan campur di:

- `/api/chat/*` yang terlalu generik
- `/api/merchant-support/*`
- `/api/internal-chat/*`

Alasan:

- route generik mendorong branching berdasarkan query param
- branching itu yang biasanya membuat leakage antar domain

## 10. Realtime Isolation

Channel prefix wajib terpisah:

- `commerce-chat-live`
- `merchant-support-live`
- `internal-chat-live`

Jangan pernah subscribe satu komponen ke tiga domain sekaligus dengan payload parser yang sama, kecuali ada adapter tegas per engine.

Lebih aman bila ada config tunggal seperti:

```ts
export const COMMERCE_CHAT_ENGINE = Object.freeze({
  key: "commerce-chat",
  realtimeChannelPrefix: "commerce-chat-live",
  unreadCountEndpoint: "/api/commerce-chat/unread-count",
  threadEndpoint: "/api/commerce-chat/thread",
  messagesEndpoint: "/api/commerce-chat/messages",
  sendEndpoint: "/api/commerce-chat/send",
  realtimeTables: ["commerce_chat_threads", "commerce_chat_messages"] as const,
})
```

## 11. Attachment Security

Lampiran adalah sumber masalah klasik. Pisahkan per engine:

- `commerce-chat/threads/{threadId}/...`
- `merchant-support/rooms/{roomId}/...`
- `internal-chat/rooms/{roomId}/...`

Aturan minimum:

- whitelist MIME type
- size limit
- filename normalization
- generated storage key, jangan pakai nama file asli sebagai path
- signed URL pendek untuk download
- virus scan hook bila nanti tersedia

Jangan pernah berbagi bucket policy langsung antar engine tanpa prefix validation.

## 12. Moderation dan Safety

Karena ini external chat, `commerce-chat` perlu layer safety yang tidak dibutuhkan internal chat:

- rate limit per sender
- spam burst detection
- blocked keyword / fraud signal
- link masking atau warning untuk nomor WA, Telegram, pembayaran di luar platform
- report conversation event
- freeze thread bila ada pelanggaran

Minimal v1:

- `safety_state` di thread
- `moderation_state` di message
- table event terpisah:

```text
commerce_chat_events
  id
  thread_id
  actor_user_id
  event_type          -- created | flagged | frozen | reopened | reported
  payload_json
  created_at
```

## 13. Unread, Read Receipt, dan Ordering

Gunakan model ringan:

- `customer_last_read_at`
- `merchant_last_read_at`
- `last_message_at`
- `last_message_sender_role`

Jangan hitung unread dari total message count real-time di client. Itu mahal dan rawan race condition.

Ordering:

- primary by `last_message_at desc`
- fallback `updated_at desc`

Untuk mencegah race:

- message insert
- room summary update
- read marker update

idealnya dilakukan dalam RPC atau server-side transaction pattern yang konsisten.

## 14. Anti-Regresi Yang Wajib Diuji

Tambahkan regression tests khusus, bukan hanya snapshot UI.

### Access tests

- customer A tidak bisa baca thread customer B
- merchant X tidak bisa baca thread merchant Y
- admin tidak bisa masuk participant API commerce chat
- merchant yang kehilangan ownership merchant tidak bisa akses thread lama

### Routing tests

- route merchant support tidak pernah mengembalikan commerce chat data
- route internal chat menolak user non-internal
- route commerce chat menolak role internal sebagai sender biasa

### Lifecycle tests

- inquiry thread tidak otomatis berubah menjadi order thread
- retry send dengan `client_message_id` sama tidak menduplikasi message
- read state tidak menandai room lain

### Attachment tests

- file terlalu besar ditolak
- MIME tidak valid ditolak
- signed URL dari engine lain tidak bisa dipakai silang

## 15. Rollout Plan Yang Aman

### Phase 1

- buat engine baru `commerce-chat`
- schema baru, route baru, config baru
- belum menghapus apa pun dari engine lain

### Phase 2

- bangun UI customer inbox dan merchant inbox khusus commerce
- adapter UI boleh reuse komponen tampilan bubble, tetapi data loader harus engine-specific

### Phase 3

- tambahkan escalation/report pipeline ke merchant support atau internal ops sebagai event terpisah

### Phase 4

- retention, moderation, attachment hardening, audit dashboard

## 16. Keputusan Desain Final

Rekomendasi final untuk project ini:

1. Buat engine baru bernama `commerce-chat` khusus customer-merchant.
2. Jangan revive `package_chat_*` karena naming dan model lamanya terlalu sempit serta historinya sudah menunjukkan drift.
3. Pertahankan `merchant-support` dan `internal-chat` sebagai domain terpisah total.
4. Jangan pernah memberi admin akses participant langsung ke commerce thread.
5. Pisahkan inquiry vs order thread agar lifecycle jelas dan tidak mencampur konteks bisnis.
6. Tambahkan idempotency key, audit event, attachment prefix isolation, dan regression test sejak awal.

## 17. Mapping Ke Struktur Repo Saat Ini

Perubahan yang paling natural di repo ini nanti adalah:

- tambah `lib/commerce-chat/*`
- tambah constant engine di `lib/chat-engines.ts`
- tambah route `app/api/commerce-chat/*`
- tambah migration `supabase/migrations/*create_commerce_chat_tables.sql`
- tambah test regresi `tests/commerce-chat-flow.test.mts`

Yang sebaiknya tidak dipakai ulang selain komponen UI presentasional:

- `lib/chat/*` sebagai domain package chat lama
- route generik `app/api/chat/*`

## 18. Ringkasan Singkat

Kalau ingin chat seperti Shopee tetapi aman, kuncinya adalah:

- pisahkan engine per domain, bukan hanya beda halaman
- room customer-merchant harus entity bisnis mandiri
- admin/support masuk lewat escalation pipeline, bukan participant reuse
- lifecycle inquiry dan order harus terpisah
- security boundary dikunci di schema, route, realtime, attachment, dan tests sekaligus

