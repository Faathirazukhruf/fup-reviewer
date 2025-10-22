import "./globals.css";

export const metadata = {
  title: "FUP Reviewer Local",
  description: "Dept → Docs → Sheet Review (localStorage)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="wrap">
          <div className="card">
            <h1>FUP Reviewer</h1>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

