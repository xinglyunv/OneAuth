"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function DeveloperSettingsPage() {
  const router = useRouter()

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>开发者设置</h2>
      <div className="dd-card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>OAuth 端点</h3>
        <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div><span style={{ color: "var(--dd-text-muted)" }}>Authorization: </span><code>/api/oauth/authorize</code></div>
          <div><span style={{ color: "var(--dd-text-muted)" }}>Token: </span><code>/api/oauth/token</code></div>
          <div><span style={{ color: "var(--dd-text-muted)" }}>UserInfo: </span><code>/api/userinfo</code></div>
          <div><span style={{ color: "var(--dd-text-muted)" }}>JWKS: </span><code>/.well-known/jwks.json</code></div>
        </div>
      </div>
      <div className="dd-card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>个人令牌</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--dd-text-muted)", marginBottom: "1rem" }}>管理 API 令牌以编程方式访问 OneAuth API。</p>
        <Link href="/user/tokens" className="dd-btn dd-btn-secondary dd-btn-sm">管理令牌</Link>
      </div>
      <div className="dd-card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>账户</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--dd-text-muted)", marginBottom: "1rem" }}>管理您的开发者账户和个人资料。</p>
        <Link href="/user/profile" className="dd-btn dd-btn-secondary dd-btn-sm">编辑资料</Link>
      </div>
    </div>
  )
}
