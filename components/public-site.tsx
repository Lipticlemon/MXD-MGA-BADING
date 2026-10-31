"use client";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { type Content, courseAmount, scheduled } from "../lib/content";
import { designCss } from "../lib/styles";
import { RichText } from "./rich-text";
import { Asset } from "./asset";
function Modal({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => {
      node?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="site-dialog"
      aria-label={label}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
export default function PublicSite({
  document: d,
  select,
  pageId = "home",
  preview = false,
}: {
  document: Content;
  select?: (id: string) => void;
  pageId?: string;
  preview?: boolean;
}) {
  const [menu, setMenu] = useState(false),
    [now, setNow] = useState(Date.now()),
    [dismissed, setDismissed] = useState<string[]>([]),
    [enroll, setEnroll] = useState<string | null>(null),
    [formStatus, setFormStatus] = useState(""),
    [submitting, setSubmitting] = useState(false);
  const th = d.theme,
    t = (id: string | undefined) => (id ? (d.texts[id] ?? "") : ""),
    u = (key: string) => t(d.ui[key]);
  const page = d.pages.find((p) => p.id === pageId) || d.pages[0];
  const event = (kind: string, target: string) => {
    if (
      preview ||
      select ||
      !d.analytics.enabled ||
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    )
      return;
    try {
      let visitor = sessionStorage.getItem("mxd-visitor");
      if (!visitor) {
        visitor = crypto.randomUUID();
        sessionStorage.setItem("mxd-visitor", visitor);
      }
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          target,
          page: page?.slug || "/",
          visitor,
          source: document.referrer ? new URL(document.referrer).hostname : "",
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  };
  useEffect(() => {
    if (!preview && !select) {
      try {
        setDismissed(
          JSON.parse(sessionStorage.getItem("mxd-dismissed") || "[]"),
        );
      } catch {}
      event("view", "");
    }
    if (
      !d.maintenance.reopen &&
      !d.courses.some((c) => c.promoStart || c.promoEnd) &&
      !d.announcements.some((a) => a.starts || a.ends) &&
      !d.sections.some((s) => s.items.some((i) => i.promoStart || i.promoEnd))
    )
      return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [pageId]);
  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    if (!preview)
      try {
        sessionStorage.setItem("mxd-dismissed", JSON.stringify(next));
      } catch {}
  };
  const style = {
    "--bg": th.background,
    "--surface": th.surface,
    "--accent": th.accent,
    "--hover": th.buttonHover,
    "--ink": th.text,
    "--muted": th.muted,
    "--line": th.border,
    "--radius": `${th.radius}px`,
    "--width": `${th.width}px`,
    "--glow": th.glow,
    "--duration": `${th.duration}ms`,
    fontFamily: th.font === "Inter" ? "Inter,ui-sans-serif,system-ui" : th.font,
    fontSize: `${th.scale}rem`,
  } as CSSProperties;
  const text = (id: string, tag = "span") => {
    const Tag = tag as "span";
    return (
      <Tag data-edit={id}>
        <RichText value={t(id)} />
      </Tag>
    );
  };
  const announcements = d.announcements.filter(
    (a) =>
      a.visible &&
      scheduled(a.starts, a.ends, now) &&
      (!a.pages.length || a.pages.includes(pageId)) &&
      !dismissed.includes(a.id),
  );
  const banner = (position: string) =>
    announcements
      .filter((a) => a.type === "banner" && a.placement === position)
      .map((a) => (
        <aside
          key={a.id}
          data-edit={a.id}
          className={`announcement ${a.mobile ? "" : "desktop-only"}`}
          style={{ background: a.background }}
        >
          {text(a.title, "strong")}
          {text(a.body)}
          <a href={a.url || "#"}>{text(a.label)}</a>
          <button aria-label={u("close")} onClick={() => dismiss(a.id)}>
            ×
          </button>
        </aside>
      ));
  const popup = announcements.find((a) => a.type === "popup");
  const activeCourse = d.courses.find((c) => c.id === enroll);
  const isMaintenance =
    d.maintenance.enabled &&
    (!d.maintenance.reopen || Date.parse(d.maintenance.reopen) > now);
  function startEnrollment(c: Content["courses"][number]) {
    event("enroll", c.id);
    if (c.mode === "external" && c.url) {
      window.location.href = c.url;
      return;
    }
    setFormStatus("");
    setEnroll(c.id);
  }
  function renderCourses() {
    return (
      <div className="items course-grid">
        {d.courses
          .filter((c) => c.visible)
          .map((c) => (
            <article
              key={c.id}
              className={"item course-card " + (c.featured ? "featured" : "")}
              data-edit={c.id}
            >
              {c.media && (
                <Asset
                  data-edit={c.id + "-media"}
                  src={c.media}
                  alt={t(c.alt)}
                />
              )}
              <div className="eyebrow">{text(c.category)}</div>
              {text(c.title, "h3")}
              {text(c.body, "p")}
              {courseAmount(c, now) !== null && (
                <div className="price">
                  {c.salePrice !== null &&
                    scheduled(c.promoStart, c.promoEnd, now) &&
                    c.price !== null && (
                      <del>
                        {new Intl.NumberFormat("en", {
                          style: "currency",
                          currency: c.currency,
                        }).format(c.price)}
                      </del>
                    )}
                  {new Intl.NumberFormat("en", {
                    style: "currency",
                    currency: c.currency,
                  }).format(courseAmount(c, now)! / 100)}
                </div>
              )}
              {c.promoEnd && Date.parse(c.promoEnd) > now && (
                <time dateTime={c.promoEnd} className="countdown">
                  {Math.floor((Date.parse(c.promoEnd) - now) / 86400000)} :{" "}
                  {new Date(Math.max(0, Date.parse(c.promoEnd) - now))
                    .toISOString()
                    .slice(11, 19)}
                </time>
              )}
              <button
                data-edit={c.id + "-button"}
                className="button"
                disabled={!d.commerce.enabled}
                onClick={() => startEnrollment(c)}
              >
                {t(c.label)} ↗
              </button>
              {c.modules
                .filter((m) => m.visible)
                .map((m) => (
                  <details key={m.id}>
                    <summary>
                      {t(m.title)}
                      {m.bonus && <span>{u("bonus")}</span>}
                    </summary>
                    {m.lessons
                      .filter((l) => l.visible)
                      .map((l) => (
                        <div key={l.id} className="lesson">
                          {text(l.title, "h4")}
                          {text(l.body, "p")}
                          {l.url && <a href={l.url}>{u("course")} ↗</a>}
                        </div>
                      ))}
                  </details>
                ))}
            </article>
          ))}
      </div>
    );
  }
  return (
    <div
      className={`site ${th.motion ? "motion" : ""}`}
      style={style}
      onClickCapture={(e) => {
        if (select) {
          const id = (e.target as HTMLElement)
            .closest("[data-edit]")
            ?.getAttribute("data-edit");
          if (id) {
            e.preventDefault();
            e.stopPropagation();
            select(id);
          }
        }
      }}
    >
      <style>{designCss(d)}</style>
      {banner("top")}
      <a className="skip" href="#content">
        {u("skip")}
      </a>
      {isMaintenance ? (
        <main
          className="maintenance"
          style={{ background: d.maintenance.background }}
        >
          {d.maintenance.media && (
            <Asset src={d.maintenance.media} alt={t(d.maintenance.title)} />
          )}
          <h1>{t(d.maintenance.title)}</h1>
          <p>{t(d.maintenance.body)}</p>
          {d.maintenance.reopen && (
            <time dateTime={d.maintenance.reopen}>
              {new Date(d.maintenance.reopen).toLocaleString()}
            </time>
          )}
        </main>
      ) : (
        <>
          <header
            data-edit="navigation"
            className={"site-nav " + (th.navSticky ? "sticky" : "")}
          >
            <a href="/" className="brand" data-edit="brand">
              {th.logo ? (
                <img src={th.logo} alt={t(d.brand)} width="40" height="40" />
              ) : (
                <span className="brandmark" aria-hidden>
                  ✳
                </span>
              )}
              {text(d.brand)}
            </a>
            <button
              className="menu-toggle"
              aria-label={u("menu")}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
            <nav className={menu ? "opened" : ""}>
              {d.nav.map((n) => (
                <a
                  key={n.id}
                  href={n.url || "#"}
                  onClick={() => {
                    setMenu(false);
                    event("cta", n.id);
                  }}
                >
                  {text(n.label)}
                </a>
              ))}
            </nav>
            <a className="button small" href={d.nav[2]?.url || "#content"}>
              {text(d.nav[2]?.label || d.brand)} ↗
            </a>
          </header>
          <main id="content">
            {d.sections
              .filter(
                (s) => s.visible && (!page || page.sectionIds.includes(s.id)),
              )
              .sort((a, b) =>
                page
                  ? page.sectionIds.indexOf(a.id) -
                    page.sectionIds.indexOf(b.id)
                  : 0,
              )
              .map((s) => (
                <section
                  data-edit={s.id}
                  id={s.id}
                  key={s.id}
                  className={`section ${s.type} layout-${s.layout}`}
                  style={{ paddingBlock: s.padding }}
                >
                  {s.backgroundMedia && (
                    <div className="background-media">
                      <Asset
                        src={s.backgroundMedia}
                        kind={s.backgroundKind}
                        background
                        alt=""
                      />
                    </div>
                  )}
                  <div className="section-inner">
                    {s.type === "hero" ? (
                      <>
                        <div className="hero-copy">
                          <div className="eyebrow">
                            <span />
                            {text(s.label)}
                          </div>
                          {text(s.title, "h1")}
                          <span className="headline-stroke" aria-hidden />
                          {text(s.body, "p")}
                          <a
                            data-edit={s.id + "-button"}
                            className="button"
                            href={s.url || "#courses"}
                            onClick={() => event("cta", s.id)}
                          >
                            {text(s.label)} ↗
                          </a>
                          {s.secondaryLabel && (
                            <a
                              className="button secondary"
                              href={s.secondaryUrl || "#courses"}
                            >
                              {text(s.secondaryLabel)}
                            </a>
                          )}
                          {s.items
                            .filter((i) => i.visible)
                            .map((i) => (
                              <article
                                key={i.id}
                                data-edit={i.id}
                                className="hero-extra"
                              >
                                {i.media && (
                                  <Asset
                                    src={i.media}
                                    kind={i.mediaKind}
                                    alt={t(i.alt)}
                                  />
                                )}
                                <h3>{text(i.title)}</h3>
                                <p>{text(i.body)}</p>
                                <a
                                  data-edit={i.id + "-button"}
                                  href={i.url || s.url}
                                >
                                  {text(i.label)}
                                </a>
                              </article>
                            ))}
                        </div>
                        <div className="hero-art" data-edit={s.id + "-media"}>
                          {s.media ? (
                            <Asset
                              src={s.media}
                              kind={s.mediaKind}
                              alt={t(s.mediaAlt || s.title)}
                            />
                          ) : (
                            <>
                              <div className="art-orbit one" />
                              <div className="art-orbit two" />
                              <div className="art-core" aria-hidden>
                                ✳
                              </div>
                              <div className="art-line" />
                              <div className="art-dot" />
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="section-heading">
                          <div>
                            <div className="eyebrow">{text(s.label)}</div>
                            {text(s.title, "h2")}
                          </div>
                          {text(s.body, "p")}
                        </div>
                        {s.type === "courses" && d.courses.length ? (
                          renderCourses()
                        ) : s.type === "curriculum" && d.courses.length ? (
                          <div className="item-list">
                            {d.courses
                              .filter((c) => c.visible)
                              .flatMap((c) =>
                                c.modules
                                  .filter((m) => m.visible)
                                  .map((m) => (
                                    <details key={m.id}>
                                      <summary>
                                        {text(m.title)}
                                        <span>+</span>
                                      </summary>
                                      {m.lessons
                                        .filter((l) => l.visible)
                                        .map((l) => (
                                          <div className="lesson" key={l.id}>
                                            {text(l.title, "h3")}
                                            {text(l.body, "p")}
                                            {l.url && (
                                              <a href={l.url}>
                                                {u("course")} ↗
                                              </a>
                                            )}
                                          </div>
                                        ))}
                                    </details>
                                  )),
                              )}
                          </div>
                        ) : (
                          <div
                            className={`items ${s.layout === "list" ? "item-list" : ""}`}
                            style={{ "--columns": s.columns } as CSSProperties}
                          >
                            {s.items
                              .filter((i) => i.visible)
                              .map((i, index) =>
                                s.type === "faq" || s.type === "curriculum" ? (
                                  <details key={i.id} data-edit={i.id}>
                                    <summary>
                                      {text(i.title)}
                                      <span aria-hidden>+</span>
                                    </summary>
                                    {text(i.body, "p")}
                                    {s.type === "curriculum" && (
                                      <a href={i.url || s.url}>
                                        {text(i.label)} ↗
                                      </a>
                                    )}
                                  </details>
                                ) : (
                                  <article
                                    key={i.id}
                                    data-edit={i.id}
                                    className={`item ${s.type === "pricing" && index === 1 ? "featured" : ""}`}
                                  >
                                    {i.media && (
                                      <Asset
                                        data-edit={i.id + "-media"}
                                        src={i.media}
                                        kind={
                                          (
                                            i as typeof i & {
                                              mediaKind?: string;
                                            }
                                          ).mediaKind
                                        }
                                        alt={t(i.alt)}
                                        style={{
                                          aspectRatio: i.aspect,
                                          objectFit: i.crop,
                                          objectPosition: `${i.focalX}% ${i.focalY}%`,
                                        }}
                                      />
                                    )}
                                    {i.icon !== "none" && (
                                      <div className="item-symbol" aria-hidden>
                                        {i.icon === "diamond"
                                          ? "◈"
                                          : i.icon === "wave"
                                            ? "⌁"
                                            : "✳"}
                                      </div>
                                    )}
                                    {text(i.title, "h3")}
                                    {text(i.body, "p")}
                                    {s.type === "pricing" &&
                                      courseAmount(i, now) !== null && (
                                        <div className="price">
                                          {new Intl.NumberFormat("en-PH", {
                                            style: "currency",
                                            currency: i.currency,
                                          }).format(
                                            courseAmount(i, now)! / 100,
                                          )}
                                        </div>
                                      )}
                                    <a
                                      data-edit={i.id + "-button"}
                                      className={
                                        s.type === "pricing"
                                          ? "button"
                                          : "text-link"
                                      }
                                      href={i.url || s.url || "#"}
                                      onClick={() => event("cta", i.id)}
                                    >
                                      {text(i.label)} ↗
                                    </a>
                                  </article>
                                ),
                              )}
                          </div>
                        )}
                        {s.type === "cta" && (
                          <a
                            data-edit={s.id + "-button"}
                            className="button"
                            href={s.url || "#courses"}
                          >
                            {text(s.label)} ↗
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </section>
              ))}
          </main>
          <footer data-edit="footer">
            <a className="brand" href="/">
              {text(d.brand)}
            </a>
            {text(d.footer, "p")}
            <div>
              {d.nav.map((n) => (
                <a key={n.id} href={n.url || "#"}>
                  {text(n.label)}
                </a>
              ))}
            </div>
          </footer>
        </>
      )}
      {banner("bottom")}
      {popup && !select && (
        <Modal label={t(popup.title)} onClose={() => dismiss(popup.id)}>
          <button
            className="dialog-close"
            aria-label={u("close")}
            onClick={() => dismiss(popup.id)}
          >
            ×
          </button>
          <h2>{t(popup.title)}</h2>
          <p>{t(popup.body)}</p>
          <a className="button" href={popup.url || "#"}>
            {t(popup.label)}
          </a>
        </Modal>
      )}
      {activeCourse && !select && (
        <Modal label={t(activeCourse.title)} onClose={() => setEnroll(null)}>
          <button
            className="dialog-close"
            aria-label={u("close")}
            onClick={() => setEnroll(null)}
          >
            ×
          </button>
          <h2>{t(activeCourse.title)}</h2>
          <p>{u("instructions")}</p>
          <p>{t(d.commerce.instructions)}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (submitting) return;
              setSubmitting(true);
              setFormStatus("");
              const data = new FormData(e.currentTarget);
              try {
                const r = await fetch("/api/enroll", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    course: activeCourse.id,
                    name: data.get("name"),
                    email: data.get("email"),
                    note: data.get("note"),
                    consent: data.get("consent") === "on",
                    website: data.get("website"),
                  }),
                });
                const result = (await r.json()) as {
                  url?: string;
                  id?: string;
                };
                if (!r.ok) throw Error();
                if (result.url) {
                  window.location.href = result.url;
                  return;
                }
                setFormStatus(
                  u("received") + " · " + u("reference") + ": " + result.id,
                );
              } catch {
                setFormStatus(u("error"));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <label>
              {u("name")}
              <input name="name" required maxLength={120} autoComplete="name" />
            </label>
            <label>
              {u("email")}
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
            <label>
              {u("note")}
              <textarea name="note" maxLength={2000} />
            </label>
            <input
              name="website"
              className="honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <label>
              <input
                type="checkbox"
                name="consent"
                required={d.commerce.requireConsent}
              />
              {u("consent")}
            </label>
            <button className="button" disabled={submitting}>
              {submitting ? u("loading") : u("submit")}
            </button>
            <p role="status">{formStatus}</p>
          </form>
        </Modal>
      )}
    </div>
  );
}
