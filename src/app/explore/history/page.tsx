import type { Metadata } from "next";
import ExplorationHistoryPage from "./history-page";

export const metadata: Metadata = {
  title: "Exploration History | CareerBridge",
  description: "Return to fields, courses and opportunities you have explored.",
};

export default function HistoryPage() {
  return <ExplorationHistoryPage />;
}
