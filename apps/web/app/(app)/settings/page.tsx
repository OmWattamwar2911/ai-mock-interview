import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");

  return <SettingsView user={user} />;
}
