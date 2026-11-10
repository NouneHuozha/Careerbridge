import type { Metadata } from "next";
import PossibilitiesPage from "./possibilities-page";

export const metadata: Metadata = {
  title: "Discover what's possible | CareerBridge",
  description: "Explore fields connected to your interests and education stage.",
};

export default function ResultsPage() {
  return <PossibilitiesPage />;
}
