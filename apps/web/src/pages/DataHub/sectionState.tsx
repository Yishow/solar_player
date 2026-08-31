import type { ReactNode } from "react";

type DataHubSectionStateProps =
  | { children?: never; message?: string; status: "loading" }
  | { children?: never; message: string; status: "error" }
  | { children?: never; message: string; status: "empty" }
  | { children: ReactNode; message?: never; status: "ready" };

export function DataHubSectionState(props: DataHubSectionStateProps) {
  if (props.status === "ready") {
    return <>{props.children}</>;
  }

  const isError = props.status === "error";
  const message = props.message ?? "正在載入目前區段...";

  return (
    <section
      aria-live="polite"
      className="mgmt-card mx-5 p-5 text-sm text-[#4d554f]"
      role={isError ? "alert" : "status"}
    >
      {message}
    </section>
  );
}
