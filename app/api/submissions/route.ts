import { getDeps } from "@/lib/deps";
import { listSubmissions } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return listSubmissions(req, getDeps());
}
