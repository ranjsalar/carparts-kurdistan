export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white" aria-busy="true">
      <div className="border-b border-steel-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-steel-100" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-steel-100" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-steel-200" />
        <div className="mt-7 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-steel-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
