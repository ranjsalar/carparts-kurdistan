"use client";

import { useFormStatus } from "react-dom";

/*
  Drop-in submit button for server-action forms: disables itself and shows a
  spinner while the action is in flight, so forms never feel dead after a
  click and can't be double-submitted. Works inside both server- and
  client-rendered <form action={...}> elements.
*/
export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending && (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            aria-hidden
            className="animate-spin"
          >
            <path d="M12 3 a9 9 0 1 1-6.36 2.64" />
          </svg>
        )}
        {children}
      </span>
    </button>
  );
}
