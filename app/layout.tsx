import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import { LiquidGlass } from "@/components/effects/LiquidGlass";
import { INTRO_SEEN_SCRIPT } from "@/lib/intro/config";
import "./globals.css";

// The interface and headlines. Suisse Int'l leads the stack in globals.css;
// this is the closest open match, used until its licensed files are added.
const grotesk = Inter_Tight({
  variable: "--font-grotesk",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Emphasis words only.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infinity Careers",
  description: "Infinity Careers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${grotesk.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Before the first paint: a visitor who has seen the intro never sees a frame of it. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SEEN_SCRIPT }} />
        {children}
        <LiquidGlass />
      </body>
    </html>
  );
}
