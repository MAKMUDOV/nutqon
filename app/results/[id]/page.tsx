"use client";
import { useParams } from "next/navigation";
import ResultView from "@/components/ResultView";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ResultView id={id} />;
}
