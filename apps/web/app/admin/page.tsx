import { AdminPanel } from "@/components/AdminPanel";
import { getAppData } from "@/lib/appData";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return <AdminPanel initial={await getAppData()} />;
}
