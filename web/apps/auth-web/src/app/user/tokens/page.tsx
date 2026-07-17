"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

interface Token {
  id: string
  name: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
}

export default function TokensPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [rawToken, setRawToken] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  const headers = useCallback(() => {
    const token = localStorage.getItem("access_token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }, [])

  const fetchTokens = useCallback(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }
    setLoading(true)
    fetch("/api/user/tokens", { headers: headers() })
      .then((r) => {
        if (!r.ok) throw new Error("获取令牌列表失败")
        return r.json()
      })
      .then(data => setTokens(data.tokens))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router, headers])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const handleCreate = async () => {
    if (!name.trim()) return
    setError("")
    setRawToken("")
    setCreating(true)
    try {
      const res = await fetch("/api/user/tokens", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error("创建令牌失败")
      const data = await res.json()
      setRawToken(data.token || data.access_token || "")
      setName("")
      await fetchTokens()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建令牌失败")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/user/tokens/${id}`, { method: "DELETE", headers: headers() })
      if (!res.ok) throw new Error("删除令牌失败")
      setTokens((prev) => prev.filter((t) => t.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "删除令牌失败")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <span className="cc-spinner" />
      </div>
    )
  }

  return (
    <div className="cc-wide">
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        个人访问令牌
      </h2>

      {error && (
        <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {rawToken && (
        <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem", wordBreak: "break-all" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>请立即保存此令牌，关闭后不再显示</div>
          <code style={{ fontSize: "0.8125rem" }}>{rawToken}</code>
        </div>
      )}

      <div className="cc-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label className="cc-label" htmlFor="token_name">
              创建新令牌
            </label>
            <input
              id="token_name"
              className="cc-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入令牌名称"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <button
            className="cc-btn cc-btn-primary"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            style={{ marginBottom: "0.125rem" }}
          >
            {creating ? "创建中..." : "创建令牌"}
          </button>
        </div>
      </div>

      <div className="cc-card" style={{ overflow: "hidden" }}>
        {tokens.length === 0 ? (
          <div className="cc-empty">暂无个人访问令牌</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="cc-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>权限</th>
                  <th>创建日期</th>
                  <th>最近使用</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td style={{ fontWeight: 500 }}>{token.name}</td>
                    <td>{token.scopes?.join(", ") || "-"}</td>
                    <td>{new Date(token.created_at).toLocaleString("zh-CN")}</td>
                    <td>
                      {token.last_used_at
                        ? new Date(token.last_used_at).toLocaleString("zh-CN")
                        : "从未使用"}
                    </td>
                    <td>
                      <button
                        className="cc-btn cc-btn-sm cc-btn-danger"
                        onClick={() => handleDelete(token.id)}
                        disabled={deleting === token.id}
                      >
                        {deleting === token.id ? "删除中..." : "删除"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
