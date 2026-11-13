import type { Metadata } from "next";
import SavedItemsPage from "./saved-items-page";

export const metadata: Metadata = {
  title: "Saved | CareerBridge",
  description: "Return to the fields, courses and opportunities you saved.",
};

export default function SavedPage() {
  return <SavedItemsPage />;
}
