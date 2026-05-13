import type { ReactNode } from "react";
import { SectionTitle } from "./SectionTitle";
import { shellDensityClassMap, type ShellDensity } from "./shellDensity";

type TitleBlockProps = {
  aside?: ReactNode;
  density?: ShellDensity;
  description?: string;
  subtitle: string;
  title: string;
};

export function TitleBlock({
  aside,
  density = "management",
  description,
  subtitle,
  title
}: TitleBlockProps) {
  return (
    <div
      data-shell-density={density}
      data-shell-primitive="title-block"
      className="flex items-start justify-between gap-4"
    >
      <div className={["space-y-3", shellDensityClassMap[density].title].join(" ")}>
        <SectionTitle title={title} subtitle={subtitle} />
        {description ? <p className="text-lg leading-8 text-neutral-600">{description}</p> : null}
      </div>
      {aside}
    </div>
  );
}
