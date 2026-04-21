import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { resolvePackageChatActorRole } from "../lib/chat/package-chat-access.ts"
import {
  getPortalSessionCookieName,
  normalizeActivePortal,
  resolvePortalFromPathname,
} from "../lib/portal-context.ts"
import {
  canAccessInternalPortal,
  isAdminPortalRole,
  isFinancePortalRole,
} from "../lib/internal-roles.ts"

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
const proxyPath = fileURLToPath(new URL("../proxy.ts", import.meta.url))
const proxySource = readFileSync(proxyPath, "utf8")

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

  await runCase("portal namespace normalization stays explicit", () => {
    assert.equal(normalizeActivePortal("customer"), "customer")
    assert.equal(normalizeActivePortal("merchant"), "merchant")
    assert.equal(normalizeActivePortal("admin"), "admin")
    assert.equal(normalizeActivePortal("finance"), "finance")
    assert.equal(normalizeActivePortal("superadmin"), "superadmin")
    assert.equal(normalizeActivePortal("unknown"), "")
    assert.equal(normalizeActivePortal(null), "")
  })

  await runCase("portal pathname routing stays pinned", () => {
    assert.equal(resolvePortalFromPathname("/"), "customer")
    assert.equal(resolvePortalFromPathname("/customer/dashboard"), "customer")
    assert.equal(resolvePortalFromPathname("/merchant/dashboard"), "merchant")
    assert.equal(resolvePortalFromPathname("/admin/dashboard"), "admin")
    assert.equal(resolvePortalFromPathname("/finance/dashboard"), "finance")
    assert.equal(resolvePortalFromPathname("/superadmin/dashboard"), "superadmin")
  })

  await runCase("portal session cookie names stay isolated per portal", () => {
    assert.equal(getPortalSessionCookieName("customer"), "rf-sb-customer-auth")
    assert.equal(getPortalSessionCookieName("merchant"), "rf-sb-merchant-auth")
    assert.equal(getPortalSessionCookieName("admin"), "rf-sb-admin-auth")
    assert.equal(getPortalSessionCookieName("finance"), "rf-sb-finance-auth")
    assert.equal(getPortalSessionCookieName("superadmin"), "rf-sb-superadmin-auth")
  })

  await runCase("internal portal role gates stay fixed", () => {
    assert.equal(isAdminPortalRole("admin"), true)
    assert.equal(isAdminPortalRole("operations_manager"), true)
    assert.equal(isAdminPortalRole("superadmin"), false)
    assert.equal(isFinancePortalRole("finance"), true)
    assert.equal(isFinancePortalRole("finance_manager"), true)
    assert.equal(isFinancePortalRole("superadmin"), false)

    assert.equal(canAccessInternalPortal("admin", "admin"), true)
    assert.equal(canAccessInternalPortal("admin", "operations_manager"), true)
    assert.equal(canAccessInternalPortal("admin", "superadmin"), false)
    assert.equal(canAccessInternalPortal("finance", "finance"), true)
    assert.equal(canAccessInternalPortal("finance", "finance_manager"), true)
    assert.equal(canAccessInternalPortal("finance", "superadmin"), false)
    assert.equal(canAccessInternalPortal("superadmin", "superadmin"), true)
    assert.equal(canAccessInternalPortal("superadmin", "admin"), false)
  })

  await runCase("proxy keeps admin route fallback to superadmin session only", () => {
    assert.match(proxySource, /if \(pathname\.startsWith\("\/admin"\)\) return \["admin", "superadmin"\]/)
    assert.match(proxySource, /if \(pathname\.startsWith\("\/merchant"\)\) return \["merchant"\]/)
    assert.match(proxySource, /if \(pathname\.startsWith\("\/finance"\)\) return \["finance"\]/)
    assert.match(proxySource, /if \(pathname\.startsWith\("\/superadmin"\)\) return \["superadmin"\]/)
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
