"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

function OAuthConsentInner() {
  const params = useSearchParams()
  const clientName = params.get("client_id") || "Unknown App"
  const scope = params.get("scope") || "openid"

  return (
    <div style={{ maxWidth: 480, margin: "100px auto", padding: 32, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h2 style={{ fontSize: 20, marginBottom: 24, textAlign: "center" }}>授权确认</h2>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <p style={{ fontSize: 14, color: "#666" }}>
          <strong>&ldquo;{clientName}&rdquo;</strong> 请求访问您的以下权限：
        </p>
      </div>
      <div style={{ background: "#fafafa", padding: 16, borderRadius: 4, marginBottom: 24 }}>
        {scope.split(" ").map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <span>&check;</span>
            <span style={{ fontSize: 14 }}>{s === "openid" ? "使用您的身份信息登录" : s === "profile" ? "查看您的昵称和头像" : s === "email" ? "查看您的邮箱地址" : s === "offline_access" ? "保持登录状态" : `访问 ${s}`}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <a href="/" onClick={e => { e.preventDefault(); alert("已取消授权"); window.location.href = "/" }} style={{ flex: 1, padding: 12, background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, cursor: "pointer", textAlign: "center", display: "block", textDecoration: "none" }}>拒绝</a>
        <a href={`/api/oauth/authorize?${params.toString()}`} style={{ flex: 1, padding: 12, background: "#1677ff", color: "#fff", borderRadius: 4, fontSize: 14, cursor: "pointer", textAlign: "center", display: "block", textDecoration: "none" }}>同意</a>
      </div>
    </div>
  )
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 100, color: "#999" }}>加载中...</div>}>
      <OAuthConsentInner />
    </Suspense>
  )
}