import { redirect } from "next/navigation";

export default function GitHubSubRoute() {
  redirect("/analyzer?tab=github");
}
