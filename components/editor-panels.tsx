"use client";
import { useState, useRef, useEffect } from "react";
import {
  useEditor,
  TextField,
  Field,
  Toggle,
  DateField,
  OrderButtons,
  download,
} from "./editor-context";
import PreviewFrame from "./preview-frame";
import {
  newText,
  section,
  themeSchema,
  responsiveStyle,
  type Content,
  contentSchema,
  upgradeContent,
} from "../lib/content";
import {
  makeSection,
  makeItem,
  duplicateSection,
  move,
  applyPreset,
} from "../lib/editor-model";
export function AssetField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string, mime?: string) => void;
}) {
  const [files, setFiles] = useState<
    { id: string; name: string; mime: string; deleted: number }[]
  >([]);
  useEffect(() => {
    fetch("/api/media")
      .then((r) => r.json())
      .then((v) => Array.isArray(v) && setFiles(v))
      .catch(() => {});
  }, []);
  return (
    <div className="asset-field">
      <Field label={label} value={value} onChange={(v) => onChange(v)} />
      <select
        aria-label={"Choose " + label}
        value={value.startsWith("/api/media/") ? value : ""}
        onChange={(e) => {
          const file = files.find(
            (f) => "/api/media/" + f.id === e.target.value,
          );
          onChange(e.target.value, file?.mime);
        }}
      >
        <option value="">Choose uploaded media</option>
        {files
          .filter((f) => !f.deleted)
          .map((f) => (
            <option key={f.id} value={"/api/media/" + f.id}>
              {f.name}
            </option>
          ))}
      </select>
      {value && (
        <button type="button" onClick={() => onChange("")}>
          Clear
        </button>
      )}
    </div>
  );
}
export function OverviewPanel() {
  const { doc, published, setTab, save } = useEditor();
  const warnings: string[] = [];
  if (Object.values(doc.texts).some((v) => /^text\d+$/.test(v)))
    warnings.push("Numbered placeholders remain.");
  if (!doc.seo.image) warnings.push("Social preview image is not configured.");
  if (!doc.theme.logo) warnings.push("A logo image has not been uploaded.");
  if (doc.courses.some((c) => c.visible && c.price === null))
    warnings.push("Some visible courses have no price.");
  return (
    <>
      <div className="admin-panel">
        <button className="primary" onClick={() => setTab("Pages")}>
          Open visual editor ↗
        </button>
      </div>
      <div className="overview-grid">
        {[
          ["Text & Labels", Object.keys(doc.texts).length + " text entries"],
          ["Pages", doc.pages.length + " pages"],
          ["Courses", doc.courses.length + " courses"],
          ["Enrollments", "View requests"],
        ].map(([name, label]) => (
          <button
            className="overview-card"
            key={name}
            onClick={() => setTab(name)}
          >
            <span>{name} ↗</span>
            <strong>{label}</strong>
          </button>
        ))}
      </div>
      {warnings.length > 0 && (
        <div className="admin-panel">
          <h2>Publication checks</h2>
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
      <button onClick={() => save("discard")}>Discard draft changes</button>
    </>
  );
}
export function TextsPanel() {
  const { doc, change, setSelected, setTab, setPage } = useEditor();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [pageFilter, setPageFilter] = useState(""),
    [bulk, setBulk] = useState(""),
    [error, setError] = useState("");
  const pageText = pageFilter
    ? new Set(
        JSON.stringify(
          doc.sections.filter((s) =>
            doc.pages
              .find((p) => p.id === pageFilter)
              ?.sectionIds.includes(s.id),
          ),
        ).match(/text\d+/g) || [],
      )
    : null;
  const ids = filter
    ? new Set(
        JSON.stringify(doc.sections.find((s) => s.id === filter)).match(
          /text\d+/g,
        ) || [],
      )
    : null;
  return (
    <>
      <label className="field">
        Page
        <select
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
        >
          <option value="">All pages</option>
          {doc.pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.slug}
            </option>
          ))}
        </select>
      </label>
      <div className="two-cols">
        <Field
          label="Search IDs or content"
          value={search}
          onChange={setSearch}
        />
        <label className="field">
          Section
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All sections</option>
            {doc.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.type} · {doc.texts[s.title]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="admin-panel">
        <summary>Bulk edit</summary>
        <p>Paste a JSON object mapping existing text IDs to values.</p>
        <Field
          label="Text values"
          type="textarea"
          value={bulk}
          onChange={setBulk}
        />
        <div className="toolbar">
          <button onClick={() => download("mxd-texts.json", doc.texts)}>
            Export text values
          </button>
          <button
            onClick={() => {
              try {
                const v = JSON.parse(bulk);
                if (
                  !v ||
                  Array.isArray(v) ||
                  typeof v !== "object" ||
                  Object.entries(v).some(
                    ([k, x]) =>
                      !(k in doc.texts) ||
                      typeof x !== "string" ||
                      x.length > 10000,
                  )
                )
                  throw Error();
                change((d) => Object.assign(d.texts, v));
                setError("Applied to draft");
              } catch {
                setError("Use existing text IDs and string values.");
              }
            }}
          >
            Apply to draft
          </button>
        </div>
        <p role="status">{error}</p>
      </details>
      <div className="text-grid">
        {Object.entries(doc.texts)
          .filter(
            ([id, value]) =>
              (!ids || ids.has(id)) &&
              (!pageText || pageText.has(id)) &&
              (id + " " + value).toLowerCase().includes(search.toLowerCase()),
          )
          .map(([id]) => (
            <div key={id}>
              <TextField id={id} label={id} />
              <button
                onClick={() => {
                  setSelected(id);
                  const s = doc.sections.find((s) =>
                    JSON.stringify(s).includes('"' + id + '"'),
                  );
                  const p = doc.pages.find(
                    (p) => s && p.sectionIds.includes(s.id),
                  );
                  if (p) setPage(p.id);
                  setTab("Pages");
                }}
              >
                Locate in preview ↗
              </button>
            </div>
          ))}
      </div>
    </>
  );
}
function StylesInspector() {
  const { doc, change, selected } = useEditor();
  const [breakpoint, setBreakpoint] = useState<"base" | "tablet" | "mobile">(
    "base",
  );
  const style = doc.styles[selected]?.[breakpoint] || {};
  function edit(key: string, value: unknown) {
    change((d) => {
      d.styles[selected] ||= { base: {}, tablet: {}, mobile: {} };
      (d.styles[selected][breakpoint] as Record<string, unknown>)[key] = value;
    });
  }
  return (
    <details open className="style-inspector">
      <summary>Appearance · {selected}</summary>
      <Field
        label="Viewport"
        value={breakpoint}
        options={["base", "tablet", "mobile"]}
        onChange={(v) => setBreakpoint(v as typeof breakpoint)}
      />
      <button
        onClick={() =>
          change((d) => {
            if (d.styles[selected]) d.styles[selected][breakpoint] = {};
          })
        }
      >
        Reset overrides
      </button>
      <div className="two-cols">
        {[
          "color",
          "background",
          "borderColor",
          "shadowColor",
          "hoverColor",
          "hoverBackground",
          "gradientFrom",
          "gradientTo",
        ].map((k) => (
          <Field
            key={k}
            label={k}
            type="color"
            value={(style as Record<string, string>)[k] || "#ffffff"}
            onChange={(v) => edit(k, v)}
          />
        ))}
        {(
          [
            "fontSize",
            "fontWeight",
            "lineHeight",
            "letterSpacing",
            "padding",
            "margin",
            "gap",
            "width",
            "radius",
            "borderWidth",
            "shadow",
            "opacity",
            "columns",
            "duration",
            "delay",
            "intensity",
            "gradientAngle",
          ] as const
        ).map((k) => (
          <Field
            key={k}
            label={k}
            type="number"
            step={["lineHeight", "opacity"].includes(k) ? 0.1 : 1}
            value={style[k] ?? ""}
            onChange={(v) => edit(k, v === "" ? undefined : Number(v))}
          />
        ))}
      </div>
      <Field
        label="Font"
        value={style.font || "Inter"}
        options={["Inter", "Georgia", "system-ui"]}
        onChange={(v) => edit("font", v)}
      />
      <Field
        label="Alignment"
        value={style.textAlign || "left"}
        options={["left", "center", "right"]}
        onChange={(v) => edit("textAlign", v)}
      />
      <Field
        label="Animation"
        value={style.animation || "none"}
        options={["none", "fade", "slide"]}
        onChange={(v) => edit("animation", v)}
      />
      <Field
        label="Transition"
        value={style.easing || "ease"}
        options={["ease", "linear", "ease-in", "ease-out", "ease-in-out"]}
        onChange={(v) => edit("easing", v)}
      />
      <Toggle
        label="Hide at this viewport"
        value={style.hidden || false}
        onChange={(v) => edit("hidden", v)}
      />
    </details>
  );
}
function Properties() {
  const { doc, change, selected } = useEditor();
  const s = doc.sections.find(
    (s) =>
      s.id === selected ||
      s.id + "-button" === selected ||
      s.id + "-media" === selected ||
      s.items.some((i) =>
        [
          i.id,
          i.id + "-media",
          i.id + "-button",
          i.title,
          i.body,
          i.label,
          i.alt,
        ].includes(selected),
      ) ||
      [s.title, s.body, s.label].includes(selected),
  );
  const item = s?.items.find((i) =>
    [
      i.id,
      i.id + "-media",
      i.id + "-button",
      i.title,
      i.body,
      i.label,
      i.alt,
    ].includes(selected),
  );
  function update(fn: (s: Content["sections"][number]) => void) {
    if (s) change((d) => fn(d.sections.find((x) => x.id === s.id)!));
  }
  function itemUpdate(fn: (i: NonNullable<typeof item>) => void) {
    if (s && item) update((s) => fn(s.items.find((i) => i.id === item.id)!));
  }
  return (
    <div className="properties">
      <h2>Properties</h2>
      {selected in doc.texts && <TextField id={selected} label="Text" />}
      {item ? (
        <>
          <TextField id={item.title} label="Title" />
          <TextField id={item.body} label="Body" />
          <TextField id={item.label} label="Button label" />
          <Field
            label="Button link"
            value={item.url}
            onChange={(v) =>
              itemUpdate((i) => {
                i.url = v;
              })
            }
          />
          <Toggle
            label="Visible"
            value={item.visible}
            onChange={(v) =>
              itemUpdate((i) => {
                i.visible = v;
              })
            }
          />
          <AssetField
            label="Media"
            value={item.media}
            onChange={(v, mime) =>
              itemUpdate((i) => {
                i.media = v;
                if (mime)
                  i.mediaKind = mime.startsWith("video")
                    ? "video"
                    : mime.startsWith("audio")
                      ? "audio"
                      : "image";
              })
            }
          />
          <Field
            label="Media type"
            value={item.mediaKind}
            options={["image", "video", "audio"]}
            onChange={(v) =>
              itemUpdate((i) => {
                i.mediaKind = v as typeof i.mediaKind;
              })
            }
          />
          <TextField id={item.alt} label="Media description" />
          <Field
            label="Icon"
            value={item.icon}
            options={["none", "spark", "diamond", "wave"]}
            onChange={(v) =>
              itemUpdate((i) => {
                i.icon = v as typeof i.icon;
              })
            }
          />
          <Field
            label="Image fit"
            value={item.crop}
            options={["cover", "contain"]}
            onChange={(v) =>
              itemUpdate((i) => {
                i.crop = v as typeof i.crop;
              })
            }
          />
          {(["aspect", "focalX", "focalY"] as const).map((k) => (
            <Field
              key={k}
              label={k}
              type="number"
              value={item[k]}
              step={0.1}
              onChange={(v) =>
                itemUpdate((i) => {
                  i[k] = Number(v);
                })
              }
            />
          ))}
          {s?.type === "pricing" && (
            <>
              <Field
                label="Price"
                type="number"
                value={item.price ?? ""}
                onChange={(v) =>
                  itemUpdate((i) => {
                    i.price = v === "" ? null : Number(v);
                  })
                }
              />
              <Field
                label="Currency"
                value={item.currency}
                options={["PHP", "USD", "EUR", "GBP", "SGD", "AUD", "CAD"]}
                onChange={(v) =>
                  itemUpdate((i) => {
                    i.currency = v as typeof i.currency;
                  })
                }
              />
              <Field
                label="Promotional price"
                type="number"
                value={item.salePrice ?? ""}
                onChange={(v) =>
                  itemUpdate((i) => {
                    i.salePrice = v === "" ? null : Number(v);
                  })
                }
              />
              <DateField
                label="Promotion start"
                value={item.promoStart}
                onChange={(v) =>
                  itemUpdate((i) => {
                    i.promoStart = v;
                  })
                }
              />
              <DateField
                label="Promotion end"
                value={item.promoEnd}
                onChange={(v) =>
                  itemUpdate((i) => {
                    i.promoEnd = v;
                  })
                }
              />
            </>
          )}
        </>
      ) : s ? (
        <>
          <TextField id={s.title} label="Heading" />
          <TextField id={s.body} label="Description" />
          <TextField id={s.label} label="Label / button" />
          {s.secondaryLabel ? (
            <>
              <TextField id={s.secondaryLabel} label="Secondary button" />
              <Field
                label="Secondary link"
                value={s.secondaryUrl}
                onChange={(v) =>
                  update((s) => {
                    s.secondaryUrl = v;
                  })
                }
              />
              <button
                onClick={() =>
                  update((s) => {
                    s.secondaryLabel = undefined;
                  })
                }
              >
                Remove secondary button
              </button>
            </>
          ) : (
            <button
              onClick={() =>
                change((d) => {
                  d.sections.find((x) => x.id === s.id)!.secondaryLabel =
                    newText(d);
                })
              }
            >
              Add secondary button
            </button>
          )}
          <Field
            label="Button link"
            value={s.url}
            onChange={(v) =>
              update((s) => {
                s.url = v;
              })
            }
          />
          <Toggle
            label="Visible"
            value={s.visible}
            onChange={(v) =>
              update((s) => {
                s.visible = v;
              })
            }
          />
          <Field
            label="Layout"
            value={s.layout}
            options={["split", "center", "grid", "list", "carousel"]}
            onChange={(v) =>
              update((s) => {
                s.layout = v as typeof s.layout;
              })
            }
          />
          <Field
            label="Padding"
            type="number"
            min={16}
            max={200}
            value={s.padding}
            onChange={(v) =>
              update((s) => {
                s.padding = Number(v);
              })
            }
          />
          <Field
            label="Columns"
            type="number"
            min={1}
            max={4}
            value={s.columns}
            onChange={(v) =>
              update((s) => {
                s.columns = Number(v);
              })
            }
          />
          <AssetField
            label="Section media"
            value={s.media}
            onChange={(v, mime) =>
              update((s) => {
                s.media = v;
                if (mime)
                  s.mediaKind = mime.startsWith("video")
                    ? "video"
                    : mime.startsWith("audio")
                      ? "audio"
                      : "image";
              })
            }
          />
          <Field
            label="Section media type"
            value={s.mediaKind}
            options={["image", "video", "audio"]}
            onChange={(v) =>
              update((s) => {
                s.mediaKind = v as typeof s.mediaKind;
              })
            }
          />
          <AssetField
            label="Background media"
            value={s.backgroundMedia}
            onChange={(v) =>
              update((s) => {
                s.backgroundMedia = v;
              })
            }
          />
          <Field
            label="Background media type"
            value={s.backgroundKind}
            options={["image", "video"]}
            onChange={(v) =>
              update((s) => {
                s.backgroundKind = v as typeof s.backgroundKind;
              })
            }
          />
          {s.mediaAlt ? (
            <TextField label="Media description" id={s.mediaAlt} />
          ) : (
            <button
              onClick={() =>
                change((d) => {
                  d.sections.find((x) => x.id === s.id)!.mediaAlt = newText(d);
                })
              }
            >
              Add image description
            </button>
          )}
          <button
            onClick={() =>
              change((d) => {
                d.sections.find((x) => x.id === s.id)!.items.push(makeItem(d));
              })
            }
          >
            Add entry +
          </button>
        </>
      ) : selected === "brand" ? (
        <>
          <TextField id={doc.brand} label="Site name" />
          <AssetField
            label="Logo"
            value={doc.theme.logo}
            onChange={(v) =>
              change((d) => {
                d.theme.logo = v;
              })
            }
          />
        </>
      ) : selected === "footer" ? (
        <TextField id={doc.footer} label="Footer text" />
      ) : null}
      <StylesInspector />
    </div>
  );
}
export function PagesPanel() {
  const { doc, change, page, setPage, selected, setSelected } = useEditor();
  const [width, setWidth] = useState("100%"),
    [interact, setInteract] = useState(false);
  const dragging = useRef<number | null>(null),
    itemDrag = useRef<{ section: string; index: number } | null>(null);
  const current = doc.pages.find((p) => p.id === page) || doc.pages[0];
  function order(from: number, to: number) {
    change((d) =>
      move(d.pages.find((p) => p.id === current.id)!.sectionIds, from, to),
    );
  }
  return (
    <>
      <div className="toolbar">
        <select
          aria-label="Page"
          value={current.id}
          onChange={(e) => setPage(e.target.value)}
        >
          {doc.pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.slug}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            change((d) => {
              const id = crypto.randomUUID();
              d.pages.push({
                id,
                slug: "/page-" + (d.pages.length + 1),
                title: newText(d),
                description: newText(d),
                visible: true,
                sectionIds: [],
                noindex: false,
              });
              setPage(id);
            })
          }
        >
          Add page
        </button>
        {["100%", "768px", "390px"].map((w) => (
          <button key={w} onClick={() => setWidth(w)}>
            {w === "100%" ? "Desktop" : w === "768px" ? "Tablet" : "Mobile"}
          </button>
        ))}
        <Toggle
          label="Interact with preview"
          value={interact}
          onChange={setInteract}
        />
      </div>
      <details className="admin-panel">
        <summary>Page settings</summary>
        <TextField id={current.title} label="Page title" />
        <TextField id={current.description} label="Meta description" />
        <Field
          label="Path"
          value={current.slug}
          onChange={(v) =>
            change((d) => {
              d.pages.find((p) => p.id === current.id)!.slug = v;
            })
          }
        />
        <Toggle
          label="Visible"
          value={current.visible}
          onChange={(v) =>
            change((d) => {
              d.pages.find((p) => p.id === current.id)!.visible = v;
            })
          }
        />
        <Toggle
          label="Exclude from search indexing"
          value={current.noindex}
          onChange={(v) =>
            change((d) => {
              d.pages.find((p) => p.id === current.id)!.noindex = v;
            })
          }
        />
        {current.slug !== "/" && (
          <button
            onClick={() =>
              change((d) => {
                d.pages = d.pages.filter((p) => p.id !== current.id);
                setPage(d.pages[0].id);
              })
            }
          >
            Remove page
          </button>
        )}
      </details>
      <div className="visual-editor">
        <aside className="structure">
          <h2>Structure</h2>
          {["brand", "navigation", "footer"].map((id) => (
            <button key={id} onClick={() => setSelected(id)}>
              {id}
            </button>
          ))}
          {current.sectionIds.map((id, index) => {
            const s = doc.sections.find((s) => s.id === id);
            if (!s) return null;
            return (
              <div
                className="structure-section"
                key={id}
                draggable
                onDragStart={(e) => {
                  dragging.current = index;
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging.current !== null) order(dragging.current, index);
                  dragging.current = null;
                }}
              >
                <button
                  className={selected === id ? "selected" : ""}
                  onClick={() => setSelected(id)}
                >
                  {s.type} · {doc.texts[s.title]}
                </button>
                <OrderButtons
                  index={index}
                  length={current.sectionIds.length}
                  up={() => order(index, index - 1)}
                  down={() => order(index, index + 1)}
                  remove={() =>
                    change((d) => {
                      d.pages.find((p) => p.id === current.id)!.sectionIds =
                        d.pages
                          .find((p) => p.id === current.id)!
                          .sectionIds.filter((x) => x !== id);
                    })
                  }
                />
                <button
                  onClick={() =>
                    change((d) => {
                      duplicateSection(d, id);
                    })
                  }
                >
                  Duplicate
                </button>
                <details>
                  <summary>Components</summary>
                  {[
                    s.title,
                    s.body,
                    s.label,
                    s.id + "-button",
                    s.id + "-media",
                  ].map((k) => (
                    <button key={k} onClick={() => setSelected(k)}>
                      {k}
                    </button>
                  ))}
                  {s.items.map((i, n) => (
                    <div
                      key={i.id}
                      className="structure-item"
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        itemDrag.current = { section: id, index: n };
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (itemDrag.current?.section === id)
                          change((d) =>
                            move(
                              d.sections.find((s) => s.id === id)!.items,
                              itemDrag.current!.index,
                              n,
                            ),
                          );
                        itemDrag.current = null;
                      }}
                    >
                      <button onClick={() => setSelected(i.id)}>
                        {doc.texts[i.title]}
                      </button>
                      <OrderButtons
                        index={n}
                        length={s.items.length}
                        up={() =>
                          change((d) =>
                            move(
                              d.sections.find((s) => s.id === id)!.items,
                              n,
                              n - 1,
                            ),
                          )
                        }
                        down={() =>
                          change((d) =>
                            move(
                              d.sections.find((s) => s.id === id)!.items,
                              n,
                              n + 1,
                            ),
                          )
                        }
                        remove={() =>
                          change((d) => {
                            d.sections
                              .find((s) => s.id === id)!
                              .items.splice(n, 1);
                          })
                        }
                      />
                      {[
                        i.title,
                        i.body,
                        i.label,
                        i.id + "-button",
                        i.id + "-media",
                      ].map((k) => (
                        <button key={k} onClick={() => setSelected(k)}>
                          {k}
                        </button>
                      ))}
                    </div>
                  ))}
                </details>
              </div>
            );
          })}
          <label className="field">
            Add section
            <select
              value=""
              onChange={(e) => {
                const type = e.target
                  .value as Content["sections"][number]["type"];
                change((d) => {
                  const s = makeSection(d, type);
                  d.sections.push(s);
                  d.pages
                    .find((p) => p.id === current.id)!
                    .sectionIds.push(s.id);
                  setSelected(s.id);
                });
              }}
            >
              <option value="">Choose template</option>
              {section.shape.type.options.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Reuse section
            <select
              value=""
              onChange={(e) =>
                change((d) => {
                  d.pages
                    .find((p) => p.id === current.id)!
                    .sectionIds.push(e.target.value);
                })
              }
            >
              <option value="">Choose existing block</option>
              {doc.sections
                .filter((s) => !current.sectionIds.includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.type} · {doc.texts[s.title]}
                  </option>
                ))}
            </select>
          </label>
        </aside>
        <div className="canvas">
          <PreviewFrame
            document={doc}
            width={width}
            pageId={current.id}
            select={interact ? undefined : setSelected}
          />
        </div>
        <Properties />
      </div>
    </>
  );
}
export function DesignPanel() {
  const { doc, change, previewDocument } = useEditor();
  const [name, setName] = useState(""),
    [message, setMessage] = useState("");
  return (
    <>
      <div className="admin-panel">
        <h2>Global theme</h2>
        <div className="two-cols">
          {(
            [
              "background",
              "surface",
              "accent",
              "text",
              "muted",
              "border",
              "buttonHover",
            ] as const
          ).map((k) => (
            <Field
              key={k}
              label={k}
              type="color"
              value={doc.theme[k]}
              onChange={(v) =>
                change((d) => {
                  d.theme[k] = v;
                })
              }
            />
          ))}
          {(["radius", "width", "scale", "glow", "duration"] as const).map(
            (k) => (
              <Field
                key={k}
                label={k}
                type="number"
                step={["scale", "glow"].includes(k) ? 0.05 : 1}
                value={doc.theme[k]}
                onChange={(v) =>
                  change((d) => {
                    d.theme[k] = Number(v);
                  })
                }
              />
            ),
          )}
        </div>
        <Field
          label="Font"
          value={doc.theme.font}
          options={["Inter", "Georgia", "system-ui"]}
          onChange={(v) =>
            change((d) => {
              d.theme.font = v as typeof d.theme.font;
            })
          }
        />
        <AssetField
          label="Logo"
          value={doc.theme.logo}
          onChange={(v) =>
            change((d) => {
              d.theme.logo = v;
            })
          }
        />
        <Toggle
          label="Sticky navigation"
          value={doc.theme.navSticky}
          onChange={(v) =>
            change((d) => {
              d.theme.navSticky = v;
            })
          }
        />
        <Toggle
          label="Animations"
          value={doc.theme.motion}
          onChange={(v) =>
            change((d) => {
              d.theme.motion = v;
            })
          }
        />
        <p>
          Per-component and responsive overrides are available in Pages →
          Properties.
        </p>
      </div>
      <div className="admin-panel">
        <h2>Design presets</h2>
        <Field label="Name" value={name} onChange={setName} />
        <button
          disabled={!name.trim()}
          onClick={() => {
            change((d) => {
              d.presets.push({
                id: crypto.randomUUID(),
                name: name.trim(),
                theme: structuredClone(d.theme),
                styles: structuredClone(d.styles),
                layouts: d.sections.map((s) => ({
                  id: s.id,
                  layout: s.layout,
                  padding: s.padding,
                  columns: s.columns,
                })),
              });
            });
            setName("");
          }}
        >
          Save current design
        </button>
        {doc.presets.map((p) => (
          <div className="preset-row" key={p.id}>
            <input
              aria-label="Preset name"
              value={p.name}
              onChange={(e) =>
                change((d) => {
                  d.presets.find((x) => x.id === p.id)!.name = e.target.value;
                })
              }
            />
            <button
              onClick={() => {
                const d = structuredClone(doc);
                applyPreset(d, p.id);
                previewDocument(d);
              }}
            >
              Preview
            </button>
            <button onClick={() => change((d) => applyPreset(d, p.id))}>
              Apply
            </button>
            <button
              onClick={() =>
                change((d) => {
                  d.presets.push({
                    ...structuredClone(p),
                    id: crypto.randomUUID(),
                    name: p.name + " copy",
                  });
                })
              }
            >
              Duplicate
            </button>
            <button onClick={() => download("mxd-preset.json", p)}>
              Export
            </button>
            <button
              onClick={() =>
                change((d) => {
                  d.presets = d.presets.filter((x) => x.id !== p.id);
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <label className="field">
          Import preset
          <input
            type="file"
            accept="application/json"
            onChange={async (e) => {
              try {
                const p = JSON.parse(await e.target.files![0].text());
                const candidate = structuredClone(doc);
                candidate.presets.push({ ...p, id: crypto.randomUUID() });
                const valid = contentSchema.parse(candidate);
                change((d) => {
                  d.presets = valid.presets;
                });
                setMessage("Imported to draft");
              } catch {
                setMessage("Invalid preset");
              }
            }}
          />
        </label>
        <p role="status">{message}</p>
      </div>
    </>
  );
}
export function SettingsPanel() {
  const { doc, change, save, status } = useEditor();
  const [sectionTab, setSectionTab] = useState("General");
  return (
    <>
      <div className="toolbar">
        {[
          "General",
          "Navigation",
          "SEO",
          "Announcements",
          "Maintenance",
          "Backups",
          "Security",
        ].map((name) => (
          <button key={name} onClick={() => setSectionTab(name)}>
            {name}
          </button>
        ))}
      </div>
      <div className="admin-panel">
        {sectionTab === "General" ? (
          <>
            <TextField id={doc.brand} label="Site name" />
            <TextField id={doc.footer} label="Footer" />
            {Object.entries(doc.ui).map(([key, id]) => (
              <TextField key={key} id={id} label={"Public label: " + key} />
            ))}
            <button onClick={() => download("mxd-content.json", doc)}>
              Export all content
            </button>
            <label className="field">
              Import content backup
              <input
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  try {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const p = JSON.parse(await file.text());
                    const d = upgradeContent(
                      p.site_state?.[0]?.draft
                        ? JSON.parse(p.site_state[0].draft)
                        : p,
                    );
                    change((next) => Object.assign(next, d));
                    status("Imported to draft");
                  } catch {
                    status("Invalid backup");
                  }
                }}
              />
            </label>
            <button onClick={() => save("discard")}>
              Discard current draft
            </button>
          </>
        ) : sectionTab === "Navigation" ? (
          <>
            {doc.nav.map((n, index) => (
              <div className="entry" key={n.id}>
                <TextField id={n.label} label="Link label" />
                <Field
                  label="Destination"
                  value={n.url}
                  onChange={(v) =>
                    change((d) => {
                      d.nav[index].url = v;
                    })
                  }
                />
                <OrderButtons
                  index={index}
                  length={doc.nav.length}
                  up={() => change((d) => move(d.nav, index, index - 1))}
                  down={() => change((d) => move(d.nav, index, index + 1))}
                  remove={() =>
                    change((d) => {
                      d.nav.splice(index, 1);
                    })
                  }
                />
              </div>
            ))}
            <button
              onClick={() =>
                change((d) => {
                  d.nav.push({
                    id: crypto.randomUUID(),
                    label: newText(d),
                    url: "/",
                  });
                })
              }
            >
              Add link
            </button>
          </>
        ) : sectionTab === "SEO" ? (
          <>
            <TextField id={doc.seo.title} label="Site title" />
            <TextField id={doc.seo.description} label="Description" />
            <AssetField
              label="Social preview image"
              value={doc.seo.image}
              onChange={(v) =>
                change((d) => {
                  d.seo.image = v;
                })
              }
            />
            <AssetField
              label="Favicon"
              value={doc.seo.favicon}
              onChange={(v) =>
                change((d) => {
                  d.seo.favicon = v;
                })
              }
            />
            <Field
              label="Canonical URL override"
              value={doc.seo.canonical}
              onChange={(v) =>
                change((d) => {
                  d.seo.canonical = v;
                })
              }
            />
            <Toggle
              label="Exclude website from search indexing"
              value={doc.seo.noindex}
              onChange={(v) =>
                change((d) => {
                  d.seo.noindex = v;
                })
              }
            />
            <Toggle
              label="Generate sitemap"
              value={doc.seo.sitemap}
              onChange={(v) =>
                change((d) => {
                  d.seo.sitemap = v;
                })
              }
            />
            <h3>Redirects</h3>
            {doc.seo.redirects.map((r, i) => (
              <div className="entry" key={i}>
                <Field
                  label="From path"
                  value={r.from}
                  onChange={(v) =>
                    change((d) => {
                      d.seo.redirects[i].from = v;
                    })
                  }
                />
                <Field
                  label="To URL or path"
                  value={r.to}
                  onChange={(v) =>
                    change((d) => {
                      d.seo.redirects[i].to = v;
                    })
                  }
                />
                <button
                  onClick={() =>
                    change((d) => {
                      d.seo.redirects.splice(i, 1);
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                change((d) => {
                  d.seo.redirects.push({ from: "/old-page", to: "/" });
                })
              }
            >
              Add redirect
            </button>
          </>
        ) : sectionTab === "Announcements" ? (
          <>
            {doc.announcements.map((a, i) => (
              <div className="entry" key={a.id}>
                <TextField id={a.title} label="Title" />
                <TextField id={a.body} label="Message" />
                <TextField id={a.label} label="Button" />
                <Field
                  label="Type"
                  value={a.type}
                  options={["banner", "popup"]}
                  onChange={(v) =>
                    change((d) => {
                      d.announcements[i].type = v as typeof a.type;
                    })
                  }
                />
                <Field
                  label="Button URL"
                  value={a.url}
                  onChange={(v) =>
                    change((d) => {
                      d.announcements[i].url = v;
                    })
                  }
                />
                <Field
                  label="Background"
                  type="color"
                  value={a.background}
                  onChange={(v) =>
                    change((d) => {
                      d.announcements[i].background = v;
                    })
                  }
                />
                <Field
                  label="Placement"
                  value={a.placement}
                  options={["top", "bottom"]}
                  onChange={(v) =>
                    change((d) => {
                      d.announcements[i].placement = v as typeof a.placement;
                    })
                  }
                />
                <DateField
                  label="Start"
                  value={a.starts}
                  onChange={(v) =>
                    change((d) => {
                      d.announcements[i].starts = v;
                    })
                  }
                />
                <DateField
                  label="End"
                  value={a.ends}
                  onChange={(v) =>
                    change((d) => {
                      d.announcements[i].ends = v;
                    })
                  }
                />
                <Toggle
                  label="Visible"
                  value={a.visible}
                  onChange={(v) =>
                    change((d) => {
                      d.announcements[i].visible = v;
                    })
                  }
                />
                <Toggle
                  label="Show on mobile"
                  value={a.mobile}
                  onChange={(v) =>
                    change((d) => {
                      d.announcements[i].mobile = v;
                    })
                  }
                />
                <label className="field">
                  Target pages (empty means all)
                  <select
                    multiple
                    value={a.pages}
                    onChange={(e) =>
                      change((d) => {
                        d.announcements[i].pages = Array.from(
                          e.target.selectedOptions,
                        ).map((o) => o.value);
                      })
                    }
                  >
                    {doc.pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.slug}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() =>
                    change((d) => {
                      d.announcements.splice(i, 1);
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                change((d) => {
                  d.announcements.push({
                    id: crypto.randomUUID(),
                    type: "banner",
                    title: newText(d),
                    body: newText(d),
                    label: newText(d),
                    url: "/",
                    visible: false,
                    starts: "",
                    ends: "",
                    pages: [],
                    mobile: true,
                    background: "#7C3AED",
                    placement: "top",
                  });
                })
              }
            >
              Add announcement
            </button>
          </>
        ) : sectionTab === "Maintenance" ? (
          <>
            <Toggle
              label="Enable maintenance"
              value={doc.maintenance.enabled}
              onChange={(v) =>
                change((d) => {
                  d.maintenance.enabled = v;
                })
              }
            />
            <TextField id={doc.maintenance.title} label="Title" />
            <TextField id={doc.maintenance.body} label="Message" />
            <AssetField
              label="Image"
              value={doc.maintenance.media}
              onChange={(v) =>
                change((d) => {
                  d.maintenance.media = v;
                })
              }
            />
            <Field
              label="Background"
              type="color"
              value={doc.maintenance.background}
              onChange={(v) =>
                change((d) => {
                  d.maintenance.background = v;
                })
              }
            />
            <DateField
              label="Reopening"
              value={doc.maintenance.reopen}
              onChange={(v) =>
                change((d) => {
                  d.maintenance.reopen = v;
                })
              }
            />
          </>
        ) : sectionTab === "Backups" ? (
          <Backups />
        ) : (
          <>
            <h2>Sessions</h2>
            <p>
              Admin sessions expire after 24 hours. This action signs out every
              active admin session.
            </p>
            <button
              onClick={async () => {
                const r = await fetch("/api/operations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "revoke-sessions" }),
                });
                if (r.ok) window.location.href = "/login";
                else status("Unable to revoke sessions");
              }}
            >
              Revoke all sessions
            </button>
            <Audit />
          </>
        )}
      </div>
    </>
  );
}
function Backups() {
  const [files, setFiles] = useState<
      { key: string; size: number; uploaded: string }[]
    >([]),
    [message, setMessage] = useState(""),
    [cursor, setCursor] = useState<string | null>(null);
  async function refresh(more = false) {
    const r = await fetch(
      "/api/backup" +
        (more && cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
    );
    const d = (await r.json()) as {
      files: typeof files;
      cursor: string | null;
    };
    if (r.ok) {
      setFiles((old) => (more ? [...old, ...d.files] : d.files));
      setCursor(d.cursor);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  return (
    <>
      <h2>Backup and recovery</h2>
      <p>
        Daily snapshots include content, media metadata, enrollments and audit
        history. Media objects and replacement versions are retained in R2.
        Import a snapshot in General to recover its content into the draft.
      </p>
      <button
        onClick={async () => {
          setMessage("Creating backup…");
          const r = await fetch("/api/backup", { method: "POST" });
          setMessage(r.ok ? "Backup created" : "Backup failed");
          if (r.ok) refresh();
        }}
      >
        Create backup now
      </button>
      <p role="status">{message}</p>
      {cursor && (
        <button onClick={() => refresh(true)}>Load more backups</button>
      )}
      {files.map((f) => (
        <div key={f.key} className="revision">
          <span>
            {new Date(f.uploaded).toLocaleString()} · {Math.ceil(f.size / 1024)}{" "}
            KB
          </span>
          <a href={"/api/backup?key=" + encodeURIComponent(f.key)}>Download</a>
        </div>
      ))}
    </>
  );
}
function Audit() {
  const [rows, setRows] = useState<
    {
      id: string;
      action: string;
      target: string;
      actor: string;
      created: string;
    }[]
  >([]);
  useEffect(() => {
    fetch("/api/operations?mode=audit")
      .then((r) => r.json())
      .then((v) => Array.isArray(v) && setRows(v));
  }, []);
  return (
    <>
      <h2>Audit history</h2>
      {rows.map((r) => (
        <div key={r.id} className="revision">
          <span>
            {r.action} · {r.target}
            <small>
              {r.actor} · {new Date(r.created).toLocaleString()}
            </small>
          </span>
        </div>
      ))}
    </>
  );
}
