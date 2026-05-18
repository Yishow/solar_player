import React from "react";
import type { ReactNode } from "react";

type PlaybackTitleGroupProps = {
  description?: string;
  eyebrow?: string;
  subtitle?: string;
  title: ReactNode;
};

export function PlaybackTitleGroup({
  description,
  eyebrow,
  subtitle,
  title
}: PlaybackTitleGroupProps) {
  return (
    <div
      data-shell-density="playback"
      data-shell-primitive="playback-title-group"
      className="space-y-4"
    >
      {eyebrow ? (
        <p className="font-en text-sm uppercase tracking-[0.28em] text-brand-700">{eyebrow}</p>
      ) : null}
      <div className="space-y-3">
        <div className="text-[64px] font-bold leading-[1.08] tracking-[0.08em] text-brand-900">
          {title}
        </div>
        {subtitle ? (
          <p className="font-en text-lg uppercase tracking-[0.22em] text-brand-700">{subtitle}</p>
        ) : null}
      </div>
      {description ? <p className="max-w-4xl text-2xl leading-[1.45] text-neutral-600">{description}</p> : null}
    </div>
  );
}
