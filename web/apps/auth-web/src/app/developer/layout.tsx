"use client"

import "@/app/globals.css"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [userName, setUserName] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }

    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(userData => {
        if (!userData || userData.role !== "DEVELOPER") {
          router.replace("/login")
          return
        }
        setAuthed(true)
        const name = userData.profile?.display_name || userData.username || userData.email
        setUserName(name)
      })
      .catch(() => router.replace("/login"))
  }, [router])

  if (!authed) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--dd-canvas)" }}>
        <div className="dd-spinner" style={{ width: 32, height: 32, fontSize: 32 }} />
      </div>
    )
  }

  const isActive = (href: string) => {
    if (href === "/developer") return pathname === "/developer"
    return pathname.startsWith(href)
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    localStorage.removeItem("user_email")
    router.push("/login")
  }

  const navItems = [
    { href: "/developer", label: "概览", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
    { href: "/developer/apps", label: "应用管理", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { href: "/developer/webhooks", label: "Webhooks", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
    { href: "/developer/settings", label: "设置", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
  ]

  return (
    <div className="dd-layout">
      <style>{`
        .dev-sidebar-toggle { display: none; }
        @media (max-width: 768px) {
          .dev-sidebar-toggle { display: inline-flex !important; }
          .dd-body { flex-direction: column !important; }
          .dd-sidebar { width: 260px !important; display: none; position: fixed; top: var(--dd-header-h); left: 0; height: calc(100vh - var(--dd-header-h)); z-index: 50; overflow-y: auto; }
          .dd-sidebar[data-open="true"] { display: block !important; }
          .dd-main { margin-left: 0 !important; padding: 1rem !important; max-width: none !important; }
          .dev-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 40; }
          .dev-overlay[data-open="true"] { display: block !important; }
        }
      `}</style>

      <header className="dd-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <button className="dd-btn dd-btn-secondary dd-btn-sm dev-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D1967" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <h1>OneAuth 开发者中心</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {userName && <span style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)" }}>{userName}</span>}
          <button className="dd-btn dd-btn-secondary dd-btn-sm" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> 退出
          </button>
        </div>
      </header>

      <div className="dd-body">
        <div className="dev-overlay" data-open={sidebarOpen} onClick={() => setSidebarOpen(false)} />
        <aside className="dd-sidebar" data-open={sidebarOpen} style={{ background: "var(--dd-surface)" }}>
          <nav style={{ display: "flex", flexDirection: "column" }}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""} onClick={() => setSidebarOpen(false)}>
                {item.icon}{item.label}
              </Link>
            ))}
            <div className="dd-divider" style={{ margin: "0.5rem 1rem" }} />
            <Link href="/user" onClick={() => setSidebarOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              用户中心
            </Link>
          </nav>
        </aside>

        <main className="dd-main" style={{ maxWidth: "none", padding: "1.25rem" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
