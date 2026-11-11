import { getDeps } from "@/lib/deps";
import { getSettings, putSettings } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return getSettings(req, getDeps());
}
export async function PUT(req: Request) {
  return putSettings(req, getDeps());
}
