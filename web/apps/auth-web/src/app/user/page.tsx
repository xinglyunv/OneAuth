"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "@identity/shared"
import type { UserProfile } from "@identity/shared"

export default function AccountOverviewPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }

    api
      .getProfile(token)
      .then(setProfile)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <span className="cc-spinner" />
      </div>
    )
  }

  if (error) {
    return <div className="cc-alert cc-alert-error">{error}</div>
  }

  if (!profile) return null

  const statusBadgeClass =
    profile.status === "active" ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"

  const joinedDate = new Date(profile.created_at).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        账户概览
      </h2>

      {/* Profile Card */}
      <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "var(--cc-primary)",
              flexShrink: 0,
            }}
          >
            {(profile.profile?.display_name || profile.username || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "0.125rem" }}>
              {profile.profile?.display_name || profile.username}
            </div>
            <div style={{ color: "var(--cc-text-secondary)", fontSize: "0.875rem" }}>
              @{profile.username}
            </div>
          </div>
          <span className={statusBadgeClass} style={{ marginLeft: "auto" }}>
            {profile.status === "active" ? "活跃" : profile.status}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <div>
            <div style={{ color: "var(--cc-text-muted)", marginBottom: "0.25rem" }}>邮箱</div>
            <div>{profile.email}</div>
          </div>
          <div>
            <div style={{ color: "var(--cc-text-muted)", marginBottom: "0.25rem" }}>加入时间</div>
            <div>{joinedDate}</div>
          </div>
          <div>
            <div style={{ color: "var(--cc-text-muted)", marginBottom: "0.25rem" }}>MFA 状态</div>
            <span
              className={
                profile.mfa_enabled ? "cc-badge cc-badge-success" : "cc-badge cc-badge-warning"
              }
            >
              {profile.mfa_enabled ? "已启用" : "未启用"}
            </span>
          </div>
          <div>
            <div style={{ color: "var(--cc-text-muted)", marginBottom: "0.25rem" }}>邮箱验证</div>
            <span
              className={
                profile.email_verified
                  ? "cc-badge cc-badge-success"
                  : "cc-badge cc-badge-warning"
              }
            >
              {profile.email_verified ? "已验证" : "未验证"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="cc-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--cc-text-muted)", marginBottom: "0.5rem" }}>
            MFA 认证
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--cc-primary)" }}>
            {profile.mfa_enabled ? "已保护" : "待开启"}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)", marginTop: "0.375rem" }}>
            {profile.mfa_enabled
              ? "双因素认证已启用"
              : "建议启用双因素认证保护账户"}
          </div>
        </div>
        <div className="cc-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--cc-text-muted)", marginBottom: "0.5rem" }}>
            邮箱验证
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--cc-primary)" }}>
            {profile.email_verified ? "已验证" : "未验证"}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)", marginTop: "0.375rem" }}>
            {profile.email_verified
              ? "邮箱地址已验证通过"
              : "请前往邮箱完成验证"}
          </div>
        </div>
        <div className="cc-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--cc-text-muted)", marginBottom: "0.5rem" }}>
            账户状态
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--cc-primary)" }}>
            {profile.status === "active" ? "正常" : profile.status}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--cc-text-secondary)", marginTop: "0.375rem" }}>
            账户 ID: {profile.user_id.slice(0, 8)}...
          </div>
        </div>
      </div>
    </div>
  )
}
