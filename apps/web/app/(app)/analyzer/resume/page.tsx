import { redirect } from "next/navigation";

export default function ResumeSubRoute() {
  redirect("/analyzer?tab=resume");
}
