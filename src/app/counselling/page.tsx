import type { Metadata } from "next";
import { CounsellingIntroduction } from "./counselling-intro";

export const metadata: Metadata = {
  title: "Guided Explorer | CareerBridge",
  description:
    "Self-guided questions to help you reflect on what interests you and explore what comes next.",
};

export default function CounsellingIntroductionPage() {
  return <CounsellingIntroduction />;
}
