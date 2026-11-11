import { getDeps } from "@/lib/deps";
import { login } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return login(req, getDeps());
}
