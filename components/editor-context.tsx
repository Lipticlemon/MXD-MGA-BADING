"use client";
import { createContext, useContext, useId, useRef } from "react";
import type { Content } from "../lib/content";
export type EditorContextValue = {
  doc: Content;
  change: (fn: (d: Content) => void) => void;
  selected: string;
  setSelected: (v: string) => void;
  page: string;
  setPage: (v: string) => void;
  setTab: (v: string) => void;
  status: (v: string) => void;
  save: (action?: string, revision?: string) => Promise<void>;
  previewDocument: (d: Content) => void;
  published: Content;
  refresh: () => Promise<void>;
};
export const EditorContext = createContext<EditorContextValue | null>(null);
export function useEditor() {
  const value = useContext(EditorContext);
  if (!value) throw Error("Editor unavailable");
  return value;
}
export function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
  options,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="field">
      {label}
      {options ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((x) => (
            <option value={x} key={x}>
              {x}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function TextField({ id, label }: { id: string; label: string }) {
  const { doc, change } = useEditor();
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <label className="field">
      {label}
      <small>
        {id} · {(doc.texts[id] || "").length} characters
      </small>
      <textarea
        ref={ref}
        value={doc.texts[id] || ""}
        onChange={(e) =>
          change((d) => {
            d.texts[id] = e.target.value;
          })
        }
      />
      <span className="toolbar">
        <button
          type="button"
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            const a = el.selectionStart,
              b = el.selectionEnd;
            change((d) => {
              const value = d.texts[id];
              d.texts[id] =
                value.slice(0, a) +
                "**" +
                value.slice(a, b) +
                "**" +
                value.slice(b);
            });
          }}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            const a = el.selectionStart,
              b = el.selectionEnd;
            change((d) => {
              const v = d.texts[id];
              d.texts[id] =
                v.slice(0, a) + "*" + v.slice(a, b) + "*" + v.slice(b);
            });
          }}
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() =>
            change((d) => {
              d.texts[id] = id;
            })
          }
        >
          Reset
        </button>
      </span>
    </label>
  );
}
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const local =
    value && Number.isFinite(Date.parse(value))
      ? new Date(
          Date.parse(value) - new Date(value).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "";
  return (
    <Field
      label={label}
      type="datetime-local"
      value={local}
      onChange={(v) => onChange(v ? new Date(v).toISOString() : "")}
    />
  );
}
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function OrderButtons({
  index,
  length,
  up,
  down,
  remove,
}: {
  index: number;
  length: number;
  up: () => void;
  down: () => void;
  remove: () => void;
}) {
  return (
    <span className="toolbar">
      <button type="button" aria-label="Move up" disabled={!index} onClick={up}>
        ↑
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={index === length - 1}
        onClick={down}
      >
        ↓
      </button>
      <button type="button" onClick={remove}>
        Remove
      </button>
    </span>
  );
}
