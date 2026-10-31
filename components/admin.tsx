"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { upgradeContent, type Content } from "../lib/content";
import { EditorContext, download } from "./editor-context";
import PreviewFrame from "./preview-frame";
import {
  PagesPanel,
  TextsPanel,
  DesignPanel,
  SettingsPanel,
  OverviewPanel,
} from "./editor-panels";
import {
  CoursesPanel,
  MediaPanel,
  EnrollmentsPanel,
  AnalyticsPanel,
  VersionsPanel,
} from "./management-panels";
export default function Admin({
  cloudflare = false,
}: {
  cloudflare?: boolean;
}) {
  const [doc, setDoc] = useState<Content | null>(null),
    [published, setPublished] = useState<Content | null>(null),
    [tab, setTab] = useState("Overview"),
    [status, setStatus] = useState("Loading"),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState("hero"),
    [page, setPage] = useState("home"),
    [preview, setPreview] = useState<Content | null>(null),
    [width, setWidth] = useState("100%");
  const version = useRef(0),
    latest = useRef<Content | null>(null),
    saved = useRef(""),
    inflight = useRef(false),
    conflict = useRef(false),
    failed = useRef(""),
    history = useRef<Content[]>([]),
    future = useRef<Content[]>([]);
  latest.current = doc;
  const refresh = useCallback(async () => {
    const r = await fetch("/api/manage");
    const data = (await r.json()) as {
      draft: unknown;
      published: unknown;
      version: number;
      error?: string;
    };
    if (!r.ok) throw Error(data.error || "Unable to load");
    const d = upgradeContent(data.draft);
    saved.current = JSON.stringify(d);
    latest.current = d;
    version.current = data.version;
    setDoc(d);
    setPublished(upgradeContent(data.published));
    setDirty(false);
    setStatus("Saved");
    conflict.current = false;
    failed.current = "";
  }, []);
  useEffect(() => {
    refresh().catch((e) => setStatus(e.message));
  }, [refresh]);
  function change(fn: (d: Content) => void) {
    const current = latest.current;
    if (!current) return;
    history.current.push(structuredClone(current));
    history.current = history.current.slice(-80);
    future.current = [];
    const next = structuredClone(current);
    fn(next);
    latest.current = next;
    setDoc(next);
    setDirty(true);
    setStatus("Unsaved");
    failed.current = "";
  }
  async function save(action = "save", revision?: string, auto = false) {
    const snapshot = latest.current;
    if (!snapshot || inflight.current || conflict.current) return;
    const serialized = JSON.stringify(snapshot);
    if (auto && failed.current === serialized) return;
    inflight.current = true;
    setBusy(true);
    setStatus(action === "publish" ? "Publishing…" : "Saving…");
    try {
      const r = await fetch("/api/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          version: version.current,
          document: snapshot,
          revision,
        }),
      });
      const data = (await r.json()) as { version: number; error?: string };
      if (!r.ok) {
        if (r.status === 409) conflict.current = true;
        throw Error(data.error || "Save failed");
      }
      version.current = data.version;
      saved.current = serialized;
      const changed = JSON.stringify(latest.current) !== serialized;
      setDirty(changed);
      setStatus(
        changed ? "Unsaved" : action === "publish" ? "Published" : "Saved",
      );
      if (action === "publish") setPublished(snapshot);
      if (action === "restore" || action === "discard") {
        history.current.push(snapshot);
        await refresh();
        setStatus(
          action === "restore"
            ? "Restored to draft. Publish to apply."
            : "Published content restored to draft.",
        );
      }
    } catch (e) {
      failed.current = serialized;
      setStatus(e instanceof Error ? e.message : "Unable to save");
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!dirty || busy || conflict.current) return;
    const id = setTimeout(() => save("save", undefined, true), 1500);
    return () => clearTimeout(id);
  }, [doc, dirty, busy]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  function travel(back: boolean) {
    const current = latest.current;
    if (!current) return;
    const source = back ? history.current : future.current,
      target = back ? future.current : history.current;
    const next = source.pop();
    if (next) {
      target.push(current);
      latest.current = next;
      setDoc(next);
      setDirty(JSON.stringify(next) !== saved.current);
      setStatus("Unsaved");
    }
  }
  if (!doc || !published)
    return (
      <main className="loading">
        <h1>ADMIN PANEL</h1>
        <p role="status">{status}</p>
        <button onClick={() => refresh().catch((e) => setStatus(e.message))}>
          Retry
        </button>
      </main>
    );
  const value = {
    doc,
    change,
    selected,
    setSelected,
    page,
    setPage,
    setTab,
    status: setStatus,
    save: (a?: string, r?: string) => save(a, r),
    previewDocument: setPreview,
    published,
    refresh,
  };
  return (
    <EditorContext value={value}>
      <div className="admin">
        <aside className="admin-sidebar">
          <a href="/admin" className="admin-brand">
            <span aria-hidden>✳</span>ADMIN PANEL
          </a>
          <div className="workspace-label">WORKSPACE</div>
          <nav>
            {[
              "Overview",
              "Pages",
              "Text & Labels",
              "Design",
              "Media",
              "Courses",
              "Enrollments",
              "Analytics",
              "Settings",
            ].map((name, i) => (
              <button
                key={name}
                className={tab === name ? "active" : ""}
                onClick={() => {
                  setTab(name);
                  setPreview(null);
                }}
              >
                <span aria-hidden>
                  {["◫", "▤", "T", "◈", "▧", "◉", "↗", "⌁", "⚙"][i]}
                </span>
                {name}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <a
              href="https://mxd.digital-world-9896a4.workers.dev/"
              target="_blank"
              rel="noreferrer"
            >
              Open website ↗
            </a>
            {cloudflare ? (
              <form action="/logout" method="POST">
                <button type="submit">Sign out</button>
              </form>
            ) : (
              <a href="/signout-with-chatgpt?return_to=/admin" target="_top">
                Sign out
              </a>
            )}
          </div>
        </aside>
        <div className="admin-main">
          <header className="admin-top">
            <div>
              <span className="status-dot" />
              <output aria-live="polite">
                {status}
                {dirty ? " · draft" : ""}
              </output>
            </div>
            <div className="toolbar">
              <button
                aria-label="Undo"
                disabled={!history.current.length}
                onClick={() => travel(true)}
              >
                ↶
              </button>
              <button
                aria-label="Redo"
                disabled={!future.current.length}
                onClick={() => travel(false)}
              >
                ↷
              </button>
              <button onClick={() => setTab("Versions")}>History</button>
              <button onClick={() => setPreview(preview ? null : doc)}>
                {preview ? "Editor" : "Preview"}
              </button>
              <button disabled={busy} onClick={() => save()}>
                Save draft
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => save("publish")}
              >
                Publish ↗
              </button>
            </div>
          </header>
          <div className="admin-content">
            <div className="page-heading">
              <div>
                <span className="workspace-label">MXD</span>
                <h1>{preview ? "Preview" : tab}</h1>
              </div>
              <span className="draft-pill">v{version.current}</span>
            </div>
            {conflict.current && (
              <div role="alert" className="admin-panel">
                <p>
                  Another session changed this draft. Export your edits before
                  reloading.
                </p>
                <button onClick={() => download("mxd-unsaved.json", doc)}>
                  Export local edits
                </button>
                <button
                  onClick={() => refresh().catch((e) => setStatus(e.message))}
                >
                  Reload server draft
                </button>
              </div>
            )}
            {preview ? (
              <>
                <div className="toolbar">
                  {["100%", "768px", "390px"].map((w) => (
                    <button key={w} onClick={() => setWidth(w)}>
                      {w === "100%"
                        ? "Desktop"
                        : w === "768px"
                          ? "Tablet"
                          : "Mobile"}
                    </button>
                  ))}
                  <button onClick={() => setPreview(doc)}>
                    Preview current draft
                  </button>
                </div>
                <PreviewFrame document={preview} width={width} pageId={page} />
              </>
            ) : tab === "Overview" ? (
              <OverviewPanel />
            ) : tab === "Pages" ? (
              <PagesPanel />
            ) : tab === "Text & Labels" ? (
              <TextsPanel />
            ) : tab === "Design" ? (
              <DesignPanel />
            ) : tab === "Media" ? (
              <MediaPanel />
            ) : tab === "Courses" ? (
              <CoursesPanel />
            ) : tab === "Enrollments" ? (
              <EnrollmentsPanel />
            ) : tab === "Analytics" ? (
              <AnalyticsPanel />
            ) : tab === "Versions" ? (
              <VersionsPanel />
            ) : (
              <SettingsPanel />
            )}
          </div>
        </div>
      </div>
    </EditorContext>
  );
}
