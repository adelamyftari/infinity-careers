import type { CSSProperties, RefObject } from "react";
import gsap from "gsap";

/** Each scene takes over at these seconds on the master timeline. */
export const SCENE_AT = [0, 0.75, 1.5, 2.25, 3] as const;
/** The last scene starts compressing here, and the logo starts here. */
const COMPRESS_AT = 3.5;
export const LOGO_AT = 3.72;
/** The latest moment the master can wait for the logo without showing a stall. */
export const LOGO_GATE_AT = 3.45;

// The loader's palette, as literal colours: Dark Forest Teal, Infinity Yellow, Muted Teal and pure
// white. Each scene's background is solid and painted with its own type, never read from a
// stylesheet variable that could be missing (a stale stylesheet once left a scene transparent, its
// white type over the white scene beneath).
export const PETROL = "#102f32";
const YELLOW = "#e9ae00";
const MUTED_TEAL = "#286b65";
const WHITE = "#ffffff";

/** The colour the page's scrollbar takes while each scene is up, so nothing breaks the field. */
export const SCENE_COLOR = [PETROL, WHITE, MUTED_TEAL, YELLOW, WHITE] as const;

/** Scene entrances: each panel waits, clipped away, in the server-rendered HTML, so no scene can flash. */
const HIDDEN = {
  horizontal: "inset(0% 0% 0% 100%)",
  upward: "inset(100% 0% 0% 0%)",
  diagonal: "polygon(0% 0%, 0% 0%, -35% 100%, -35% 100%)",
  expand: "inset(50% 50% 50% 50%)",
};
const SHOWN = {
  rect: "inset(0% 0% 0% 0%)",
  diagonal: "polygon(0% 0%, 135% 0%, 100% 100%, -35% 100%)",
};

/**
 * One line per array, one span per word. Sizes keep the longest line inside the screen in both
 * directions; `fitType` scales a line down further if the face that loaded runs wider.
 */
const SCENES: { lines: string[][]; size: string; background: string; color: string; clip?: string }[] = [
  { lines: [["ARE", "YOU"], ["YOUNG?"]], size: "min(19.5vw, 36vh)", background: PETROL, color: YELLOW },
  { lines: [["ENERGETIC?"]], size: "min(14.2vw, 44vh)", background: WHITE, color: PETROL, clip: HIDDEN.horizontal },
  { lines: [["ENTHUSIASTIC?"]], size: "min(11.2vw, 44vh)", background: MUTED_TEAL, color: WHITE, clip: HIDDEN.upward },
  { lines: [["EAGER", "TO"], ["GROW?"]], size: "min(16.4vw, 36vh)", background: YELLOW, color: PETROL, clip: HIDDEN.diagonal },
  { lines: [["YOUR", "FUTURE"], ["STARTS", "HERE."]], size: "min(11.6vw, 30vh)", background: WHITE, color: PETROL, clip: HIDDEN.expand },
];
/** The most of the screen's width a settled line may take. */
const MAX_WIDTH = 0.9;

/**
 * The five full-screen typographic scenes, in the site's display face (Inter Tight) at its heaviest weight, Black, upright, set tight. The words
 * are real text but decorative here: the overlay they sit in is hidden from
 * assistive technology, which goes straight to the page.
 */
