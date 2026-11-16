"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { EASE, prefersReducedMotion } from "@/lib/motion";

/**
 * A modal dialog on the native <dialog> (showModal): the rest of the page is
 * inert while it is open, so focus stays inside it; Escape closes it; focus
 * returns to what opened it. It brings its own backdrop (Dark Forest Teal),
 * fades it in and raises the panel with GSAP, and plays the reverse before it
 * tells its owner to unmount it.
 *
 * - `drawer`: the role's details, from the right on wide screens.
 * - `center`: the application, a large centred panel.
 * Both are full-screen sheets on phones, scrolling inside.
 */

const CloseContext = createContext<() => void>(() => {});
/** Closes the modal it is inside, with its exit motion. */
export const useModalClose = () => useContext(CloseContext);

/** Open modals: the page scrolls again once the last one closes. */
let openCount = 0;

type ModalProps = {
  labelledBy: string;
  describedBy?: string;
  variant: "drawer" | "center";
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ labelledBy, describedBy, variant, onClose, children }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    el.showModal();
    openCount++;
    document.documentElement.style.overflow = "hidden";

    if (!prefersReducedMotion()) {
      const panel = el.querySelector("[data-modal-panel]");
      const wide = window.matchMedia("(min-width: 768px)").matches;
      gsap
        .timeline({ defaults: { ease: EASE } })
        .fromTo(el.querySelector("[data-modal-backdrop]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0)
        .fromTo(
          panel,
          variant === "drawer" && wide ? { x: 48, autoAlpha: 0 } : { y: wide ? 28 : 40, scale: wide ? 0.985 : 1, autoAlpha: 0 },
          { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.55 },
          0.04,
        )
        .fromTo(el.querySelectorAll("[data-modal-reveal]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05 }, 0.16);
    }

    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) document.documentElement.style.overflow = "";
      if (el.open) el.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [variant]);

  const close = useCallback(() => {
    const el = dialog.current;
    if (!el || closing.current) return;
    closing.current = true;
    if (prefersReducedMotion()) {
      onCloseRef.current();
      return;
    }
    const wide = window.matchMedia("(min-width: 768px)").matches;
    gsap
      .timeline({ defaults: { ease: "power2.in" }, onComplete: () => onCloseRef.current() })
      .to(el.querySelector("[data-modal-panel]"), variant === "drawer" && wide ? { x: 36, autoAlpha: 0, duration: 0.28 } : { y: 24, autoAlpha: 0, duration: 0.28 }, 0)
      .to(el.querySelector("[data-modal-backdrop]"), { autoAlpha: 0, duration: 0.3 }, 0.04);
  }, [variant]);

  const panel =
    variant === "drawer"
      ? "ml-auto h-full w-full md:w-[min(46rem,92vw)] md:rounded-surface"
      : // On a short screen the whole panel scrolls (see the low variant in globals.css): full screen, one scroll.
        "m-auto h-full w-full md:h-auto md:max-h-[calc(100dvh-3rem)] md:w-[min(58rem,calc(100vw-3rem))] md:rounded-surface low:h-full low:max-h-none low:w-full low:overflow-y-auto low:overscroll-contain low:rounded-none low:border-0";

  return (
    <dialog
      ref={dialog}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-modal="true"
      onCancel={(event) => {
        // Escape: close with the exit motion rather than at once.
        event.preventDefault();
        close();
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 text-neutral outline-none backdrop:bg-transparent"
    >
      <CloseContext value={close}>
        <div data-modal-backdrop aria-hidden="true" onClick={close} className="absolute inset-0 bg-petrol/80 backdrop-blur-[6px]" />
        <div className={`pointer-events-none relative flex size-full md:p-6 ${variant === "center" ? "low:p-0" : ""}`}>
          <div
            data-modal-panel
            className={`pointer-events-auto relative flex flex-col overflow-hidden border-white/12 bg-petrol-soft shadow-[0_40px_90px_-30px_rgb(0_0_0/0.7)] md:border ${panel}`}
          >
            {/* The glass's reflected highlight along its top edge. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(247_247_242/0.35),transparent)]" />
            {children}
          </div>
        </div>
      </CloseContext>
    </dialog>
  );
}

/** The round close button every modal has, top right. */
export function ModalCloseButton({ label = "Close" }: { label?: string }) {
  const close = useModalClose();
  return (
    <button
      type="button"
      onClick={close}
      aria-label={label}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-button border border-neutral/25 text-neutral transition-colors duration-[220ms] hover:border-accent hover:bg-accent hover:text-petrol"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
        <path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
