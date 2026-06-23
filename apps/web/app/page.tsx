import { getAppData } from "@/lib/appData";
import { LiveDashboard } from "@/components/LiveDashboard";

// Always render fresh from the live store (never statically cached).
export const dynamic = "force-dynamic";

export default async function Page() {
  return <LiveDashboard initial={await getAppData()} />;
}
