"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@/components/editorial/Editorial";
import { button } from "@/components/ui/button";
import { PRIVACY_POLICY_URL } from "@/lib/careers/application";
import { HEADQUARTERS_CONTACT } from "@/lib/site/contact";
import { CONTACT_LIMITS, CONTACT_SUBJECTS, contactErrors, EMPTY_MESSAGE, type ContactErrors, type ContactMessage } from "@/lib/site/contact-form";

const INPUT =
  "block w-full rounded-[12px] border border-primary/15 bg-white px-4 text-body text-primary outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/60 focus:border-primary focus:shadow-[0_0_0_3px_rgb(233_174_0/0.45)] aria-invalid:border-accent aria-invalid:shadow-[0_0_0_1px_var(--color-accent)]";

type Reply = { ok: boolean; error?: string; message?: string; fields?: ContactErrors };

/**
 * A short general enquiry (not a job application: candidates apply on /roles). One step: five
 * fields, the privacy agreement (never pre-checked), send. "Message received." appears only once
 * the server has saved it; if online messages are not set up yet, the server says so and the
 * headquarters' phone number is offered instead.
 */
export function ContactForm() {
  const [message, setMessage] = useState<ContactMessage>(EMPTY_MESSAGE);
  const [attempted, setAttempted] = useState(false);
  const [serverFields, setServerFields] = useState<ContactErrors>({});
  const [serverError, setServerError] = useState<{ text: string; offerPhone: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const errors: ContactErrors = { ...(attempted ? contactErrors(message) : {}), ...serverFields };
  const set = <K extends keyof ContactMessage>(key: K, value: ContactMessage[K]) => {
    setServerFields((f) => ({ ...f, [key]: undefined }));
    setMessage((m) => ({ ...m, [key]: value }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setAttempted(true);
    const problems = contactErrors(message);
    const first = (Object.keys(problems) as (keyof ContactMessage)[])[0];
    if (first) {
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSending(true);
    setServerError(null);
    setServerFields({});
    const honeypot = (form.current?.elements.namedItem("company_website") as HTMLInputElement | null)?.value ?? "";
    let reply: Reply | null = null;
    let status = 0;
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...message, company_website: honeypot }) });
      status = response.status;
      reply = (await response.json().catch(() => null)) as Reply | null;
    } catch {
      reply = null;
    }
    setSending(false);
    if (reply?.ok && status >= 200 && status < 300) {
      setSent(true);
      return;
    }
    if (!reply) {
      setServerError({ text: "We couldn't reach our server. Please check your connection and try again: your message is still here.", offerPhone: false });
      return;
    }
    setServerFields(reply.fields ?? {});
    setServerError({ text: reply.message ?? "Your message could not be sent. Please try again.", offerPhone: reply.error === "not_configured" || reply.error === "save_failed" });
  }

  if (sent)
    return (
      <div role="status" className="rounded-[14px] border border-primary/12 bg-white/80 p-[clamp(1.5rem,3vw,2.5rem)] backdrop-blur-sm">
        <p className="text-[clamp(2rem,1.2rem+2.6vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.035em]">
          MESSAGE <span className="text-accent [-webkit-text-stroke:0.5px_var(--color-primary)]">RECEIVED.</span>
        </p>
        <p className="mt-4 max-w-[30rem] text-lead text-muted">Thank you for contacting Infinity. Your message has been received.</p>
      </div>
    );

  const field = (key: keyof ContactMessage, label: string, input: ReactNode, required = true, hint?: string) => (
    <div>
      <label htmlFor={`contact-${key}`} className="block text-small font-medium text-primary">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-primary/55">
            *
          </span>
        ) : (
          <span className="ml-1.5 font-normal text-muted">(optional)</span>
        )}
      </label>
      <div className="mt-1.5">{input}</div>
      {hint && !errors[key] && <p className="mt-1.5 text-label text-muted">{hint}</p>}
      {errors[key] && (
        <p id={`contact-${key}-error`} className="mt-1.5 flex items-start gap-1.5 text-small font-medium text-primary">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 4.75v4M8 11.1v.15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          {errors[key]}
        </p>
      )}
    </div>
  );
  const aria = (key: keyof ContactMessage) => ({ id: `contact-${key}`, name: key, "aria-invalid": errors[key] ? true : undefined, "aria-describedby": errors[key] ? `contact-${key}-error` : undefined });

  return (
    <form ref={form} noValidate onSubmit={submit} aria-label="Send us a message" className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        {field("fullName", "Full name", <input {...aria("fullName")} type="text" autoComplete="name" maxLength={CONTACT_LIMITS.fullName} value={message.fullName} onChange={(e) => set("fullName", e.target.value)} className={`${INPUT} h-12`} />)}
        {field("email", "Email address", <input {...aria("email")} type="email" inputMode="email" autoComplete="email" maxLength={CONTACT_LIMITS.email} value={message.email} onChange={(e) => set("email", e.target.value)} className={`${INPUT} h-12`} />)}
        {field("phone", "Phone number", <input {...aria("phone")} type="tel" inputMode="tel" autoComplete="tel" maxLength={CONTACT_LIMITS.phone} placeholder="+355 …" value={message.phone} onChange={(e) => set("phone", e.target.value)} className={`${INPUT} h-12`} />, false)}
        {field(
          "subject",
          "Subject",
          <div className="relative">
            <select {...aria("subject")} value={message.subject} onChange={(e) => set("subject", e.target.value as ContactMessage["subject"])} className={`${INPUT} h-12 cursor-pointer appearance-none pr-10`}>
              <option value="">Choose a subject…</option>
              {CONTACT_SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 12 12" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2 text-muted">
              <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>,
        )}
      </div>
      {message.subject === "Careers & Recruitment" && (
        <p className="rounded-[12px] bg-primary/[0.05] px-4 py-3 text-small text-primary">
          Applying for a position? Please apply through{" "}
          <Link href="/roles" className="font-semibold underline decoration-accent decoration-2 underline-offset-4">
            Positions
          </Link>
          , where your application and CV reach our recruitment team directly.
        </p>
      )}
      {field(
        "message",
        "Message",
        <textarea {...aria("message")} rows={6} maxLength={CONTACT_LIMITS.message} value={message.message} onChange={(e) => set("message", e.target.value)} className={`${INPUT} min-h-40 resize-y py-3`} />,
        true,
        `${message.message.length} / ${CONTACT_LIMITS.message}`,
      )}

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="contact-privacy"
            name="privacy"
            type="checkbox"
            checked={message.privacy}
            onChange={(e) => set("privacy", e.target.checked)}
            aria-invalid={errors.privacy ? true : undefined}
            aria-describedby={errors.privacy ? "contact-privacy-error" : undefined}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--brand-primary)]"
          />
          <span className="text-small text-primary/85">
            I agree that Infinity may use these details to answer my message.
            {PRIVACY_POLICY_URL && (
              <>
                {" "}
                <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener" className="underline underline-offset-4">
                  Read the privacy policy
                </a>
                .
              </>
            )}
            <span aria-hidden="true" className="ml-1 text-primary/55">
              *
            </span>
          </span>
        </label>
        {errors.privacy && (
          <p id="contact-privacy-error" className="mt-1.5 flex items-start gap-1.5 pl-8 text-small font-medium text-primary">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 4.75v4M8 11.1v.15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            {errors.privacy}
          </p>
        )}
      </div>

      {/* Unseen by people: a script that fills every field fills this one too. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="contact-company-website">Company website</label>
        <input id="contact-company-website" name="company_website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {serverError && (
        <div role="alert" className="rounded-[12px] border border-accent bg-accent/10 px-4 py-3 text-small text-primary">
          <p>{serverError.text}</p>
          {serverError.offerPhone && (
            <p className="mt-1.5">
              Call us on{" "}
              <a href={HEADQUARTERS_CONTACT.phoneHref} className="font-semibold underline decoration-accent decoration-2 underline-offset-4">
                {HEADQUARTERS_CONTACT.phone}
              </a>
              .
            </p>
          )}
        </div>
      )}

      <div>
        <button type="submit" disabled={sending} aria-busy={sending || undefined} className={`group/arrow ${button.action} disabled:opacity-70`}>
          {sending ? (
            <>
              <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-neutral/30 border-t-neutral" />
              SENDING…
            </>
          ) : (
            <>
              SEND MESSAGE
              <ArrowUpRight />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
