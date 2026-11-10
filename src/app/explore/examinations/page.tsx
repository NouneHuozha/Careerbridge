import type { Metadata } from "next";
import { Suspense } from "react";
import ExaminationsExplorer from "./examinations-explorer";

export const metadata: Metadata = {
  title: "Examinations | CareerBridge",
  description:
    "Explore entrance examinations by education stage, course and field of study.",
};

export default function ExaminationsPage() {
  return (
    <Suspense fallback={<main className="min-h-svh bg-[#fbfaf6]" />}>
      <ExaminationsExplorer />
    </Suspense>
  );
}
