"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import AdminNavLinks, { type AdminNavItem } from "@/app/components/AdminNavLinks"
import SignOutButton from "@/app/components/SignOutButton"

type AdminSidebarShellProps = {
  adminCode: string
  children: React.ReactNode
  isOperationsManager: boolean
  items: AdminNavItem[]
  roleLabel: string
}

function BrandMark({ isOperationsManager }: { isOperationsManager: boolean }) {
  return (
    <span
      className={`relative overflow-hidden ${
        isOperationsManager ? "block h-[96px] w-[260px] max-w-full" : "shrink-0 h-10 w-10 rounded-2xl bg-orange-600"
      }`}
    >
      {isOperationsManager ? (
        <Image
          src="/logo-redfeng.png"
          alt="RedFeng"
          fill
          sizes="260px"
          className="object-contain object-left"
          priority
        />
      ) : (
        <span className="inline-flex h-full w-full items-center justify-center text-sm font-black text-white">RF</span>
      )}
    </span>
  )
}

function RoleInitials({ roleLabel }: { roleLabel: string }) {
  return (
    <>
      {roleLabel
        .split(" ")
        .map((part) => part[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </>
  )
}

function SidebarContent({
  adminCode,
  isDesktop,
  isOperationsManager,
  items,
  onNavigate,
  roleLabel,
}: {
  adminCode: string
  isDesktop: boolean
  isOperationsManager: boolean
  items: AdminNavItem[]
  onNavigate?: () => void
  roleLabel: string
}) {
  return (
    <>
      <div
        className={`flex items-start justify-between gap-3 ${
          isDesktop ? (isOperationsManager ? "px-5 py-4 lg:px-7" : "px-5 py-5 lg:px-7 lg:py-7") : "px-5 py-5"
        }`}
      >
        <div className={isOperationsManager ? "min-w-0 flex-1" : "flex items-center gap-3"}>
          <BrandMark isOperationsManager={isOperationsManager} />
          {!isOperationsManager ? (
            <div>
              <span className="text-[1.8rem] font-semibold tracking-[-0.05em] text-slate-950">Red Feng</span>
            </div>
          ) : null}
        </div>
        {!isDesktop ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Tutup sidebar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#efd8c8] bg-[#fff7f1] text-slate-600 transition hover:text-orange-600"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path d="M6.7 5.3L12 10.6l5.3-5.3 1.4 1.4L13.4 12l5.3 5.3-1.4 1.4L12 13.4l-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3z" fill="currentColor" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className={isDesktop ? `hidden px-7 pb-4 lg:block ${isOperationsManager ? "pt-1" : ""}` : "px-5 pb-4"}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">{isOperationsManager ? "Dashboard Operasional" : "Admin Workspace"}</p>
        <p className="mt-3 text-xs font-semibold text-slate-700">{roleLabel}</p>
        <p className="mt-1 text-[11px] text-slate-400">{adminCode}</p>
      </div>

      <nav className={`flex-1 overflow-auto pb-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isDesktop ? (isOperationsManager ? "px-5" : "px-4 lg:px-5") : "px-5"}`}>
        <AdminNavLinks items={items} onNavigate={onNavigate} />
      </nav>

      <div className={isDesktop ? `hidden px-7 py-6 lg:block ${isOperationsManager ? "" : "border-t border-[#f0e6dd]"}` : "border-t border-[#f0e6dd] px-5 py-5"}>
        {isOperationsManager ? (
          <div className="mb-4 flex items-center gap-3 rounded-[18px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              <RoleInitials roleLabel={roleLabel} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{roleLabel}</p>
              <p className="mt-1 text-xs text-slate-400">{adminCode}</p>
            </div>
          </div>
        ) : null}
        <SignOutButton
          portal="admin"
          redirectTo="https://app.redfeng.co/admin/login"
          className={`inline-flex w-full items-center justify-center rounded-[16px] px-4 py-3 text-sm font-semibold transition ${
            isOperationsManager ? "border border-[#f4d7d7] bg-white text-rose-500 hover:bg-rose-50" : "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
          }`}
        />
      </div>
    </>
  )
}

export default function AdminSidebarShell({
  adminCode,
  children,
  isOperationsManager,
  items,
  roleLabel,
}: AdminSidebarShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDesktopOpen, setIsDesktopOpen] = useState(true)

  useEffect(() => {
    if (!isMobileOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileOpen])

  const desktopSidebarWidthClass = isOperationsManager ? "lg:pl-[264px]" : "lg:pl-[280px]"
  const desktopContentOffsetClass = isDesktopOpen ? desktopSidebarWidthClass : "lg:pl-24"

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-slate-900">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[#eef2f7] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Buka sidebar"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#efd8c8] bg-[#fff7f1] text-slate-700 transition hover:text-orange-600"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path d="M4 7h16v2H4V7zm0 4h16v2H4v-2zm0 4h16v2H4v-2z" fill="currentColor" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">{isOperationsManager ? "Dashboard Operasional" : "Admin Workspace"}</p>
          <p className="truncate text-[11px] text-slate-400">{roleLabel}</p>
        </div>
        <span className="rounded-full border border-[#efd8c8] bg-[#fff7f1] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">
          {roleLabel}
        </span>
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup sidebar"
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
          />
          <aside
            className={`absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] ${
              isOperationsManager ? "border-r border-[#eef2f7]" : "border-r border-[#eee5dc]"
            }`}
          >
            <SidebarContent
              adminCode={adminCode}
              isDesktop={false}
              isOperationsManager={isOperationsManager}
              items={items}
              onNavigate={() => setIsMobileOpen(false)}
              roleLabel={roleLabel}
            />
          </aside>
        </div>
      ) : null}

      {!isDesktopOpen ? (
        <button
          type="button"
          onClick={() => setIsDesktopOpen(true)}
          aria-label="Buka sidebar desktop"
          className="fixed left-4 top-5 z-30 hidden h-11 items-center gap-2 rounded-2xl border border-[#efd8c8] bg-white/95 px-3 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:inline-flex"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-orange-600">
            <path d="M9.2 5.3L15.9 12l-6.7 6.7-1.4-1.4 5.3-5.3-5.3-5.3z" fill="currentColor" />
          </svg>
          Menu
        </button>
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden h-screen flex-col border-r bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-transform duration-300 ease-out lg:flex ${
          isOperationsManager ? "w-[264px] border-[#eef2f7]" : "w-[280px] border-[#eee5dc]"
        } ${isDesktopOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-end px-5 pt-4">
          <button
            type="button"
            onClick={() => setIsDesktopOpen(false)}
            aria-label="Sembunyikan sidebar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#efd8c8] bg-[#fff7f1] text-slate-600 transition hover:text-orange-600"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path d="M14.8 5.3L8.1 12l6.7 6.7 1.4-1.4-5.3-5.3 5.3-5.3z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="-mt-3 flex min-h-0 flex-1 flex-col">
          <SidebarContent
            adminCode={adminCode}
            isDesktop
            isOperationsManager={isOperationsManager}
            items={items}
            roleLabel={roleLabel}
          />
        </div>
      </aside>

      <div className={`min-w-0 transition-[padding] duration-300 ease-out ${desktopContentOffsetClass}`}>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
