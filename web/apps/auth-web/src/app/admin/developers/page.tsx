"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface DevItem {
  user_id: string
  email: string
  username: string
  display_name: string
  status: string
  roles: string[]
  created_at: string
}

export default function AdminDevelopersPage() {
  const router = useRouter()
  const [developers, setDevelopers] = useState<DevItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [total, setTotal] = useState(0)

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""

  const fetchDevelopers = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/admin/users/developers?size=100", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("获取开发者列表失败")
      const data = await res.json()
      setDevelopers(data.developers || [])
      setTotal(data.total || 0)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (!token) { router.replace("/admin/login"); return }
    fetchDevelopers()
  }, [fetchDevelopers, router, token])

  const assignDeveloperRole = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role_name: "DEVELOPER" }),
      })
      if (!res.ok) throw new Error("分配角色失败")
      fetchDevelopers()
    } catch (e: any) { alert(e.message) }
  }

  const removeDeveloperRole = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles/DEVELOPER`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("移除角色失败")
      fetchDevelopers()
    } catch (e: any) { alert(e.message) }
  }

  const isDeveloperRole = (roles: string[]) => roles.includes("DEVELOPER")

  return (
    <div>
      <h1 className="dd-page-title">开发者管理</h1>
      <p className="dd-page-subtitle" style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)", marginBottom: "1.5rem" }}>
        管理平台开发者角色 · 共 {total} 位开发者
      </p>

      {error && <div className="dd-alert dd-alert-error">{error}</div>}

      <div className="dd-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
              <div className="dd-skeleton" style={{ width: "100%", height: 200 }} />
            </div>
          ) : developers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--dd-text-muted)" }}>
              暂无开发者。请在用户管理页面为用户分配 DEVELOPER 角色。
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>开发者</th>
                    <th>联系邮箱</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>加入时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {developers.map(dev => (
                    <tr key={dev.user_id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {dev.display_name || dev.username || dev.email}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.8125rem" }}>{dev.email}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {dev.roles.map(role => (
                            <span key={role} className={`dd-badge ${role === "DEVELOPER" ? "dd-badge-info" : "dd-badge-secondary"}`}>
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {dev.status === "active" ? (
                          <span className="dd-badge dd-badge-success">活跃</span>
                        ) : (
                          <span className="dd-badge dd-badge-danger">禁用</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8125rem" }}>
                        {dev.created_at ? new Date(dev.created_at).toLocaleDateString("zh-CN") : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.375rem" }}>
                          <button className="dd-btn dd-btn-ghost dd-btn-sm"
                            onClick={() => window.location.href = `/admin/users`}>
                            查看用户
                          </button>
                          {isDeveloperRole(dev.roles) ? (
                            <button className="dd-btn dd-btn-danger dd-btn-sm"
                              onClick={() => removeDeveloperRole(dev.user_id)}>
                              移除开发者
                            </button>
                          ) : (
                            <button className="dd-btn dd-btn-secondary dd-btn-sm"
                              onClick={() => assignDeveloperRole(dev.user_id)}>
                              设为开发者
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="dd-card" style={{ marginTop: "1rem", padding: "1rem", background: "var(--dd-surface-subtle)", fontSize: "0.75rem", color: "var(--dd-text-secondary)" }}>
        开发者管理基于角色（DEVELOPER），用户需要先被分配 DEVELOPER 角色才会出现在此列表。管理员可在用户管理页面为用户分配角色，也可直接在开发者页面分配/移除开发者角色。
      </div>
    </div>
  )
}
