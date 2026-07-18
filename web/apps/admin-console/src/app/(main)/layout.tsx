"use client"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/users", label: "Users", icon: "👤" },
  { href: "/apps", label: "Applications", icon: "⚡" },
  { href: "/organizations", label: "Organizations", icon: "🏢" },
  { href: "/roles", label: "Roles", icon: "🔐" },
  { href: "/scopes", label: "Scopes", icon: "🔑" },
  { href: "/sessions", label: "Sessions", icon: "🔌" },
  { href: "/tokens", label: "Tokens", icon: "🪙" },
  { href: "/security", label: "Security", icon: "🛡️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/audit", label: "Audit Logs", icon: "📋" },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<{ username: string } | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAuth(d); else router.push("/login") })
      .catch(() => router.push("/login"))
  }, [router])

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" })
    router.push("/login")
  }

  if (!auth) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="dd-spinner" />
    </div>
  )

  return (
    <div className="dd-layout">
      <aside className="dd-sidebar">
        <div className="dd-sidebar-header">
          <h2>OneAuth</h2>
          <p>Admin Console</p>
        </div>
        <nav className="dd-sidebar-nav">
          {NAV_ITEMS.map(item => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            return (
              <a key={item.href} href={item.href} className={"dd-sidebar-link" + (isActive ? " active" : "")}>
                <span style={{ fontSize: "0.875rem" }}>{item.icon}</span>
                {item.label}
              </a>
            )
          })}
        </nav>
        <div className="dd-sidebar-footer">
          <div className="user">{auth.username}</div>
          <span className="logout" onClick={handleLogout}>Sign Out</span>
        </div>
      </aside>
      <main className="dd-main">
        <header className="dd-header">
          <h1>{NAV_ITEMS.find(i => i.href === "/" ? pathname === "/" : pathname.startsWith(i.href))?.label || "Admin"}</h1>
          <div className="dd-header-right">
            <span>{auth.username}</span>
          </div>
        </header>
        <div className="dd-content">{children}</div>
      </main>
    </div>
  )
}
