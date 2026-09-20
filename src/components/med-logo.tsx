export default function MedLogo({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#0f766e" />
      <path
        d="M24 12h16v12h12v16H40v12H24V40H12V24h12z"
        fill="#ffffff"
      />
      <path d="M28 16h8v12h12v8H36v12h-8V36H16v-8h12z" fill="#ef4444" />
    </svg>
  );
}