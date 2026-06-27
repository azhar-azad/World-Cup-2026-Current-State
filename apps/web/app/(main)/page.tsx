import { getAppData } from "@/lib/appData";
import { LiveDashboard } from "@/components/LiveDashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <LiveDashboard initial={await getAppData()} />;
}
