import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { snapshots, watchers } from "../../../db/schema";
import { fetchPageSnapshot, publicMonitorError } from "../../../lib/monitor.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(watchers).orderBy(desc(watchers.lastCheckedAt)).limit(50);
    return Response.json({ watchers: rows });
  } catch (error) {
    const safe = publicMonitorError(error);
    return Response.json({ error: safe.message }, { status: safe.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { label?: string; url?: string };
    const label = payload.label?.trim() ?? "";
    const url = payload.url?.trim() ?? "";
    if (!label) return Response.json({ error: "A short watcher label is required." }, { status: 400 });
    if (label.length > 80) return Response.json({ error: "Watcher labels are limited to 80 characters." }, { status: 400 });

    const capture = await fetchPageSnapshot(url);
    const db = await getDb();
    const duplicate = await db.select({ id: watchers.id }).from(watchers).where(eq(watchers.url, capture.sourceUrl)).limit(1);
    if (duplicate.length > 0) {
      return Response.json({ error: "That exact page is already in this watchlist." }, { status: 409 });
    }

    const watcherId = crypto.randomUUID();
    const snapshotId = crypto.randomUUID();
    const checkedAt = new Date().toISOString();
    const [watcher] = await db
      .insert(watchers)
      .values({
        id: watcherId,
        label,
        url: capture.sourceUrl,
        createdAt: checkedAt,
        lastCheckedAt: checkedAt,
        lastChangedAt: null,
        latestHash: capture.contentHash,
        latestSnapshotId: snapshotId,
        status: "stable",
        changeKind: "baseline",
        changeSummary: "Baseline saved; no comparison exists yet.",
      })
      .returning();

    await db.insert(snapshots).values({
      id: snapshotId,
      watcherId,
      checkedAt,
      sourceUrl: capture.sourceUrl,
      finalUrl: capture.finalUrl,
      pageTitle: capture.pageTitle,
      statusCode: capture.statusCode,
      byteLength: capture.byteLength,
      contentHash: capture.contentHash,
      normalizedText: capture.normalizedText,
      changeKind: "baseline",
      changeSummary: "Baseline saved; no comparison exists yet.",
      addedJson: "[]",
      removedJson: "[]",
    });

    return Response.json(
      {
        watcher,
        evidence: { added: [], removed: [], omittedAdded: 0, omittedRemoved: 0 },
      },
      { status: 201 },
    );
  } catch (error) {
    const safe = publicMonitorError(error);
    return Response.json({ error: safe.message }, { status: safe.status });
  }
}
