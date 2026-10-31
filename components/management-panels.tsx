"use client";
import { useState, useEffect, useRef } from "react";
import {
  useEditor,
  TextField,
  Field,
  Toggle,
  DateField,
  OrderButtons,
  download,
} from "./editor-context";
import { newText, upgradeContent, type Content } from "../lib/content";
import { makeCourse, move } from "../lib/editor-model";
import { AssetField } from "./editor-panels";
import { Asset } from "./asset";
export function CoursesPanel() {
  const { doc, change, status } = useEditor();
  const [selected, setSelected] = useState(""),
    [provider, setProvider] = useState<boolean | null>(null);
  const drag = useRef<number | null>(null);
  const current = doc.courses.find((c) => c.id === selected) || doc.courses[0];
  function update(fn: (c: Content["courses"][number]) => void) {
    if (current) change((d) => fn(d.courses.find((c) => c.id === current.id)!));
  }
  useEffect(() => {
    fetch("/api/operations")
      .then((r) => r.json())
      .then((d) =>
        setProvider(!!(d as { stripeConfigured?: boolean }).stripeConfigured),
      );
  }, []);
  return (
    <>
      <div className="admin-panel">
        <h2>Enrollment settings</h2>
        <Toggle
          label="Enable enrollment"
          value={doc.commerce.enabled}
          onChange={(v) =>
            change((d) => {
              d.commerce.enabled = v;
            })
          }
        />
        <Toggle
          label="Require consent"
          value={doc.commerce.requireConsent}
          onChange={(v) =>
            change((d) => {
              d.commerce.requireConsent = v;
            })
          }
        />
        <Field
          label="Website origin"
          value={doc.commerce.publicOrigin}
          onChange={(v) =>
            change((d) => {
              d.commerce.publicOrigin = v;
            })
          }
        />
        {doc.commerce.instructions && (
          <TextField
            id={doc.commerce.instructions}
            label="Manual payment / enrollment instructions"
          />
        )}
        <p>
          Stripe:{" "}
          {provider === null
            ? "Checking configuration…"
            : provider
              ? "Configured"
              : "Not configured. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to the public Worker before enabling Stripe courses."}
        </p>
        <p>
          Manual requests remain pending until you confirm them. No card data is
          stored.
        </p>
      </div>
      <div className="section-editor">
        <aside className="section-list">
          <h2>Courses</h2>
          {doc.courses.map((c, i) => (
            <div
              key={c.id}
              draggable
              onDragStart={() => {
                drag.current = i;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag.current !== null)
                  change((d) => move(d.courses, drag.current!, i));
                drag.current = null;
              }}
            >
              <button onClick={() => setSelected(c.id)}>
                {doc.texts[c.title]}
                <small>{c.visible ? "Visible" : "Hidden"}</small>
              </button>
              <OrderButtons
                index={i}
                length={doc.courses.length}
                up={() => change((d) => move(d.courses, i, i - 1))}
                down={() => change((d) => move(d.courses, i, i + 1))}
                remove={() =>
                  change((d) => {
                    d.courses.splice(i, 1);
                  })
                }
              />
            </div>
          ))}
          <button
            onClick={() =>
              change((d) => {
                const c = makeCourse(d);
                d.courses.push(c);
                setSelected(c.id);
              })
            }
          >
            Add course +
          </button>
        </aside>
        {current && (
          <div className="admin-panel">
            <TextField id={current.title} label="Course title" />
            <TextField id={current.body} label="Description" />
            <TextField id={current.label} label="Enrollment button" />
            <TextField id={current.category} label="Category" />
            <Toggle
              label="Visible"
              value={current.visible}
              onChange={(v) =>
                update((c) => {
                  c.visible = v;
                })
              }
            />
            <Toggle
              label="Featured"
              value={current.featured}
              onChange={(v) =>
                update((c) => {
                  c.featured = v;
                })
              }
            />
            <AssetField
              label="Course image"
              value={current.media}
              onChange={(v) =>
                update((c) => {
                  c.media = v;
                })
              }
            />
            <TextField id={current.alt} label="Image description" />
            <div className="two-cols">
              <Field
                label="Price"
                type="number"
                min={0}
                step={0.01}
                value={current.price ?? ""}
                onChange={(v) =>
                  update((c) => {
                    c.price = v === "" ? null : Number(v);
                  })
                }
              />
              <Field
                label="Promotional price"
                type="number"
                min={0}
                step={0.01}
                value={current.salePrice ?? ""}
                onChange={(v) =>
                  update((c) => {
                    c.salePrice = v === "" ? null : Number(v);
                  })
                }
              />
              <Field
                label="Currency"
                value={current.currency}
                options={["PHP", "USD", "EUR", "GBP", "SGD", "AUD", "CAD"]}
                onChange={(v) =>
                  update((c) => {
                    c.currency = v as typeof c.currency;
                  })
                }
              />
              <Field
                label="Enrollment method"
                value={current.mode}
                options={["manual", "stripe", "external"]}
                onChange={(v) =>
                  update((c) => {
                    c.mode = v as typeof c.mode;
                  })
                }
              />
            </div>
            <DateField
              label="Promotion start"
              value={current.promoStart}
              onChange={(v) =>
                update((c) => {
                  c.promoStart = v;
                })
              }
            />
            <DateField
              label="Promotion end"
              value={current.promoEnd}
              onChange={(v) =>
                update((c) => {
                  c.promoEnd = v;
                })
              }
            />
            <Field
              label="External enrollment URL"
              value={current.url}
              onChange={(v) =>
                update((c) => {
                  c.url = v;
                })
              }
            />
            <h3>Modules and lessons</h3>
            {current.modules.map((m, mi) => (
              <div key={m.id} className="entry">
                <TextField id={m.title} label="Module title" />
                <Toggle
                  label="Visible"
                  value={m.visible}
                  onChange={(v) =>
                    update((c) => {
                      c.modules[mi].visible = v;
                    })
                  }
                />
                <Toggle
                  label="Bonus module"
                  value={m.bonus}
                  onChange={(v) =>
                    update((c) => {
                      c.modules[mi].bonus = v;
                    })
                  }
                />
                <OrderButtons
                  index={mi}
                  length={current.modules.length}
                  up={() => update((c) => move(c.modules, mi, mi - 1))}
                  down={() => update((c) => move(c.modules, mi, mi + 1))}
                  remove={() =>
                    update((c) => {
                      c.modules.splice(mi, 1);
                    })
                  }
                />
                {m.lessons.map((l, li) => (
                  <div className="entry" key={l.id}>
                    <TextField id={l.title} label="Lesson title" />
                    <TextField id={l.body} label="Lesson description" />
                    <Field
                      label="Preview / resource URL"
                      value={l.url}
                      onChange={(v) =>
                        update((c) => {
                          c.modules[mi].lessons[li].url = v;
                        })
                      }
                    />
                    <Toggle
                      label="Visible"
                      value={l.visible}
                      onChange={(v) =>
                        update((c) => {
                          c.modules[mi].lessons[li].visible = v;
                        })
                      }
                    />
                    <OrderButtons
                      index={li}
                      length={m.lessons.length}
                      up={() =>
                        update((c) => move(c.modules[mi].lessons, li, li - 1))
                      }
                      down={() =>
                        update((c) => move(c.modules[mi].lessons, li, li + 1))
                      }
                      remove={() =>
                        update((c) => {
                          c.modules[mi].lessons.splice(li, 1);
                        })
                      }
                    />
                  </div>
                ))}
                <button
                  onClick={() =>
                    change((d) => {
                      d.courses
                        .find((c) => c.id === current.id)!
                        .modules[mi].lessons.push({
                          id: crypto.randomUUID(),
                          title: newText(d),
                          body: newText(d),
                          url: "",
                          visible: true,
                        });
                    })
                  }
                >
                  Add lesson +
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                change((d) => {
                  d.courses
                    .find((c) => c.id === current.id)!
                    .modules.push({
                      id: crypto.randomUUID(),
                      title: newText(d),
                      bonus: false,
                      visible: true,
                      lessons: [],
                    });
                })
              }
            >
              Add module +
            </button>
            <p>
              Use Pages to place a Courses or Curriculum section on the website.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
type Media = {
  id: string;
  name: string;
  mime: string;
  size: number;
  folder: string;
  deleted: number;
  usage: { draft: string[]; published: string[] };
};
export function MediaPanel() {
  const { doc, change, status } = useEditor();
  const [files, setFiles] = useState<Media[]>([]),
    [search, setSearch] = useState(""),
    [folder, setFolder] = useState(""),
    [trash, setTrash] = useState(false),
    [versions, setVersions] = useState<
      Record<
        string,
        { id: string; created: string; mime: string; size: number }[]
      >
    >({}),
    [offset, setOffset] = useState(0),
    [uploading, setUploading] = useState(false);
  async function refresh() {
    const r = await fetch("/api/media?offset=" + offset);
    const result = await r.json();
    if (Array.isArray(result)) setFiles(result);
  }
  useEffect(() => {
    refresh();
  }, [offset]);
  function replaceReferences(old: string, next: string) {
    change((d) => {
      const walk = (v: unknown): void => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object")
          for (const [k, x] of Object.entries(v)) {
            if (x === old) (v as Record<string, unknown>)[k] = next;
            else walk(x);
          }
      };
      walk(d);
    });
  }
  async function upload(file: File, replace?: string) {
    setUploading(true);
    status("Uploading…");
    try {
      let source = file;
      if (
        file.type === "image/svg+xml" ||
        file.name.toLowerCase().endsWith(".svg")
      ) {
        source = await new Promise<File>((resolve, reject) => {
          const url = URL.createObjectURL(file),
            img = new Image();
          img.onload = () => {
            try {
              const scale = Math.min(1, 2048 / Math.max(img.width, img.height)),
                canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(img.width * scale));
              canvas.height = Math.max(1, Math.round(img.height * scale));
              canvas
                .getContext("2d")!
                .drawImage(img, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob)
                  resolve(
                    new File([blob], file.name.replace(/\.svg$/i, ".png"), {
                      type: "image/png",
                    }),
                  );
                else reject(Error("SVG conversion failed"));
              }, "image/png");
            } catch {
              URL.revokeObjectURL(url);
              reject(Error("Unsafe or unsupported SVG"));
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(Error("Invalid SVG"));
          };
          img.src = url;
        });
      }
      const form = new FormData();
      form.set("file", source);
      form.set("folder", folder);
      if (replace) form.set("replace", replace);
      const r = await fetch("/api/media", { method: "POST", body: form });
      const result = (await r.json()) as { error?: string; url: string };
      if (!r.ok) throw Error(result.error || "Upload failed");
      if (replace) replaceReferences("/api/media/" + replace, result.url);
      status(
        replace ? "Replacement added to draft. Publish to apply." : "Uploaded",
      );
      await refresh();
    } catch (e) {
      status(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }
  async function action(p: Record<string, unknown>) {
    const r = await fetch("/api/media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const result = (await r.json()) as { error?: string; url?: string };
    if (!r.ok) {
      status(result.error || "Operation failed");
      return;
    }
    if (result.url) replaceReferences("/api/media/" + p.id, result.url);
    status(result.url ? "Recovered version added to draft" : "Media updated");
    refresh();
  }
  return (
    <>
      <div className="admin-panel">
        <div className="two-cols">
          <Field label="Search media" value={search} onChange={setSearch} />
          <Field
            label="Folder / collection"
            value={folder}
            onChange={setFolder}
          />
        </div>
        <Toggle label="Show trash" value={trash} onChange={setTrash} />
        <label className="field">
          Upload image, SVG, video or audio (50 MB maximum)
          <input
            type="file"
            disabled={uploading}
            accept="image/*,video/mp4,video/webm,audio/mpeg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
        </label>
        <p>
          Replacing media changes draft references only. Published media remains
          unchanged until you publish.
        </p>
        <div className="toolbar">
          <button
            disabled={!offset}
            onClick={() => setOffset(Math.max(0, offset - 100))}
          >
            Previous 100
          </button>
          <button
            disabled={files.length < 100}
            onClick={() => setOffset(offset + 100)}
          >
            Next 100
          </button>
        </div>
      </div>
      <div className="media-grid">
        {files
          .filter(
            (f) =>
              !!f.deleted === trash &&
              (!folder || f.folder === folder) &&
              (f.name + " " + f.folder)
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
          .map((f) => (
            <article className="admin-panel" key={f.id}>
              {!f.deleted && (
                <Asset
                  src={"/api/media/" + f.id}
                  kind={
                    f.mime.startsWith("video")
                      ? "video"
                      : f.mime.startsWith("audio")
                        ? "audio"
                        : "image"
                  }
                  alt={f.name}
                />
              )}
              <h3>{f.name}</h3>
              <p>
                {f.mime} · {Math.ceil(f.size / 1024)} KB
              </p>
              <Field
                label="Name"
                value={f.name}
                onChange={(v) =>
                  setFiles((files) =>
                    files.map((x) => (x.id === f.id ? { ...x, name: v } : x)),
                  )
                }
              />
              <Field
                label="Folder"
                value={f.folder}
                onChange={(v) =>
                  setFiles((files) =>
                    files.map((x) => (x.id === f.id ? { ...x, folder: v } : x)),
                  )
                }
              />
              <button
                onClick={() =>
                  action({
                    id: f.id,
                    action: "rename",
                    name: f.name,
                    folder: f.folder,
                  })
                }
              >
                Save metadata
              </button>
              <input
                aria-label="Reusable media URL"
                readOnly
                value={"/api/media/" + f.id}
                onFocus={(e) => e.target.select()}
              />
              <p>
                {f.usage.draft.length} draft references ·{" "}
                {f.usage.published.length} published references
              </p>
              <details>
                <summary>Usage locations</summary>
                {[...f.usage.draft, ...f.usage.published].map((x, i) => (
                  <small key={i}>
                    {x}
                    <br />
                  </small>
                ))}
              </details>
              {f.deleted ? (
                <button onClick={() => action({ id: f.id, action: "restore" })}>
                  Restore file
                </button>
              ) : (
                <>
                  <label className="field">
                    Replace in draft
                    <input
                      type="file"
                      disabled={uploading}
                      accept="image/*,video/mp4,video/webm,audio/mpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) upload(file, f.id);
                      }}
                    />
                  </label>
                  <button
                    disabled={f.usage.published.length > 0}
                    onClick={() => action({ id: f.id, action: "delete" })}
                  >
                    Move to trash
                  </button>
                </>
              )}
              <button
                onClick={async () => {
                  const r = await fetch("/api/media/" + f.id + "?versions");
                  const data = await r.json();
                  if (Array.isArray(data))
                    setVersions((v) => ({ ...v, [f.id]: data }));
                }}
              >
                Replacement history
              </button>
              {versions[f.id]?.map((v) => (
                <div key={v.id}>
                  <small>{new Date(v.created).toLocaleString()}</small>
                  <button
                    onClick={() =>
                      action({
                        id: f.id,
                        action: "restore-version",
                        version: v.id,
                      })
                    }
                  >
                    Recover to draft
                  </button>
                </div>
              ))}
            </article>
          ))}
      </div>
    </>
  );
}
type Enrollment = {
  id: string;
  course: string;
  name: string;
  email: string;
  note: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  created: string;
};
export function EnrollmentsPanel() {
  const { status, doc } = useEditor();
  const [rows, setRows] = useState<Enrollment[]>([]),
    [offset, setOffset] = useState(0),
    [filter, setFilter] = useState("");
  async function refresh() {
    const r = await fetch("/api/operations?mode=enrollments&offset=" + offset);
    const d = await r.json();
    if (Array.isArray(d)) setRows(d);
  }
  useEffect(() => {
    refresh();
  }, [offset]);
  return (
    <>
      <div className="toolbar">
        <button onClick={refresh}>Refresh</button>
        <button onClick={() => download("mxd-enrollments.json", rows)}>
          Export this page
        </button>
        <button
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          Previous 50
        </button>
        <button
          disabled={rows.length < 50}
          onClick={() => setOffset(offset + 50)}
        >
          Next 50
        </button>
      </div>
      <Field label="Search" value={filter} onChange={setFilter} />
      {rows
        .filter((r) =>
          JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()),
        )
        .map((r) => (
          <div className="admin-panel" key={r.id}>
            <h2>
              {r.name} · {r.status}
            </h2>
            <p>{r.email}</p>
            <p>
              {doc.texts[
                doc.courses.find((c) => c.id === r.course)?.title || ""
              ] || r.course}
            </p>
            <p>{r.note}</p>
            <p>
              {new Intl.NumberFormat("en", {
                style: "currency",
                currency: r.currency,
              }).format(r.amount / 100)}{" "}
              · {r.provider}
            </p>
            <small>
              {r.id} · {new Date(r.created).toLocaleString()}
            </small>
            <Field
              label="Status"
              value={r.status}
              options={
                r.provider === "stripe"
                  ? [
                      "pending",
                      "cancelled",
                      ...(r.status === "paid" ? ["paid"] : []),
                    ]
                  : ["pending", "paid", "cancelled"]
              }
              onChange={async (v) => {
                const res = await fetch("/api/operations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "enrollment-status",
                    id: r.id,
                    status: v,
                  }),
                });
                const data = (await res.json()) as { error?: string };
                status(
                  res.ok ? "Enrollment updated" : data.error || "Update failed",
                );
                if (res.ok) refresh();
              }}
            />
          </div>
        ))}
    </>
  );
}
export function AnalyticsPanel() {
  const { doc, change } = useEditor();
  const [data, setData] = useState<{
    enabled: boolean;
    totals: { kind: string; count: number }[];
    visitors: { count: number };
    pages: { page: string; views: number }[];
    sources: { source: string; views: number }[];
    days: number;
  } | null>(null);
  async function refresh() {
    const r = await fetch("/api/operations?mode=analytics");
    if (r.ok) setData((await r.json()) as typeof data);
  }
  useEffect(() => {
    refresh();
  }, []);
  return (
    <>
      <div className="admin-panel">
        <Toggle
          label="Enable privacy-conscious analytics"
          value={doc.analytics.enabled}
          onChange={(v) =>
            change((d) => {
              d.analytics.enabled = v;
            })
          }
        />
        <Field
          label="Retention in days"
          type="number"
          min={1}
          max={365}
          value={doc.analytics.retentionDays}
          onChange={(v) =>
            change((d) => {
              d.analytics.retentionDays = Number(v);
            })
          }
        />
        <p>
          Publish to apply. Do Not Track and Global Privacy Control are
          respected. Visitor identifiers rotate daily; IP addresses are not
          stored in analytics.
        </p>
        <button onClick={refresh}>Refresh metrics</button>
      </div>
      {data?.enabled && (
        <div className="admin-panel">
          <h2>Last {data.days} days</h2>
          <p>Daily unique visitors: {data.visitors.count}</p>
          {data.totals.map((r) => (
            <p key={r.kind}>
              {r.kind}: {r.count}
            </p>
          ))}
          <h3>Pages</h3>
          {data.pages.map((r) => (
            <p key={r.page}>
              {r.page}: {r.views}
            </p>
          ))}
          <h3>Traffic sources</h3>
          {data.sources.map((r) => (
            <p key={r.source}>
              {r.source || "Direct"}: {r.views}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
export function VersionsPanel() {
  const { save, previewDocument, status, doc } = useEditor();
  const [rows, setRows] = useState<
      { id: string; created: string; kind: string; actor: string }[]
    >([]),
    [cursor, setCursor] = useState<string | null>(null),
    [diff, setDiff] = useState<{ id: string; ids: string[] } | null>(null);
  async function load(more = false) {
    const r = await fetch(
      "/api/manage" +
        (more && cursor ? "?before=" + encodeURIComponent(cursor) : ""),
    );
    if (!r.ok) return;
    const data = (await r.json()) as {
      revisions: typeof rows;
      nextCursor: string | null;
    };
    setRows((old) => (more ? [...old, ...data.revisions] : data.revisions));
    setCursor(data.nextCursor);
  }
  useEffect(() => {
    load();
  }, []);
  async function snapshot(id: string) {
    const r = await fetch(
      "/api/operations?mode=revisions&id=" + encodeURIComponent(id),
    );
    if (!r.ok) throw Error("Unable to load snapshot");
    return upgradeContent(await r.json());
  }
  return (
    <div className="admin-panel">
      <p>
        Preview before restoring. Restoration changes the draft; publishing
        applies it to the website.
      </p>
      {rows.map((r) => (
        <div className="revision" key={r.id}>
          <div>
            <strong>{r.kind}</strong>
            <small>
              {new Date(r.created).toLocaleString()} · {r.actor}
            </small>
            {diff?.id === r.id && (
              <p>
                {diff.ids.length} text differences:{" "}
                {diff.ids.slice(0, 20).join(", ")}
              </p>
            )}
          </div>
          <div className="toolbar">
            <button
              onClick={async () => {
                try {
                  previewDocument(await snapshot(r.id));
                } catch {
                  status("Unable to preview revision");
                }
              }}
            >
              Preview
            </button>
            <button
              onClick={async () => {
                const old = await snapshot(r.id);
                setDiff({
                  id: r.id,
                  ids: Object.keys({ ...doc.texts, ...old.texts }).filter(
                    (id) => doc.texts[id] !== old.texts[id],
                  ),
                });
              }}
            >
              Compare text
            </button>
            <button onClick={() => save("restore", r.id)}>
              Restore to draft
            </button>
          </div>
        </div>
      ))}
      {cursor && (
        <button onClick={() => load(true)}>Load older revisions</button>
      )}
    </div>
  );
}
