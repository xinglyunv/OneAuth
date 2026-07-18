"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface UserRole { id: string; name: string; description?: string }
interface User {
  id: string; email: string; username: string; status: string
  mfa_enabled: boolean; email_verified: boolean
  display_name?: string; roles?: UserRole[]; session_count?: number
  created_at: string
}

const AVAILABLE_ROLES = ["USER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"]

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [toggling, setToggling] = useState<string | null>(null)

  // Detail modal
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const [detailRoles, setDetailRoles] = useState<UserRole[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Role modal
  const [roleUser, setRoleUser] = useState<User | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Reset password
  const [resetPwUser, setResetPwUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [resetting, setResetting] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const params = new URLSearchParams({ page: String(page), size: "20" })
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "请求失败" }))).error)
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
      setTotalPages(Math.ceil((data.total || 0) / 20) || 1)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [page, search, statusFilter, token])

  useEffect(() => { if (!token) { router.replace("/admin/login"); return }; fetchUsers() }, [fetchUsers, router, token])

  const toggleStatus = async (userId: string) => {
    setToggling(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "操作失败" }))).error)
      setSuccess("状态已切换")
      fetchUsers()
    } catch (e: any) { setError(e.message) } finally { setToggling(null) }
  }

  const viewDetail = async (user: User) => {
    setDetailUser(user); setDetailLoading(true)
    try {
      const [userRes, rolesRes] = await Promise.all([
        fetch(`/api/admin/users/${user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/users/${user.id}/roles`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (userRes.ok) { const d = await userRes.json(); setDetailUser(d.user || user) }
      if (rolesRes.ok) { const d = await rolesRes.json(); setDetailRoles(d.roles || []) }
    } catch { /* noop */ } finally { setDetailLoading(false) }
  }

  const assignRole = async (userId: string, roleName: string) => {
    setRoleLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role_name: roleName }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({ error: "失败" })); throw new Error(d.error) }
      setSuccess(`${roleName} 角色已分配`)
      fetchUsers()
      if (detailUser?.id === userId) viewDetail(detailUser)
      if (roleUser?.id === userId) setRoleUser(null)
    } catch (e: any) { setError(e.message) } finally { setRoleLoading(false) }
  }

  const removeRole = async (userId: string, roleId: string) => {
    setRoleLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles/${roleId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("操作失败")
      setSuccess("角色已移除")
      fetchUsers()
      if (detailUser?.id === userId) viewDetail(detailUser)
    } catch (e: any) { setError(e.message) } finally { setRoleLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "删除失败" }))).error)
      setSuccess("用户已删除")
      setDeleteUser(null)
      fetchUsers()
    } catch (e: any) { setError(e.message) } finally { setDeleting(false) }
  }

  const handleResetPw = async () => {
    if (!resetPwUser || newPassword.length < 8) { setError("密码至少 8 个字符"); return }
    setResetting(true)
    try {
      const res = await fetch(`/api/admin/users/${resetPwUser.id}/reset-password`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "重置失败" }))).error)
      setSuccess("密码已重置")
      setResetPwUser(null); setNewPassword("")
    } catch (e: any) { setError(e.message) } finally { setResetting(false) }
  }

  const truncate = (s: string, n: number) => s.length <= n ? s : s.slice(0, n / 2) + "..." + s.slice(-n / 2)

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <h1 className="dd-page-title">用户管理</h1>
          <p className="dd-page-subtitle" style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)" }}>
            共 {total} 个用户 · 支持角色分配、禁用、详情查看、删除
          </p>
        </div>
      </div>

      {error && <div className="dd-alert dd-alert-error" style={{ marginBottom: "1rem" }}>{error}<button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }}>&times;</button></div>}
      {success && <div className="dd-alert dd-alert-success" style={{ marginBottom: "1rem" }}>{success}<button onClick={() => setSuccess("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }}>&times;</button></div>}

      {/* Search */}
      <div className="dd-search-bar" style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input className="dd-input" placeholder="搜索邮箱或用户名..." value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { setPage(1); fetchUsers() } }} style={{ maxWidth: 280 }} />
        <select className="dd-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--dd-border)", borderRadius: "var(--dd-radius)", fontSize: "0.875rem" }}>
          <option value="">全部状态</option>
          <option value="active">活跃</option>
          <option value="disabled">禁用</option>
        </select>
        <button className="dd-btn dd-btn-primary dd-btn-sm" onClick={() => { setPage(1); fetchUsers() }}>搜索</button>
      </div>

      {/* Table */}
      <div className="dd-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <div className="dd-skeleton" style={{ width: "100%", height: 200 }} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--dd-text-muted)" }}>暂无用户</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>用户</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>MFA</th>
                    <th>创建日期</th>
                    <th style={{ minWidth: 320 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u.display_name || u.username || u.email}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--dd-text-muted)" }}>{u.email}</div>
                        <div style={{ fontSize: "0.6875rem", fontFamily: "monospace", color: "var(--dd-text-muted)" }}>{truncate(u.id, 16)}</div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {(u.roles || []).map(r => (
                            <span key={r.id} className="dd-badge" style={{ background: "#f0e6ff", color: "var(--dd-brand)", cursor: "pointer" }}
                              title="点击移除" onClick={() => removeRole(u.id, r.id)}>
                              {r.name} &times;
                            </span>
                          ))}
                          {(!u.roles || u.roles.length === 0) && <span style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>未分配</span>}
                        </div>
                      </td>
                      <td>{u.status === "active" ? <span className="dd-badge dd-badge-success">活跃</span> : <span className="dd-badge dd-badge-danger">禁用</span>}</td>
                      <td>{u.mfa_enabled ? <span className="dd-badge" style={{ background: "#cff4fc", color: "#055160" }}>已启用</span> : <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>—</span>}</td>
                      <td style={{ fontSize: "0.8125rem" }}>{new Date(u.created_at).toLocaleDateString("zh-CN")}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                          <button className="dd-btn dd-btn-ghost dd-btn-sm" onClick={() => viewDetail(u)}>详情</button>
                          <button className="dd-btn dd-btn-ghost dd-btn-sm" onClick={() => { setRoleUser(u); setDetailRoles(u.roles || []) }}>角色</button>
                          <button className={`dd-btn dd-btn-sm ${u.status === "active" ? "dd-btn-danger" : "dd-btn-secondary"}`}
                            onClick={() => toggleStatus(u.id)} disabled={toggling === u.id}>
                            {toggling === u.id ? "..." : u.status === "active" ? "禁用" : "启用"}
                          </button>
                          <button className="dd-btn dd-btn-ghost dd-btn-sm" onClick={() => { setResetPwUser(u); setNewPassword("") }}>改密</button>
                          <button className="dd-btn dd-btn-ghost dd-btn-sm" style={{ color: "var(--dd-danger)" }}
                            onClick={() => fetch(`/api/admin/users/${u.id}/force-logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).then(r => { if (r.ok) setSuccess("已强制退出") }).catch(() => {})}>
                            退出
                          </button>
                          <button className="dd-btn dd-btn-ghost dd-btn-sm" style={{ color: "var(--dd-danger)" }}
                            onClick={() => setDeleteUser(u)}>删除</button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem", alignItems: "center" }}>
          <button className="dd-btn dd-btn-secondary dd-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span style={{ fontSize: "0.875rem", color: "var(--dd-text-muted)" }}>{page} / {totalPages}</span>
          <button className="dd-btn dd-btn-secondary dd-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      )}

      {/* User Detail Modal */}
      {detailUser && (
        <div className="dd-modal-overlay" onClick={() => setDetailUser(null)}>
          <div className="dd-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>用户详情</h3>
              <button onClick={() => setDetailUser(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--dd-text-muted)" }}>&times;</button>
            </div>
            {detailLoading ? <div className="dd-skeleton" style={{ height: 200 }} /> : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
                <div><div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>邮箱</div><div>{detailUser.email}</div></div>
                <div><div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>用户名</div><div>{detailUser.username || "—"}</div></div>
                <div><div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>显示名</div><div>{detailUser.display_name || "—"}</div></div>
                <div><div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>状态</div><span className={detailUser.status === "active" ? "dd-badge dd-badge-success" : "dd-badge dd-badge-danger"}>{detailUser.status}</span></div>
                <div><div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>邮箱验证</div><span>{detailUser.email_verified ? "已验证" : "未验证"}</span></div>
                <div><div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>MFA</div><span>{detailUser.mfa_enabled ? "已启用" : "未启用"}</span></div>
                <div><div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>会话数</div><div>{detailUser.session_count ?? "—"}</div></div>
                <div><div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>User ID</div><div style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{detailUser.id}</div></div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>角色</div>
                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                    {detailRoles.map(r => (
                      <span key={r.id} className="dd-badge" style={{ background: "#f0e6ff", color: "var(--dd-brand)", cursor: "pointer" }}
                        onClick={() => removeRole(detailUser.id, r.id)}>{r.name} &times;</span>
                    ))}
                    {detailRoles.length === 0 && <span style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>无角色</span>}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
                  <div style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>分配角色</div>
                  <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                    {AVAILABLE_ROLES.filter(r => !detailRoles.some(dr => dr.name === r)).map(roleName => (
                      <button key={roleName} className="dd-btn dd-btn-secondary dd-btn-sm" onClick={() => assignRole(detailUser.id, roleName)} disabled={roleLoading}>
                        + {roleName}
                      </button>
                    ))}
                    {AVAILABLE_ROLES.every(r => detailRoles.some(dr => dr.name === r)) && <span style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>已拥有全部角色</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {roleUser && (
        <div className="dd-modal-overlay" onClick={() => setRoleUser(null)}>
          <div className="dd-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>管理角色 — {roleUser.email}</h3>
              <button onClick={() => setRoleUser(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "var(--dd-text-muted)" }}>&times;</button>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--dd-text-muted)", marginBottom: "1rem" }}>
              为 {roleUser.username || roleUser.email} 分配或移除系统角色
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.5rem" }}>当前角色</div>
              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {(roleUser.roles || []).map(r => (
                  <span key={r.id} className="dd-badge" style={{ background: "#f0e6ff", color: "var(--dd-brand)", cursor: "pointer", padding: "0.25rem 0.625rem" }}
                    onClick={() => removeRole(roleUser.id, r.id)}>{r.name} &times;</span>
                ))}
                {(!roleUser.roles || roleUser.roles.length === 0) && <span style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>无角色</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.5rem" }}>可分配角色</div>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                {AVAILABLE_ROLES.filter(r => !(roleUser.roles || []).some(ur => ur.name === r)).map(roleName => (
                  <button key={roleName} className="dd-btn dd-btn-secondary dd-btn-sm" onClick={() => assignRole(roleUser.id, roleName)} disabled={roleLoading}>
                    + {roleName}
                  </button>
                ))}
                {AVAILABLE_ROLES.every(r => (roleUser.roles || []).some(ur => ur.name === r)) && <span style={{ color: "var(--dd-text-muted)", fontSize: "0.75rem" }}>已拥有全部角色</span>}
              </div>
            </div>
            <div className="dd-card" style={{ background: "var(--dd-surface-subtle)", padding: "0.75rem", fontSize: "0.75rem", color: "var(--dd-text-secondary)" }}>
              <strong>角色说明：</strong>USER=普通用户 · DEVELOPER=开发者 · ADMIN=管理员 · SUPER_ADMIN=超级管理员
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwUser && (
        <div className="dd-modal-overlay" onClick={() => setResetPwUser(null)}>
          <div className="dd-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem" }}>重置密码 — {resetPwUser.email}</h3>
            <label className="dd-label">新密码（至少 8 位）</label>
            <input className="dd-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="输入新密码" style={{ marginBottom: "1rem" }} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="dd-btn dd-btn-primary" onClick={handleResetPw} disabled={resetting || newPassword.length < 8}>{resetting ? "重置中..." : "确认重置"}</button>
              <button className="dd-btn dd-btn-ghost" onClick={() => setResetPwUser(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteUser && (
        <div className="dd-modal-overlay" onClick={() => setDeleteUser(null)}>
          <div className="dd-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem", color: "var(--dd-danger)" }}>删除用户</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--dd-text-secondary)", marginBottom: "1rem" }}>
              确定要删除用户 <strong>{deleteUser.email}</strong> 吗？此操作不可恢复。
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="dd-btn dd-btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? "删除中..." : "确认删除"}</button>
              <button className="dd-btn dd-btn-ghost" onClick={() => setDeleteUser(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
