"use client"

import "@/app/globals.css"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

function OAuthConsentInner() {
  const params = useSearchParams()
  const clientName = params.get("client_id") || "Unknown App"
  const scope = params.get("scope") || "openid"

  const scopeLabels: Record<string, string> = {
    openid: "使用您的身份信息登录",
    profile: "查看您的昵称和头像",
    email: "查看您的邮箱地址",
    offline_access: "保持登录状态",
  }

  const scopes = scope.split(" ").filter((s) => s.length > 0)

  return (
    <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 460, width: "100%", padding: "0 1rem" }}>
        <div className="cc-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--cc-text)", textAlign: "center" }}>
            授权确认
          </h2>

          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--cc-text-secondary)", margin: "0.25rem 0 1.5rem", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--cc-text)" }}>&ldquo;{clientName}&rdquo;</strong>{" "}
            请求访问您的以下权限：
          </p>

          <div className="cc-card" style={{
            padding: 0,
            marginBottom: "1.5rem",
            overflow: "hidden",
          }}>
            {scopes.map((s) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.875rem 1rem",
                  borderBottom: "1px solid var(--cc-border)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cc-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: "0.9375rem", color: "var(--cc-text)" }}>
                  {scopeLabels[s] || `访问 ${s}`}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <a
              href="/user"
              className="cc-btn cc-btn-secondary"
              style={{ flex: 1 }}
            >
              拒绝
            </a>
            <a
              href={`/api/oauth/authorize?${params.toString()}`}
              className="cc-btn cc-btn-primary"
              style={{ flex: 1 }}
            >
              同意
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="cc-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="cc-empty">
            <span className="cc-spinner" style={{ width: "1.5rem", height: "1.5rem" }} />
            <p style={{ marginTop: "0.75rem" }}>加载中...</p>
          </div>
        </div>
      }
    >
      <OAuthConsentInner />
    </Suspense>
  )
}
