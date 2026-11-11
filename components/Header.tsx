"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, useMe } from "@/lib/client";

export default function Header() {
  const { user } = useMe();
  const path = usePathname();
  const item = (href: string, label: string) => (
    <Link href={href} className={`rounded-full border px-3.5 py-1.5 text-sm ${path === href ? "border-gold bg-gold text-green-dark" : "border-white/40 hover:border-gold"}`}>{label}</Link>
  );
  return (
    <header className="bg-green text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3.5">
        <Link href="/" className="flex items-baseline gap-2.5">
          <b className="font-display text-[22px] tracking-wider">NUTQON</b>
          <span className="text-sm font-semibold text-gold">CEFR Writing Checker</span>
        </Link>
        <nav className="ms-auto flex flex-wrap items-center gap-1.5">
          {item("/", "Bosh sahifa")}
          {user && item("/history", "Mening natijalarim")}
          {user?.role === "TEACHER" && item("/teacher", "O'qituvchi paneli")}
          {user && item("/account", "Hisobim")}
          {user ? (
            <button
              type="button"
              className="rounded-full border border-white/40 px-3.5 py-1.5 text-sm hover:border-gold"
              onClick={async () => { await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => null); location.href = "/login"; }}
            >
              Chiqish
            </button>
          ) : (
            item("/login", "Kirish")
          )}
        </nav>
      </div>
    </header>
  );
}
