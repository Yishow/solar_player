import type { PropsWithChildren } from "react";
import { SectionWrapper } from "./SectionWrapper";
import type { ShellDensity } from "./shellDensity";

type PanelCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  className?: string;
  density?: ShellDensity;
}>;

export function PanelCard({
  title,
  subtitle,
  className,
  density = "management",
  children
}: PanelCardProps) {
  return (
    <SectionWrapper
      className={className}
      density={density}
      subtitle={subtitle}
      title={title}
    >
      {children}
    </SectionWrapper>
  );
}
