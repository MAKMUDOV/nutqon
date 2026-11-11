import { getDeps } from "@/lib/deps";
import { getSubmission } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return getSubmission(req, getDeps(), await ctx.params);
}
