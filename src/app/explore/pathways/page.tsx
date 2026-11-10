import type { Metadata } from "next";
import { Suspense } from "react";
import PathwaysExplorer from "./pathways-explorer";

export const metadata: Metadata = {
  title: "Pathways | CareerBridge",
  description: "Explore broad education routes after Class 10 or Class 12.",
};

export default function PathwaysPage() {
  return (
    <Suspense fallback={<main className="min-h-svh bg-[#fbfaf6]" />}>
      <PathwaysExplorer />
    </Suspense>
  );
}
