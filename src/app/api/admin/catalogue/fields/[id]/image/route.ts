import { connection, NextResponse } from "next/server";
import { getAdminFieldImage } from "../../../../../../../db/field-images";
import {
  AdminAccessDeniedError,
  AdminAuthenticationRequiredError,
  requireAdmin,
} from "../../../../../../admin-auth";

const imageHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    await requireAdmin();
    const { id } = await context.params;
    if (!/^[a-z0-9][a-z0-9._-]{0,179}$/i.test(id)) {
      return NextResponse.json({ error: "The Field image could not be found." }, {
        status: 404,
        headers: imageHeaders,
      });
    }

    const image = await getAdminFieldImage(id);
    if (!image?.imageData || !image.imageContentType) {
      return NextResponse.json({ error: "This Field revision does not have an image." }, {
        status: 404,
        headers: imageHeaders,
      });
    }
    return new Response(new Uint8Array(image.imageData), {
      headers: {
        ...imageHeaders,
        "Content-Type": image.imageContentType,
        "Content-Length": String(image.imageData.length),
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      return NextResponse.json({ error: "Sign in before viewing Field images." }, {
        status: 401,
        headers: imageHeaders,
      });
    }
    if (error instanceof AdminAccessDeniedError) {
      return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, {
        status: 403,
        headers: imageHeaders,
      });
    }
    console.error(
      "[careerbridge-next] Admin Field image query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "The Field image is temporarily unavailable." }, {
      status: 503,
      headers: imageHeaders,
    });
  }
}
