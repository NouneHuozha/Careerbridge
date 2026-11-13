import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { possibilityFields, type StudyStage } from "../field-data";
import { FieldDetail } from "../field-detail";
import { HistoryVisit } from "../../history-visit";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fieldId: string }>;
}): Promise<Metadata> {
  const { fieldId } = await params;
  const field = possibilityFields.find((item) => item.id === fieldId);
  return {
    title: field ? `${field.name} | CareerBridge` : "Field guide | CareerBridge",
    description: field?.description,
  };
}

export function generateStaticParams() {
  return possibilityFields.map((field) => ({ fieldId: field.id }));
}

export default async function FieldPage({
  params,
  searchParams,
}: {
  params: Promise<{ fieldId: string }>;
  searchParams: Promise<{ stage?: string | string[]; from?: string | string[] }>;
}) {
  const [{ fieldId }, query] = await Promise.all([params, searchParams]);
  const field = possibilityFields.find((item) => item.id === fieldId);
  if (!field) notFound();

  const stage = Array.isArray(query.stage) ? query.stage[0] : query.stage;
  const from = Array.isArray(query.from) ? query.from[0] : query.from;
  const initialStage: StudyStage | undefined =
    stage === "class-10" || stage === "class-12" ? stage : undefined;

  return (
    <>
      <HistoryVisit
        type="field"
        id={field.id}
        context={initialStage ? { stage: initialStage } : undefined}
      />
      <FieldDetail
        field={field}
        initialStage={initialStage}
        fromGuidedExplorer={from === "guided"}
      />
    </>
  );
}
