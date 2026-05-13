type LeafOrnamentProps = {
  className?: string;
};

export function LeafOrnament({ className }: LeafOrnamentProps) {
  return (
    <svg
      viewBox="0 0 84 52"
      className={["h-10 w-16", className ?? ""].join(" ")}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 44C7 36 7 20 17 11C28 1 46 4 57 13C67 22 70 37 62 45C54 53 38 51 28 45"
        fill="rgba(79,122,63,0.2)"
      />
      <path
        d="M15 44C26 35 35 25 46 10"
        stroke="rgba(36,75,32,0.9)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M33 24C41 25 52 23 61 16"
        stroke="rgba(36,75,32,0.7)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M24 33C29 34 36 33 44 28"
        stroke="rgba(36,75,32,0.6)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
