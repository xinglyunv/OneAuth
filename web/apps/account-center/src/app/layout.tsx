"use client"
import "./globals.css"
import Link from "next/link"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="cc-header">
          <Link href="/profile" className="cc-header-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cc-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            OneAuth
          </Link>
          <nav className="cc-header-nav">
            <Link href="/profile">个人资料</Link>
            <Link href="/security">安全设置</Link>
            <Link href="/devices">登录设备</Link>
            <Link href="/apps">已授权应用</Link>
          </nav>
          <div className="cc-header-actions">
            <button onClick={() => { localStorage.clear(); window.location.href = "/profile" }} className="cc-btn cc-btn-ghost cc-btn-sm">
              退出登录
            </button>
          </div>
        </header>
        <main className="cc-page" style={{ padding: "2rem 0" }}>
          <div className="cc-container">{children}</div>
        </main>
      </body>
    </html>
  )
}
