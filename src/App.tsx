import React, { useState, useEffect } from "react";
import "./App.css";

// --- Memory Match game (self-contained) ---

type Card = {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useMemoryDeck(pairs = 8) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const emojis = [
    "🍕", "🎮", "🚀", "🤖", "🐱", "🧠", "⚡️", "🌈", "🍪", "🎧", "🧩", "💎", "🔥", "🌙", "📀", "🪄",
  ];

  const reset = () => {
    const chosen = emojis.slice(0, pairs);
    const seeded: Card[] = shuffle(
      chosen
        .flatMap((e, idx) => [
          { id: idx * 2, emoji: e, flipped: false, matched: false },
          { id: idx * 2 + 1, emoji: e, flipped: false, matched: false },
        ])
    );
    setDeck(seeded);
    setMoves(0);
    setLocked(false);
    setStartedAt(null);
    setFinishedAt(null);
  };

  useEffect(() => {
    reset();
  }, [pairs]);

  useEffect(() => {
    if (deck.length && deck.every((c) => c.matched)) {
      setFinishedAt(performance.now());
    }
  }, [deck]);

  const flip = (index: number) => {
    if (locked) return;
    setDeck((prev) => {
      const d = [...prev];
      const card = d[index];
      if (!card || card.flipped || card.matched) return prev;
      if (!startedAt) setStartedAt(performance.now());
      card.flipped = true;
      const open = d.filter((c) => c.flipped && !c.matched);
      if (open.length === 2) {
        setLocked(true);
        setMoves((m) => m + 1);
        const [a, b] = open;
        if (a.emoji === b.emoji) {
          setTimeout(() => {
            setDeck((cur) =>
              cur.map((c) => (c.flipped && !c.matched ? { ...c, matched: true } : c))
            );
            setLocked(false);
          }, 350);
        } else {
          setTimeout(() => {
            setDeck((cur) =>
              cur.map((c) => (c.flipped && !c.matched ? { ...c, flipped: false } : c))
            );
            setLocked(false);
          }, 650);
        }
      }
      return d;
    });
  };

  const elapsedMs = finishedAt && startedAt ? Math.round(finishedAt - startedAt) : null;

  return { deck, flip, reset, moves, elapsedMs };
}

const MemoryMatch: React.FC<{ pairs?: number }> = ({ pairs = 8 }) => {
  const { deck, flip, reset, moves, elapsedMs } = useMemoryDeck(pairs);

  return (
    <div className="memory-match">
      <div className="memory-toolbar">
        <h2 className="memory-title">🧩 Memory Match</h2>
        <div className="memory-controls">
          <label className="memory-select">
            <span>Pairs:</span>
            <select
              className="memory-select-input"
              defaultValue={pairs}
              onChange={(e) => (location.href = `?pairs=${e.target.value}`)}
            >
              {[6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button onClick={reset} className="btn btn--light">
            Restart
          </button>
        </div>
      </div>
      <div className="memory-stats">
        <span>
          <strong>Moves:</strong> {moves}
        </span>
        {elapsedMs !== null && (
          <span>
            <strong>Time:</strong> {(elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      <div className="memory-grid">
        {deck.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => flip(i)}
            className={`memory-card${c.flipped ? " is-flipped" : ""}${c.matched ? " is-matched" : ""}`}
            disabled={c.matched}
            aria-label={c.flipped ? c.emoji : "Hidden card"}
          >
            {c.flipped || c.matched ? c.emoji : "?"}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Placeholder zip game (coming soon) ---
const ZipGamePlaceholder: React.FC = () => (
  <div className="game-card game-card--muted">
    <h2 className="game-card-title">⚡ Zip (coming soon)</h2>
    <p>A quick, brainy puzzle inspired by daily mini-games. We'll plug the real game here later.</p>
  </div>
);

// --- Dashboard shell ---
const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({
  title,
  children,
  right,
}) => (
  <section className="section">
    <div className="section-header">
      <h1 className="section-title">{title}</h1>
      {right && <div className="section-actions">{right}</div>}
    </div>
    {children}
  </section>
);

function useQueryPairs(): number {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const n = Number(params.get("pairs"));
  return Number.isFinite(n) && n >= 4 && n <= 24 ? n : 8;
}

export default function GamesDashboard() {
  const pairs = useQueryPairs();
  const [active, setActive] = useState<"dashboard" | "memory" | "zip">("dashboard");

  return (
    <div className="app container">
      <header className="site-header">
        <div className="site-brand">
          <span className="site-brand-icon" aria-hidden="true">
            🎯
          </span>
          <strong>GameHub</strong>
        </div>
        <nav className="site-nav">
          <button
            type="button"
            onClick={() => setActive("dashboard")}
            className={`btn btn--dark${active === "dashboard" ? " is-active" : ""}`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActive("memory")}
            className={`btn btn--dark${active === "memory" ? " is-active" : ""}`}
          >
            Memory Match
          </button>
          <button
            type="button"
            onClick={() => setActive("zip")}
            className={`btn btn--dark${active === "zip" ? " is-active" : ""}`}
          >
            Zip
          </button>
        </nav>
      </header>

      {active === "dashboard" && (
        <Section
          title="Your games"
          right={
            <button type="button" className="btn btn--light" onClick={() => setActive("memory")}>
              Play now
            </button>
          }
        >
          <div className="game-grid">
            <div className="game-card">
              <div className="game-card-header">
                <h3 className="game-card-title">🧩 Memory Match</h3>
                <button type="button" className="btn btn--light" onClick={() => setActive("memory")}>
                  Open
                </button>
              </div>
              <p>Flip cards, find pairs. Simple, fast, addictive.</p>
            </div>
            <div className="game-card game-card--muted">
              <div className="game-card-header">
                <h3 className="game-card-title">⚡ Zip</h3>
                <button type="button" className="btn btn--light" onClick={() => setActive("zip")}>
                  Preview
                </button>
              </div>
              <p>Daily brainteaser slot. We'll ship this next.</p>
            </div>
          </div>
        </Section>
      )}

      {active === "memory" && (
        <Section
          title="Memory Match"
          right={
            <button type="button" className="btn btn--light" onClick={() => setActive("dashboard")}>
              Back
            </button>
          }
        >
          <MemoryMatch pairs={pairs} />
        </Section>
      )}

      {active === "zip" && (
        <Section
          title="Zip"
          right={
            <button type="button" className="btn btn--light" onClick={() => setActive("dashboard")}>
              Back
            </button>
          }
        >
          <ZipGamePlaceholder />
        </Section>
      )}

      <footer className="site-footer">
        <span>© GameHub • Built with React + TypeScript</span>
      </footer>
    </div>
  );
}
