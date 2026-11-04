/**
 * Lets any page ask the hero's job explorer to show one property's roles:
 * the explorer owns the filter state, this only carries the request.
 *
 * The request is also held until an explorer takes it, so it survives the
 * client-side navigation from /properties to the homepage, where the
 * explorer picks it up as it mounts.
 */

const EVENT = "infinity:filter-property";

let pending: string | null = null;

export function requestPropertyFilter(property: string) {
  pending = property;
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: property }));
}

export function onPropertyFilterRequest(listener: (property: string) => void) {
  const handle = (event: Event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail !== "string") return;
    pending = null;
    listener(event.detail);
  };
  window.addEventListener(EVENT, handle);

  if (pending !== null) {
    const property = pending;
    pending = null;
    listener(property);
  }

  return () => window.removeEventListener(EVENT, handle);
}
