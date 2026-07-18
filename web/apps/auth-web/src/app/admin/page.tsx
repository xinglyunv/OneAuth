"use client"

import "@/app/globals.css"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface AdminStats {
  total_users: number; active_users: number; today_registrations: number
  total_apps: number; total_scopes: number
  today_logins: number; today_failures: number
  db_status: string; redis_status: string; service_status: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.replace("/admin/login"); return }

    Promise.all([
      fetch("/api/admin/dashboard", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/users?size=1", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/apps?size=1", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/scopes", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/tokens?size=1", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/sessions?size=1", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([dashData, usersData, appsData, scopesData, tokensData, sessionsData]) => {
        setStats({
          total_users: dashData.total_users || usersData.total || 0,
          active_users: dashData.active_users || 0,
          today_registrations: dashData.today_registrations || 0,
          total_apps: dashData.total_apps || appsData.total || 0,
          total_scopes: dashData.total_scopes || scopesData.scopes?.length || 0,
          today_logins: dashData.today_logins || 0,
          today_failures: dashData.today_failures || 0,
          db_status: dashData.db_status || "healthy",
          redis_status: dashData.redis_status || "healthy",
          service_status: dashData.service_status || "healthy",
        })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  const statCards = [
    { label: "总用户数", value: stats?.total_users, color: "#2D1967", bg: "#E8E6F0", href: "/admin/users", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
    { label: "活跃用户", value: stats?.active_users, color: "#198754", bg: "#D1E7DD", href: "/admin/users", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { label: "今日新增", value: stats?.today_registrations, color: "#0DCAF0", bg: "#CFF4FC", href: "/admin/users", icon: "M12 5v14M5 12h14" },
    { label: "应用总数", value: stats?.total_apps, color: "#6366f1", bg: "#E0E7FF", href: "/admin/apps", icon: "M2 3h20v14H2zM8 21h8M12 17v4" },
    { label: "Scope", value: stats?.total_scopes, color: "#f59e0b", bg: "#FEF3C7", href: "/admin/scopes", icon: "M12 2a10 10 0 1 0 0 20" },
    { label: "今日登录", value: stats?.today_logins, color: "#10b981", bg: "#D1FAE5", href: "/admin/sessions", icon: "M15 3h4v18h-4M10 17l5-5-5-5M13 12H3" },
    { label: "登录失败", value: stats?.today_failures, color: "#ef4444", bg: "#FEE2E2", href: "/admin/security", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2" },
  ]

  const sysCards = [
    { label: "数据库", status: stats?.db_status || "unknown", icon: "M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7" },
    { label: "Redis", status: stats?.redis_status || "unknown", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
    { label: "API 服务", status: stats?.service_status || "unknown", icon: "M5 12h14 M12 5v14" },
  ]

  return (
    <div>
      <h1 className="dd-page-title">管理仪表盘</h1>
      <p className="dd-page-subtitle" style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)", marginBottom: "1.5rem" }}>
        用户管理 · 应用审核 · 安全监控 · 审计日志
      </p>

      {error && <div className="dd-alert dd-alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* Platform Overview */}
      <div className="dd-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {statCards.map(card => (
          <Link key={card.label} href={card.href} className="dd-stat-card" style={{ padding: "1.25rem" }}>
            <div className="dd-stat-icon" style={{ background: card.bg }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={card.icon} />
              </svg>
            </div>
            <div>
              {loading ? <div className="dd-skeleton" style={{ width: 40, height: 28, borderRadius: "var(--dd-radius-sm)" }} />
                : <div className="dd-stat-value">{card.value ?? 0}</div>}
              <div className="dd-stat-label">{card.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* System Status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {sysCards.map(card => (
          <div key={card.label} className="dd-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: card.status === "healthy" ? "#D1E7DD" : "#F8D7DA",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={card.status === "healthy" ? "#198754" : "#DC3545"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={card.icon} />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{card.label}</div>
                <div style={{ fontSize: "0.75rem", color: card.status === "healthy" ? "var(--dd-success)" : "var(--dd-danger)" }}>
                  {card.status === "healthy" ? "运行正常" : "异常"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="dd-card">
        <div className="dd-card-header">快捷操作</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem", padding: "1rem" }}>
          {[
            { href: "/admin/users", label: "管理用户" },
            { href: "/admin/developers", label: "管理开发者" },
            { href: "/admin/apps", label: "审核应用" },
            { href: "/admin/roles", label: "分配权限" },
            { href: "/admin/security", label: "安全策略" },
            { href: "/admin/audit", label: "查看审计日志" },
          ].map(item => (
            <Link key={item.href} href={item.href} className="dd-btn dd-btn-secondary" style={{ textDecoration: "none", justifyContent: "flex-start" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
