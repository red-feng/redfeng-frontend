'use client'

export default function LegalStep({ merchantId }: { merchantId: string }) {
  return (
    <div>
      Step 2 - Legal <br />
      Merchant ID: {merchantId}
    </div>
  )
}