"use client";

import { FormEvent, useEffect, useState } from "react";

type Watcher = {
  id: string;
  label: string;
  url: string;
  lastCheckedAt: string;
  lastChangedAt: string | null;
  latestHash: string;
  status: string;
  changeKind: string;
  changeSummary: string;
};

type Evidence = {
  added: string[];
  removed: string[];
  omittedAdded: number;
  omittedRemoved: number;
  evidenceLimited: boolean;
};

type ApiResult = {
  watcher?: Watcher;
  watchers?: Watcher[];
  evidence?: Evidence;
  error?: string;
};

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

function hostFor(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function shortHash(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function formatChecked(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

async function apiJson(url: string, init?: RequestInit): Promise<ApiResult> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({})) as ApiResult;
  if (!response.ok) {
    throw new ApiRequestError(payload.error || `Request failed (${response.status})`, response.status);
  }
  return payload;
}

export function MonitorWorkspace() {
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [latestEvidence, setLatestEvidence] = useState<Record<string, Evidence>>({});

  function handleApiError(reason: unknown, fallback: string) {
    if (reason instanceof ApiRequestError && reason.status === 401) {
      setSignedOut(true);
      setError(null);
      return;
    }
    setError(reason instanceof Error ? reason.message : fallback);
  }

  useEffect(() => {
    let active = true;
    apiJson("/api/watchers")
      .then((result) => {
        if (active) setWatchers(result.watchers ?? []);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        handleApiError(reason, "Could not load watchlist.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function addWatcher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWorkingId("new");
    try {
      const result = await apiJson("/api/watchers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label, url }),
      });
      if (result.watcher) {
        setWatchers((current) => [result.watcher as Watcher, ...current]);
        if (result.evidence) {
          setLatestEvidence((current) => ({
            ...current,
            [result.watcher!.id]: result.evidence as Evidence,
          }));
        }
      }
      setLabel("");
      setUrl("");
    } catch (reason) {
      handleApiError(reason, "Could not create watcher.");
    } finally {
      setWorkingId(null);
    }
  }

  async function recheck(watcher: Watcher) {
    setError(null);
    setWorkingId(watcher.id);
    try {
      const result = await apiJson(`/api/watchers/${encodeURIComponent(watcher.id)}/check`, {
        method: "POST",
      });
      if (result.watcher) {
        setWatchers((current) =>
          current.map((item) => (item.id === watcher.id ? (result.watcher as Watcher) : item)),
        );
      }
      if (result.evidence) {
        setLatestEvidence((current) => ({ ...current, [watcher.id]: result.evidence as Evidence }));
      }
    } catch (reason) {
      handleApiError(reason, "Could not recheck page.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="workspace-section" id="workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Working product slice</p>
          <h2>Start with one page you cannot afford to miss.</h2>
        </div>
        <p>
          This private build captures real public pages and supports manual rechecks. Scheduled checks,
          notifications, team access, and billing remain outside this V0.
        </p>
      </div>

      <div className="workspace-shell">
        {signedOut ? (
          <div className="signin-panel">
            <p className="eyebrow">Private account</p>
            <h3>Sign in to open your watchlist.</h3>
            <p>
              RivalTrace uses Sign in with ChatGPT for this preview. Each account sees only its own
              pages and evidence history.
            </p>
            <a className="button button-primary" href="/signin-with-chatgpt?return_to=%2F%23workspace">
              Sign in with ChatGPT
            </a>
          </div>
        ) : (
          <>
        <aside className="watch-form-panel">
          <div className="panel-label"><span>New watcher</span><span className="live-pill">Live fetch</span></div>
          <form onSubmit={addWatcher}>
            <label htmlFor="watch-label">Label</label>
            <input
              id="watch-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Competitor pricing"
              maxLength={80}
              required
            />
            <label htmlFor="watch-url">Public HTTPS page</label>
            <input
              id="watch-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/pricing"
              inputMode="url"
              type="url"
              pattern="https://.*"
              required
            />
            <button className="button button-primary full-button" disabled={workingId === "new"}>
              {workingId === "new" ? "Capturing baseline…" : "Capture baseline"}
            </button>
          </form>
          <p className="form-boundary">
            HTTPS HTML only. Private IPs, credentials, custom ports, login walls, and oversized pages are rejected.
          </p>
        </aside>

        <div className="watchlist-panel" aria-live="polite">
          <div className="panel-label">
            <span>Watchlist</span>
            <span>{watchers.length} {watchers.length === 1 ? "page" : "pages"}</span>
          </div>
          {error ? <div className="error-banner" role="alert">{error}</div> : null}
          {loading ? <div className="empty-state">Loading the private watchlist…</div> : null}
          {!loading && watchers.length === 0 ? (
            <div className="empty-state">
              <strong>No live pages yet.</strong>
              <span>Add one public competitor page to save its first evidence snapshot.</span>
            </div>
          ) : null}
          <div className="watch-list">
            {watchers.map((watcher) => {
              const evidence = latestEvidence[watcher.id];
              return (
                <article className="watch-card" key={watcher.id}>
                  <div className="watch-card-main">
                    <div className={`change-icon ${watcher.status === "changed" ? "changed" : "stable"}`} aria-hidden="true">
                      {watcher.status === "changed" ? "↗" : "✓"}
                    </div>
                    <div>
                      <p className="watch-label">{watcher.label}</p>
                      <a href={watcher.url} target="_blank" rel="noreferrer">{hostFor(watcher.url)}</a>
                      <p className="watch-summary">{watcher.changeSummary}</p>
                    </div>
                  </div>
                  <div className="watch-meta">
                    <span>{watcher.changeKind}</span>
                    <span>{formatChecked(watcher.lastCheckedAt)}</span>
                    <code>{shortHash(watcher.latestHash)}</code>
                    <button
                      className="recheck-button"
                      onClick={() => recheck(watcher)}
                      disabled={workingId === watcher.id}
                    >
                      {workingId === watcher.id ? "Checking…" : "Recheck"}
                    </button>
                  </div>
                  {evidence && (evidence.added.length > 0 || evidence.removed.length > 0 || evidence.evidenceLimited) ? (
                    <details className="watch-evidence" open>
                      <summary>Latest exact evidence</summary>
                      {evidence.evidenceLimited ? (
                        <p>The content hash changed beyond this preview&apos;s bounded diff window. No exact block is shown for that change.</p>
                      ) : null}
                      {evidence.removed.map((item, index) => <div className="diff-block removed" key={`r-${index}-${item}`}><span>−</span><code>{item}</code></div>)}
                      {evidence.added.map((item, index) => <div className="diff-block added" key={`a-${index}-${item}`}><span>+</span><code>{item}</code></div>)}
                      {evidence.omittedAdded + evidence.omittedRemoved > 0 ? (
                        <p>{evidence.omittedAdded + evidence.omittedRemoved} additional changed blocks omitted from this bounded view.</p>
                      ) : null}
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
          </>
        )}
      </div>
    </section>
  );
}
