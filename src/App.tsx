import React, { useMemo, useState, useEffect } from "react";

// --- Memory Match game (self‑contained) ---

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
    "🍕","🎮","🚀","🤖","🐱","🧠","⚡️","🌈","🍪","🎧","🧩","💎","🔥","🌙","📀","🪄",
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

  useEffect(() => { reset(); }, [pairs]);

  useEffect(() => {
    if (deck.length && deck.every(c => c.matched)) {
      setFinishedAt(performance.now());
    }
  }, [deck]);

  const flip = (index: number) => {
    if (locked) return;
    setDeck(prev => {
      const d = [...prev];
      const card = d[index];
      if (!card || card.flipped || card.matched) return prev;
      if (!startedAt) setStartedAt(performance.now());
      card.flipped = true;
      const open = d.filter(c => c.flipped && !c.matched);
      if (open.length === 2) {
        setLocked(true);
        setMoves(m => m + 1);
        const [a, b] = open;
        if (a.emoji === b.emoji) {
          // match
          setTimeout(() => {
            setDeck(cur => cur.map(c => (c.flipped && !c.matched ? { ...c, matched: true } : c)));
            setLocked(false);
          }, 350);
        } else {
          setTimeout(() => {
            setDeck(cur => cur.map(c => (c.flipped && !c.matched ? { ...c, flipped: false } : c)));
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
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>🧩 Memory Match</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label>
            Pairs:
            <select defaultValue={pairs} onChange={(e) => location.href = `?pairs=${e.target.value}`} style={{ marginLeft: 8 }}>
              {[6,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button onClick={reset} style={btnStyle}>Restart</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 14, opacity: 0.9 }}>
        <span><strong>Moves:</strong> {moves}</span>
        {elapsedMs !== null && <span><strong>Time:</strong> {(elapsedMs/1000).toFixed(1)}s</span>}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(pairs*2, 8)}, minmax(64px, 1fr))`,
          gap: 10,
          maxWidth: 720,
        }}
      >
        {deck.map((c, i) => (
          <button
            key={c.id}
            onClick={() => flip(i)}
            style={{
              ...cardStyle,
              background: c.matched ? "#d1fae5" : c.flipped ? "#eef2ff" : "#111827",
              color: c.flipped || c.matched ? "#111827" : "#9ca3af",
              cursor: c.matched ? "default" : "pointer",
            }}
            disabled={c.matched}
            aria-label={c.flipped ? c.emoji : "Hidden card"}
          >
            <span style={{ fontSize: 28, userSelect: "none" }}>{c.flipped || c.matched ? c.emoji : "?"}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Placeholder zip game (coming soon) ---
const ZipGamePlaceholder: React.FC = () => (
  <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
    <h2 style={{ marginTop: 0 }}>⚡ Zip (coming soon)</h2>
    <p style={{ margin: 0 }}>A quick, brainy puzzle inspired by daily mini-games. We'll plug the real game here later.</p>
  </div>
);

// --- Dashboard shell ---
const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <section style={{ display: "grid", gap: 12 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      <div>{right}</div>
    </div>
    {children}
  </section>
);

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "white",
};

const cardStyle: React.CSSProperties = {
  height: 84,
  display: "grid",
  placeItems: "center",
  borderRadius: 12,
  border: "1px solid #1f2937",
  transition: "transform .12s ease, background .2s ease",
};

function useQueryPairs(): number {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const n = Number(params.get('pairs'));
  return Number.isFinite(n) && n >= 4 && n <= 24 ? n : 8;
}

export default function GamesDashboard() {
  const pairs = useQueryPairs();

  const [active, setActive] = useState<"dashboard" | "memory" | "zip">("dashboard");

  // Basic theming
  useEffect(() => {
    document.body.style.background = "#0b1220";
    document.body.style.color = "#e5e7eb";
    document.body.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    return () => {
      document.body.style.background = "";
      document.body.style.color = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  const NavButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} style={{ ...btnStyle, background: "#111827", color: "#e5e7eb", borderColor: "#374151" }} />
  );

  return (
    <div style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px", display: "grid", gap: 24 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>🎯</span>
          <strong>GameHub</strong>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <NavButton onClick={() => setActive("dashboard")}>Dashboard</NavButton>
          <NavButton onClick={() => setActive("memory")}>Memory Match</NavButton>
          <NavButton onClick={() => setActive("zip")}>Zip</NavButton>
        </div>
      </header>

      {active === "dashboard" && (
        <Section
          title="Your games"
          right={<button style={btnStyle} onClick={() => setActive("memory")}>Play now</button>}
        >
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div style={{ border: "1px solid #1f2937", borderRadius: 16, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>🧩 Memory Match</h3>
                <button style={btnStyle} onClick={() => setActive("memory")}>Open</button>
              </div>
              <p style={{ marginTop: 8, opacity: 0.9 }}>Flip cards, find pairs. Simple, fast, addictive.</p>
            </div>
            <div style={{ border: "1px solid #1f2937", borderRadius: 16, padding: 16, opacity: 0.8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>⚡ Zip</h3>
                <button style={{ ...btnStyle, opacity: 0.8 }} onClick={() => setActive("zip")}>Preview</button>
              </div>
              <p style={{ marginTop: 8, opacity: 0.9 }}>Daily brainteaser slot. We'll ship this next.</p>
            </div>
          </div>
        </Section>
      )}

      {active === "memory" && (
        <Section title="Memory Match" right={<button style={btnStyle} onClick={() => setActive("dashboard")}>Back</button>}>
          <MemoryMatch pairs={pairs} />
        </Section>
      )}

      {active === "zip" && (
        <Section title="Zip" right={<button style={btnStyle} onClick={() => setActive("dashboard")}>Back</button>}>
          <ZipGamePlaceholder />
        </Section>
      )}

      <footer style={{ opacity: 0.7, fontSize: 12, textAlign: "center" }}>
        <span>© GameHub • Built with React + TypeScript</span>
      </footer>
    </div>
  );
}
