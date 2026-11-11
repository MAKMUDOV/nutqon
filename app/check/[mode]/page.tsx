"use client";
import { notFound, useParams } from "next/navigation";
import CheckForm from "@/components/CheckForm";
import type { Mode } from "@/lib/types";

export default function Page() {
  const { mode } = useParams<{ mode: string }>();
  if (mode !== "letter" && mode !== "essay" && mode !== "full") notFound();
  return <CheckForm key={mode} mode={mode as Mode} />;
}
