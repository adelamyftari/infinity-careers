"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True while React hydrates server HTML, false for components first mounted
 * on the client (e.g. after client-side navigation). Read it in a `useState`
 * initializer to decide once, at mount: the intro only plays on the first
 * document load.
 */
export function useIsHydrating() {
  return useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );
}
