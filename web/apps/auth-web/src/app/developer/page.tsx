"use client"

import "@/app/globals.css"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function DeveloperDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({ apps: 0, tokens: 0, webhooks: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.replace("/developer/login"); return }
    Promise.all([
      fetch("/api/apps", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => ({}))),
      fetch("/api/webhooks", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => ({}))),
    ]).then(([appsData, webhooksData]) => {
      setStats({
        apps: (appsData.apps || []).length,
        tokens: (appsData.tokens || []).length,
        webhooks: (webhooksData.webhooks || []).length,
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [router])

  const cards = [
    { label: "OAuth 应用", value: stats.apps, href: "/developer/apps", color: "#2D1967" },
    { label: "Webhooks", value: stats.webhooks, href: "/developer/webhooks", color: "#6366f1" },
    { label: "个人令牌", value: stats.tokens, href: "/user/tokens", color: "#0ea5e9" },
  ]

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>开发者概览</h2>
      <p style={{ fontSize: "0.875rem", color: "var(--dd-text-muted)", marginBottom: "1.5rem" }}>管理您的 OAuth 应用和集成</p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0" }}><div className="dd-spinner" style={{ width: 32, height: 32, fontSize: 32 }} /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {cards.map(card => (
            <Link key={card.href} href={card.href} style={{ textDecoration: "none" }}>
              <div className="dd-card" style={{ padding: "1.25rem", cursor: "pointer" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: card.color, marginBottom: "0.25rem" }}>{card.value}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)" }}>{card.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="dd-card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>快速开始</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link href="/developer/apps" className="dd-btn dd-btn-primary" style={{ textDecoration: "none", textAlign: "center" }}>创建 OAuth 应用</Link>
          <Link href="/developer/webhooks" className="dd-btn dd-btn-secondary" style={{ textDecoration: "none", textAlign: "center" }}>配置 Webhook</Link>
        </div>
      </div>
    </div>
  )
}
