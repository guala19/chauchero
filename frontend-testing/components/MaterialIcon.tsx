type Props = {
  name: string;
  className?: string;
  filled?: boolean;
};

export function MaterialIcon({ name, className = "", filled = false }: Props) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
      }
    >
      {name}
    </span>
  );
}
