"use server"

import { redirect } from "next/navigation"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isKopraExecutionConfigured, isKopraStatusConfigured, executeKopraRefundTransfer, getKopraRefundStatus } from "@/lib/refunds/kopra"
import { cancelMidtransTransaction, getMidtransTransactionStatus, refundMidtransTransaction } from "@/lib/refunds/midtrans"
import { isFinanceApprovalRole, isFinanceExecutionRole, isFinancePortalRole } from "@/lib/internal-roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type RefundStatus =
  | "refund_requested"
  | "refund_under_review"
  | "refund_approved"
  | "refund_rejected"
  | "refund_processing_midtrans"
  | "refund_processing_bank"
  | "refund_paid"
  | "refund_failed"
  | "refund_reconciled"
  | "refund_closed"

function backToRefunds(message: string, type: "success" | "error"): never {
  redirect(`/finance/refunds?${type}=${encodeURIComponent(message)}`)
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim()
}

function readMoney(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").replace(/,/g, "").trim()
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : Number.NaN
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function normalizeKeyword(value: unknown) {
  return String(value || "").trim().toLowerCase()
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function mergeMetadata(
  currentMetadata: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
) {
  return {
    ...(currentMetadata || {}),
    ...patch,
  }
}

async function ensureFinanceActor() {
  const supabase = await createClient("finance")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/finance/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const role = profile?.role || null

  if (!profile || (!isFinancePortalRole(role) && role !== "superadmin")) {
    redirect("/finance/login")
  }

  return {
    user,
    role,
  }
}

async function insertRefundEvent(params: {
  refundRequestId: string
  actorId: string
  actorRole: string | null
  eventType: string
  summary: string
  metadata?: Record<string, unknown>
}) {
  const adminSupabase = createAdminClient()

  await adminSupabase.from("refund_events").insert({
    refund_request_id: params.refundRequestId,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    event_type: params.eventType,
    summary: params.summary,
    metadata: params.metadata || {},
  })
}

function statusLabel(status: RefundStatus) {
  switch (status) {
    case "refund_requested":
      return "Refund Requested"
    case "refund_under_review":
      return "Under Review"
    case "refund_approved":
      return "Approved"
    case "refund_rejected":
      return "Rejected"
    case "refund_processing_midtrans":
      return "Processing Midtrans"
    case "refund_processing_bank":
      return "Processing Bank"
    case "refund_paid":
      return "Refund Paid"
    case "refund_failed":
      return "Refund Failed"
    case "refund_reconciled":
      return "Reconciled"
    case "refund_closed":
      return "Closed"
  }
}

async function applyGatewayExecution(params: {
  refund: {
    id: string
    status: string | null
    refund_channel: string | null
    order_id: string | null
    midtrans_transaction_id: string | null
    midtrans_refund_id: string | null
    kopra_reference_no: string | null
    net_refund_amount: number | null
    refund_reason: string
    bank_name: string | null
    bank_account_number: string | null
    bank_account_holder: string | null
    metadata: Record<string, unknown> | null
  }
  nextStatus: RefundStatus
  note: string
  midtransRefundId: string
  midtransTransactionId: string
  kopraReferenceNo: string
}) {
  if (params.nextStatus === "refund_processing_midtrans") {
    const transactionKey =
      params.midtransTransactionId ||
      params.refund.midtrans_transaction_id ||
      params.refund.order_id ||
      ""

    if (!transactionKey) {
      throw new Error("Midtrans transaction ID atau order ID wajib tersedia.")
    }

    const statusResponse = (await getMidtransTransactionStatus(transactionKey)) as Record<string, unknown>
    const transactionStatus = normalizeKeyword(statusResponse.transaction_status)

    if (["refund", "partial_refund", "cancel"].includes(transactionStatus)) {
      return {
        metadataPatch: {
          gatewayProvider: "midtrans",
          midtransExecution: {
            mode: "already_final",
            statusResponse,
          },
        },
        midtransRefundId:
          params.midtransRefundId ||
          safeString(statusResponse.refund_key) ||
          params.refund.midtrans_refund_id,
      }
    }

    if (transactionStatus === "settlement") {
      const refundKey = params.midtransRefundId || `refund-${params.refund.id}`
      const refundResponse = (await refundMidtransTransaction({
        transactionIdOrOrderId: transactionKey,
        refundKey,
        amount: Number(params.refund.net_refund_amount || 0),
        reason: params.note || params.refund.refund_reason,
      })) as Record<string, unknown>

      return {
        metadataPatch: {
          gatewayProvider: "midtrans",
          midtransExecution: {
            mode: "refund",
            statusResponse,
            refundResponse,
          },
        },
        midtransRefundId:
          safeString(refundResponse.refund_key) ||
          safeString(refundResponse.refund_id) ||
          refundKey,
      }
    }

    if (["pending", "capture", "authorize"].includes(transactionStatus)) {
      const cancelResponse = (await cancelMidtransTransaction(transactionKey)) as Record<string, unknown>
      return {
        metadataPatch: {
          gatewayProvider: "midtrans",
          midtransExecution: {
            mode: "cancel",
            statusResponse,
            cancelResponse,
          },
        },
        midtransRefundId: params.midtransRefundId || params.refund.midtrans_refund_id,
      }
    }

    throw new Error(`Status transaksi Midtrans belum bisa direfund: ${transactionStatus || "unknown"}.`)
  }

  if (params.nextStatus === "refund_processing_bank") {
    if (!isKopraExecutionConfigured()) {
      throw new Error("KOPRA_REFUND_API_URL belum diatur, jadi eksekusi refund bank belum bisa dijalankan.")
    }

    const transferResponse = await executeKopraRefundTransfer({
      refundId: params.refund.id,
      amount: Number(params.refund.net_refund_amount || 0),
      bankName: params.refund.bank_name,
      bankAccountNumber: params.refund.bank_account_number,
      bankAccountHolder: params.refund.bank_account_holder,
      note: params.note || null,
      orderId: params.refund.order_id,
    })

    return {
      metadataPatch: {
        gatewayProvider: "kopra",
        kopraExecution: transferResponse,
      },
      kopraReferenceNo:
        params.kopraReferenceNo ||
        safeString(transferResponse.referenceNo) ||
        params.refund.kopra_reference_no,
    }
  }

  return {
    metadataPatch: null,
    midtransRefundId: params.midtransRefundId || params.refund.midtrans_refund_id,
    kopraReferenceNo: params.kopraReferenceNo || params.refund.kopra_reference_no,
  }
}

function canMoveToStatus(role: string | null, status: RefundStatus) {
  if (status === "refund_under_review") {
    return isFinancePortalRole(role) || role === "superadmin"
  }

  if (status === "refund_approved" || status === "refund_rejected" || status === "refund_closed") {
    return isFinanceApprovalRole(role)
  }

  return isFinanceExecutionRole(role)
}

function isFinalStatus(status: string | null | undefined) {
  return ["refund_rejected", "refund_failed", "refund_closed"].includes(normalizeStatus(status))
}

function isValidRefundTransition(currentStatus: string, nextStatus: RefundStatus) {
  const transitions: Record<string, RefundStatus[]> = {
    refund_requested: ["refund_under_review"],
    refund_under_review: ["refund_approved", "refund_rejected"],
    refund_approved: ["refund_processing_midtrans", "refund_processing_bank", "refund_failed"],
    refund_processing_midtrans: ["refund_paid", "refund_failed"],
    refund_processing_bank: ["refund_paid", "refund_failed"],
    refund_paid: ["refund_reconciled", "refund_closed"],
    refund_rejected: ["refund_closed"],
    refund_failed: ["refund_closed"],
    refund_reconciled: ["refund_closed"],
  }

  return transitions[currentStatus]?.includes(nextStatus) ?? false
}

export async function createRefundRequest(formData: FormData) {
  const actor = await ensureFinanceActor()
  const bookingReference = readText(formData, "bookingReference")
  const orderId = readText(formData, "orderId")
  const refundChannel = readText(formData, "refundChannel") || "manual_other"
  const paymentMethodInput = readText(formData, "paymentMethod")
  const paymentChannelInput = readText(formData, "paymentChannel")
  const midtransTransactionId = readText(formData, "midtransTransactionId")
  const refundReasonCode = readText(formData, "refundReasonCode")
  const refundReason = readText(formData, "refundReason")
  const grossAmount = readMoney(formData, "grossAmount")
  const deductionAmount = readMoney(formData, "deductionAmount")
  const netRefundAmount = readMoney(formData, "netRefundAmount")
  const bankName = readText(formData, "bankName")
  const bankAccountNumber = readText(formData, "bankAccountNumber")
  const bankAccountHolder = readText(formData, "bankAccountHolder")
  const notes = readText(formData, "notes")

  if (!refundReason) {
    backToRefunds("Alasan refund wajib diisi.", "error")
  }

  if (grossAmount === null || Number.isNaN(grossAmount) || grossAmount <= 0) {
    backToRefunds("Nominal bruto refund tidak valid.", "error")
  }

  if ((deductionAmount !== null && Number.isNaN(deductionAmount)) || (deductionAmount !== null && deductionAmount < 0)) {
    backToRefunds("Nominal potongan refund tidak valid.", "error")
  }

  const safeDeduction = deductionAmount || 0
  const resolvedNetRefundAmount =
    netRefundAmount === null || Number.isNaN(netRefundAmount) ? grossAmount - safeDeduction : netRefundAmount

  if (!Number.isFinite(resolvedNetRefundAmount) || resolvedNetRefundAmount < 0) {
    backToRefunds("Nominal refund bersih tidak valid.", "error")
  }

  if (refundChannel === "kopra_manual" && (!bankName || !bankAccountNumber || !bankAccountHolder)) {
    backToRefunds("Refund via Kopra wajib melengkapi data rekening customer.", "error")
  }

  const adminSupabase = createAdminClient()
  let booking:
    | {
        id: string
        user_id: string | null
        booking_code: string | null
        customer_name: string | null
        customer_email: string | null
        total_amount: number | null
        payment_method: string | null
        gateway_payment_method: string | null
        package_id: string | null
      }
    | null = null
  let merchantId: string | null = null

  if (bookingReference) {
    const { data: bookingData } = await adminSupabase
      .from("bookings")
      .select(
        "id, user_id, booking_code, customer_name, customer_email, total_amount, payment_method, gateway_payment_method, package_id",
      )
      .or(`booking_code.eq.${bookingReference},id.eq.${bookingReference}`)
      .maybeSingle()

    if (!bookingData) {
      backToRefunds("Booking tidak ditemukan. Gunakan booking code atau booking ID yang valid.", "error")
    }

    booking = bookingData

    if (booking.package_id) {
      const { data: packageData } = await adminSupabase
        .from("packages")
        .select("merchant_id")
        .eq("id", booking.package_id)
        .maybeSingle()

      merchantId = packageData?.merchant_id || null
    }
  }

  const { data: refund, error } = await adminSupabase
    .from("refund_requests")
    .insert({
      booking_id: booking?.id || null,
      customer_id: booking?.user_id || null,
      merchant_id: merchantId,
      order_id: orderId || booking?.booking_code || null,
      payment_method: paymentMethodInput || booking?.payment_method || null,
      payment_channel: paymentChannelInput || booking?.gateway_payment_method || null,
      refund_channel: refundChannel,
      midtrans_transaction_id: midtransTransactionId || null,
      refund_reason: refundReason,
      refund_reason_code: refundReasonCode || null,
      gross_amount: grossAmount,
      deduction_amount: safeDeduction,
      net_refund_amount: resolvedNetRefundAmount,
      bank_name: bankName || null,
      bank_account_number: bankAccountNumber || null,
      bank_account_holder: bankAccountHolder || null,
      notes: notes || null,
      requested_by: actor.user.id,
      metadata: {
        bookingCode: booking?.booking_code || null,
        customerName: booking?.customer_name || null,
        customerEmail: booking?.customer_email || null,
        bookingGrossAmount: booking?.total_amount || null,
      },
    })
    .select("id, booking_id, merchant_id, status")
    .single()

  if (error || !refund) {
    backToRefunds(error?.message || "Gagal membuat refund request.", "error")
  }

  await insertRefundEvent({
    refundRequestId: refund.id,
    actorId: actor.user.id,
    actorRole: actor.role,
    eventType: "refund_created",
    summary: `Refund request dibuat${booking?.booking_code ? ` untuk booking ${booking.booking_code}` : ""}.`,
    metadata: {
      bookingId: booking?.id || null,
      merchantId,
      refundChannel,
      grossAmount,
      deductionAmount: safeDeduction,
      netRefundAmount: resolvedNetRefundAmount,
      orderId: orderId || booking?.booking_code || null,
    },
  })

  await createAdminAuditLog({
    actorId: actor.user.id,
    actorRole: actor.role,
    targetType: "refund",
    targetId: refund.id,
    action: "finance_create_refund_request",
    summary: `Finance membuat refund request ${refund.id}`,
    metadata: {
      bookingId: booking?.id || null,
      bookingCode: booking?.booking_code || null,
      refundChannel,
      grossAmount,
      deductionAmount: safeDeduction,
      netRefundAmount: resolvedNetRefundAmount,
    },
  })

  backToRefunds("Refund request berhasil dibuat.", "success")
}

export async function updateRefundStatus(formData: FormData) {
  const actor = await ensureFinanceActor()
  const refundId = readText(formData, "refundId")
  const nextStatus = readText(formData, "nextStatus") as RefundStatus
  const note = readText(formData, "note")
  const midtransRefundId = readText(formData, "midtransRefundId")
  const midtransTransactionId = readText(formData, "midtransTransactionId")
  const kopraReferenceNo = readText(formData, "kopraReferenceNo")

  const allowedStatuses: RefundStatus[] = [
    "refund_under_review",
    "refund_approved",
    "refund_rejected",
    "refund_processing_midtrans",
    "refund_processing_bank",
    "refund_paid",
    "refund_failed",
    "refund_reconciled",
    "refund_closed",
  ]

  if (!refundId || !allowedStatuses.includes(nextStatus)) {
    backToRefunds("Aksi refund tidak valid.", "error")
  }

  if (!canMoveToStatus(actor.role, nextStatus)) {
    backToRefunds("Role finance ini tidak punya akses untuk status refund tersebut.", "error")
  }

  if ((nextStatus === "refund_rejected" || nextStatus === "refund_failed") && !note) {
    backToRefunds("Catatan wajib diisi untuk reject atau mark failed.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: refund, error: fetchError } = await adminSupabase
    .from("refund_requests")
    .select("id, booking_id, merchant_id, status, refund_channel, order_id, midtrans_transaction_id, midtrans_refund_id, kopra_reference_no, net_refund_amount, refund_reason, bank_name, bank_account_number, bank_account_holder, metadata")
    .eq("id", refundId)
    .single()

  if (fetchError || !refund) {
    backToRefunds("Refund request tidak ditemukan.", "error")
  }

  const currentStatus = normalizeStatus(refund.status)
  if (isFinalStatus(currentStatus)) {
    backToRefunds("Refund dengan status final tidak bisa diubah lagi.", "error")
  }

  if (!isValidRefundTransition(currentStatus, nextStatus)) {
    backToRefunds("Urutan status refund tidak valid untuk request ini.", "error")
  }

  if (nextStatus === "refund_processing_midtrans" && !(midtransRefundId || refund.midtrans_refund_id || midtransTransactionId || refund.midtrans_transaction_id)) {
    backToRefunds("Isi Midtrans refund ID atau transaction ID sebelum menandai processing Midtrans.", "error")
  }

  if (nextStatus === "refund_processing_bank" && !(kopraReferenceNo || refund.kopra_reference_no || note)) {
    backToRefunds("Isi referensi Kopra atau catatan transfer sebelum menandai processing bank.", "error")
  }

  if (nextStatus === "refund_closed" && !["refund_paid", "refund_reconciled", "refund_rejected", "refund_failed"].includes(currentStatus)) {
    backToRefunds("Refund hanya bisa ditutup setelah statusnya paid, reconciled, rejected, atau failed.", "error")
  }

  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: now,
  }

  if (note) {
    payload.notes = note
  }

  if (midtransRefundId) {
    payload.midtrans_refund_id = midtransRefundId
  }

  if (midtransTransactionId) {
    payload.midtrans_transaction_id = midtransTransactionId
  }

  if (kopraReferenceNo) {
    payload.kopra_reference_no = kopraReferenceNo
  }

  if (nextStatus === "refund_processing_midtrans" || nextStatus === "refund_processing_bank") {
    const execution = await applyGatewayExecution({
      refund,
      nextStatus,
      note,
      midtransRefundId,
      midtransTransactionId,
      kopraReferenceNo,
    })

    if (execution.metadataPatch) {
      payload.metadata = mergeMetadata(refund.metadata, execution.metadataPatch)
    }

    if (execution.midtransRefundId) {
      payload.midtrans_refund_id = execution.midtransRefundId
    }

    if (execution.kopraReferenceNo) {
      payload.kopra_reference_no = execution.kopraReferenceNo
    }
  }

  if (nextStatus === "refund_under_review") {
    payload.reviewed_by = actor.user.id
    payload.reviewed_at = now
  }

  if (nextStatus === "refund_approved" || nextStatus === "refund_rejected") {
    payload.approved_by = actor.user.id
    payload.approved_at = now
  }

  if (
    nextStatus === "refund_processing_midtrans" ||
    nextStatus === "refund_processing_bank" ||
    nextStatus === "refund_paid" ||
    nextStatus === "refund_failed"
  ) {
    payload.executed_by = actor.user.id
    payload.executed_at = now
  }

  if (["refund_rejected", "refund_paid", "refund_failed", "refund_reconciled", "refund_closed"].includes(nextStatus)) {
    payload.completed_at = now
  }

  const { error: updateError } = await adminSupabase.from("refund_requests").update(payload).eq("id", refundId)

  if (updateError) {
    backToRefunds(updateError.message, "error")
  }

  await insertRefundEvent({
    refundRequestId: refund.id,
    actorId: actor.user.id,
    actorRole: actor.role,
    eventType: nextStatus,
    summary: `Refund dipindahkan ke status ${statusLabel(nextStatus)}.`,
    metadata: {
      previousStatus: refund.status,
      nextStatus,
      note: note || null,
      midtransRefundId: midtransRefundId || refund.midtrans_refund_id || null,
      midtransTransactionId: midtransTransactionId || refund.midtrans_transaction_id || null,
      kopraReferenceNo: kopraReferenceNo || refund.kopra_reference_no || null,
      refundChannel: refund.refund_channel,
      orderId: refund.order_id,
    },
  })

  await createAdminAuditLog({
    actorId: actor.user.id,
    actorRole: actor.role,
    targetType: "refund",
    targetId: refund.id,
    action: `finance_${nextStatus}`,
    summary: `Finance mengubah refund ${refund.id} ke status ${statusLabel(nextStatus)}`,
    metadata: {
      bookingId: refund.booking_id,
      merchantId: refund.merchant_id,
      previousStatus: refund.status,
      nextStatus,
      note: note || null,
      refundChannel: refund.refund_channel,
      midtransRefundId: midtransRefundId || refund.midtrans_refund_id || null,
      midtransTransactionId: midtransTransactionId || refund.midtrans_transaction_id || null,
      kopraReferenceNo: kopraReferenceNo || refund.kopra_reference_no || null,
    },
  })

  backToRefunds(`Refund berhasil dipindahkan ke ${statusLabel(nextStatus)}.`, "success")
}

export async function syncRefundGatewayStatus(formData: FormData) {
  const actor = await ensureFinanceActor()
  const refundId = readText(formData, "refundId")

  if (!refundId) {
    backToRefunds("Refund request tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: refund, error } = await adminSupabase
    .from("refund_requests")
    .select("id, booking_id, merchant_id, status, refund_channel, order_id, midtrans_transaction_id, midtrans_refund_id, kopra_reference_no, metadata")
    .eq("id", refundId)
    .single()

  if (error || !refund) {
    backToRefunds("Refund request tidak ditemukan.", "error")
  }

  const now = new Date().toISOString()
  const currentStatus = normalizeStatus(refund.status)

  if (!["refund_processing_midtrans", "refund_processing_bank"].includes(currentStatus)) {
    backToRefunds("Sync gateway hanya bisa dijalankan saat refund sedang diproses.", "error")
  }

  let nextStatus: RefundStatus | null = null
  let gatewaySummary = ""
  let metadataPatch: Record<string, unknown> | null = null
  let notePatch: string | null = null
  let midtransRefundIdPatch: string | null = null
  let kopraReferencePatch: string | null = null

  if (refund.refund_channel === "midtrans") {
    const transactionKey = refund.midtrans_transaction_id || refund.order_id || ""
    if (!transactionKey) {
      backToRefunds("Refund Midtrans ini belum memiliki transaction ID atau order ID.", "error")
    }

    const statusResponse = (await getMidtransTransactionStatus(transactionKey)) as Record<string, unknown>
    const transactionStatus = normalizeKeyword(statusResponse.transaction_status)

    metadataPatch = {
      gatewayProvider: "midtrans",
      lastGatewaySync: now,
      midtransStatusResponse: statusResponse,
    }
    midtransRefundIdPatch =
      safeString(statusResponse.refund_key) ||
      safeString(statusResponse.refund_id) ||
      refund.midtrans_refund_id

    if (["refund", "partial_refund", "cancel"].includes(transactionStatus)) {
      nextStatus = "refund_paid"
      gatewaySummary = `Gateway Midtrans mengembalikan status ${transactionStatus}.`
      notePatch = `Midtrans sync ${now}: ${transactionStatus}`
    } else if (transactionStatus === "deny" || transactionStatus === "expire") {
      nextStatus = "refund_failed"
      gatewaySummary = `Gateway Midtrans mengembalikan status ${transactionStatus}.`
      notePatch = `Midtrans sync ${now}: ${transactionStatus}`
    } else {
      backToRefunds(`Status Midtrans saat ini masih ${transactionStatus || "unknown"}.`, "success")
    }
  } else if (refund.refund_channel === "kopra_manual") {
    if (!isKopraStatusConfigured()) {
      backToRefunds("KOPRA_STATUS_API_URL belum diatur, jadi status Kopra belum bisa disinkronkan otomatis.", "error")
    }

    const statusResponse = await getKopraRefundStatus({
      refundId: refund.id,
      referenceNo: refund.kopra_reference_no,
      orderId: refund.order_id,
    })

    const keyword =
      normalizeKeyword(statusResponse.status) ||
      normalizeKeyword(statusResponse.message)

    metadataPatch = {
      gatewayProvider: "kopra",
      lastGatewaySync: now,
      kopraStatusResponse: statusResponse,
    }
    kopraReferencePatch =
      safeString(statusResponse.referenceNo) ||
      refund.kopra_reference_no

    if (["success", "successful", "paid", "completed"].includes(keyword)) {
      nextStatus = "refund_paid"
      gatewaySummary = `Gateway Kopra mengembalikan status ${keyword}.`
      notePatch = `Kopra sync ${now}: ${keyword}`
    } else if (["failed", "reject", "rejected", "error"].includes(keyword)) {
      nextStatus = "refund_failed"
      gatewaySummary = `Gateway Kopra mengembalikan status ${keyword}.`
      notePatch = `Kopra sync ${now}: ${keyword}`
    } else {
      backToRefunds(`Status Kopra saat ini masih ${keyword || "unknown"}.`, "success")
    }
  } else {
    backToRefunds("Sync otomatis baru tersedia untuk channel Midtrans atau Kopra manual.", "error")
  }

  const payload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: now,
    completed_at: nextStatus === "refund_paid" || nextStatus === "refund_failed" ? now : null,
    metadata: mergeMetadata(refund.metadata, metadataPatch || {}),
  }

  if (notePatch) {
    payload.notes = notePatch
  }

  if (midtransRefundIdPatch) {
    payload.midtrans_refund_id = midtransRefundIdPatch
  }

  if (kopraReferencePatch) {
    payload.kopra_reference_no = kopraReferencePatch
  }

  const { error: updateError } = await adminSupabase.from("refund_requests").update(payload).eq("id", refund.id)
  if (updateError) {
    backToRefunds(updateError.message, "error")
  }

  await insertRefundEvent({
    refundRequestId: refund.id,
    actorId: actor.user.id,
    actorRole: actor.role,
    eventType: nextStatus || currentStatus,
    summary: gatewaySummary || "Gateway refund berhasil disinkronkan.",
    metadata: {
      previousStatus: refund.status,
      nextStatus,
      gatewayChannel: refund.refund_channel,
    },
  })

  await createAdminAuditLog({
    actorId: actor.user.id,
    actorRole: actor.role,
    targetType: "refund",
    targetId: refund.id,
    action: "finance_sync_refund_gateway_status",
    summary: `Finance sinkron status gateway refund ${refund.id}`,
    metadata: {
      previousStatus: refund.status,
      nextStatus,
      gatewayChannel: refund.refund_channel,
    },
  })

  backToRefunds(gatewaySummary || "Status refund dari gateway berhasil disinkronkan.", "success")
}
