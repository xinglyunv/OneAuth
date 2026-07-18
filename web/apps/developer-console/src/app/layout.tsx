"use client"
import "./globals.css"
import Link from "next/link"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="dd-layout">
          <aside className="dd-sidebar">
            <Link href="/apps" className="dd-sidebar-brand">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
              </svg>
              Developer
            </Link>
            <Link href="/apps">OAuth 应用</Link>
          </aside>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <header className="dd-header">
              <span style={{ fontWeight: 600, color: "var(--dd-text-primary)", fontSize: "0.9375rem" }}>开发者控制台</span>
              <button onClick={() => { localStorage.clear(); window.location.href = "/apps" }} className="dd-btn dd-btn-ghost dd-btn-sm">
                退出登录
              </button>
            </header>
            <main className="dd-main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
