/**
 * Ref-counted lock for `document.body.style.overflow`.
 *
 * Several dialogs used to write that global directly and release it with
 * `= ''`. Dropping the inline value re-exposes the base `body { overflow }`
 * rule, so on mobile — where the shell scrolls the page instead of an inner
 * pane — closing any dialog froze scrolling until a reload. Going through this
 * module means the last release restores exactly what was set before the first
 * lock, and overlapping dialogs don't unlock each other.
 */

let lockCount = 0;
let savedOverflow = "";

/** Locks body scroll. Returns a release function that is safe to call twice. */
export function lockBodyScroll(): () => void {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount <= 0) {
      lockCount = 0;
      document.body.style.overflow = savedOverflow;
      savedOverflow = "";
    }
  };
}
