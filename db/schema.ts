import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const state = sqliteTable("site_state", {
  id: integer("id").primaryKey(),
  draft: text("draft").notNull(),
  published: text("published").notNull(),
  version: integer("version").notNull().default(0),
});
export const revisions = sqliteTable(
  "revisions",
  {
    id: text("id").primaryKey(),
    document: text("document").notNull(),
    created: text("created").notNull(),
    actor: text("actor").notNull(),
    kind: text("kind").notNull(),
  },
  (t) => [index("revisions_created").on(t.created)],
);
export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  deleted: integer("deleted").notNull().default(0),
  created: text("created").notNull(),
  folder: text("folder").notNull().default(""),
  objectKey: text("object_key").notNull().default(""),
});
export const sessions = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(),
  expires: integer("expires").notNull(),
});
export const attempts = sqliteTable("login_attempts", {
  id: text("id").primaryKey(),
  count: integer("count").notNull(),
  window: integer("window").notNull(),
});

export const enrollments = sqliteTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    course: text("course").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    note: text("note").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    provider: text("provider").notNull(),
    checkout: text("checkout"),
    created: text("created").notNull(),
  },
  (t) => [index("enrollments_created").on(t.created)],
);
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    page: text("page").notNull(),
    target: text("target").notNull(),
    visitor: text("visitor").notNull(),
    source: text("source").notNull(),
    created: text("created").notNull(),
  },
  (t) => [
    index("events_created").on(t.created),
    index("events_kind_page").on(t.kind, t.page),
  ],
);
export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  created: text("created").notNull(),
});
export const mediaVersions = sqliteTable(
  "media_versions",
  {
    id: text("id").primaryKey(),
    media: text("media").notNull(),
    objectKey: text("object_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("media_versions_parent").on(t.media)],
);
export const audit = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("audit_created").on(t.created)],
);
