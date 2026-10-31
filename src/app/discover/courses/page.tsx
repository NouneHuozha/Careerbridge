import type { Metadata } from "next";
import StudyPathPage from "../study-path-page";
import { class12StudyPath } from "../study-path-data";

export const metadata: Metadata = {
  title: "After Class 12: Course Areas | CareerBridge",
  description:
    "Explore broad study types after Class 12. This guide does not determine eligibility or imply local availability.",
};

export default function Class12CoursesPage() {
  return <StudyPathPage config={class12StudyPath} />;
}
