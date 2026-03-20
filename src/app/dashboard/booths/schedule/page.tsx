import { redirect } from "next/navigation";

export default function LegacyDashboardBoothSchedulePage() {
  redirect("/admin/booths/schedule");
}
