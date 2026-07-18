"use client"
import { useEffect, useState } from "react"

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users?size=1").then(r => r.json()).then(d => d.total || 0).catch(() => 0),
      fetch("/api/admin/apps?size=1").then(r => r.json()).then(d => d.total || 0).catch(() => 0),
      fetch("/api/admin/orgs?size=1").then(r => r.json()).then(d => d.total || 0).catch(() => 0),
      fetch("/api/admin/sessions/count").then(r => r.json()).then(d => d.total || 0).catch(() => 0),
    ]).then(([users, apps, orgs, sessions]) => {
      setStats({ users, apps, orgs, sessions })
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ textAlign: "center", padding: "3rem" }}><div className="dd-spinner" /></div>

  return (
    <div>
      <div className="dd-page-title">Dashboard</div>
      <div className="dd-stat-grid">
        <div className="dd-stat-card"><div className="dd-stat-label">Total Users</div><div className="dd-stat-value">{stats.users}</div></div>
        <div className="dd-stat-card"><div className="dd-stat-label">Applications</div><div className="dd-stat-value">{stats.apps}</div></div>
        <div className="dd-stat-card"><div className="dd-stat-label">Organizations</div><div className="dd-stat-value">{stats.orgs}</div></div>
        <div className="dd-stat-card"><div className="dd-stat-label">Active Sessions</div><div className="dd-stat-value">{stats.sessions}</div></div>
      </div>
      <div className="dd-page-title" style={{ fontSize: "1rem", marginTop: "2rem" }}>Quick Actions</div>
      <div className="dd-quick-links">
        <a href="/users" className="dd-quick-link">👤 Manage Users</a>
        <a href="/apps" className="dd-quick-link">⚡ Review Applications</a>
        <a href="/audit" className="dd-quick-link">📋 View Audit Logs</a>
      </div>
    </div>
  )
}
