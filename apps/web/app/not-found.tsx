export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm text-muted">That route is not in this build.</p>
    </div>
  );
}
