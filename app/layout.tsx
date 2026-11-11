import type { Metadata } from "next";
import { IBM_Plex_Sans, Literata, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const display = Literata({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const ar = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "600", "700"], variable: "--font-ar" });

export const metadata: Metadata = {
  title: "NUTQON — CEFR Writing Checker",
  description: "Arab tilida yozilgan xat va inshoni CEFR mezonlari bo'yicha AI yordamida tekshirish"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${body.variable} ${display.variable} ${ar.variable}`}>
      <body className="min-h-screen font-body">
        <Header />
        <main className="mx-auto grid max-w-5xl gap-5 px-4 pb-16 pt-6">{children}</main>
        <footer className="no-print mx-auto max-w-5xl px-4 pb-8 text-xs text-ink-muted">
          Baholash taxminiy AI baholashdir va rasmiy CEFR natijasi emas. So&apos;zlar soni chegaralari ichki qoida bo&apos;lib, o&apos;qituvchi sozlamalarida o&apos;zgartiriladi.
        </footer>
      </body>
    </html>
  );
}
