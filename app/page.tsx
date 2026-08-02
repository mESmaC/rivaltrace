import type { Metadata } from "next";
import { MonitorWorkspace } from "./components/MonitorWorkspace";

export const metadata: Metadata = {
  title: "Competitor changes, with receipts",
  description:
    "Monitor pricing, product, and positioning pages. See exactly what changed before deciding what it means.",
};

export default function Home() {
  return (
    <main>
      <header className="site-nav">
        <a className="wordmark" href="#top" aria-label="RivalTrace home">
          <span className="wordmark-mark" aria-hidden="true">R</span>
          RivalTrace
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a className="nav-cta" href="#workspace">Open private preview</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> Private working preview</p>
          <h1>Know when a competitor changes the page that matters.</h1>
          <p className="hero-lede">
            RivalTrace turns exact website changes into a short, inspectable brief—so a price move,
            feature launch, or positioning shift does not hide in another browser tab.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#workspace">Watch a page</a>
            <a className="button button-secondary" href="#evidence-demo">See the evidence</a>
          </div>
          <ul className="trust-row" aria-label="Product boundaries">
            <li>Public web pages only</li>
            <li>Exact before/after evidence</li>
            <li>No invented line numbers</li>
          </ul>
        </div>

        <aside className="signal-card" aria-label="Example competitor change">
          <div className="signal-card-head">
            <div>
              <p className="card-kicker">Pricing signal</p>
              <h2>Team plan changed</h2>
            </div>
            <span className="signal-time">12 min ago</span>
          </div>
          <div className="page-chip"><span className="page-favicon">N</span> pricing.northstar.example</div>
          <div className="diff-block removed"><span>−</span><code>$49 / seat / month</code></div>
          <div className="diff-block added"><span>+</span><code>$39 / seat / month, billed annually</code></div>
          <div className="signal-summary">
            <span>Observed</span>
            The listed seat price fell and an annual-billing condition was added.
          </div>
          <div className="receipt-row">
            <span>SHA-256 evidence</span><code>8d7a…10f2</code>
          </div>
        </aside>
      </section>

      <section className="proof-strip" aria-label="RivalTrace workflow">
        <div><strong>01</strong><span>Choose the pages worth watching</span></div>
        <div><strong>02</strong><span>Capture a normalized baseline</span></div>
        <div><strong>03</strong><span>Review only evidence-backed changes</span></div>
      </section>

      <MonitorWorkspace />

      <section className="explain-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Signal first. Interpretation second.</h2>
          <p>RivalTrace keeps observed evidence separate from any later business interpretation.</p>
        </div>
        <div className="feature-grid">
          <article>
            <span className="feature-number">01</span>
            <h3>Pages, not entire websites</h3>
            <p>Track the pricing, feature, changelog, and positioning URLs tied to an actual decision.</p>
          </article>
          <article>
            <span className="feature-number">02</span>
            <h3>Noise-reduced snapshots</h3>
            <p>Scripts, styles, and markup are removed before comparison. Content hashes make each snapshot inspectable.</p>
          </article>
          <article>
            <span className="feature-number">03</span>
            <h3>Bounded change briefs</h3>
            <p>Added and removed text is capped, classified, and linked to its source instead of becoming an opaque summary.</p>
          </article>
        </div>
      </section>

      <section className="evidence-demo" id="evidence-demo">
        <div>
          <p className="eyebrow">Evidence contract</p>
          <h2>A brief you can challenge.</h2>
        </div>
        <div className="contract-list">
          <div><span>Observed change</span><strong>Exact added and removed blocks</strong></div>
          <div><span>Provenance</span><strong>Final URL, check time, status, content hash</strong></div>
          <div><span>Interpretation</span><strong>Clearly separated and never presented as fact</strong></div>
          <div><span>Boundary</span><strong>No login walls, private pages, or readiness claims</strong></div>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="section-heading">
          <p className="eyebrow">Launch pricing</p>
          <h2>Useful before it gets expensive.</h2>
          <p>Billing is not connected in this private build. These are the launch-plan limits being implemented.</p>
        </div>
        <div className="pricing-grid">
          <article>
            <p className="plan-name">Free</p>
            <p className="plan-price">$0</p>
            <p>Three public URLs checked weekly with 14 days of evidence history.</p>
            <span className="plan-status">Launch target</span>
          </article>
          <article className="featured-plan">
            <p className="plan-name">Solo</p>
            <p className="plan-price">$9<span>/month</span></p>
            <p>Fifteen URLs checked daily, pricing alerts, and 90 days of evidence history.</p>
            <span className="plan-status">Planned first paid tier</span>
          </article>
          <article>
            <p className="plan-name">Studio</p>
            <p className="plan-price">$19<span>/month</span></p>
            <p>Fifty URLs, six-hour checks, three seats, and weekly portfolio briefings.</p>
            <span className="plan-status">After Solo validation</span>
          </article>
        </div>
      </section>

      <footer>
        <a className="wordmark footer-wordmark" href="#top"><span className="wordmark-mark">R</span>RivalTrace</a>
        <p>Evidence-backed competitor monitoring. A product from <a href="https://www.yycore.ai">YY</a>.</p>
        <p className="footer-note">Private V0 · manual rechecks active · automated scheduling and billing not yet connected.</p>
      </footer>
    </main>
  );
}
