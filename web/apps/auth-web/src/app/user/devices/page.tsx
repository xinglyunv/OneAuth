"use client"

import "@/app/globals.css"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

interface Device {
  id: string
  name: string
  platform: string
  browser: string
  ip_address: string
  last_active: string
}

export default function DevicesPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionId, setActionId] = useState<string | null>(null)
  const [loggingOutAll, setLoggingOutAll] = useState(false)

  const headers = useCallback(() => {
    const token = localStorage.getItem("access_token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }, [])

  const fetchDevices = useCallback(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/login")
      return
    }
    setLoading(true)
    fetch("/api/user/devices", { headers: headers() })
      .then((r) => {
        if (!r.ok) throw new Error("获取设备列表失败")
        return r.json()
      })
      .then(data => setDevices(data.devices))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router, headers])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const handleLogout = async (id: string) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/user/devices/${id}`, { method: "DELETE", headers: headers() })
      if (!res.ok) throw new Error("退出设备失败")
      setDevices((prev) => prev.filter((d) => d.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "退出设备失败")
    } finally {
      setActionId(null)
    }
  }

  const handleLogoutAll = async () => {
    setLoggingOutAll(true)
    setError("")
    try {
      const res = await fetch("/api/user/devices/logout-all", { method: "POST", headers: headers() })
      if (!res.ok) throw new Error("退出所有设备失败")
      setDevices([])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "退出所有设备失败")
    } finally {
      setLoggingOutAll(false)
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          设备管理
        </h2>
        {devices.length > 0 && (
          <button
            className="cc-btn cc-btn-danger"
            onClick={handleLogoutAll}
            disabled={loggingOutAll}
          >
            {loggingOutAll ? "退出中..." : "退出所有设备"}
          </button>
        )}
      </div>

      {error && (
        <div className="cc-alert cc-alert-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="cc-card" style={{ overflow: "hidden" }}>
        {devices.length === 0 ? (
          <div className="cc-empty">暂无设备</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="cc-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>平台</th>
                  <th>浏览器</th>
                  <th>IP</th>
                  <th>最后活跃</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td>{device.name || "未知设备"}</td>
                    <td>{device.platform || "-"}</td>
                    <td>{device.browser || "-"}</td>
                    <td>{device.ip_address}</td>
                    <td>
                      {device.last_active
                        ? new Date(device.last_active).toLocaleString("zh-CN")
                        : "-"}
                    </td>
                    <td>
                      <button
                        className="cc-btn cc-btn-sm cc-btn-danger"
                        onClick={() => handleLogout(device.id)}
                        disabled={actionId === device.id}
                      >
                        {actionId === device.id ? "退出中..." : "退出"}
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
