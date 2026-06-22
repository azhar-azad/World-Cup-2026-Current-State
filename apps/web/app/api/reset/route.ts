import { getAppData } from "@/lib/appData";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export function POST() {
  store.reset();
  return Response.json(getAppData());
}
