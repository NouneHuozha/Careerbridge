import type { Metadata } from "next";
import { Suspense } from "react";
import InstitutionsExplorer from "./institutions-explorer";

export const metadata: Metadata = {
  title: "Institutions | CareerBridge",
  description: "Explore institutions and compare course offerings, locations and provider information.",
};

export default function InstitutionsPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#fbfaf6]" />}>
      <InstitutionsExplorer />
    </Suspense>
  );
}