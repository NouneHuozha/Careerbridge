import type { Metadata } from "next";
import FieldsDirectory from "./fields-directory";

export const metadata: Metadata = {
  title: "Explore fields | CareerBridge",
  description:
    "Discover areas of study and work, browse fields and explore possible study routes.",
};

export default function FieldsPage() {
  return <FieldsDirectory />;
}
