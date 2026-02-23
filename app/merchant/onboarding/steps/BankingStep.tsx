'use client'

export default function BankingStep({ merchantId }: { merchantId: string }) {
  return (
    <div>
      Step 3 - Banking <br />
      Merchant ID: {merchantId}
    </div>
  )
}