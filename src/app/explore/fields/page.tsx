import type { Metadata } from "next";
import { connection } from "next/server";
import FieldsDirectory from "./fields-directory";
import { listPublishedFields } from "../../../db/fields";

export const metadata: Metadata = {
  title: "Explore fields | CareerBridge",
  description:
    "Discover areas of study and work, browse fields and explore possible study routes.",
};

export default async function FieldsPage() {
  await connection();
  const fields = await listPublishedFields();
  return <FieldsDirectory fields={fields} />;
}
