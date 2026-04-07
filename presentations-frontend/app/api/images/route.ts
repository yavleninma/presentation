import { NextResponse } from "next/server";

const UNSPLASH_API = "https://api.unsplash.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "query parameter is required" },
      { status: 400 },
    );
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { url: null, credit: null, reason: "UNSPLASH_ACCESS_KEY not configured" },
      { status: 200 },
    );
  }

  try {
    const res = await fetch(
      `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { url: null, credit: null, reason: `Unsplash API ${res.status}` },
        { status: 200 },
      );
    }

    const data = await res.json();
    const photo = data.results?.[0];

    if (!photo) {
      return NextResponse.json({ url: null, credit: null });
    }

    return NextResponse.json({
      url: photo.urls?.regular ?? null,
      credit: photo.user?.name
        ? `${photo.user.name} / Unsplash`
        : "Unsplash",
    });
  } catch {
    return NextResponse.json(
      { url: null, credit: null, reason: "fetch error" },
      { status: 200 },
    );
  }
}
