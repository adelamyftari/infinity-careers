"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { InfinityMark } from "@/components/brand/InfinityMark";
import {
  effectivePreferences,
  EXPERIENCE_STATUS_LABEL,
  EXPERIENCE_STATUSES,
  EXPERIENCE_YEARS,
  experienceErrors,
  LIMITS,
  personalErrors,
  preferenceResult,
  PRIVACY_ERROR,
  PRIVACY_POLICY_URL,
  roleChoices,
  STEP_ONE_KEYS,
  type ApplicationDraft,
  type ApplicationInput,
  type Errors,
  type Experience,
  type Personal,
  type RoleChoices,
} from "@/lib/careers/application";
import { propertyOptionLabel, UNSET, valueLabel, type Choice, type Preferences } from "@/lib/careers/offerings";
import { getCareersProperty } from "@/lib/careers/properties";
import { departmentName, propertyLabel, roleWhere, type RoleEntry } from "@/lib/careers/roles";
import { CAREER_GROUP_LABEL } from "@/lib/careers/taxonomy";
import { EASE, prefersReducedMotion } from "@/lib/motion";
import { Modal, ModalCloseButton, useModalClose } from "../Modal";
import { CvUpload } from "./CvUpload";
import { FieldGroup, FixedField, RadioField, SelectField, TextField, type Option } from "./fields";

const STEPS = ["PERSONAL DETAILS & JOB PREFERENCES", "UPLOAD CV & SUBMIT"] as const;

type ApplicationDialogProps = {
  entry: RoleEntry;
  draft: ApplicationDraft;
  onDraft: (draft: ApplicationDraft | null) => void;
  onClose: () => void;
  /** "Explore more positions" after a successful submission. */
  onExplore: () => void;
};

/** The application, in its modal. */
export default function ApplicationDialog(props: ApplicationDialogProps) {
  return (
    <Modal variant="center" labelledBy="application-title" onClose={props.onClose}>
      <ApplicationFlow {...props} />
    </Modal>
  );
}

type Outcome = { kind: "success"; type: "vacancy" | "interest" } | null;

/** The server's answer to a submission. */
type Reply = { ok: true; type?: "vacancy" | "interest" } | { ok: false; error?: string; message?: string; fields?: Errors };

function isReply(value: unknown): value is Reply {
  return !!value && typeof value === "object" && typeof (value as { ok?: unknown }).ok === "boolean";
}

/** Sends the application, reporting the upload's progress. Resolves null when the network failed. */
function send(form: FormData, onProgress: (share: number) => void): Promise<{ status: number; reply: Reply | null } | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/applications");
    xhr.responseType = "json";
    xhr.timeout = 90_000;
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onload = () => resolve({ status: xhr.status, reply: isReply(xhr.response) ? xhr.response : null });
    xhr.onerror = () => resolve(null);
    xhr.ontimeout = () => resolve(null);
    xhr.send(form);
  });
}

/**
 * What scrolls the form: the step's own area, or, on a short screen where the whole panel scrolls
 * as one page (the low variant), the panel.
 */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  const area = el.closest<HTMLElement>("[data-scroll]");
  if (area && /auto|scroll/.test(getComputedStyle(area).overflowY)) return area;
  return el.closest<HTMLElement>("[data-modal-panel]");
}

const stepOf = (key: string): 0 | 1 => ((STEP_ONE_KEYS as readonly string[]).includes(key) ? 0 : 1);
const fieldId = (key: string) => (key === "cv" ? "cv-label" : `app-${key}`);

const propertyName = (value: string) => propertyOptionLabel(value, propertyLabel);
const options = (choice: Choice, label: (value: string) => string = valueLabel): Option[] => choice.options.map((value) => ({ value, label: label(value) }));

