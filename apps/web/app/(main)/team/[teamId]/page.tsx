import { notFound } from "next/navigation";
import { teamsById } from "@wc26/data";
import { getAppData } from "@/lib/appData";
import { TeamView } from "@/components/TeamView";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  if (!teamsById.has(teamId)) notFound();
  return <TeamView teamId={teamId} initial={await getAppData()} />;
}
