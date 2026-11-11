import { getDeps } from "@/lib/deps";
import { ocr } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  return ocr(req, getDeps());
}
