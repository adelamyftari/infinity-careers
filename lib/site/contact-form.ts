/**
 * The contact form: what it asks and the rules it must meet, for the form (inline errors) and the
 * server (app/api/contact/route.ts), which checks everything again. A general enquiry, not a job
 * application: candidates apply through /roles.
 */

export const CONTACT_SUBJECTS = ["General Inquiry", "Careers & Recruitment", "Business Inquiry", "Other"] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export type ContactMessage = { fullName: string; email: string; phone: string; subject: ContactSubject | ""; message: string; privacy: boolean };

export const EMPTY_MESSAGE: ContactMessage = { fullName: "", email: "", phone: "", subject: "", message: "", privacy: false };

export const CONTACT_LIMITS = { fullName: 120, email: 254, phone: 24, message: 2000 } as const;
/** Short of a sentence is not a message. */
export const MESSAGE_MIN = 10;

export type ContactErrors = Partial<Record<keyof ContactMessage, string>>;

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE = /^\+?[\d\s().-]+$/;
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

export function contactErrors(m: ContactMessage): ContactErrors {
  const e: ContactErrors = {};
  const name = m.fullName.trim();
  if (!name) e.fullName = "Please enter your full name.";
  else if (name.length > CONTACT_LIMITS.fullName) e.fullName = `Please keep it under ${CONTACT_LIMITS.fullName} characters.`;
  else if (!NAME.test(name)) e.fullName = "Please use letters only (spaces, hyphens and apostrophes are fine).";
  const email = m.email.trim();
  if (!email) e.email = "Please enter your email address.";
  else if (email.length > CONTACT_LIMITS.email || !EMAIL.test(email)) e.email = "Please enter a valid email address, like name@example.com.";
  const phone = m.phone.trim();
  const digits = phone.replace(/\D/g, "").length;
  if (phone && (phone.length > CONTACT_LIMITS.phone || !PHONE.test(phone) || digits < 7 || digits > 15)) e.phone = "Please enter a valid phone number, or leave it empty.";
  if (!(CONTACT_SUBJECTS as readonly string[]).includes(m.subject)) e.subject = "Please choose a subject.";
  const message = m.message.trim();
  if (!message) e.message = "Please write your message.";
  else if (message.length < MESSAGE_MIN) e.message = "Please tell us a little more.";
  else if (message.length > CONTACT_LIMITS.message) e.message = `Please keep it under ${CONTACT_LIMITS.message} characters.`;
  if (!m.privacy) e.privacy = "Please confirm that we may use your details to answer your message.";
  return e;
}
