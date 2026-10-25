import { redirect } from "next/navigation";

export default function CodingSubRoute() {
  redirect("/analyzer?tab=coding");
}
