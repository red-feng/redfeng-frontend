# Diagram Role dan Account Lifecycle

Dokumen ini menyajikan diagram ringkas untuk hierarki role internal dan lifecycle pengelolaan akun antar role.

## 1. Hierarki Role

```mermaid
flowchart TD
  SA[superadmin]
  OM[operations_manager]
  FM[finance_manager]
  AD[admin]
  FI[finance]

  SA --> OM
  SA --> FM
  OM --> AD
  FM --> FI
```

Makna diagram:

- `superadmin` berada di puncak dua jalur
- jalur operasional: `operations_manager` memimpin `admin`
- jalur finance: `finance_manager` memimpin `finance`

## 2. Lifecycle Akun Internal

```mermaid
flowchart LR
  SA[superadmin] -->|create / reset / delete| OM[operations_manager]
  SA -->|create / reset / delete| AD[admin]
  SA -->|create / reset / delete| FM[finance_manager]
  SA -->|create / reset / delete| FI[finance]

  OM -->|create / reset / delete| AD
  FM -->|create / reset / delete| FI
```

Aturan utamanya:

- `operations_manager` hanya mengelola akun `admin`
- `finance_manager` hanya mengelola akun `finance`
- `superadmin` bisa mengelola seluruh struktur manager dan executor

## 3. Alur Operasional

```mermaid
flowchart LR
  A1[admin review merchant/package/booking] --> A2[admin handoff booking ke finance]
  A2 --> F1[finance approve payout]
  F1 --> F2[finance mark processing]
  F2 --> F3[finance mark paid]

  OM[operations_manager] -.monitor / audit / report.-> A1
  FM[finance_manager] -.monitor / approve oversight / report.-> F1
  SA[superadmin] -.override.-> A1
  SA -.override.-> F1
```

Makna diagram:

- `admin` adalah executor operasional
- `operations_manager` memonitor, mengarahkan prioritas, dan mengelola akun admin
- `finance` menjalankan payout
- `finance_manager` memonitor queue finance, melihat aging, mengelola akun finance, dan mengirim laporan
- `superadmin` memegang override lintas jalur

## 4. Prinsip Singkat

- manager tidak otomatis menjadi executor
- manager memegang kontrol tim, kualitas, audit, dan pelaporan
- executor memegang aksi rutin yang menyentuh status bisnis
- audit log wajib menangkap semua lifecycle akun internal

Dokumen ini melengkapi:

- `docs/role-matrix.md`
- `docs/role-matrix-checklist.md`
- `docs/internal-account-lifecycle.md`
- `docs/finance-role-audit.md`
