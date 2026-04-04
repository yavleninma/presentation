import { NextRequest } from "next/server";
import { searchPexelsImages } from "@/lib/images/pexels";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) {
    return Response.json(
      { error: "query parameter is required" },
      { status: 400 }
    );
  }

  const perPage = parseInt(
    request.nextUrl.searchParams.get("perPage") ?? "5"
  );

  const results = await searchPexelsImages(query, {
    perPage: Math.min(perPage, 15),
  });

  return Response.json({ results });
}
