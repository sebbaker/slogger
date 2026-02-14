"use client";

type AuthGateProps = {
  onSubmit: (key: string) => void;
};

export function AuthGate({ onSubmit }: AuthGateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h1 className="mb-2 text-2xl font-semibold text-white">Slogger Explorer</h1>
        <p className="mb-4 text-sm text-slate-300">Enter your API key to query logs.</p>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const value = String(formData.get("apiKey") ?? "").trim();
            if (value) {
              onSubmit(value);
            }
          }}
        >
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-500 focus:ring-2"
            type="password"
            name="apiKey"
            placeholder="sk_live_..."
            autoComplete="off"
          />
          <button
            className="w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            type="submit"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
