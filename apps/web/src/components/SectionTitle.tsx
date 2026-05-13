type SectionTitleProps = {
  title: string;
  subtitle: string;
  align?: "left" | "center";
};

export function SectionTitle({ title, subtitle, align = "left" }: SectionTitleProps) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <p className="font-en text-sm uppercase tracking-[0.3em] text-brand-700">{subtitle}</p>
      <h2 className="mt-2 text-[40px] font-bold leading-[1.1] text-brand-900">{title}</h2>
    </div>
  );
}
