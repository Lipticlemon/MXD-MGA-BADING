import { safeUrl } from "../lib/content";
export function RichText({ value }: { value: string }) {
  const parts = value.split(
    /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^\s)]+\)|\n)/g,
  );
  return (
    <>
      {parts.map((p, i) => {
        if (p === "\n") return <br key={i} />;
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*"))
          return <em key={i}>{p.slice(1, -1)}</em>;
        const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
        if (match && safeUrl.safeParse(match[2]).success)
          return (
            <a key={i} href={match[2]}>
              {match[1]}
            </a>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
