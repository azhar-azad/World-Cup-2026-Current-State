import { getAppData } from "@/lib/appData";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  await store.reset();
  return Response.json(await getAppData());
}
