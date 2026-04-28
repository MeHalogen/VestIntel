export default function RootNotFound() {
  // Minimal root not-found page to satisfy Next.js build-time resolution.
  return (
    <html>
      <body>
        <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Page not found</h1>
          <p style={{ opacity: 0.8, margin: 0 }}>The page you’re looking for doesn’t exist.</p>
        </div>
      </body>
    </html>
  )
}
