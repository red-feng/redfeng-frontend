import assert from "node:assert/strict"
import {
  decideCommerceInquiryThreadResolution,
  isCommerceThreadUnreadForActor,
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

runCase("commerce inquiry reuses existing thread when present", () => {
  assert.equal(
    decideCommerceInquiryThreadResolution({
      hasExistingInquiryThread: true,
    }),
    "reuse_inquiry_thread",
  )
})

runCase("commerce inquiry creates thread only when needed", () => {
  assert.equal(
    decideCommerceInquiryThreadResolution({
      hasExistingInquiryThread: false,
    }),
    "create_inquiry_thread",
  )
})

runCase("internal roles are blocked from commerce chat", () => {
  assert.equal(shouldBlockInternalRoleFromCommerceChat("admin"), true)
  assert.equal(shouldBlockInternalRoleFromCommerceChat("finance_manager"), true)
  assert.equal(shouldBlockInternalRoleFromCommerceChat("superadmin"), true)
})

runCase("non-internal roles stay allowed for commerce chat", () => {
  assert.equal(shouldBlockInternalRoleFromCommerceChat("merchant"), false)
  assert.equal(shouldBlockInternalRoleFromCommerceChat("customer"), false)
  assert.equal(shouldBlockInternalRoleFromCommerceChat(null), false)
})

runCase("customer unread count ignores own last message", () => {
  assert.equal(
    isCommerceThreadUnreadForActor({
      actorRole: "customer",
      lastMessageSenderRole: "customer",
      lastMessageAt: "2026-04-17T10:00:00.000Z",
      customerLastReadAt: "2026-04-17T09:00:00.000Z",
    }),
    false,
  )
})

runCase("merchant unread count respects read marker", () => {
  assert.equal(
    isCommerceThreadUnreadForActor({
      actorRole: "merchant",
      lastMessageSenderRole: "customer",
      lastMessageAt: "2026-04-17T10:00:00.000Z",
      merchantLastReadAt: "2026-04-17T09:00:00.000Z",
    }),
    true,
  )
  assert.equal(
    isCommerceThreadUnreadForActor({
      actorRole: "merchant",
      lastMessageSenderRole: "customer",
      lastMessageAt: "2026-04-17T10:00:00.000Z",
      merchantLastReadAt: "2026-04-17T10:00:00.000Z",
    }),
    false,
  )
})

runCase("system messages do not create unread pressure", () => {
  assert.equal(
    isCommerceThreadUnreadForActor({
      actorRole: "customer",
      lastMessageSenderRole: "system",
      lastMessageAt: "2026-04-17T10:00:00.000Z",
      customerLastReadAt: null,
    }),
    false,
  )
})

console.log("Commerce chat regression checks passed.")
