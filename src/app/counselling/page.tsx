import type { Metadata } from "next";
import GuidedExplorer from "./guided-explorer";

export const metadata: Metadata = {
  title: "Guided Explorer — CareerBridge",
  description:
    "A voluntary, self-guided way to browse education and study areas. No person is involved, and no answer decides eligibility.",
};

export default function GuidedExplorerPage() {
  return <GuidedExplorer />;
}
