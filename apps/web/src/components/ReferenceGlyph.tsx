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
        <svg aria-hidden="true" className={iconClassName(className)} viewBox="0 0 64 64" fill="none">
          <path d="M36 4L14 36H32L26 60L50 28H34L38 4Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M34 6L16 34H32L28 58L48 26H34L36 6Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="44" cy="16" r="3" fill="currentColor" opacity="0.4" />
          <circle cx="20" cy="48" r="1.5" fill="currentColor" opacity="0.4" />
        </svg>
      );
    case "sun":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="12" fill="currentColor" fillOpacity="0.15" />
          <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="2.4" />
          <path d="M32 4V12 M32 52V60 M4 32H12 M52 32H60 M12.2 12.2L17.8 17.8 M46.2 46.2L51.8 51.8 M12.2 51.8L17.8 46.2 M46.2 12.2L51.8 17.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
        </svg>
      );
    case "bars":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} viewBox="0 0 64 64" fill="none">
          <rect x="14" y="36" width="8" height="20" rx="2" fill="currentColor" fillOpacity="0.15" />
          <rect x="28" y="24" width="8" height="32" rx="2" fill="currentColor" fillOpacity="0.2" />
          <rect x="42" y="12" width="8" height="44" rx="2" fill="currentColor" fillOpacity="0.3" />
          <rect x="14" y="36" width="8" height="20" rx="2" stroke="currentColor" strokeWidth="2.4" />
          <rect x="28" y="24" width="8" height="32" rx="2" stroke="currentColor" strokeWidth="2.4" />
          <rect x="42" y="12" width="8" height="44" rx="2" stroke="currentColor" strokeWidth="2.4" />
          <path d="M6 56H58" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M18 26 L26 18 L34 22 L46 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="46" cy="6" r="3" fill="currentColor" />
        </svg>
      );
    case "co2":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} viewBox="0 0 64 64" fill="none">
          <path d="M18 22 A 8 8 0 0 1 34 22 A 10 10 0 0 1 54 26 A 8 8 0 0 1 48 40 H 20 A 10 10 0 0 1 18 22 Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M20 24 A 8 8 0 0 1 36 24 A 10 10 0 0 1 56 28 A 8 8 0 0 1 50 42 H 22 A 10 10 0 0 1 20 24 Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M38 46 L38 58 M32 52 L38 58 L44 52" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M26 30 C 24.5 28.5 21 28.5 19.5 30 C 17.5 32 17.5 36 19.5 38 C 21 39.5 24.5 39.5 26 38" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="28" y="29" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="2.4" />
          <path d="M37 36 C 37 34 40 34 40 36 C 40 38 36 40 36 42 H 41" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "leaf":
      return (
        <svg aria-hidden="true" className={iconClassName(className)} viewBox="0 0 64 64" fill="none">
          <path d="M34 8C34 8 58 10 58 34C58 48 44 58 32 58C18 58 6 44 6 32C6 14 34 8 34 8Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M32 6C32 6 60 8 60 36C60 52 44 62 30 62C14 62 2 48 2 34C2 12 32 6 32 6Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M30 62C30 62 30 40 44 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M34 46L46 40" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M40 34L52 28" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26 38C26 38 18 30 18 22C18 14 28 10 28 10C28 10 38 14 38 22C38 30 26 38 26 38Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255, 253, 247, 0.9)" />
          <path d="M26 38V10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
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