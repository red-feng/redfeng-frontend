import assert from "node:assert/strict"
import fs from "node:fs"
import chromium from "@sparticuz/chromium"
import puppeteer, { type BrowserContext, type Page } from "puppeteer-core"
import { getPortalSessionCookieName, type ActivePortal } from "../lib/portal-context.ts"

type SupportedPortal = "merchant" | "admin" | "finance" | "superadmin"

type PortalCredentials = {
  portal: SupportedPortal
  loginPath: string
  expectedPath: string
  username?: string
  email?: string
  password: string
  usernameSelector: string
  passwordSelector: string
}

const DEFAULT_BASE_URL = process.env.AUTH_E2E_BASE_URL || "https://redfeng.co"
const DEFAULT_WAIT_TIMEOUT_MS = Number(process.env.AUTH_E2E_WAIT_TIMEOUT_MS || "45000")

async function resolveBrowserExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ]

  const localBrowser = candidates.find((candidate) => fs.existsSync(candidate))
  if (localBrowser) return localBrowser

  try {
    const serverlessPath = await chromium.executablePath()
    if (serverlessPath && fs.existsSync(serverlessPath)) return serverlessPath
  } catch {}

  return null
}

function buildPortalCredentials(): PortalCredentials[] {
  const portals: Array<PortalCredentials | null> = [
    process.env.AUTH_E2E_MERCHANT_EMAIL && process.env.AUTH_E2E_MERCHANT_PASSWORD
      ? {
          portal: "merchant",
          loginPath: "/merchant/login",
          expectedPath: "/merchant/dashboard",
          email: process.env.AUTH_E2E_MERCHANT_EMAIL,
          password: process.env.AUTH_E2E_MERCHANT_PASSWORD,
          usernameSelector: "#merchant-login-email",
          passwordSelector: "#merchant-login-password",
        }
      : null,
    process.env.AUTH_E2E_ADMIN_USERNAME && process.env.AUTH_E2E_ADMIN_PASSWORD
      ? {
          portal: "admin",
          loginPath: "/admin/login",
          expectedPath: "/admin/dashboard",
          username: process.env.AUTH_E2E_ADMIN_USERNAME,
          password: process.env.AUTH_E2E_ADMIN_PASSWORD,
          usernameSelector: "#admin-username",
          passwordSelector: "#admin-password",
        }
      : null,
    process.env.AUTH_E2E_FINANCE_USERNAME && process.env.AUTH_E2E_FINANCE_PASSWORD
      ? {
          portal: "finance",
          loginPath: "/finance/login",
          expectedPath: "/finance/dashboard",
          username: process.env.AUTH_E2E_FINANCE_USERNAME,
          password: process.env.AUTH_E2E_FINANCE_PASSWORD,
          usernameSelector: "#finance-username",
          passwordSelector: "#finance-password",
        }
      : null,
    process.env.AUTH_E2E_SUPERADMIN_USERNAME && process.env.AUTH_E2E_SUPERADMIN_PASSWORD
      ? {
          portal: "superadmin",
          loginPath: "/superadmin/login",
          expectedPath: "/superadmin/dashboard",
          username: process.env.AUTH_E2E_SUPERADMIN_USERNAME,
          password: process.env.AUTH_E2E_SUPERADMIN_PASSWORD,
          usernameSelector: "#superadmin-username",
          passwordSelector: "#superadmin-password",
        }
      : null,
  ]

  return portals.filter(Boolean) as PortalCredentials[]
}

function ensureEnoughCredentials(portals: PortalCredentials[]) {
  if (portals.length >= 2) return

  console.log("SKIP auth portal E2E: provide credentials for at least two portals.")
  console.log("Expected env examples:")
  console.log("  AUTH_E2E_MERCHANT_EMAIL / AUTH_E2E_MERCHANT_PASSWORD")
  console.log("  AUTH_E2E_ADMIN_USERNAME / AUTH_E2E_ADMIN_PASSWORD")
  console.log("  AUTH_E2E_FINANCE_USERNAME / AUTH_E2E_FINANCE_PASSWORD")
  console.log("  AUTH_E2E_SUPERADMIN_USERNAME / AUTH_E2E_SUPERADMIN_PASSWORD")
  process.exit(0)
}

async function assertNoServerError(page: Page, context: string) {
  const bodyText = await page.evaluate(() => document.body?.innerText || "")
  assert.equal(
    bodyText.includes("Application error: a server-side exception has occurred"),
    false,
    `${context}: server-side application error banner detected`,
  )
}

async function loginPortal(page: Page, baseUrl: string, credentials: PortalCredentials) {
  await page.goto(`${baseUrl}${credentials.loginPath}`, { waitUntil: "networkidle2", timeout: DEFAULT_WAIT_TIMEOUT_MS })
  await assertNoServerError(page, `${credentials.portal} login page`)

  if (credentials.email) {
    await page.locator(credentials.usernameSelector).fill(credentials.email)
  } else {
    await page.locator(credentials.usernameSelector).fill(credentials.username || "")
  }

  await page.locator(credentials.passwordSelector).fill(credentials.password)

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: DEFAULT_WAIT_TIMEOUT_MS }),
    page.locator("button").click(),
  ])

  await page.waitForFunction(
    (expectedPath: string) => window.location.pathname.startsWith(expectedPath),
    { timeout: DEFAULT_WAIT_TIMEOUT_MS },
    credentials.expectedPath,
  )

  await assertNoServerError(page, `${credentials.portal} dashboard after login`)
}

async function assertPortalStillAlive(page: Page, credentials: PortalCredentials) {
  await page.reload({ waitUntil: "networkidle2", timeout: DEFAULT_WAIT_TIMEOUT_MS })
  await page.waitForFunction(
    (expectedPath: string) => window.location.pathname.startsWith(expectedPath),
    { timeout: DEFAULT_WAIT_TIMEOUT_MS },
    credentials.expectedPath,
  )
  await assertNoServerError(page, `${credentials.portal} dashboard after reload`)
}

async function assertPortalCookies(browserContext: BrowserContext, portals: ActivePortal[]) {
  const cookies = await browserContext.cookies()
  const cookieNames = new Set(cookies.map((cookie: { name: string }) => cookie.name))

  for (const portal of portals) {
    assert.equal(
      cookieNames.has(getPortalSessionCookieName(portal)),
      true,
      `Expected cookie namespace for portal ${portal} to exist`,
    )
  }
}

async function main() {
  const credentials = buildPortalCredentials()
  ensureEnoughCredentials(credentials)

  const scenario = credentials.slice(0, 2)
  const executablePath = await resolveBrowserExecutablePath()
  assert.ok(executablePath, "No browser executable found for auth portal E2E.")

  const browser = await puppeteer.launch({
    executablePath,
    args: [...chromium.args, "--font-render-hinting=medium"],
    headless: true,
  })

  try {
    const pageA = await browser.newPage()
    const pageB = await browser.newPage()

    await loginPortal(pageA, DEFAULT_BASE_URL, scenario[0])
    await loginPortal(pageB, DEFAULT_BASE_URL, scenario[1])

    await assertPortalCookies(browser.defaultBrowserContext(), [
      scenario[0].portal,
      scenario[1].portal,
    ])

    await assertPortalStillAlive(pageA, scenario[0])
    await assertPortalStillAlive(pageB, scenario[1])

    console.log(
      `Auth portal E2E passed for ${scenario[0].portal} + ${scenario[1].portal} on ${DEFAULT_BASE_URL}`,
    )
  } finally {
    await browser.close()
  }
}

await main()
