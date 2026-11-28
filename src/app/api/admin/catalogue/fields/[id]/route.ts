import { NextRequest } from "next/server";
import { updateFieldDraft } from "../field-draft";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return updateFieldDraft(request, id);
}
