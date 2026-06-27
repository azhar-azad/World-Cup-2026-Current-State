import { getAppData } from "@/lib/appData";
import { GroupsClient } from "@/components/GroupsClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Group Stage</h1>
      <GroupsClient initial={await getAppData()} />
    </div>
  );
}
