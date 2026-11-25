import type { Metadata } from "next";
import InstitutionDirectory from "./institution-directory";
import { listPublicInstitutionDirectory } from "../institution-page-data";

export const metadata: Metadata = {
  title: "Explore institutions | CareerBridge",
  description:
    "Discover colleges, universities and other educational institutions across Northeast India.",
};

export default async function InstitutionDirectoryPage() {
  const institutions = await listPublicInstitutionDirectory();
  return <InstitutionDirectory institutions={institutions} />;
}