export function KineticType({ root }: { root: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={root} className="absolute inset-0 overflow-hidden" data-kinetic>
      {SCENES.map((scene, i) => {
        const style: CSSProperties = { backgroundColor: scene.background, color: scene.color, clipPath: scene.clip };
        return (
          <section key={i} data-scene={i} className="absolute inset-0 flex items-center justify-center" style={style}>
            <p
              data-type
              className="invisible text-center font-black leading-[0.9] tracking-[-0.03em] [font-family:var(--font-grotesk)]"
              style={{ fontSize: scene.size }}
            >
              {scene.lines.map((words, l) => (
                <span key={l} data-line className="block whitespace-nowrap">
                  {words.map((word, w) => (
                    <span key={w}>
                      {w > 0 && " "}
                      <span data-word className="inline-block">
                        {i === 2
                          ? [...word].map((char, c) => (
                              <span key={c} data-char className="inline-block">
                                {char}
                              </span>
                            ))
                          : word}
                      </span>
                    </span>
                  ))}
                </span>
              ))}
            </p>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Scales any scene's type down until its widest line fits MAX_WIDTH of the screen, measured from
 * the text in the face that actually loaded (its computed font and tracking), so the entrance
 * transforms already set on the letters cannot affect it. Run once the face is in.
 */
export function fitType(root: HTMLElement) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return;
  root.querySelectorAll<HTMLElement>("[data-type]").forEach((type) => {
    // From the scene's own responsive size (set inline from SCENES), every time.
    type.dataset.size ??= type.style.fontSize;
    type.style.fontSize = type.dataset.size;
    const style = getComputedStyle(type);
    const size = parseFloat(style.fontSize);
    const tracking = parseFloat(style.letterSpacing) || 0;
    context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    const widest = Math.max(
      ...Array.from(type.querySelectorAll<HTMLElement>("[data-line]"), (line) => {
        const text = line.textContent ?? "";
        return context.measureText(text).width + tracking * text.length;
      }),
    );
    const room = window.innerWidth * MAX_WIDTH;
    if (widest > room) type.style.fontSize = `${(size * room) / widest}px`;
  });
}

/** Adds the typography to the master timeline. It leaves the screen open for the logo at LOGO_AT. */
export function addKineticType(master: gsap.core.Timeline, root: HTMLElement) {
  const scene = (i: number) => root.querySelector<HTMLElement>(`[data-scene="${i}"]`)!;
  const type = (i: number) => scene(i).querySelector<HTMLElement>("[data-type]")!;
  const all = (i: number, part: string) => Array.from(scene(i).querySelectorAll<HTMLElement>(part));
  const show = (i: number, at: number) => master.set(type(i), { autoAlpha: 1 }, at);
  const WIPE = { duration: 0.36, ease: "power4.inOut" };
  const SETTLE = { duration: 0.56, ease: "expo.out" };

  // 01 Dark Forest Teal. Bursts up from below, leaning into the move.
  show(0, 0);
  master.fromTo(
    all(0, "[data-line]"),
    { yPercent: 170, skewX: -20, scale: 1.2, rotation: -3 },
    { yPercent: 0, skewX: 0, scale: 1, rotation: 0, stagger: 0.06, ...SETTLE },
    0.02,
  );

  // 02 White. A horizontal wipe pushes the teal away; the word arrives against it.
  const second = SCENE_AT[1];
  master.to(scene(0), { xPercent: -22, duration: 0.36, ease: "power3.in" }, second - 0.16);
  master.to(type(0), { skewX: 16, duration: 0.36, ease: "power3.in" }, second - 0.16);
  master.to(scene(1), { clipPath: SHOWN.rect, ...WIPE }, second - 0.16);
  show(1, second - 0.1);
  master.fromTo(type(1), { x: () => -0.7 * window.innerWidth, skewX: 28 }, { x: 0, skewX: 0, ...SETTLE }, second - 0.1);

  // 03 Muted Teal. Comes up from below; the letters run in sideways and lock.
  const third = SCENE_AT[2];
  master.to(scene(2), { clipPath: SHOWN.rect, ...WIPE }, third - 0.16);
  master.to(type(1), { yPercent: -60, duration: 0.36, ease: "power3.in" }, third - 0.16);
  show(2, third - 0.1);
  master.fromTo(
    all(2, "[data-char]"),
    { x: () => 0.55 * window.innerWidth, skewX: -32 },
    { x: 0, skewX: 0, stagger: 0.014, duration: 0.46, ease: "expo.out" },
    third - 0.1,
  );

  // 04 Infinity Yellow. A slanted edge takes the screen; the words come from three sides into one block.
  const fourth = SCENE_AT[3];
  master.to(scene(3), { clipPath: SHOWN.diagonal, ...WIPE }, fourth - 0.16);
  show(3, fourth - 0.08);
  const words = all(3, "[data-word]");
  const from = [
    { xPercent: -130, rotation: -7 },
    { yPercent: -220, rotation: 5 },
    { xPercent: 130, rotation: 5 },
  ];
  words.forEach((word, i) => {
    master.fromTo(word, { ...from[i], skewX: -14 }, { xPercent: 0, yPercent: 0, rotation: 0, skewX: 0, ...SETTLE }, fourth - 0.08 + i * 0.07);
  });

  // 05 White. The panel opens from the centre; the answer lands with weight.
  const fifth = SCENE_AT[4];
  master.to(scene(4), { clipPath: SHOWN.rect, duration: 0.34, ease: "power4.out" }, fifth - 0.12);
  show(4, fifth - 0.1);
  master.fromTo(type(4), { scale: 1.75, skewX: -8 }, { scale: 1, skewX: 0, ...SETTLE }, fifth - 0.1);

  // Into the logo: the words compress to the point where the logo forms, and their panel closes around them.
  master.to(type(4), { scale: 0.05, skewX: 14, duration: 0.24, ease: "power3.in" }, COMPRESS_AT);
  master.to(scene(4), { clipPath: HIDDEN.expand, duration: 0.3, ease: "power4.inOut" }, COMPRESS_AT + 0.06);
  // The earlier panels are all covered by now: only the logo's field remains beneath.
  master.set([0, 1, 2, 3].map(scene), { autoAlpha: 0 }, COMPRESS_AT + 0.06);
}
