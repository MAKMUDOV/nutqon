import { getDeps } from "@/lib/deps";
import { me } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return me(req, getDeps());
}
