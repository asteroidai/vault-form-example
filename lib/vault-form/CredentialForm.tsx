"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Markdown from "react-markdown";

import { getShareLink, ShareLinkError, submitShareLink } from "./api.ts";
import { buildSubmitValues, inputProps, pagesOf, validateValue } from "./fields.ts";
import type { FieldSpec, PublicShareLink } from "./types.ts";

type Props = {
  /** Asteroid API origin, for example https://odyssey.asteroid.ai. */
  apiUrl: string;
  /** Share token from your backend. */
  token: string;
  onCompleted?: () => void;
  /** The link can never succeed. Fetch a new token from your backend. */
  onNeedsNewLink?: () => void;
};

type State =
  | { kind: "loading" }
  | { kind: "ready"; link: PublicShareLink }
  | { kind: "done" }
  | { kind: "failed"; message: string };

// Replace the markup and class names with your own design system. The logic
// lives in fields.ts and api.ts, which have no UI dependencies.
export function CredentialForm({ apiUrl, token, onCompleted, onNeedsNewLink }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    getShareLink(apiUrl, token)
      .then((link) => {
        if (cancelled) return;
        setState(link.status === "pending" ? { kind: "ready", link } : { kind: "done" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ShareLinkError && err.needsNewLink) {
          onNeedsNewLink?.();
          return;
        }
        setState({ kind: "failed", message: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, token, onNeedsNewLink]);

  if (state.kind === "loading") return <p className="muted">Loading…</p>;
  if (state.kind === "failed") return <p className="error">{state.message}</p>;
  if (state.kind === "done") return <p>Thanks. Your details are saved.</p>;

  return (
    <Wizard
      link={state.link}
      onSubmit={async (values) => {
        await submitShareLink(apiUrl, token, values);
        setState({ kind: "done" });
        onCompleted?.();
      }}
      onNeedsNewLink={onNeedsNewLink}
    />
  );
}

function Wizard({
  link,
  onSubmit,
  onNeedsNewLink,
}: {
  link: PublicShareLink;
  onSubmit: (values: { key: string; value: string }[]) => Promise<void>;
  onNeedsNewLink?: () => void;
}) {
  const pages = pagesOf(link.fields, link.steps);
  const byKey = new Map(link.fields.map((f) => [f.key, f]));
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const page = pages[index]!;
  const pageFields = page.fieldKeys.flatMap((k) => byKey.get(k) ?? []);
  const last = index === pages.length - 1;

  const check = (fields: FieldSpec[]) => {
    const found: Record<string, string> = {};
    for (const field of fields) {
      const message = validateValue(field, values[field.key] ?? "");
      if (message) found[field.key] = message;
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!check(pageFields)) return;
    if (!last) {
      setIndex(index + 1);
      return;
    }
    if (!check(link.fields)) return;
    setSubmitting(true);
    try {
      await onSubmit(buildSubmitValues(link.fields, values));
    } catch (err) {
      if (err instanceof ShareLinkError && err.needsNewLink) {
        onNeedsNewLink?.();
        return;
      }
      setSubmitError(messageOf(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card">
      <header>
        <h2>{link.title}</h2>
        {link.description ? <p className="muted">{link.description}</p> : null}
        {pages.length > 1 ? (
          <p className="muted">
            Step {index + 1} of {pages.length}
            {page.title ? `: ${page.title}` : ""}
          </p>
        ) : null}
      </header>

      {page.instructions ? (
        <div className="instructions">
          <Markdown>{page.instructions}</Markdown>
        </div>
      ) : null}

      <fieldset disabled={submitting}>
        {pageFields.map((field) => (
          <label key={field.key} className="field">
            <span>
              {field.label}
              {field.required ? null : <span className="muted"> (optional)</span>}
            </span>
            <input
              {...inputProps(field.type)}
              name={field.key}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              aria-invalid={errors[field.key] ? true : undefined}
              spellCheck={false}
              autoCapitalize="off"
            />
            {field.hint ? <small className="muted">{field.hint}</small> : null}
            {errors[field.key] ? <small className="error">{errors[field.key]}</small> : null}
          </label>
        ))}
      </fieldset>

      {submitError ? <p className="error">{submitError}</p> : null}

      <footer>
        {index > 0 ? (
          <button type="button" onClick={() => setIndex(index - 1)} disabled={submitting}>
            Back
          </button>
        ) : null}
        <button type="submit" className="primary" disabled={submitting}>
          {last ? (submitting ? "Saving…" : "Save securely") : "Next"}
        </button>
      </footer>

      <p className="muted small">
        Requested by {link.requesterOrgName}. Values go straight to Asteroid&apos;s encrypted vault.
      </p>
    </form>
  );
}

function messageOf(err: unknown): string {
  if (err instanceof ShareLinkError) {
    if (err.status === 429) return `Too many attempts. Try again in ${err.retryAfter ?? 60} seconds.`;
    if (err.status === 400) return "A required value is missing or invalid.";
  }
  return "Something went wrong. Try again.";
}
