import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getOptionalEnv } from '@/lib/env'
import { getAdminResendFromEmail } from '@/lib/contact-config'

export async function POST(req: Request) {
  try {
    const resendApiKey = getOptionalEnv("RESEND_API_KEY")

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const resend = new Resend(resendApiKey)

    const { email, brandName } = await req.json()

    await resend.emails.send({
      from: getAdminResendFromEmail(),
      to: email,
      subject: 'RedFeng Merchant: Pengajuan Sedang Diverifikasi',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;line-height:1.7;color:#0f172a;">
          <h2 style="margin-bottom:8px;">Halo ${brandName},</h2>
          <p style="margin:0 0 14px;">Pengajuan akun merchant Anda sudah kami terima dan saat ini sedang diverifikasi oleh tim RedFeng.</p>
          <p style="margin:0 0 14px;">Pada tahap ini, admin akan meninjau profil bisnis, data legal, rekening payout, serta dokumen pendukung yang Anda unggah.</p>
          <p style="margin:0 0 14px;">Estimasi proses review biasanya maksimal <strong>1 x 24 jam kerja</strong>. Jika ada revisi, kami akan mengirim pemberitahuan melalui email ini.</p>
          <p style="margin:0 0 18px;">Mohon pastikan email ini tetap aktif agar Anda tidak melewatkan hasil review merchant.</p>
          <p style="margin:0;">Terima kasih,<br/><strong>Tim Admin RedFeng</strong></p>
        </div>
      `
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Email gagal dikirim' },
      { status: 500 }
    )
  }
}