function ApplicationFlow({ entry, draft, onDraft, onExplore }: ApplicationDialogProps) {
  const close = useModalClose();
  const vacancy = entry.kind === "vacancy";
  const { step, personal, preferences, experience, privacy, cv } = draft;
  const choices = roleChoices(entry, preferences);
  // What is in force (a field's only option, a choice still offered), not a stale earlier choice.
  const effective = effectivePreferences(choices);
  const preference = preferenceResult(entry, effective);

  const [attempted, setAttempted] = useState<[boolean, boolean]>([false, false]);
  const [serverFields, setServerFields] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const direction = useRef(1);
  const stepRoot = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const update = (patch: Partial<ApplicationDraft>) => onDraft({ ...draft, ...patch });
  const clearServer = (key: string) => setServerFields((f) => ({ ...f, [key]: undefined }));
  const setPersonal = (key: keyof Personal, value: string) => {
    clearServer(key);
    update({ personal: { ...personal, [key]: value } });
  };
  // A choice upstream may rule out one below it; what is still offered is kept (lib/careers/offerings).
  const setPreference = (key: keyof Preferences, errorKey: string, value: string) => {
    clearServer(errorKey);
    update({ preferences: { ...preferences, [key]: value } });
  };
  // Switching to "no experience" keeps the years and the previous job in the draft (they are not
  // sent), so switching back finds them again.
  const setExperience = (key: keyof Experience, errorKey: string, value: string) => {
    clearServer(errorKey);
    update({ experience: { ...experience, [key]: value } });
  };

  const errorsByStep: [Errors, Errors] = [
    { ...personalErrors(personal), ...preference.errors, ...experienceErrors(experience) },
    { ...(cv ? {} : { cv: "Please upload your CV." }), ...(privacy ? {} : { privacy: PRIVACY_ERROR }) },
  ];
  const shown = (s: 0 | 1): Errors => ({ ...(attempted[s] ? errorsByStep[s] : {}), ...Object.fromEntries(Object.entries(serverFields).filter(([k, v]) => v && stepOf(k) === s)) });
  const err = shown(step);

  // The header follows the choice: the chosen property once there is one.
  const chosen = preference.resolved?.propertyId;
  // A listing without a property says what it is (group and department), never "to be confirmed".
  const where = chosen
    ? { property: propertyLabel(chosen), location: getCareersProperty(chosen).city }
    : entry.propertyIds.length
      ? roleWhere(entry)
      : { property: CAREER_GROUP_LABEL[entry.careerGroup], location: departmentName(entry) };

  // Each step slides in from the side it comes from; focus goes to its heading.
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    if (stepRoot.current) scrollerOf(stepRoot.current)?.scrollTo({ top: 0 });
    if (prefersReducedMotion() || !stepRoot.current) return;
    const tween = gsap.fromTo(stepRoot.current, { x: direction.current * 32, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: EASE });
    return () => void tween.revert();
  }, [step]);

  function go(next: 0 | 1) {
    direction.current = next > step ? 1 : -1;
    setServerError(null);
    update({ step: next });
  }

  function focusFirst(errors: Errors) {
    const key = Object.keys(errors).find((k) => errors[k]);
    if (!key) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId(key));
      // Only the step's own scroll area moves (scrollIntoView would also shift the modal's frame
      // once that area reaches its end): the field a third of the way down it.
      const area = el ? scrollerOf(el) : null;
      if (el && area) {
        const top = el.getBoundingClientRect().top - area.getBoundingClientRect().top + area.scrollTop - area.clientHeight / 3;
        area.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
      el?.focus({ preventScroll: true });
    });
  }

  function next() {
    setAttempted(([, two]) => [true, two]);
    const errors = errorsByStep[0];
    if (Object.keys(errors).length) return focusFirst(errors);
    go(1);
  }

  async function submit() {
    if (submitting) return;
    setAttempted([true, true]);
    const firstBad = errorsByStep.findIndex((e) => Object.keys(e).length > 0);
    if (firstBad === 0 || firstBad === 1) {
      if (firstBad !== step) go(firstBad);
      return focusFirst(errorsByStep[firstBad]);
    }
    if (!cv) return;

    setSubmitting(true);
    setServerError(null);
    setServerFields({});
    setProgress(0);
    const input: ApplicationInput = { roleId: entry.id, personal, preferences: effective, experience, privacy };
    const form = new FormData();
    form.set("application", JSON.stringify(input));
    form.set("cv", cv, cv.name);
    form.set("company_website", (document.getElementById("app-company-website") as HTMLInputElement | null)?.value ?? "");
    const result = await send(form, setProgress);
    setSubmitting(false);
    setProgress(null);

    if (!result) {
      setServerError("We couldn't reach our server. Please check your connection and try again: everything you entered, and your CV, is still here.");
      return;
    }
    const { status, reply } = result;
    if (reply?.ok && status >= 200 && status < 300) {
      onDraft(null);
      setOutcome({ kind: "success", type: reply.type ?? (vacancy ? "vacancy" : "interest") });
      return;
    }
    const fields = reply && !reply.ok ? (reply.fields ?? {}) : {};
    setServerFields(fields);
    setServerError(reply && !reply.ok && reply.message ? reply.message : "Something went wrong and your application was not submitted. Please try again.");
    const bad = Object.keys(fields).filter((k) => fields[k]);
    if (bad.length) {
      const target = bad.some((k) => stepOf(k) === 0) ? 0 : 1;
      if (target !== step) go(target);
      focusFirst(fields);
    }
  }

  if (outcome) return <Success type={outcome.type} title={entry.title} onClose={close} onExplore={onExplore} />;

  return (
    <>
      {/* Header: what is being applied for, straight from the role. */}
      <div className="border-b border-neutral/10 px-5 pb-4 pt-4 md:px-9 md:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div data-modal-reveal className="min-w-0">
            <p className="text-label font-medium tracking-[0.18em] text-accent">
              APPLICATION <span className="text-neutral/40">/</span> INFINITY CAREERS
            </p>
            <h2 id="application-title" className="mt-3 font-bold leading-[0.95] tracking-[-0.03em]">
              <span className="block text-small tracking-[0.14em] text-neutral/60">{vacancy ? "APPLY FOR" : "REGISTER INTEREST IN"}</span>
              <span className="mt-1 block text-balance text-[clamp(1.625rem,1.1rem+1.8vw,2.5rem)]">{entry.title.toUpperCase()}</span>
            </h2>
            <p className="mt-2 text-small text-neutral/70">
              {where.property}
              <span aria-hidden="true" className="px-1.5 text-neutral/35">·</span>
              {where.location}
              {!vacancy && <span className="ml-2 rounded-full border border-neutral/20 px-2 py-0.5 text-label text-neutral/70">Future opportunity</span>}
            </p>
          </div>
          <ModalCloseButton label="Close the application" />
        </div>

        {/* Progress: two steps, the current one in Infinity Yellow, and where you are: 01 / 02. */}
        <div data-modal-reveal className="mt-5 flex items-end gap-4">
          <ol aria-label="Application progress" className="grid flex-1 grid-cols-2 gap-2">
            {STEPS.map((label, i) => (
              <li key={label} aria-current={i === step ? "step" : undefined}>
                <span className="block h-[3px] overflow-hidden rounded-full bg-neutral/15">
                  <span className={`block h-full rounded-full bg-accent transition-[width] duration-500 ease-premium ${i < step ? "w-full" : i === step ? "w-1/2" : "w-0"}`} />
                </span>
                <span className={`mt-2 block truncate text-label font-medium tracking-[0.08em] ${i === step ? "text-neutral" : "text-neutral/45"}`}>
                  <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="max-md:sr-only"> — {label}</span>
                  {i < step && <span className="sr-only"> (done)</span>}
                </span>
              </li>
            ))}
          </ol>
          <p aria-hidden="true" className="shrink-0 pb-px text-label font-medium tabular-nums tracking-[0.08em] text-neutral/60">
            <span className="text-accent">{String(step + 1).padStart(2, "0")}</span> / {String(STEPS.length).padStart(2, "0")}
          </p>
        </div>
      </div>

      <div data-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 md:px-9 low:flex-none low:overflow-visible">
        <div ref={stepRoot}>
          <h3 ref={heading} tabIndex={-1} className="text-[clamp(1.25rem,1rem+0.8vw,1.625rem)] font-bold tracking-[-0.015em] outline-none">
            <span className="text-accent tabular-nums">{String(step + 1).padStart(2, "0")}</span> — {STEPS[step]}
          </h3>
          <p className="mt-1 text-small text-neutral/60">
            {step === 0 && "How we can reach you, what you are applying for, and your experience. No account is needed."}
            {step === 1 && "Add your CV and send. Nothing is submitted before you do."}
          </p>

          <div className="mt-6 grid gap-6">
            {step === 0 && (
              <>
                <FieldGroup title="PERSONAL INFORMATION">
                  <TextField id="app-firstName" label="First name" required autoComplete="given-name" maxLength={LIMITS.name} value={personal.firstName} onChange={(v) => setPersonal("firstName", v)} error={err.firstName} />
                  <TextField id="app-lastName" label="Last name" required autoComplete="family-name" maxLength={LIMITS.name} value={personal.lastName} onChange={(v) => setPersonal("lastName", v)} error={err.lastName} />
                  <TextField id="app-email" label="Email address" type="email" inputMode="email" required autoComplete="email" maxLength={LIMITS.email} value={personal.email} onChange={(v) => setPersonal("email", v)} error={err.email} />
                  <TextField id="app-phone" label="Phone number" type="tel" inputMode="tel" required autoComplete="tel" maxLength={LIMITS.phone} placeholder="+355 …" value={personal.phone} onChange={(v) => setPersonal("phone", v)} error={err.phone} />
                </FieldGroup>

                <FieldGroup title={vacancy ? "JOB PREFERENCES" : "LOCATION PREFERENCE"}>
                  <JobPreferences choices={choices} err={err} onChange={setPreference} />
                </FieldGroup>

                <FieldGroup title="YOUR EXPERIENCE">
                  <RadioField
                    id="app-experienceStatus"
                    label="Do you have previous work experience?"
                    required
                    className="md:col-span-2"
                    options={EXPERIENCE_STATUSES.map((value) => ({ value, label: EXPERIENCE_STATUS_LABEL[value] }))}
                    value={experience.status}
                    onChange={(v) => setExperience("status", "experienceStatus", v)}
                    error={err.experienceStatus}
                  />
                  {experience.status === "with_experience" && (
                    <>
                      <RadioField
                        id="app-experienceYears"
                        label="Years of experience"
                        required
                        grid
                        className="md:col-span-2"
                        options={EXPERIENCE_YEARS.map((value) => ({ value, label: value }))}
                        value={experience.years}
                        onChange={(v) => setExperience("years", "experienceYears", v)}
                        error={err.experienceYears}
                      />
                      <TextField
                        id="app-previousPosition"
                        label="Previous job position"
                        maxLength={LIMITS.previousPosition}
                        placeholder="e.g. Receptionist, Dealer, Waiter"
                        value={experience.previousPosition}
                        onChange={(v) => setExperience("previousPosition", "previousPosition", v)}
                        error={err.previousPosition}
                      />
                    </>
                  )}
                </FieldGroup>
              </>
            )}

            {step === 1 && (
              <>
                <CvUpload
                  file={cv}
                  onFile={(file) => {
                    clearServer("cv");
                    update({ cv: file });
                  }}
                  error={err.cv}
                  progress={progress}
                />

                <Summary entry={entry} choices={choices} experience={experience} onEdit={() => go(0)} />

                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      id="app-privacy"
                      type="checkbox"
                      checked={privacy}
                      onChange={(e) => {
                        clearServer("privacy");
                        update({ privacy: e.target.checked });
                      }}
                      aria-invalid={err.privacy ? true : undefined}
                      aria-describedby={err.privacy ? "app-privacy-error" : undefined}
                      className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--brand-accent)]"
                    />
                    <span className="text-small text-neutral/85">
                      I agree to the processing of my personal data for recruitment purposes.
                      {PRIVACY_POLICY_URL && (
                        <>
                          {" "}
                          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener" className="text-accent underline underline-offset-4">
                            Read the privacy policy
                          </a>
                          .
                        </>
                      )}
                      <span aria-hidden="true" className="ml-1 text-accent">
                        *
                      </span>
                    </span>
                  </label>
                  {err.privacy && (
                    <p id="app-privacy-error" className="mt-1.5 pl-8 text-small text-accent">
                      {err.privacy}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Unseen by people: a script that fills every field fills this one too. */}
          <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
            <label htmlFor="app-company-website">Company website</label>
            <input id="app-company-website" name="company_website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
        </div>
      </div>

      {/* The actions, always in reach. */}
      <div className="border-t border-neutral/10 bg-petrol/60 px-5 py-4 md:px-9 low:sticky low:bottom-0 low:z-10 low:bg-petrol-soft">
        {serverError && (
          <p role="alert" className="mb-3 rounded-[12px] border border-accent/50 bg-accent/10 px-4 py-3 text-small text-neutral">
            {serverError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          {step === 1 ? (
            <button type="button" onClick={() => go(0)} disabled={submitting} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-[14px] px-4 text-small font-semibold tracking-[0.06em] text-neutral/85 transition-colors hover:text-accent disabled:opacity-40">
              <span aria-hidden="true">←</span> BACK
            </button>
          ) : (
            <span />
          )}
          {step === 0 ? (
            <button type="button" onClick={next} className="group/cta inline-flex h-12 cursor-pointer items-center gap-2 rounded-[14px] bg-neutral px-6 text-small font-semibold tracking-[0.06em] text-petrol transition-colors duration-300 hover:bg-accent">
              CONTINUE
              <span aria-hidden="true" className="transition-transform duration-500 ease-premium group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5">
                ↗
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              aria-busy={submitting || undefined}
              className="group/cta inline-flex h-12 cursor-pointer items-center gap-2 rounded-[14px] bg-accent px-6 text-small font-semibold tracking-[0.06em] text-petrol transition-colors duration-300 hover:bg-neutral disabled:cursor-wait disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-petrol/30 border-t-petrol" />
                  SUBMITTING…
                </>
              ) : (
                <>
                  {vacancy ? "SUBMIT APPLICATION" : "SUBMIT INTEREST"}
                  <span aria-hidden="true" className="transition-transform duration-500 ease-premium group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5">
                    ↗
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * The location, the position level and the contract type, in that order: each
 * offers only what the listings offer given the choices before it. Nothing is
 * preselected: a single level or contract is still the candidate's to choose.
 * A value HR has not set is not a choice and is not shown at all (no "to be
 * confirmed" field); one property is shown as where the role is.
 */
function JobPreferences({ choices, err, onChange }: { choices: RoleChoices; err: Errors; onChange: (key: keyof Preferences, errorKey: string, value: string) => void }) {
  const only = (choice: Choice) => (choice.options.length === 1 ? choice.options[0] : null);
  const property =
    choices.property.options.length > 1 ? (
      <SelectField
        id="app-property"
        label={choices.kind === "vacancy" ? "Which location would you like to apply to?" : "Which location would you like to work at?"}
        required
        options={options(choices.property, propertyName)}
        value={choices.property.value}
        onChange={(v) => onChange("propertyId", "property", v)}
        error={err.property}
      />
    ) : only(choices.property) && only(choices.property) !== UNSET ? (
      <FixedField id="app-property" label="Location" value={propertyName(only(choices.property) ?? "")} note="Where this role is" />
    ) : null;

  if (choices.kind === "role")
    return (
      <>
        {property && <div className="md:col-span-2">{property}</div>}
        <p className="text-small text-neutral/60 md:col-span-2">There is no open vacancy for this role right now, so there is no level or contract to choose. HR will discuss them if a position opens.</p>
      </>
    );

  const levelUnset = only(choices.level) === UNSET;
  const level = !choices.property.value ? (
    <FixedField id="app-level" label="Which position level are you applying for?" value="Choose a location first" />
  ) : levelUnset ? null : (
    <RadioField id="app-level" label="Which position level are you applying for?" required options={options(choices.level)} value={choices.level.value} onChange={(v) => onChange("level", "level", v)} error={err.level} />
  );

  const type = !choices.level.value ? (
    <FixedField id="app-employmentType" label="Preferred employment type" value={choices.property.value ? "Choose a position level first" : "Choose a location first"} />
  ) : only(choices.employmentType) === UNSET ? null : (
    <RadioField
      id="app-employmentType"
      label="Preferred employment type"
      required
      className={levelUnset ? "md:col-span-2" : ""}
      options={options(choices.employmentType)}
      value={choices.employmentType.value}
      onChange={(v) => onChange("employmentType", "employmentType", v)}
      error={err.employmentType}
    />
  );

  return (
    <>
      {property && <div className="md:col-span-2">{property}</div>}
      {level}
      {type}
    </>
  );
}

/** A small summary of what is being applied for: not a review step. Only what is known is listed. */
function Summary({ entry, choices, experience, onEdit }: { entry: RoleEntry; choices: RoleChoices; experience: Experience; onEdit: () => void }) {
  const known = (label: string, value: string, name: (v: string) => string = valueLabel): [string, string][] => (value && value !== UNSET ? [[label, name(value)]] : []);
  const rows: [string, string][] = [
    ["Position", entry.title],
    ...known("Property", choices.property.value, propertyName),
    ...(choices.kind === "vacancy" ? [...known("Employment", choices.employmentType.value), ...known("Position level", choices.level.value)] : []),
    ["Experience", experience.status === "with_experience" ? `With Experience · ${experience.years}` : "No Previous Experience"],
  ];
  return (
    <section aria-labelledby="summary-title" className="rounded-[14px] border border-neutral/12 bg-neutral/[0.04] px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <h4 id="summary-title" className="text-label font-medium tracking-[0.18em] text-neutral/60">
          YOUR APPLICATION
        </h4>
        <button type="button" onClick={onEdit} className="-mr-2 cursor-pointer rounded-[8px] px-2.5 py-1 text-small text-accent hover:bg-neutral/10">
          Edit details
        </button>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2 md:grid-cols-3">
        {rows.map(([term, detail]) => (
          <div key={term} className="min-w-0">
            <dt className="text-label tracking-[0.08em] text-neutral/50">{term.toUpperCase()}</dt>
            <dd className="break-words text-small text-neutral">{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** After the server has confirmed it: the monogram, a ring, the headline. */
function Success({ type, title, onClose, onExplore }: { type: "vacancy" | "interest"; title: string; onClose: () => void; onExplore: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const interest = type === "interest";

  useLayoutEffect(() => {
    const el = root.current;
    el?.querySelector<HTMLElement>("[data-success-title]")?.focus({ preventScroll: true });
    if (!el || prefersReducedMotion()) return;
    const q = gsap.utils.selector(el);
    const tl = gsap
      .timeline({ defaults: { ease: EASE } })
      .fromTo(q("[data-ring]"), { scale: 0.4, autoAlpha: 0.9 }, { scale: 1.8, autoAlpha: 0, duration: 1.4 }, 0.15)
      .fromTo(q("[data-ring-still]"), { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.9 }, 0.1)
      .fromTo(q("[data-mark]"), { scale: 0.5, autoAlpha: 0, rotate: -12 }, { scale: 1, autoAlpha: 1, rotate: 0, duration: 0.9 }, 0)
      .fromTo(q("[data-success-line]"), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.1 }, 0.35)
      .fromTo(q("[data-success-fade]"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.6);
    return () => void tl.revert();
  }, []);

  const words = interest ? ["INTEREST", "REGISTERED."] : ["APPLICATION", "RECEIVED."];

  return (
    <div ref={root} className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-14 text-center md:px-12 md:py-20">
      <div className="absolute right-4 top-4">
        <ModalCloseButton />
      </div>
      <div className="relative flex size-28 items-center justify-center">
        <span data-ring aria-hidden="true" className="absolute inset-0 rounded-full border border-accent" />
        <span data-ring-still aria-hidden="true" className="absolute inset-0 rounded-full border border-accent/40" />
        <InfinityMark data-mark className="size-14" />
      </div>
      <h2 id="application-title" data-success-title tabIndex={-1} aria-label={interest ? "Interest registered." : "Application received."} className="mt-8 text-[clamp(2.25rem,1.4rem+3vw,4rem)] font-bold leading-[0.92] tracking-[-0.035em] outline-none">
        {words.map((word, i) => (
          <span key={word} aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
            <span data-success-line className={`block ${i === 1 ? "text-accent" : ""}`}>
              {word}
            </span>
          </span>
        ))}
      </h2>
      <p data-success-fade className="mt-5 max-w-[34rem] text-lead text-neutral/80">
        {interest
          ? "Thank you for your interest in joining Infinity. Your details have been registered successfully. Our recruitment team will review the information provided and may contact you when a matching position opens."
          : "Thank you for your interest in joining Infinity. Your application has been submitted successfully. Our recruitment team will review the information provided."}
      </p>
      <p data-success-fade className="mt-2 text-small text-neutral/55">{title}</p>
      <div data-success-fade className="mt-9 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onClose} className="inline-flex h-12 cursor-pointer items-center justify-center rounded-[14px] border border-neutral/30 px-6 text-small font-semibold tracking-[0.06em] text-neutral transition-colors hover:border-accent hover:text-accent">
          CLOSE
        </button>
        <button type="button" onClick={onExplore} className="group/cta inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-accent px-6 text-small font-semibold tracking-[0.06em] text-petrol transition-colors duration-300 hover:bg-neutral">
          EXPLORE MORE POSITIONS
          <span aria-hidden="true" className="transition-transform duration-500 ease-premium group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5">
            ↗
          </span>
        </button>
      </div>
    </div>
  );
}
