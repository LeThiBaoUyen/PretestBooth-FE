import { redirect } from "next/navigation";

export default function LegacyDashboardBoothsPage() {
  redirect("/admin/booths");
}
