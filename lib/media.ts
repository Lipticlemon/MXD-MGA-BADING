export function mediaReferences(document: unknown, id?: string) {
  const refs: string[] = [];
  function visit(v: unknown, path: string) {
    if (
      typeof v === "string" &&
      /^\/api\/media\/[a-f0-9-]{36}$/.test(v) &&
      (!id || v.endsWith("/" + id))
    )
      refs.push(path);
    else if (Array.isArray(v)) v.forEach((x, i) => visit(x, path + "." + i));
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) visit(x, path + "." + k);
  }
  visit(document, "site");
  return refs;
}
export function sniff(bytes: Uint8Array) {
  const text = new TextDecoder().decode(bytes.slice(0, 16));
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (text.startsWith("RIFF") && text.slice(8, 12) === "WEBP")
    return "image/webp";
  if (text.startsWith("GIF87a") || text.startsWith("GIF89a"))
    return "image/gif";
  if (text.slice(4, 8) === "ftyp") return "video/mp4";
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
    return "video/webm";
  if (text.startsWith("ID3") || (bytes[0] === 255 && (bytes[1] & 224) === 224))
    return "audio/mpeg";
  return null;
}
