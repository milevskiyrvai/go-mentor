export function Logo({ size = 34 }: { size?: number }) {
  return (
    <div
      className="brand-mark"
      style={{ width: size, height: size, flex: `0 0 ${size}px`, fontSize: size * 0.44 }}
    >
      Go
    </div>
  );
}
