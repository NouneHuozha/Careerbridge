import type { Metadata } from "next";
import InstitutionDirectory from "./institution-directory";

export const metadata: Metadata = {
  title: "Explore institutions | CareerBridge",
  description:
    "Discover colleges, universities and other educational institutions across Northeast India.",
};

export default function InstitutionDirectoryPage() {
  return <InstitutionDirectory />;
}
