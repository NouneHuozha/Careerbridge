import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { StudyStage } from "../field-data";
import { FieldDetail } from "../field-detail";
import { HistoryVisit } from "../../history-visit";
import { getPublishedField } from "../../../../db/fields";

export const instant = false;

export function generateMetadata(): Metadata {
  return {
    title: "Field guide | CareerBridge",
    description: "Explore this published CareerBridge field.",
  };
}

export default async function FieldPage({
  params,
  searchParams,
}: {
  params: Promise<{ fieldId: string }>;
  searchParams: Promise<{ stage?: string | string[]; from?: string | string[] }>;
}) {
  const [{ fieldId }, query] = await Promise.all([params, searchParams]);
  await connection();
  const field = await getPublishedField(fieldId);
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
