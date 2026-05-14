export type ReferenceGlyphName =
  | "bars"
  | "bolt"
  | "check"
  | "clock"
  | "co2"
  | "image"
  | "leaf"
  | "play"
  | "plug"
  | "refresh"
  | "sun";

type ReferenceGlyphProps = {
  className?: string;
  name: ReferenceGlyphName;
};

function iconClassName(className?: string) {
  return ["h-full w-full", className ?? ""].join(" ").trim();
}

export function ReferenceGlyph({ className, name }: ReferenceGlyphProps) {
  switch (name) {
    case "bolt":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
          viewBox="0 0 64 64"
        >
          <path d="M36 4 L14 36 H31 L26 60 L50 24 H33 Z" />
          <path d="M31 8 L22 31 H36" />
          <circle cx="39" cy="46" r="4" />
          <path d="M14 54 H38" />
        </svg>
      );
    case "sun":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
          viewBox="0 0 64 64"
        >
          <circle cx="32" cy="32" r="11" />
          <circle cx="32" cy="32" r="5" />
          <path d="M32 5 V15 M32 49 V59 M5 32 H15 M49 32 H59 M13 13 L20 20 M44 44 L51 51 M51 13 L44 20 M20 44 L13 51" />
        </svg>
      );
    case "bars":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
          viewBox="0 0 64 64"
        >
          <path d="M10 53 H54" />
          <rect x="14" y="31" width="7" height="16" rx="1" />
          <rect x="29" y="14" width="7" height="33" rx="1" />
          <rect x="44" y="24" width="7" height="23" rx="1" />
          <path d="M17 25 H21 M32 8 H36 M47 18 H51" />
        </svg>
      );
    case "co2":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          viewBox="0 0 64 64"
        >
          <path d="M16 47 C9 47 5 42 6 36 C7 31 11 28 16 28 C18 18 27 12 38 15 C46 17 51 23 52 31 C58 32 61 37 60 43 C59 48 55 52 48 52 H18" />
          <circle cx="24" cy="38" r="7" />
          <path d="M34 32 H44 C49 32 51 35 51 39 C51 43 48 45 44 45 H35 L50 52 H34 Z" />
          <circle cx="54" cy="51" r="3" />
          <path d="M20 38 C20 34 23 31 27 32 M39 37 H47" />
        </svg>
      );
    case "leaf":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          viewBox="0 0 64 64"
        >
          <path d="M52 10 C31 12 13 27 13 48 C31 49 48 36 52 10 Z" />
          <path d="M17 47 C27 36 36 27 49 15" />
          <path d="M28 36 C25 33 24 28 25 24 M37 28 C34 25 33 21 34 17 M22 43 C19 42 17 40 15 37" />
        </svg>
      );
    case "plug":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
          viewBox="0 0 64 64"
        >
          <path d="M23 7 V23 M41 7 V23" />
          <path d="M18 23 H46 V35 C46 43 40 49 32 49 C24 49 18 43 18 35 Z" />
          <path d="M32 49 V58 M25 35 H39 M27 42 H37" />
        </svg>
      );
    case "refresh":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
          viewBox="0 0 24 24"
        >
          <path d="M20 12 C20 16 16 20 12 20 C8 20 4 16 4 12 C4 8 8 4 12 4 C14 4 16 5 18 6" />
          <path d="M20 4 V10 H14" />
        </svg>
      );
    case "image":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M7 16 L11 12 L14 15 L16 13 L19 16" />
          <circle cx="9" cy="9" r="1" />
        </svg>
      );
    case "play":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M10 8 L16 12 L10 16 Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "check":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
          viewBox="0 0 24 24"
        >
          <path d="M20 6 L9 17 L4 12" />
        </svg>
      );
    case "clock":
      return (
        <svg
          aria-hidden="true"
          className={iconClassName(className)}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7 V13 L16 15" />
        </svg>
      );
    default:
      return null;
  }
}
