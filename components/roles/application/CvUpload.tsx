"use client";

import { useRef, useState, type DragEvent } from "react";
import { CV_ACCEPT, CV_MAX_BYTES, cvProblem, formatBytes } from "@/lib/careers/application";

type CvUploadProps = {
  file: File | null;
  onFile: (file: File | null) => void;
  /** The server's verdict, or the form's own. */
  error?: string;
  /** While submitting: the share sent (0–1), or null. */
  progress: number | null;
};

/**
 * The CV, optional: dropped on the area, or browsed for. It shows the chosen file's
 * name and size, and can be replaced or removed. A file that is not a PDF,
 * DOC or DOCX, or too large, is turned away here with the reason (the server
 * checks again). The file itself is sent untouched.
 */
export function CvUpload({ file, onFile, error, progress }: CvUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const shown = problem ?? error;

  function take(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;
    const why = cvProblem(next);
    setProblem(why);
    // A refused file never replaces the one already chosen.
    if (!why) onFile(next);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files);
  }

  const browse = () => input.current?.click();

  return (
    <div>
      <p id="cv-label" className="text-small font-semibold tracking-[0.12em] text-neutral/85">
        UPLOAD YOUR CV <span className="font-normal text-neutral/50">(OPTIONAL)</span>
      </p>
      <input
        ref={input}
        id="cv"
        type="file"
        accept={CV_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />

      {file ? (
        <div className="mt-2 rounded-[16px] border border-neutral/20 bg-neutral/[0.05] p-4">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-accent text-label font-bold text-petrol">
              {file.name.split(".").pop()?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-neutral" title={file.name}>
                {file.name}
              </p>
              <p className="text-small text-neutral/60">{formatBytes(file.size)}</p>
            </div>
          </div>
          {progress !== null ? (
            <div className="mt-4" role="progressbar" aria-label="Uploading your CV" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <div className="h-1 overflow-hidden rounded-full bg-neutral/15">
                <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${Math.max(4, progress * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-label tabular-nums text-neutral/60">{progress >= 1 ? "Uploaded, saving your application…" : `Uploading… ${Math.round(progress * 100)}%`}</p>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={browse} className="h-9 cursor-pointer rounded-[10px] border border-neutral/25 px-3.5 text-small font-medium text-neutral transition-colors hover:border-accent hover:text-accent">
                Replace file
              </button>
              <button
                type="button"
                onClick={() => {
                  setProblem(null);
                  onFile(null);
                }}
                className="h-9 cursor-pointer rounded-[10px] px-3.5 text-small font-medium text-neutral/70 transition-colors hover:text-accent"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`mt-2 flex flex-col items-center rounded-[16px] border border-dashed px-6 py-5 text-center transition-colors duration-200 ${
            over ? "border-accent bg-accent/10" : shown ? "border-accent/70" : "border-neutral/30 bg-neutral/[0.03]"
          }`}
        >
          <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8 text-accent">
            <path d="M16 21V8m0 0-5 5m5-5 5 5M7 22v2.5A2.5 2.5 0 0 0 9.5 27h13a2.5 2.5 0 0 0 2.5-2.5V22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-3 text-small text-neutral/70">
            Drag and drop your file here, or{" "}
            <button type="button" onClick={browse} aria-describedby="cv-label cv-formats" className="cursor-pointer font-medium text-accent underline underline-offset-4 hover:text-neutral">
              browse files
            </button>
            .
          </p>
          <p id="cv-formats" className="mt-3 text-label text-neutral/50">
            Accepted formats: PDF, DOC, DOCX · up to {formatBytes(CV_MAX_BYTES)}
          </p>
        </div>
      )}

      {shown && (
        <p id="cv-error" role="alert" className="mt-2 flex items-start gap-1.5 text-small text-accent">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.75v4M8 11.1v.15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {shown}
        </p>
      )}
    </div>
  );
}
