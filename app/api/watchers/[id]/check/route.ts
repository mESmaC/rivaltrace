import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { snapshots, watchers } from "../../../../../db/schema";
import { diffSnapshots, fetchPageSnapshot, publicMonitorError } from "../../../../../lib/monitor.mjs";
import { getApiUserId, unauthenticatedResponse } from "../../../current-user";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getApiUserId();
    if (!userId) return unauthenticatedResponse();
    const { id } = await context.params;
    const db = await getDb();
    const [watcher] = await db
      .select()
      .from(watchers)
      .where(and(eq(watchers.id, id), eq(watchers.userId, userId)))
      .limit(1);
    if (!watcher) return Response.json({ error: "Watcher not found." }, { status: 404 });

    const [previous] = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.watcherId, id))
      .orderBy(desc(snapshots.checkedAt))
      .limit(1);
    if (!previous) return Response.json({ error: "The watcher has no baseline snapshot." }, { status: 409 });

    const capture = await fetchPageSnapshot(watcher.url);
    const evidence = diffSnapshots(previous.normalizedText, capture.normalizedText);
    const checkedAt = new Date().toISOString();
    const snapshotId = crypto.randomUUID();

    const [, updatedWatchers] = await db.batch([
      db.insert(snapshots).values({
        id: snapshotId,
        watcherId: watcher.id,
        checkedAt,
        sourceUrl: capture.sourceUrl,
        finalUrl: capture.finalUrl,
        pageTitle: capture.pageTitle,
        statusCode: capture.statusCode,
        byteLength: capture.byteLength,
        contentHash: capture.contentHash,
        normalizedText: capture.normalizedText,
        changeKind: evidence.kind,
        changeSummary: evidence.summary,
        addedJson: JSON.stringify(evidence.added),
        removedJson: JSON.stringify(evidence.removed),
      }),
      db.update(watchers)
        .set({
          lastCheckedAt: checkedAt,
          lastChangedAt: evidence.changed ? checkedAt : watcher.lastChangedAt,
          latestHash: capture.contentHash,
          latestSnapshotId: snapshotId,
          status: evidence.changed ? "changed" : "stable",
          changeKind: evidence.kind,
          changeSummary: evidence.summary,
        })
        .where(and(eq(watchers.id, watcher.id), eq(watchers.userId, userId)))
        .returning(),
    ]);
    const [updated] = updatedWatchers;

    return Response.json({ watcher: updated, evidence });
  } catch (error) {
    const safe = publicMonitorError(error);
    return Response.json({ error: safe.message }, { status: safe.status });
  }
}
