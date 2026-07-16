export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "-apple-system, sans-serif", background: "#f5f5f5" }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "12px 24px", display: "flex", gap: 24 }}>
          <a href="/users" style={{ color: "#333", textDecoration: "none" }}>用户管理</a>
          <a href="/apps" style={{ color: "#333", textDecoration: "none" }}>应用审核</a>
          <a href="/audit" style={{ color: "#333", textDecoration: "none" }}>审计日志</a>
        </nav>
        <main style={{ maxWidth: 1000, margin: "24px auto", padding: "0 24px" }}>{children}</main>
      </body>
    </html>
  )
}
