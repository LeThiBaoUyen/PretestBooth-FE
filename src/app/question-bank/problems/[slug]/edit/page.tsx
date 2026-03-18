"use client";

import Footer from "@/components/Footer";
import UpdateProblemForm from "./UpdateProblemForm";
import { useParams } from "next/navigation";

export default function EditProblemPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pt-16 pb-20">
        <UpdateProblemForm problemSlug={slug} />
      </main>
      <Footer />
    </>
  );
}
