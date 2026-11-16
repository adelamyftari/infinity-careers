/**
 * When the intro plays: once per browser session, on the first homepage load.
 *
 * - Turn it off entirely with NEXT_PUBLIC_INTRO=off.
 * - Add ?intro to the URL to replay it at any time.
 */
export const INTRO_ENABLED = process.env.NEXT_PUBLIC_INTRO !== "off";

const SEEN_KEY = "infinity-intro-seen";

export function markIntroSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: the intro simply plays again next load.
  }
}

/**
 * Runs before the first paint (in the root layout), so a visitor who has
 * already seen the intro never sees a frame of it. globals.css hides the
 * overlay when this attribute is present.
 */
export const INTRO_SEEN_SCRIPT = `try{if(${!INTRO_ENABLED}||(sessionStorage.getItem("${SEEN_KEY}")&&!new URLSearchParams(location.search).has("intro")))document.documentElement.dataset.introSeen=""}catch(e){}`;
