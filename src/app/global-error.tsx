"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="de" id="__next_error__">
      <body style={{ margin: 0, background: "#f8fafc", color: "#1c1917" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "440px",
              textAlign: "center",
              background: "#fff",
              border: "1px solid #e7e5e4",
              borderRadius: "16px",
              boxShadow: "0 4px 16px rgba(0,0,0,.06)",
              padding: "32px 24px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "16px",
                background: "#fef2f2",
                color: "#991b1b",
                fontWeight: 800,
                fontSize: "24px",
              }}
            >
              !
            </div>
            <h1 style={{ margin: "16px 0 8px", fontSize: "20px" }}>
              Diese Seite konnte nicht geladen werden
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#44403c",
                lineHeight: 1.5,
              }}
            >
              Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie
              es erneut.
            </p>
            <div style={{ marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => retry()}
                style={{
                  background: "#0369a1",
                  color: "#fff",
                  border: 0,
                  borderRadius: "10px",
                  padding: "10px 18px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}