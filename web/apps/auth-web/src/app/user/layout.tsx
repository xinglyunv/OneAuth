"use client"

import "@/app/globals.css"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [userEmail, setUserEmail] = useState("")
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
        if (!userData) {
          router.replace("/login")
          return
        }
        if (userData.role !== "USER" && userData.role !== "DEVELOPER") {
          router.replace("/login")
          return
        }
        setAuthed(true)
        if (userData.email) {
          setUserEmail(userData.email)
          localStorage.setItem("user_email", userData.email)
        }
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
    if (href === "/user") return pathname === "/user"
    return pathname.startsWith(href)
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    localStorage.removeItem("user_email")
    router.push("/login")
  }

  const navItems = [
    { href: "/user", label: "概览", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
    { href: "/user/profile", label: "个人资料", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { href: "/user/emails", label: "邮箱管理", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 8L2 7"/></svg> },
    { href: "/user/mfa", label: "安全", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
    { href: "/user/devices", label: "设备", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
    { href: "/user/sessions", label: "会话", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3"/></svg> },
    { href: "/user/password", label: "密码", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { href: "/user/activity", label: "登录活动", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { href: "/user/tokens", label: "令牌", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> },
  ]

  return (
    <div className="dd-layout">
      <style>{`
        .account-sidebar-toggle { display: none; }
        .account-mobile-header { display: none; }
        @media (max-width: 768px) {
          .dd-body { flex-direction: column !important; }
          .dd-sidebar { width: 260px !important; display: none; position: fixed; top: var(--dd-header-h); left: 0; height: calc(100vh - var(--dd-header-h)); z-index: 50; overflow-y: auto; }
          .dd-sidebar[data-open="true"] { display: block !important; }
          .dd-main { margin-left: 0 !important; padding: 1rem !important; max-width: none !important; }
          .account-sidebar-toggle { display: inline-flex !important; }
          .account-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 40; }
          .account-overlay[data-open="true"] { display: block !important; }
          .dd-header h1 { font-size: 1rem; }
          .account-user-email { display: none; }
        }
        @media (max-width: 480px) {
          .dd-main { padding: 0.75rem !important; }
          .dd-header { padding: 0 0.75rem !important; }
        }
      `}</style>

      <header className="dd-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <button
            className="dd-btn dd-btn-secondary dd-btn-sm account-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D1967" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h1>OneAuth 个人中心</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {userEmail && (
            <span className="account-user-email" style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)" }}>
              {userEmail}
            </span>
          )}
          <button className="dd-btn dd-btn-secondary dd-btn-sm" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            退出
          </button>
        </div>
      </header>

      <div className="dd-body">
        <div className="account-overlay" data-open={sidebarOpen} onClick={() => setSidebarOpen(false)} />

        <aside
          className="dd-sidebar"
          data-open={sidebarOpen}
          style={{ background: "var(--dd-surface)" }}
        >
          <nav style={{ display: "flex", flexDirection: "column" }}>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? "active" : ""}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}{item.label}
              </Link>
            ))}

          </nav>
        </aside>

        <main className="dd-main" style={{ maxWidth: "none", padding: "1.25rem" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
