import type { Content } from "./content";
export function designCss(d: Content) {
  function rules(s: Content["styles"][string]["base"]) {
    const props: Record<string, string | number | undefined> = {
      color: s.color,
      "background-color": s.background,
      "background-image":
        s.gradientFrom && s.gradientTo
          ? `linear-gradient(${s.gradientAngle ?? 135}deg,${s.gradientFrom},${s.gradientTo})`
          : undefined,
      "border-color": s.borderColor,
      "font-family": s.font,
      "font-size": s.fontSize === undefined ? undefined : s.fontSize + "px",
      "font-weight": s.fontWeight,
      "line-height": s.lineHeight,
      "letter-spacing":
        s.letterSpacing === undefined ? undefined : s.letterSpacing + "px",
      "text-align": s.textAlign,
      padding: s.padding === undefined ? undefined : s.padding + "px",
      margin: s.margin === undefined ? undefined : s.margin + "px",
      gap: s.gap === undefined ? undefined : s.gap + "px",
      width: s.width === undefined ? undefined : s.width + "px",
      "max-width": s.width === undefined ? undefined : "100%",
      "border-radius": s.radius === undefined ? undefined : s.radius + "px",
      "border-width":
        s.borderWidth === undefined ? undefined : s.borderWidth + "px",
      "border-style": s.borderWidth === undefined ? undefined : "solid",
      "box-shadow":
        s.shadow === undefined
          ? undefined
          : `0 ${s.shadow / 3}px ${s.shadow}px ${s.shadowColor || "#00000040"}`,
      opacity: s.opacity,
      display:
        s.hidden === true ? "none" : s.hidden === false ? "revert" : undefined,
      "--element-columns": s.columns,
      "animation-name":
        s.animation === undefined
          ? undefined
          : s.animation === "none"
            ? "none"
            : s.animation === "fade"
              ? "mxd-fade"
              : "mxd-slide",
      "animation-duration":
        s.duration === undefined ? undefined : s.duration + "ms",
      "animation-delay": s.delay === undefined ? undefined : s.delay + "ms",
      "animation-fill-mode": s.animation ? "both" : undefined,
      "--motion-distance":
        s.intensity === undefined ? undefined : s.intensity + "px",
      "animation-timing-function": s.easing,
      "transition-timing-function": s.easing,
      "transition-duration":
        s.duration === undefined ? undefined : s.duration + "ms",
      "--element-hover-color": s.hoverColor,
      "--element-hover-background": s.hoverBackground,
    };
    return Object.entries(props)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}:${v}!important`)
      .join(";");
  }
  let css = "";
  function hover(s: Content["styles"][string]["base"]) {
    return (
      (s.hoverColor ? `color:${s.hoverColor}!important;` : "") +
      (s.hoverBackground ? `background:${s.hoverBackground}!important;` : "")
    );
  }
  for (const [id, r] of Object.entries(d.styles)) {
    const selector = `.site [data-edit="${id}"]`;
    css += selector + "{" + rules(r.base) + "}";
    css += selector + ":hover{" + hover(r.base) + "}";
    css +=
      "@media(max-width:1024px){" +
      selector +
      "{" +
      rules(r.tablet) +
      "}" +
      selector +
      ":hover{" +
      hover(r.tablet) +
      "}}";
    css +=
      "@media(max-width:760px){" +
      selector +
      "{" +
      rules(r.mobile) +
      "}" +
      selector +
      ":hover{" +
      hover(r.mobile) +
      "}}";
  }
  return css;
}
