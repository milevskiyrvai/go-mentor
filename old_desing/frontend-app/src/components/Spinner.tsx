export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-border border-t-primary"
      style={{ width: size, height: size }}
      role="status"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] flex-col gap-3">
      <Spinner size={32} />
      <div className="caption">Загрузка</div>
    </div>
  );
}
