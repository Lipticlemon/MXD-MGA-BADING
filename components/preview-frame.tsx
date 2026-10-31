"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import PublicSite from "./public-site";
import type { Content } from "../lib/content";
export default function PreviewFrame({
  document: d,
  width,
  pageId,
  select,
}: {
  document: Content;
  width: string;
  pageId?: string;
  select?: (id: string) => void;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(1280);
  const viewport = width === "100%" ? 1280 : parseInt(width, 10);
  const scale = Math.min(1, available / viewport);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  function ready() {
    const doc = iframe.current?.contentDocument;
    if (!doc) return;
    doc.head.replaceChildren(
      ...Array.from(
        document.querySelectorAll('link[rel="stylesheet"],style'),
      ).map((el) => el.cloneNode(true)),
    );
    doc.body.style.margin = "0";
    setTarget(doc.body);
  }
  // An empty same-origin frame may finish loading before React attaches onLoad.
  // Initialize after mount as well so the portal always gets a live document.
  useEffect(() => {
    ready();
    const node = stage.current;
    if (!node) return;
    const resize = new ResizeObserver(() =>
      setAvailable(Math.max(1, node.clientWidth)),
    );
    setAvailable(Math.max(1, node.clientWidth));
    resize.observe(node);
    return () => resize.disconnect();
  }, []);
  return (
    <div className="preview-stage" ref={stage}>
      <div
        className="preview-wrap"
        style={{
          width: viewport,
          left: Math.max(0, (available - viewport * scale) / 2),
          transform: `scale(${scale})`,
          height: 700 / scale,
        }}
      >
        <iframe
          ref={iframe}
          title="Website preview"
          className="preview-iframe"
          onLoad={ready}
        />
        {target &&
          createPortal(
            <PublicSite document={d} select={select} pageId={pageId} preview />,
            target,
          )}
      </div>
    </div>
  );
}
