"use client"

import "@/app/globals.css"
import Link from "next/link"

const portals = [
  {
    title: "用户中心",
    tagline: "管理您的身份、设备与安全设置",
    href: "/login",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    features: ["个人资料与安全", "多因素认证 (MFA)", "设备与会话管理", "OAuth 授权管理"],
  },
  {
    title: "开发者中心",
    tagline: "集成 OAuth 2.0 & OpenID Connect",
    href: "/login",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    features: ["OAuth 应用注册与配置", "Webhook 事件订阅", "API 令牌管理", "OAuth / OIDC 协议测试"],
  },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: 60, background: "#fff",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
          fontWeight: 700, fontSize: "1.125rem", color: "#1e40af",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          OneAuth
        </Link>
      </nav>

      <section style={{ textAlign: "center", padding: "5rem 2rem 3rem" }}>
        <h1 style={{
          fontSize: "2.5rem", fontWeight: 700, margin: "0 0 1rem",
          color: "#0f172a", letterSpacing: "-0.02em",
        }}>
          统一身份认证平台
        </h1>
        <p style={{
          fontSize: "1.125rem", color: "#64748b", maxWidth: 540,
          margin: "0 auto 2.5rem", lineHeight: 1.7,
        }}>
          安全、高效的企业级身份认证与授权管理，为您的应用和用户提供可靠的接入服务
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/login"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem", borderRadius: "0.5rem",
              background: "#1e40af", color: "#fff", fontWeight: 600, fontSize: "0.9375rem",
              textDecoration: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            进入用户中心
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <Link
            href="/login"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem", borderRadius: "0.5rem",
              background: "#fff", color: "#1e40af", fontWeight: 600, fontSize: "0.9375rem",
              textDecoration: "none", border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            进入开发者中心
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>
      </section>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 2rem 5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {portals.map((portal, i) => (
            <Link key={i} href={portal.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#fff", borderRadius: "0.75rem", padding: "2rem",
                border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                cursor: "pointer", height: "100%",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}>
                <div style={{ marginBottom: "1.25rem" }}>{portal.icon}</div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.375rem", color: "#0f172a" }}>
                  {portal.title}
                </h2>
                <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 1.25rem", lineHeight: 1.6 }}>
                  {portal.tagline}
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {portal.features.map((f, j) => (
                    <li key={j} style={{
                      fontSize: "0.8125rem", color: "#475569",
                      display: "flex", alignItems: "center", gap: "0.5rem",
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <footer style={{
        borderTop: "1px solid #e2e8f0", padding: "1.5rem 2rem",
        textAlign: "center", fontSize: "0.8125rem", color: "#94a3b8", background: "#fff",
      }}>
        &copy; {new Date().getFullYear()} OneAuth. All rights reserved.
      </footer>
    </div>
  )
}
