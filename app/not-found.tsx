import { load } from "../lib/store";
export default async function NotFound() {
  const { published: d } = await load();
  return (
    <main className="loading">
      <h1>{d.texts[d.ui.unavailable]}</h1>
      <a href="/">{d.texts[d.ui.back]}</a>
    </main>
  );
}
