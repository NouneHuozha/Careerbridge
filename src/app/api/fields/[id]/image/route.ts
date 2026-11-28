import { connection, NextResponse } from "next/server";
import { getPublishedFieldImage } from "../../../../../db/field-images";

const imageHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connection();
  const { id } = await context.params;
  if (!/^[a-z0-9][a-z0-9._-]{0,179}$/i.test(id)) {
    return NextResponse.json({ error: "The Field image could not be found." }, {
      status: 404,
      headers: imageHeaders,
    });
  }

  try {
    const image = await getPublishedFieldImage(id);
    if (!image) {
      return NextResponse.json({ error: "The Field image could not be found." }, {
        status: 404,
        headers: imageHeaders,
      });
    }
    if (image.imageRemoved || !image.imageData || !image.imageContentType) {
      return NextResponse.redirect(new URL("/images/fields/field-placeholder.svg", request.url), {
        status: 302,
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
    console.error(
      "[careerbridge-next] Published Field image query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "The Field image is temporarily unavailable." }, {
      status: 503,
      headers: imageHeaders,
    });
  }
}
