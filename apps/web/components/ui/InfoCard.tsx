type InfoCardProps = {
  title: string;
  description: string;
  number?: string;
  variant?: "muted" | "white";
};

const variants = {
  muted: "bg-[#f4f7f9] border-border",
  white: "bg-white border-border shadow-[var(--shadow-soft)]",
};

export function InfoCard({
  title,
  description,
  number,
  variant = "muted",
}: InfoCardProps) {
  return (
    <div className={`rounded-[12px] border p-5 ${variants[variant]}`}>
      {number ? (
        <span className="text-3xl font-black text-brand-500">{number}</span>
      ) : null}
      <h3
        className={`text-sm font-bold text-brand-900 ${number ? "mt-2" : ""}`}
      >
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}
