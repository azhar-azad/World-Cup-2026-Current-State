import { getAppData } from "@/lib/appData";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getAppData());
}
