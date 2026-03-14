import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getOptionalEnv } from '@/lib/env'

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
      from: 'RedFeng Admin <admin@redfeng.co>',
      to: email,
      subject: 'Akun Anda Sedang Diverifikasi',
      html: `
        <h2>Halo ${brandName},</h2>
        <p>Akun merchant Anda sedang dalam proses verifikasi oleh tim RedFeng.</p>
        <p>Proses ini biasanya memakan waktu maksimal 1x24 jam.</p>
        <br/>
        <p>Terima kasih,<br/>Tim RedFeng</p>
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
