export const metadata = { title: "Marketer Maestro", description: "AI marketing strategist + glass-box console" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#faf9f5", color: "#1f1e1c", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
