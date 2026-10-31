import { load } from "../../../lib/store";
export const dynamic = "force-dynamic";
// This read-only endpoint is protected by the owner-private Sites dispatch boundary.
// Service clients receive only the published document, never drafts or history.
export async function GET() {
  try {
    const state = await load();
    return Response.json(
      { document: state.published, version: state.version },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Published content unavailable" },
      { status: 503 },
    );
  }
}
