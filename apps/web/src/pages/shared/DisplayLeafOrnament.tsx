import React from "react";
import type { CSSProperties } from "react";
import type { LeafOrnamentChromeConfig } from "./displayPageChromeConfig";

export function resolveLeafOrnamentAssetSrc(source: LeafOrnamentChromeConfig["source"]) {
  if (source.mode !== "managed-asset") {
    return null;
  }

  if (typeof source.src === "string" && source.src.trim().length > 0) {
    return source.src;
  }

  return typeof source.fallbackSrc === "string" && source.fallbackSrc.trim().length > 0
    ? source.fallbackSrc
    : null;
}

export function DisplayLeafOrnament({
  className,
  config,
  style
}: {
  className: string;
  config: LeafOrnamentChromeConfig;
  style: CSSProperties;
}) {
  const assetSrc = resolveLeafOrnamentAssetSrc(config.source);

  if (assetSrc) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={className}
        draggable={false}
        src={assetSrc}
        style={{
          ...style,
          objectFit: "contain"
        }}
      />
    );
  }

  return <div aria-hidden="true" className={className} style={style} />;
}
