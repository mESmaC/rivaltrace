import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const watchers = sqliteTable(
  "watchers",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    createdAt: text("created_at").notNull(),
    lastCheckedAt: text("last_checked_at").notNull(),
    lastChangedAt: text("last_changed_at"),
    latestHash: text("latest_hash").notNull(),
    latestSnapshotId: text("latest_snapshot_id").notNull(),
    status: text("status").notNull().default("stable"),
    changeKind: text("change_kind").notNull().default("baseline"),
    changeSummary: text("change_summary").notNull().default("Baseline saved."),
  },
  (table) => [
    uniqueIndex("watchers_url_unique").on(table.url),
    index("watchers_checked_idx").on(table.lastCheckedAt),
  ],
);

export const snapshots = sqliteTable(
  "snapshots",
  {
    id: text("id").primaryKey(),
    watcherId: text("watcher_id").notNull(),
    checkedAt: text("checked_at").notNull(),
    sourceUrl: text("source_url").notNull(),
    finalUrl: text("final_url").notNull(),
    pageTitle: text("page_title").notNull(),
    statusCode: integer("status_code").notNull(),
    byteLength: integer("byte_length").notNull(),
    contentHash: text("content_hash").notNull(),
    normalizedText: text("normalized_text").notNull(),
    changeKind: text("change_kind").notNull(),
    changeSummary: text("change_summary").notNull(),
    addedJson: text("added_json").notNull().default("[]"),
    removedJson: text("removed_json").notNull().default("[]"),
  },
  (table) => [index("snapshots_watcher_checked_idx").on(table.watcherId, table.checkedAt)],
);
