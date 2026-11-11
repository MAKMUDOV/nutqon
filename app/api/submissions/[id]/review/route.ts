import { getDeps } from "@/lib/deps";
import { review } from "@/lib/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return review(req, getDeps(), await ctx.params);
}
