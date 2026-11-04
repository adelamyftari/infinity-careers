/**
 * Fires once per document, when the intro starts clearing to reveal the page
 * (or at once, when there is no intro). Page entrances start from it.
 */
let revealed = false;
const listeners = new Set<() => void>();

export function signalIntroReveal() {
  if (revealed) return;
  revealed = true;
  listeners.forEach((listener) => listener());
  listeners.clear();
}

/** Calls back on reveal, immediately if it has already happened. Returns an unsubscribe. */
export function onIntroReveal(listener: () => void) {
  if (revealed) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
