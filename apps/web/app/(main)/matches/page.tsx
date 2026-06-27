import { getAppData } from "@/lib/appData";
import { MatchesClient } from "@/components/MatchesClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Matches</h1>
      <MatchesClient initial={await getAppData()} />
    </div>
  );
}
