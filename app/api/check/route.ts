import { getDeps } from "@/lib/deps";
import { check } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // AI tahlili 2 daqiqagacha davom etishi mumkin

export async function POST(req: Request) {
  return check(req, getDeps());
}
