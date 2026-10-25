import { redirect } from "next/navigation";

export default function PortfolioSubRoute() {
  redirect("/analyzer?tab=portfolio");
}
