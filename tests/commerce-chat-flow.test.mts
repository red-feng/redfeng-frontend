import assert from "node:assert/strict"
import {
  resolveCommerceActiveThreadId,
  resolveCommerceActiveThreadIdAfterDelete,
} from "../lib/commerce-chat/client-state.ts"

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
