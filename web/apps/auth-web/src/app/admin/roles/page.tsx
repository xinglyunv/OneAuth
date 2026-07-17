"use client"

import "@/app/globals.css"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Role {
  id: string
  name: string
  scope: string
  created_at: string
}

interface Permission {
  id: string
  name: string
  resource: string
  action: string
  created_at: string
}

export default function AdminRolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [roleName, setRoleName] = useState("")
  const [roleDescription, setRoleDescription] = useState("")
  const [roleScope, setRoleScope] = useState("")
  const [creatingRole, setCreatingRole] = useState(false)

  const [permName, setPermName] = useState("")
  const [permResource, setPermResource] = useState("")
  const [permAction, setPermAction] = useState("")
  const [creatingPerm, setCreatingPerm] = useState(false)

  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [rolePerms, setRolePerms] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)

  const fetchRoles = useCallback(async () => {
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const res = await fetch("/api/admin/roles", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setRoles(data.roles || data.data || [])
    } catch (e: any) {
      setError(e.message)
    }
  }, [router])

  const fetchPermissions = useCallback(async () => {
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/login")
        return
      }
      const res = await fetch("/api/admin/permissions", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "请求失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setPermissions(data.permissions || data.data || [])
    } catch (e: any) {
      setError(e.message)
    }
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }
    Promise.all([fetchRoles(), fetchPermissions()]).finally(() => setLoading(false))
  }, [fetchRoles, fetchPermissions, router])

  const createRole = async () => {
    if (!roleName.trim()) return
    const token = localStorage.getItem("access_token")
    setCreatingRole(true)
    setError("")
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: roleName.trim(), description: roleDescription.trim(), scope: roleScope || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "创建角色失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setRoleName("")
      setRoleDescription("")
      setRoleScope("")
      await fetchRoles()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreatingRole(false)
    }
  }

  const createPermission = async () => {
    if (!permName.trim() || !permResource.trim() || !permAction.trim()) return
    const token = localStorage.getItem("access_token")
    setCreatingPerm(true)
    setError("")
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: permName.trim(), resource: permResource.trim(), action: permAction.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "创建权限失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setPermName("")
      setPermResource("")
      setPermAction("")
      await fetchPermissions()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreatingPerm(false)
    }
  }

  const selectRole = async (role: Role) => {
    setSelectedRole(role)
    setAssigning(true)
    setError("")
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`/api/admin/roles/${role.id}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "获取权限失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setRolePerms((data.permissions || data.data || []).map((p: any) => p.id || p))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAssigning(false)
    }
  }

  const toggleRolePerm = (permId: string) => {
    setRolePerms(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    )
  }

  const saveRolePermissions = async () => {
    if (!selectedRole) return
    const token = localStorage.getItem("access_token")
    setAssigning(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permission_ids: rolePerms }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "分配权限失败" }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setSelectedRole(null)
      setRolePerms([])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div>
      <h1 className="dd-page-title">角色管理</h1>

      {error && (
        <div className="dd-alert dd-alert-error">{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--dd-spacing-lg)" }}>
        {/* Roles Section */}
        <div>
          <div className="dd-card">
            <div className="dd-card-header">创建角色</div>
            <div className="dd-card-body">
              <div className="dd-field">
                <span className="dd-label">名称</span>
                <input className="dd-input" placeholder="角色名称" value={roleName} onChange={e => setRoleName(e.target.value)} />
              </div>
              <div className="dd-field">
                <span className="dd-label">描述</span>
                <input className="dd-input" placeholder="角色描述" value={roleDescription} onChange={e => setRoleDescription(e.target.value)} />
              </div>
              <div className="dd-field">
                <span className="dd-label">范围</span>
                <select className="dd-select" value={roleScope} onChange={e => setRoleScope(e.target.value)}>
                  <option value="">全局</option>
                  <option value="organization">组织</option>
                  <option value="project">项目</option>
                </select>
              </div>
              <div style={{ marginTop: "var(--dd-spacing-md)" }}>
                <button type="button" className="dd-btn dd-btn-primary" onClick={createRole} disabled={creatingRole || !roleName.trim()}>
                  {creatingRole ? <span className="dd-spinner" /> : "创建"}
                </button>
              </div>
            </div>
          </div>

          <div className="dd-card" style={{ overflow: "hidden", marginTop: "var(--dd-spacing-lg)" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
                <div className="dd-spinner" />
              </div>
            ) : roles.length === 0 ? (
              <div className="dd-empty">暂无角色数据</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>范围</th>
                      <th>创建日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(r => (
                      <tr
                        key={r.id}
                        onClick={() => selectRole(r)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ fontWeight: 500 }}>{r.name}</td>
                        <td>{r.scope || "全局"}</td>
                        <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                          {new Date(r.created_at).toLocaleDateString("zh-CN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Permissions Section */}
        <div>
          <div className="dd-card">
            <div className="dd-card-header">创建权限</div>
            <div className="dd-card-body">
              <div className="dd-field">
                <span className="dd-label">名称</span>
                <input className="dd-input" placeholder="权限名称" value={permName} onChange={e => setPermName(e.target.value)} />
              </div>
              <div className="dd-field">
                <span className="dd-label">资源</span>
                <input className="dd-input" placeholder="organizations" value={permResource} onChange={e => setPermResource(e.target.value)} />
              </div>
              <div className="dd-field">
                <span className="dd-label">操作</span>
                <input className="dd-input" placeholder="create, read, update, delete" value={permAction} onChange={e => setPermAction(e.target.value)} />
              </div>
              <div style={{ marginTop: "var(--dd-spacing-md)" }}>
                <button type="button" className="dd-btn dd-btn-primary" onClick={createPermission} disabled={creatingPerm || !permName.trim() || !permResource.trim() || !permAction.trim()}>
                  {creatingPerm ? <span className="dd-spinner" /> : "创建"}
                </button>
              </div>
            </div>
          </div>

          <div className="dd-card" style={{ overflow: "hidden", marginTop: "var(--dd-spacing-lg)" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
                <div className="dd-spinner" />
              </div>
            ) : permissions.length === 0 ? (
              <div className="dd-empty">暂无权限数据</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>资源</th>
                      <th>操作</th>
                      <th>创建日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{p.resource}</td>
                        <td><span className="dd-badge-brand">{p.action}</span></td>
                        <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                          {new Date(p.created_at).toLocaleDateString("zh-CN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Permissions Modal */}
      {selectedRole && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => { setSelectedRole(null); setRolePerms([]) }}
        >
          <div
            className="dd-card"
            style={{ width: 480, maxHeight: "80vh", overflow: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="dd-card-header">
              分配权限 — {selectedRole.name}
            </div>
            <div className="dd-card-body">
              {assigning ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
                  <div className="dd-spinner" />
                </div>
              ) : permissions.length === 0 ? (
                <div className="dd-empty">暂无可用权限</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {permissions.map(p => (
                    <label
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 0",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={rolePerms.includes(p.id)}
                        onChange={() => toggleRolePerm(p.id)}
                      />
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--dd-text-secondary)" }}>
                        ({p.resource}:{p.action})
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "var(--dd-spacing-lg)" }}>
                <button
                  type="button"
                  className="dd-btn dd-btn-secondary"
                  onClick={() => { setSelectedRole(null); setRolePerms([]) }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="dd-btn dd-btn-primary"
                  onClick={saveRolePermissions}
                  disabled={assigning}
                >
                  {assigning ? <span className="dd-spinner" /> : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
