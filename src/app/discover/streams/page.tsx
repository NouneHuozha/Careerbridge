import type { Metadata } from "next";
import StudyPathPage from "../study-path-page";
import { class10StudyPath } from "../study-path-data";

export const metadata: Metadata = {
  title: "After Class 10: Study Streams | CareerBridge",
  description:
    "Explore broad study categories after Class 10. This guide does not determine eligibility or imply local availability.",
};

export default function Class10StreamsPage() {
  return <StudyPathPage config={class10StudyPath} />;
}
