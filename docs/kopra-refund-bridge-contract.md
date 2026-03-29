# Kontrak Bridge Kopra Refund

Dokumen ini menjelaskan payload yang diharapkan oleh modul refund finance Red Feng saat mengirim refund manual ke jalur `Kopra / Mandiri`.

Tujuan kontrak ini:

- memberi format request yang stabil untuk middleware internal atau integrasi Mandiri
- menyederhanakan parsing response di app finance
- memastikan finance UI tidak perlu diubah lagi saat bridge bank diganti

## Endpoint yang dipakai app

- `KOPRA_REFUND_API_URL`
  endpoint eksekusi transfer refund
- `KOPRA_STATUS_API_URL`
  endpoint inquiry status refund transfer

Kedua endpoint dipanggil dari server action internal Red Feng, bukan dari browser.

## Header yang dikirim

App akan mengirim header berikut bila env tersedia:

- `Authorization: Bearer <KOPRA_API_TOKEN>`
- `X-API-Key: <KOPRA_API_KEY>`
- `Content-Type: application/json`

## Request Eksekusi Refund

App mengirim payload berikut ke `KOPRA_REFUND_API_URL`:

```json
{
  "refundId": "uuid-refund-request",
  "orderId": "RF2603291234",
  "amount": 250000,
  "currency": "IDR",
  "note": "Refund customer due to merchant cancellation",
  "source": {
    "system": "redfeng-finance",
    "channel": "kopra_manual"
  },
  "beneficiary": {
    "bankName": "MANDIRI",
    "accountNumber": "1234567890123",
    "accountHolder": "BAYU KUSUMO"
  }
}
```

## Response Eksekusi Refund

Bridge sebaiknya mengembalikan payload seperti ini:

```json
{
  "success": true,
  "status": "processing",
  "message": "Transfer instruction accepted",
  "referenceNo": "KOPRA-20260329-0001",
  "transactionId": "TXN-99887766"
}
```

Field minimum yang sebaiknya ada:

- `success`
- `status`
- `referenceNo`

Nilai `status` yang direkomendasikan:

- `processing`
- `success`
- `completed`
- `failed`
- `rejected`

## Request Status Refund

App mengirim payload berikut ke `KOPRA_STATUS_API_URL`:

```json
{
  "refundId": "uuid-refund-request",
  "orderId": "RF2603291234",
  "referenceNo": "KOPRA-20260329-0001"
}
```

## Response Status Refund

Bridge sebaiknya mengembalikan payload seperti ini:

```json
{
  "success": true,
  "status": "success",
  "message": "Transfer completed",
  "referenceNo": "KOPRA-20260329-0001",
  "transactionId": "TXN-99887766"
}
```

Status yang dibaca app:

- `success`
- `successful`
- `paid`
- `completed`
  hasilnya akan dipetakan ke `refund_paid`
- `failed`
- `reject`
- `rejected`
- `error`
  hasilnya akan dipetakan ke `refund_failed`

Kalau status lain dikembalikan, app akan menganggap refund masih menunggu dan tidak mengubah state final.

## Catatan Integrasi Mandiri

Dokumentasi publik Bank Mandiri yang saya temukan hanya memastikan fitur `beneficiary inquiry`, `transaction status`, dan `transfer`, tetapi tidak membuka detail endpoint implementasi publik yang siap dipanggil langsung. Karena itu, pendekatan paling aman untuk Red Feng adalah:

1. app finance mengirim payload standar ke bridge internal
2. bridge internal menerjemahkan payload ke format Mandiri / Kopra yang disyaratkan tenant Anda
3. bridge mengembalikan response yang dinormalisasi sesuai kontrak di atas

Referensi publik:

- Midtrans refund/status dipakai langsung dari server app
- Mandiri H2H Payment overview: https://www.bankmandiri.co.id/en/web/guest/mandiri-h2h-payment

## Rekomendasi Implementasi Bridge

- lakukan beneficiary inquiry sebelum transfer jika kanal Mandiri Anda mendukungnya
- simpan `referenceNo` bank sebagai kunci rekonsiliasi utama
- jangan ubah bentuk response secara bebas; pertahankan `success`, `status`, `referenceNo`, `message`
- jika response Mandiri mentah lebih kompleks, taruh seluruh payload asli di field tambahan internal bridge, bukan menghapus field ringkas yang dibaca app
