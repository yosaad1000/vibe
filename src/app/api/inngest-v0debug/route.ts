import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const count = await prisma.project.count();
    return Response.json({ ok: true, count });
  } catch (e) {
    const err = e as Error;
    console.log("[v0] prisma error:", err);
    return Response.json({ ok: false, name: err.name, message: err.message, stack: err.stack }, { status: 500 });
  }
}
