import assert from "node:assert/strict"
import {
  resolveCommerceActiveThreadId,
  resolveCommerceActiveThreadIdAfterDelete,
} from "../lib/commerce-chat/client-state.ts"
import {
  extractCommerceChatAttachmentPathFromPublicUrl,
} from "../lib/commerce-chat/attachment-path.ts"
import {
  COMMERCE_CHAT_DELETE_ROUTE_CONTRACT_VERSION,
  COMMERCE_CHAT_DELETE_ROUTE_ERRORS,
  resolveCommerceChatDeleteErrorStatus,
} from "../lib/commerce-chat/delete-contract.mjs"
import {
  COMMERCE_CHAT_DELETE_ALLOWED_ACTOR_ROLES,
  COMMERCE_CHAT_DELETE_ROLE_LOCK,
  COMMERCE_CHAT_DELETE_POLICY_VERSION,
  canDeleteCommerceThread,
  decideCommerceInquiryThreadResolution,
  requireCommerceDeleteActorRole,
  shouldBlockInternalRoleFromCommerceChat,
} from "../lib/commerce-chat/policy.mjs"

function runCase(name: string, fn: () => void) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    throw error
  }
}

const threads = [
  { id: "thread-a" },
  { id: "thread-b" },
  { id: "thread-c" },
] as const

runCase("commerce chat delete policy version stays locked", () => {
  assert.equal(COMMERCE_CHAT_DELETE_POLICY_VERSION, "2026-04-18")
})

runCase("commerce chat delete actor roles stay locked", () => {
  assert.deepEqual(COMMERCE_CHAT_DELETE_ALLOWED_ACTOR_ROLES, ["customer", "merchant"])
  assert.deepEqual(COMMERCE_CHAT_DELETE_ROLE_LOCK.allowedActorRoles, ["customer", "merchant"])
  assert.deepEqual(COMMERCE_CHAT_DELETE_ROLE_LOCK.deniedActorRoles, ["system", null])
})

runCase("commerce chat delete route contract version stays locked", () => {
  assert.equal(COMMERCE_CHAT_DELETE_ROUTE_CONTRACT_VERSION, "2026-04-18")
})

runCase("commerce chat delete route error messages stay stable", () => {
  assert.deepEqual(COMMERCE_CHAT_DELETE_ROUTE_ERRORS, {
    unauthorized: "Unauthorized",
    forbidden: "Forbidden",
    invalidThread: "Thread commerce tidak valid.",
    deleteFailed: "Gagal menghapus thread commerce.",
  })
})

runCase("only customer and merchant can delete commerce threads", () => {
  assert.equal(canDeleteCommerceThread("customer"), true)
  assert.equal(canDeleteCommerceThread("merchant"), true)
  assert.equal(canDeleteCommerceThread("system"), false)
  assert.equal(canDeleteCommerceThread(null), false)
})

runCase("delete role guard only returns locked participant roles", () => {
  assert.equal(requireCommerceDeleteActorRole("customer"), "customer")
  assert.equal(requireCommerceDeleteActorRole("merchant"), "merchant")
  assert.throws(() => requireCommerceDeleteActorRole("system"))
  assert.throws(() => requireCommerceDeleteActorRole(null))
})

runCase("inquiry resolution rule stays stable", () => {
  assert.equal(decideCommerceInquiryThreadResolution({ hasExistingInquiryThread: true }), "reuse_inquiry_thread")
  assert.equal(decideCommerceInquiryThreadResolution({ hasExistingInquiryThread: false }), "create_inquiry_thread")
})

runCase("internal roles stay blocked from delete entry flow", () => {
  assert.equal(shouldBlockInternalRoleFromCommerceChat("admin"), true)
  assert.equal(shouldBlockInternalRoleFromCommerceChat("finance"), true)
  assert.equal(shouldBlockInternalRoleFromCommerceChat("superadmin"), true)
  assert.equal(shouldBlockInternalRoleFromCommerceChat("merchant"), false)
  assert.equal(shouldBlockInternalRoleFromCommerceChat("customer"), false)
})

runCase("commerce chat delete route status mapping stays stable", () => {
  assert.equal(resolveCommerceChatDeleteErrorStatus("Anda tidak punya akses ke thread commerce ini."), 403)
  assert.equal(resolveCommerceChatDeleteErrorStatus("Role akun ini tidak diizinkan menghapus thread commerce."), 403)
  assert.equal(resolveCommerceChatDeleteErrorStatus("Thread commerce tidak valid."), 400)
  assert.equal(resolveCommerceChatDeleteErrorStatus("Gagal menghapus thread commerce."), 500)
  assert.equal(resolveCommerceChatDeleteErrorStatus(""), 500)
})

runCase("deleted inquiry can be recreated immediately", () => {
  assert.equal(decideCommerceInquiryThreadResolution({ hasExistingInquiryThread: false }), "create_inquiry_thread")
})

runCase("commerce chat attachment public url resolves to storage object path", () => {
  assert.equal(
    extractCommerceChatAttachmentPathFromPublicUrl(
      "https://example.supabase.co/storage/v1/object/public/commerce-chat-attachments/threads/thread-1/user-1/file.pdf?download=1",
    ),
    "threads/thread-1/user-1/file.pdf",
  )
})

runCase("non-commerce attachment url is ignored safely", () => {
  assert.equal(
    extractCommerceChatAttachmentPathFromPublicUrl(
      "https://example.supabase.co/storage/v1/object/public/other-bucket/threads/thread-1/file.pdf",
    ),
    null,
  )
})

runCase("requested room id is reused when still available", () => {
  assert.equal(resolveCommerceActiveThreadId("thread-b", [...threads] as never), "thread-b")
})

runCase("stale room id falls back to the first available thread", () => {
  assert.equal(resolveCommerceActiveThreadId("thread-x", [...threads] as never), "thread-a")
})

runCase("empty room id falls back to the first available thread", () => {
  assert.equal(resolveCommerceActiveThreadId("", [...threads] as never), "thread-a")
})

runCase("delete keeps current active thread when another thread is removed", () => {
  assert.equal(
    resolveCommerceActiveThreadIdAfterDelete({
      currentActiveThreadId: "thread-b",
      deletedThreadId: "thread-a",
      remainingThreads: threads.slice(1) as never,
    }),
    "thread-b",
  )
})

runCase("delete moves active thread to the next available fallback when active thread is removed", () => {
  assert.equal(
    resolveCommerceActiveThreadIdAfterDelete({
      currentActiveThreadId: "thread-b",
      deletedThreadId: "thread-b",
      remainingThreads: [{ id: "thread-c" }] as never,
    }),
    "thread-c",
  )
})

runCase("delete resolves to empty state when the last thread is removed", () => {
  assert.equal(
    resolveCommerceActiveThreadIdAfterDelete({
      currentActiveThreadId: "thread-a",
      deletedThreadId: "thread-a",
      remainingThreads: [] as never,
    }),
    "",
  )
})

console.log("Commerce chat delete-state regression checks passed.")
