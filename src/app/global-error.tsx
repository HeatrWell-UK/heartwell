'use client'

// Shown only if the root layout itself fails, so it carries its own minimal
// styling rather than relying on the site's stylesheet.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', color: '#22171A', background: '#FFFFFF' }}>
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 16px' }}>
          <h1 style={{ fontSize: 30, margin: '0 0 12px' }}>Heartwell is having a problem</h1>
          <p style={{ fontSize: 17, color: '#5E4F52', margin: '0 0 20px' }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: 56, padding: '0 24px', borderRadius: 999, border: 0, background: '#8E1B2E', color: '#FFFFFF', fontSize: 17, fontWeight: 600 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
