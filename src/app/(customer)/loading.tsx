/* Route-level skeleton so client-side navigations show structure instead of
   a blank flash while the server component streams in. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-steel-50" aria-busy="true">
      <div className="border-b border-steel-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-steel-100" />
          <div className="h-8 w-52 animate-pulse rounded-lg bg-steel-100" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl px-5 py-10">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-steel-200" />
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-steel-200 bg-white p-5">
              <div className="h-5 w-1/3 rounded bg-steel-100" />
              <div className="mt-3 h-4 w-2/3 rounded bg-steel-100" />
              <div className="mt-2 h-4 w-1/2 rounded bg-steel-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
