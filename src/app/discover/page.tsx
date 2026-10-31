import type { Metadata } from "next";
import DiscoveryForm from "./discovery-form";

export const metadata: Metadata = {
  title: "Start exploring | CareerBridge",
  description:
    "Choose optional interests and class context to explore study areas at your own pace.",
};

export default function DiscoveryPage() {
  return <DiscoveryForm />;
}
