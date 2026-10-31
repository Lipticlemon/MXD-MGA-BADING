"use client";
export function Asset({
  src,
  kind = "image",
  alt = "",
  background = false,
  ...props
}: {
  src: string;
  kind?: string;
  alt?: string;
  background?: boolean;
  className?: string;
  style?: React.CSSProperties;
  "data-edit"?: string;
}) {
  if (!src) return null;
  if (kind === "video")
    return (
      <video
        {...props}
        src={src}
        controls={!background}
        autoPlay={background}
        loop={background}
        muted={background}
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  if (kind === "audio")
    return (
      <audio {...props} src={src} controls preload="none" aria-label={alt} />
    );
  return (
    <img
      {...props}
      src={src}
      alt={alt}
      loading="lazy"
      width="640"
      height="400"
    />
  );
}
