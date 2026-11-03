type StatItemProps = {
  value: string;
  label: string;
};

export function StatItem({ value, label }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="text-3xl font-black text-brand-800">{value}</div>
      <div className="mt-1 text-xs font-semibold text-text-muted">{label}</div>
    </div>
  );
}
