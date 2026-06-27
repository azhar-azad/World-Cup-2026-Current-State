import { getAppData } from "@/lib/appData";
import { KnockoutClient } from "@/components/KnockoutClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Knockout Bracket</h1>
      <p className="text-xs text-neutral-500 mb-6">
        Boxes show current leaders.{" "}
        <span className="italic text-neutral-400">Italic with an amber dot</span> = provisional
        (not yet clinched). Third-place slot assignments are computed pending the official Annexe C
        allocation.
      </p>
      <KnockoutClient initial={await getAppData()} />
    </div>
  );
}
