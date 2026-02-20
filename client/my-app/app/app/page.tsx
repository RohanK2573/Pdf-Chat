import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppWorkspace from "../components/workspace";

export default async function AppPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return <AppWorkspace />;
}
