import { useState, type FormEvent } from "react";

export function ManagementUnlockScreen({
  lockedUntil,
  errorMessage,
  onUnlock
}: {
  lockedUntil?: string | null;
  errorMessage?: string;
  onUnlock: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locked = Boolean(lockedUntil);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (locked || isSubmitting || !password) return;
    setIsSubmitting(true);
    try { await onUnlock(password); } finally { setIsSubmitting(false); }
  };

  return (
    <section className="mx-auto flex min-h-full max-w-xl items-center justify-center px-8 py-16" aria-labelledby="management-unlock-title">
      <form className="mgmt-surface mgmt-surface--operations w-full space-y-6 p-8" onSubmit={submit}>
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">Management access</p>
          <h1 id="management-unlock-title" className="mt-2 text-3xl font-semibold">解鎖管理功能</h1>
          <p className="mt-3 text-base text-neutral-600">請輸入管理密碼以繼續目前頁面。</p>
        </div>
        <label className="block text-base font-medium" htmlFor="management-password">
          管理密碼
          <input id="management-password" className="mt-2 min-h-12 w-full rounded-md border border-neutral-300 px-4 text-lg" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={locked || isSubmitting} />
        </label>
        {locked ? <p role="status" className="text-amber-700">目前已暫時鎖定，請於 {new Date(lockedUntil as string).toLocaleString("zh-TW")} 後再試。</p> : null}
        {!locked && errorMessage ? <p role="alert" className="text-red-700">{errorMessage}</p> : null}
        <button className="min-h-12 w-full rounded-md bg-neutral-900 px-5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={locked || isSubmitting || !password}>解鎖</button>
      </form>
    </section>
  );
}
