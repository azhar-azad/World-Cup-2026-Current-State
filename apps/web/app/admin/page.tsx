import { AdminPanel } from "@/components/AdminPanel";
import { getAppData } from "@/lib/appData";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return (
    <>
      <LogoutButton />
      <AdminPanel initial={await getAppData()} />
    </>
  );
}
