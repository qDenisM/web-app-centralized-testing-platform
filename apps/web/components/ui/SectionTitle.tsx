type SectionTitleProps = {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export function SectionTitle({
  title,
  subtitle,
  align = "center",
}: SectionTitleProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`mb-10 max-w-xl ${alignClass}`}>
      <h2 className="text-2xl font-extrabold tracking-tight text-brand-900 md:text-[28px]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
