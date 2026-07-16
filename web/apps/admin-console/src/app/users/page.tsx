"use client"
import { useEffect, useState } from "react"
export default function UsersPage() {
  const [users] = useState<any[]>([])
  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8 }}>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>用户管理</h2>
      {users.length === 0 ? <p style={{ color: "#999" }}>用户列表 API 待实现</p> : users.map(u => (
        <div key={u.id}>{u.email}</div>
      ))}
      <p style={{ color: "#999", fontSize: 14, marginTop: 16 }}>后端管理 API 尚未实现，此页面为占位</p>
    </div>
  )
}
