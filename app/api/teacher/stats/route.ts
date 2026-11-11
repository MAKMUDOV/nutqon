import { getDeps } from "@/lib/deps";
import { teacherStats } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return teacherStats(req, getDeps());
}
