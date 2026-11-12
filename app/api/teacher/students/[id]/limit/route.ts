import { getDeps } from "@/lib/deps";
import { setStudentLimit } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return setStudentLimit(req, getDeps(), await ctx.params);
}
