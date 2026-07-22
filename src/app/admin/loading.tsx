/* Admin skeleton mirrors the dark header + table shell so navigation inside
   the dense admin area never blanks out. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-steel-50" aria-busy="true">
      <div className="bg-brand-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-brand-800" />
          <div className="h-7 w-40 animate-pulse rounded-lg bg-brand-800" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-steel-200" />
        <div className="mt-6 flex gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-28 animate-pulse rounded-full bg-steel-100" />
          ))}
        </div>
        <div className="mt-6 animate-pulse overflow-hidden rounded-2xl border border-steel-200 bg-white">
          <div className="h-11 bg-steel-100/70" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-steel-100 px-4 py-4">
              <div className="h-4 w-3/4 rounded bg-steel-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
