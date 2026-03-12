import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "レシートスキャン＆データ抽出",
  description: "複数レシートを一括で読み込み、スプレッドシート用データに変換します",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 w-full shadow-sm">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-[#333]">
                レシートスキャン<span className="text-[#1dbfb4]">AI</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
          {children}
        </main>

        <footer className="bg-white border-t border-gray-100 py-6 text-center text-sm text-gray-400">
          <p>© 2026 Receipt Scanner AI. All rights reserved.</p>
        </footer>

        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
