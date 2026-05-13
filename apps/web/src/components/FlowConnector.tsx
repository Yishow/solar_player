type FlowConnectorProps = {
  direction?: "horizontal" | "vertical";
  label?: string;
};

export function FlowConnector({ direction = "horizontal", label }: FlowConnectorProps) {
  const horizontal = direction === "horizontal";

  return (
    <div className={horizontal ? "flex items-center justify-center" : "flex justify-center"}>
      <svg
        viewBox={horizontal ? "0 0 160 42" : "0 0 42 160"}
        className={horizontal ? "h-12 w-full min-w-20" : "h-full min-h-20 w-12"}
      >
        {horizontal ? (
          <>
            <path d="M8 21 H138" stroke="rgba(79,122,63,0.72)" strokeWidth="4" strokeLinecap="round" />
            <path d="M124 9 L138 21 L124 33" fill="none" stroke="rgba(79,122,63,0.72)" strokeWidth="4" />
          </>
        ) : (
          <>
            <path d="M21 8 V138" stroke="rgba(79,122,63,0.72)" strokeWidth="4" strokeLinecap="round" />
            <path d="M9 124 L21 138 L33 124" fill="none" stroke="rgba(79,122,63,0.72)" strokeWidth="4" />
          </>
        )}
      </svg>
      {label ? (
        <span className="font-en text-xs uppercase tracking-[0.2em] text-neutral-500">{label}</span>
      ) : null}
    </div>
  );
}
