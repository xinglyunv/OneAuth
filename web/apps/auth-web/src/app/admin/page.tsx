"use client"

import "@/app/globals.css"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Stats {
  users: number
  apps: number
  logs: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }

    Promise.all([
      fetch("/api/admin/users?size=1", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/apps?size=1", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/admin/audit-logs?size=1", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([usersData, appsData, logsData]) => {
        setStats({
          users: usersData.total || 0,
          apps: appsData.total || 0,
          logs: logsData.total || 0,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const cards = [
    {
      label: "用户总数",
      count: stats?.users,
      href: "/admin/users",
      iconBg: "#E8E6F0",
      iconColor: "#2D1967",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D1967" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: "应用总数",
      count: stats?.apps,
      href: "/admin/apps",
      iconBg: "#D1ECF1",
      iconColor: "#055160",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#055160" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      label: "审计日志",
      count: stats?.logs,
      href: "/admin/audit",
      iconBg: "#FFF3CD",
      iconColor: "#664D03",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#664D03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
  ]

  const quickLinks = [
    { label: "查看所有用户", href: "/admin/users" },
    { label: "审核待处理应用", href: "/admin/apps" },
    { label: "浏览审计日志", href: "/admin/audit" },
  ]

  return (
    <div>
      <h1 className="dd-page-title">仪表盘</h1>
      <p className="dd-page-subtitle">用户管理 · 应用审核 · 审计日志</p>

      {/* Stat Cards */}
      <div className="dd-stat-grid">
        {cards.map(card => (
          <Link key={card.href} href={card.href} className="dd-stat-card">
            <div
              className="dd-stat-icon"
              style={{ background: card.iconBg }}
            >
              {card.icon}
            </div>
            <div>
              {loading ? (
                <div className="dd-skeleton" style={{ width: 48, height: 32, borderRadius: "var(--dd-radius-sm)" }} />
              ) : (
                <div className="dd-stat-value">{card.count ?? 0}</div>
              )}
              <div className="dd-stat-label">{card.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="dd-card">
        <div className="dd-card-header">快捷操作</div>
        <div className="dd-card-body">
          <div className="dd-quick-links">
            {quickLinks.map(item => (
              <Link key={item.href} href={item.href}>
                {item.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
