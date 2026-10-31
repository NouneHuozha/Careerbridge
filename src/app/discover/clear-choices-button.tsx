"use client";

import { useRef } from "react";

type ClearChoicesButtonProps = {
  className: string;
  disabled?: boolean;
  label?: string;
  onConfirm: () => boolean;
};

export default function ClearChoicesButton({
  className,
  disabled = false,
  label = "Clear my choices",
  onConfirm,
}: ClearChoicesButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
        className={className}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="clear-choices-title"
        aria-describedby="clear-choices-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            dialogRef.current?.close();
          }
        }}
        className="fixed inset-0 m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#d9ddd5] bg-[#fbfaf6] p-0 text-[#18352d] shadow-[0_24px_80px_-24px_rgba(16,45,38,.45)] backdrop:bg-[#102d26]/35 backdrop:backdrop-blur-sm"
      >
        <div className="p-5 sm:p-6">
          <h2
            id="clear-choices-title"
            className="font-serif text-2xl font-semibold tracking-[-.03em] text-[#102d26]"
          >
            Clear your choices?
          </h2>
          <p
            id="clear-choices-description"
            className="mt-2 text-sm leading-relaxed text-[#59665e]"
          >
            Your class and activity choices will be removed from this tab.
            You can start again anytime.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#8da398] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Keep my choices
            </button>
            <button
              type="button"
              onClick={() => {
                if (onConfirm()) dialogRef.current?.close();
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Clear choices
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
