import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { formatInternalUserCode } from "@/lib/merchant-code"
import {
  canDecideMerchantDeletionReview,
  canRequestMerchantDeletionReview,
  MERCHANT_REVIEW_BUTTONS,
} from "@/lib/merchant-review-policy"
import ConfirmSubmitButton from "../ConfirmSubmitButton"
import {
  approveMerchantDeletion,
  finalizeMerchantDeletionCancellation,
  rejectMerchantDeletion,
  requestMerchantDeletion,
} from "../actions"

type OrphanMerchantProfileRow = {
  id: string
  role: string | null
  email: string | null
  created_at: string | null
}

type MerchantDeletionRequestRow = {
  id: string
  merchant_id: string | null
  profile_id: string | null
  merchant_email: string | null
  merchant_name: string | null
  reason: string
  status: string | null
  review_note: string | null
  requested_at: string | null
  reviewed_at: string | null
  requested_by: string | null
  reviewed_by: string | null
}

function fieldValue(value: string | null) {
  return value && value.trim() ? value : "-"
}

function getDeletionRequestKey(input: { merchantId?: string | null; profileId?: string | null }) {
  if (input.merchantId) return `merchant:${input.merchantId}`
  if (input.profileId) return `profile:${input.profileId}`
  return null
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function AdminMerchantAnomaliesPage() {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const currentRole = String(currentProfile?.role || "").trim().toLowerCase()
  const currentUserId = user?.id || null
  const canRequestMerchantDeletion = canRequestMerchantDeletionReview(currentRole)
  const canReviewMerchantDeletion = canDecideMerchantDeletionReview(currentRole)

  const { data: legacyMerchantProfilesData } = await adminSupabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("role", "merchant")

  const { data: merchantAccessRows } = await adminSupabase
    .from("account_roles")
    .select("user_id")
    .eq("role", "merchant")
    .eq("status", "active")

  const merchantProfileIds = [
    ...new Set([
      ...(((legacyMerchantProfilesData as Array<{ id: string; role: string | null; created_at: string | null }> | null) || []).map((profile) => profile.id)),
      ...(((merchantAccessRows as Array<{ user_id: string | null }> | null) || []).map((row) => row.user_id).filter(Boolean) as string[]),
    ]),
  ]

  const { data: merchantProfilesData } = merchantProfileIds.length
    ? await adminSupabase.from("profiles").select("id, role, created_at").in("id", merchantProfileIds)
    : { data: [] as Array<{ id: string; role: string | null; created_at: string | null }> }

  const { data: linkedMerchantRows } = merchantProfileIds.length
    ? await adminSupabase.from("merchants").select("id, user_id").in("user_id", merchantProfileIds)
    : { data: [] as Array<{ id: string; user_id: string | null }> }

  const linkedMerchantUserIds = new Set(
    (((linkedMerchantRows as Array<{ id: string; user_id: string | null }> | null) || []) as Array<{ id: string; user_id: string | null }>)
      .map((item) => item.user_id)
      .filter(Boolean),
  )

  const orphanMerchantProfilesRaw = (((merchantProfilesData as Array<{ id: string; role: string | null; created_at: string | null }> | null) || []) as Array<{
    id: string
    role: string | null
    created_at: string | null
  }>).filter((profile) => !linkedMerchantUserIds.has(profile.id))

  const { data: authUsersData, error: authUsersError } = orphanMerchantProfilesRaw.length
    ? await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    : { data: { users: [] as Array<{ id: string; email?: string | null; created_at?: string | null }> }, error: null }

  if (authUsersError) {
    console.error("Load auth users for orphan merchants error:", authUsersError)
  }

  const authUserMap = new Map(
    (((authUsersData?.users as Array<{ id: string; email?: string | null; created_at?: string | null }> | undefined) || [])).map((userRow) => [
      userRow.id,
      {
        email: userRow.email || null,
        created_at: userRow.created_at || null,
      },
    ]),
  )

  const orphanMerchantProfiles: OrphanMerchantProfileRow[] = orphanMerchantProfilesRaw.map((profile) => ({
    id: profile.id,
    role: profile.role,
    email: authUserMap.get(profile.id)?.email || null,
    created_at: profile.created_at || authUserMap.get(profile.id)?.created_at || null,
  }))

  const { data: pendingDeletionRequestsData } = await adminSupabase
    .from("merchant_deletion_requests")
    .select(
      "id, merchant_id, profile_id, merchant_email, merchant_name, reason, status, review_note, requested_at, reviewed_at, requested_by, reviewed_by",
    )
    .in("status", ["pending", "manager_rejected"])

  const pendingDeletionRequestMap = new Map<string, MerchantDeletionRequestRow>()
  for (const request of ((pendingDeletionRequestsData as MerchantDeletionRequestRow[] | null) || []) as MerchantDeletionRequestRow[]) {
    const key = getDeletionRequestKey({ merchantId: request.merchant_id, profileId: request.profile_id })
    if (key) {
      pendingDeletionRequestMap.set(key, request)
    }
  }

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section>
          <span className="inline-flex rounded-full border border-[#efd8c8] bg-[#fff7f1] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-600">
            Menu Anomalis
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Anomalis Merchant</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Akun di bawah ini punya akses merchant aktif, tetapi belum memiliki row di tabel merchants. Admin dapat mencabut akses merchant-nya tanpa menghapus akun customer.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-medium text-slate-500">Total Anomalis</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-violet-600">{orphanMerchantProfiles.length}</p>
            <p className="mt-1 text-xs text-slate-400">Akses merchant tanpa data merchant</p>
          </div>
          <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-medium text-slate-500">Menunggu Review</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-amber-600">
              {orphanMerchantProfiles.filter((profile) => pendingDeletionRequestMap.has(getDeletionRequestKey({ profileId: profile.id }) || "")).length}
            </p>
            <p className="mt-1 text-xs text-slate-400">Sudah diajukan ke operations manager</p>
          </div>
          <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-medium text-slate-500">Belum Diajukan</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-rose-600">
              {orphanMerchantProfiles.filter((profile) => !pendingDeletionRequestMap.has(getDeletionRequestKey({ profileId: profile.id }) || "")).length}
            </p>
            <p className="mt-1 text-xs text-slate-400">Perlu tindakan admin</p>
          </div>
        </section>

        {!orphanMerchantProfiles.length ? (
          <section className="rounded-[24px] border border-[#eee3d9] bg-white p-10 text-center shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
            <h2 className="text-2xl font-semibold text-slate-950">Tidak ada akses merchant yatim</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Semua akses merchant aktif saat ini sudah punya data merchant yang valid.
            </p>
          </section>
        ) : (
          <section className="grid gap-5">
            {orphanMerchantProfiles.map((profile) => {
              const pendingDeletionRequest =
                pendingDeletionRequestMap.get(getDeletionRequestKey({ profileId: profile.id }) || "") || null

              return (
                <article
                  key={profile.id}
                  className="rounded-[22px] border border-[#eee3d9] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)] sm:p-6"
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-sm font-semibold text-violet-700">
                          {(profile.email || "M").slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-semibold text-slate-950">{fieldValue(profile.email)}</h2>
                          <p className="mt-1 text-sm text-slate-500">Kode Profil: {formatInternalUserCode(profile.id)}</p>
                        </div>
                        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                          Merchant tanpa row merchants
                        </span>
                      </div>
                      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                        <div className="rounded-[16px] border border-[#eee3d9] bg-[#fffdfa] p-4">
                          <p className="text-xs font-medium text-slate-400">Role</p>
                          <p className="mt-2 font-semibold text-slate-800">{fieldValue(profile.role)}</p>
                        </div>
                        <div className="rounded-[16px] border border-[#eee3d9] bg-[#fffdfa] p-4">
                          <p className="text-xs font-medium text-slate-400">Dibuat</p>
                          <p className="mt-2 font-semibold text-slate-800">{formatDateTime(profile.created_at)}</p>
                        </div>
                        <div className="rounded-[16px] border border-[#eee3d9] bg-[#fffdfa] p-4">
                          <p className="text-xs font-medium text-slate-400">Status Data</p>
                          <p className="mt-2 font-semibold text-rose-600">Tidak punya row merchants</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-rose-200 bg-rose-50/80 p-5">
                      {pendingDeletionRequest ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Menunggu review penghapusan</p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            Akun merchant tanpa row merchants ini sudah diajukan untuk dihapus. Operations manager perlu menyetujui atau membatalkan request ini.
                          </p>
                          <div className="mt-4 rounded-[16px] border border-amber-200 bg-white/80 p-4 text-sm leading-7 text-slate-700">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Alasan admin</p>
                            <p className="mt-3 break-words">{pendingDeletionRequest.reason}</p>
                          </div>
                          <div className="mt-4 rounded-[16px] border border-rose-200 bg-white/80 p-4 text-sm leading-7 text-rose-700">
                            Jika disetujui, akses merchant akan dicabut. Akun auth dan akses customer tetap dipertahankan.
                          </div>
                          {pendingDeletionRequest.status === "pending" && canReviewMerchantDeletion ? (
                            <div className="mt-4 space-y-4">
                              <form action={approveMerchantDeletion} className="space-y-3">
                                <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                <textarea
                                  name="reviewNote"
                                  placeholder="Alasan final penghapusan yang akan dikirim ke email merchant..."
                                  className="min-h-[96px] w-full rounded-[16px] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                />
                                <ConfirmSubmitButton
                                  confirmMessage="Yakin ingin menyetujui penghapusan akun merchant ini? Profile dan auth user akan dihapus permanen."
                                  pendingLabel="Sedang menghapus..."
                                  className="inline-flex w-full items-center justify-center rounded-[16px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                >
                                  {MERCHANT_REVIEW_BUTTONS.approve}
                                </ConfirmSubmitButton>
                              </form>
                              <form action={rejectMerchantDeletion} className="space-y-3">
                                <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                <textarea
                                  name="reviewNote"
                                  placeholder="Alasan operations manager menolak penghapusan. Alasan ini akan dikirim ke admin..."
                                  className="min-h-[96px] w-full rounded-[16px] border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                                />
                                <ConfirmSubmitButton
                                  confirmMessage="Tolak pengajuan penghapusan akun merchant ini dan kirim alasan ke admin?"
                                  pendingLabel="Sedang menolak..."
                                  className="inline-flex w-full items-center justify-center rounded-[16px] border border-rose-300 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                                >
                                  {MERCHANT_REVIEW_BUTTONS.reject}
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          ) : pendingDeletionRequest.status === "manager_rejected" && canRequestMerchantDeletion && currentUserId === pendingDeletionRequest.requested_by ? (
                            <div className="mt-4 space-y-3">
                              <div className="rounded-[16px] border border-rose-200 bg-white p-4 text-sm leading-7 text-rose-700">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-700">Alasan manager</p>
                                <p className="mt-3 break-words">{pendingDeletionRequest.review_note || "Operations manager menolak penghapusan tanpa catatan tambahan."}</p>
                              </div>
                              <form action={finalizeMerchantDeletionCancellation}>
                                <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                <ConfirmSubmitButton
                                  confirmMessage="Tutup pengajuan penghapusan akun merchant ini sebagai dibatalkan?"
                                  pendingLabel="Sedang menutup pengajuan..."
                                  className="inline-flex w-full items-center justify-center rounded-[16px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  {MERCHANT_REVIEW_BUTTONS.cancel}
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          ) : (
                            <div className="mt-4 text-sm leading-7 text-sky-700">
                              {pendingDeletionRequest.status === "manager_rejected"
                                ? "Pengajuan ini sudah ditolak operations manager dan sedang menunggu admin menutup request."
                                : "Menunggu keputusan operations manager. Admin tidak bisa menghapus akun ini sebelum request direview."}
                            </div>
                          )}
                        </>
                      ) : canRequestMerchantDeletion ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">{MERCHANT_REVIEW_BUTTONS.submit}</p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            Action ini mengirim pengajuan ke operations manager. Jika disetujui, akses merchant akan dicabut tanpa menghapus akun customer.
                          </p>
                          <form action={requestMerchantDeletion} className="mt-4 flex h-full flex-col space-y-4">
                            <input type="hidden" name="profileId" value={profile.id} />
                            <textarea
                              name="reason"
                              placeholder="Alasan pengajuan penghapusan merchant..."
                              required
                              className="min-h-[96px] w-full rounded-[16px] border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                            />
                            <ConfirmSubmitButton
                              confirmMessage="Kirim pengajuan hapus akun merchant ini ke operations manager?"
                              pendingLabel="Mengirim pengajuan..."
                              className="inline-flex items-center justify-center rounded-[16px] bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                            >
                              {MERCHANT_REVIEW_BUTTONS.submit}
                            </ConfirmSubmitButton>
                          </form>
                        </>
                      ) : (
                        <div className="text-sm leading-7 text-sky-700">
                          Operations Manager dapat mereview pengajuan hapus akun merchant jika request sudah dibuat admin.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
