import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolvePackageChatActorRole } from "../lib/chat/package-chat-access.ts"

async function runCase(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    throw error
  }
}

function createPackageAccessMock(params: {
  merchantRows?: Array<{ id: string; user_id: string }>
  packageMerchantById?: Record<string, string | null | undefined>
}) {
  const merchantRows = params.merchantRows || []
  const packageMerchantById = params.packageMerchantById || {}

  return {
    from(table: string) {
      if (table === "merchants") {
        return {
          select() {
            return {
              eq(column: string, value: string) {
                assert.equal(column, "user_id")
                return Promise.resolve({
                  data: merchantRows
                    .filter((row) => row.user_id === value)
                    .map((row) => ({ id: row.id })),
                })
              },
            }
          },
        }
      }

      if (table === "packages") {
        return {
          select() {
            return {
              eq(column: string, value: string) {
                assert.equal(column, "id")
                return {
                  maybeSingle() {
                    const merchantId = packageMerchantById[value]
                    if (!merchantId) {
                      return Promise.resolve({ data: null })
                    }
                    return Promise.resolve({ data: { merchant_id: merchantId } })
                  },
                }
              },
            }
          },
        }
      }

      throw new Error(`Unexpected table in mock: ${table}`)
    },
  }
}

const internalChatPath = fileURLToPath(new URL("../lib/internal-chat/core.ts", import.meta.url))
const internalChatSource = readFileSync(internalChatPath, "utf8")

async function main() {
  await runCase("internal chat policy version is locked", () => {
    assert.match(internalChatSource, /INTERNAL_CHAT_ROLE_POLICY_VERSION = "2026-04-14"/)
  })

  await runCase("internal chat policy keeps frozen role allow matrix", () => {
    assert.match(internalChatSource, /const INTERNAL_DIRECT_ALLOWED_TARGETS:[\s\S]*Object\.freeze\(\{/)
    assert.match(internalChatSource, /superadmin:\s*\["superadmin", "operations_manager", "finance_manager"\]/)
    assert.match(internalChatSource, /operations_manager:\s*\["superadmin", "operations_manager", "admin", "finance_manager"\]/)
    assert.match(internalChatSource, /finance_manager:\s*\["superadmin", "finance_manager", "finance", "operations_manager"\]/)
    assert.match(internalChatSource, /admin:\s*\["operations_manager", "admin", "finance"\]/)
    assert.match(internalChatSource, /finance:\s*\["finance_manager", "finance", "admin"\]/)
  })

  await runCase("package chat customer can access own room", async () => {
    const actor = await resolvePackageChatActorRole(
      createPackageAccessMock({}) as never,
      "customer-1",
      {
        id: "room-1",
        package_id: "pkg-1",
        customer_id: "customer-1",
        merchant_user_id: "merchant-user-1",
      },
    )
    assert.equal(actor, "customer")
  })

  await runCase("package chat rejects non-owner user", async () => {
    const actor = await resolvePackageChatActorRole(
      createPackageAccessMock({}) as never,
      "user-x",
      {
        id: "room-1",
        package_id: "pkg-1",
        customer_id: "customer-1",
        merchant_user_id: "merchant-user-1",
      },
    )
    assert.equal(actor, null)
  })

  await runCase("package chat allows merchant only when package belongs to merchant account", async () => {
    const actor = await resolvePackageChatActorRole(
      createPackageAccessMock({
        merchantRows: [{ id: "merchant-1", user_id: "merchant-user-1" }],
        packageMerchantById: { "pkg-1": "merchant-1" },
      }) as never,
      "merchant-user-1",
      {
        id: "room-1",
        package_id: "pkg-1",
        customer_id: "customer-1",
        merchant_user_id: "merchant-user-1",
      },
    )
    assert.equal(actor, "merchant")
  })

  await runCase("package chat blocks merchant when package merchant no longer matches", async () => {
    const actor = await resolvePackageChatActorRole(
      createPackageAccessMock({
        merchantRows: [{ id: "merchant-1", user_id: "merchant-user-1" }],
        packageMerchantById: { "pkg-1": "merchant-2" },
      }) as never,
      "merchant-user-1",
      {
        id: "room-1",
        package_id: "pkg-1",
        customer_id: "customer-1",
        merchant_user_id: "merchant-user-1",
      },
    )
    assert.equal(actor, null)
  })

  console.log("Role-lock regression checks passed.")
}

await main()
