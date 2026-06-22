import type { NextRequest } from "next/server";
import { getAppData } from "@/lib/appData";
import { store, type MatchUpdate } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchNo: string }> },
) {
  const { matchNo } = await params;
  let body: MatchUpdate;
  try {
    body = (await req.json()) as MatchUpdate;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    store.update(Number(matchNo), body);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
  return Response.json(getAppData());
}
