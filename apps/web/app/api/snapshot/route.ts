import { getAppData } from "@/lib/appData";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getAppData());
}
