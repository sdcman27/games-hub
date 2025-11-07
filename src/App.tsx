import React, { useState, useEffect, useCallback } from "react";

const MEMORY_PAIR_OPTIONS = [6, 8, 10, 12] as const;
type MemoryPairOption = (typeof MEMORY_PAIR_OPTIONS)[number];
type View = "dashboard" | "memory" | "zip";

function useMediaQuery(query: string) {
  const getMatches = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    setMatches(getMatches());
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") {
      return undefined;
    }
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [getMatches, query]);

  return matches;
}

function useSearchParamState<T>(
  key: string,
  options: {
    defaultValue: T;
    parse: (value: string | null) => T | undefined;
    serialize: (value: T) => string;
  }
) {
  const { defaultValue, parse, serialize } = options;

  const readValue = useCallback(() => {
    if (typeof window === "undefined") {
      return defaultValue;
    }
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(key);
    const parsed = parse(raw);
    return parsed ?? defaultValue;
  }, [defaultValue, key, parse]);

  const [value, setValue] = useState<T>(readValue);

  useEffect(() => {
    setValue(readValue());
  }, [readValue]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const onPopState = () => setValue(readValue());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [readValue]);

  const updateValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(previous) : next;
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          const shouldDelete = resolved === defaultValue;
          if (shouldDelete) {
            url.searchParams.delete(key);
          } else {
            url.searchParams.set(key, serialize(resolved));
          }
          const nextRelative = `${url.pathname}${url.search}${url.hash}`;
          const currentRelative = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          if (nextRelative !== currentRelative) {
            window.history.pushState({}, "", nextRelative);
          }
        }
        return resolved;
      });
    },
    [defaultValue, key, serialize]
  );

  return [value, updateValue] as const;
}

function usePairsParam() {
  return useSearchParamState<MemoryPairOption>("pairs", {
    defaultValue: 8,
    parse: (value) => {
      if (!value) return undefined;
      const numeric = Number(value);
      return MEMORY_PAIR_OPTIONS.includes(numeric as MemoryPairOption)
        ? (numeric as MemoryPairOption)
        : undefined;
    },
    serialize: (value) => String(value),
  });
}

function useViewParam() {
  return useSearchParamState<View>("view", {
    defaultValue: "dashboard",
    parse: (value) => {
      if (value === "dashboard" || value === "memory" || value === "zip") {
        return value;
      }
      return undefined;
    },
    serialize: (value) => value,
  });
}

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

const MemoryMatch: React.FC<{ pairs: number; onPairsChange: (value: MemoryPairOption) => void }> = ({
  pairs,
  onPairsChange,
}) => {
  const { deck, flip, reset, moves, elapsedMs } = useMemoryDeck(pairs);
  const gridColumns = Math.min(pairs * 2, 8);

  return (
    <div className="utility-stack">
      <div className="utility-cluster utility-cluster--between">
        <h2>🧩 Memory Match</h2>
        <div className="utility-cluster">
          <label className="form-label">
            <span>Pairs:</span>
            <select
              className="form-select"
              value={pairs}
              onChange={(event) => onPairsChange(Number(event.target.value) as MemoryPairOption)}
            >
              {MEMORY_PAIR_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={reset}>
            Restart
          </button>
        </div>
      </div>
      <div className="meta-row">
        <span>
          <strong>Moves:</strong> {moves}
        </span>
        {elapsedMs !== null && (
          <span>
            <strong>Time:</strong> {(elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      <div className={`memory-grid cols-${gridColumns}`}>
        {deck.map((c, i) => (
          <button
            key={c.id}
            onClick={() => flip(i)}
            className={`memory-card${c.matched ? " is-matched" : c.flipped ? " is-flipped" : ""}`}
            disabled={c.matched}
            aria-label={c.flipped ? c.emoji : "Hidden card"}
          >
            <span className="memory-card__emoji">{c.flipped || c.matched ? c.emoji : "?"}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Placeholder zip game (coming soon) ---
const ZipGamePlaceholder: React.FC = () => (
  <div className="panel">
    <h2>⚡ Zip (coming soon)</h2>
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
    <div className="section__header">
      <h1>{title}</h1>
      {right && <div className="section__side">{right}</div>}
    </div>
    {children}
  </section>
);

export default function GamesDashboard() {
  const [pairs, setPairs] = usePairsParam();
  const [activeView, setActiveView] = useViewParam();
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setNavOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setNavOpen(false);
  }, [activeView]);

  const navigateTo = useCallback(
    (view: View) => {
      setActiveView(view);
    },
    [setActiveView]
  );

  const navVisible = !isMobile || navOpen;

  const NavButton: React.FC<{ view: View; children: React.ReactNode }> = ({ view, children }) => (
    <button
      type="button"
      onClick={() => navigateTo(view)}
      className={["btn", "btn--surface", activeView === view ? "is-active" : null]
        .filter(Boolean)
        .join(" ")}
      aria-current={activeView === view ? "page" : undefined}
    >
      {children}
    </button>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand__icon">🎯</span>
          <strong>GameHub</strong>
        </div>
        <div className="nav-bar">
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={navVisible}
            aria-controls="primary-navigation"
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="sr-only">Toggle navigation</span>
            <svg className="nav-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <nav
            id="primary-navigation"
            className="nav-cluster"
            data-open={navVisible}
            hidden={isMobile && !navOpen}
            aria-hidden={isMobile && !navOpen}
            aria-label="Primary navigation"
          >
            <NavButton view="dashboard">Dashboard</NavButton>
            <NavButton view="memory">Memory Match</NavButton>
            <NavButton view="zip">Zip</NavButton>
          </nav>
        </div>
      </header>

      {activeView === "dashboard" && (
        <Section
          title="Your games"
          right={
            <button className="btn" onClick={() => navigateTo("memory")}>
              Play now
            </button>
          }
        >
          <div className="game-card-grid">
            <div className="panel">
              <div className="utility-cluster utility-cluster--between">
                <h3>🧩 Memory Match</h3>
                <button className="btn" onClick={() => navigateTo("memory")}>
                  Open
                </button>
              </div>
              <p>Flip cards, find pairs. Simple, fast, addictive.</p>
            </div>
            <div className="panel is-muted">
              <div className="utility-cluster utility-cluster--between">
                <h3>⚡ Zip</h3>
                <button className="btn btn--subtle" onClick={() => navigateTo("zip")}>
                  Preview
                </button>
              </div>
              <p>Daily brainteaser slot. We'll ship this next.</p>
            </div>
          </div>
        </Section>
      )}

      {activeView === "memory" && (
        <Section
          title="Memory Match"
          right={
            <button className="btn btn--ghost" onClick={() => navigateTo("dashboard")}>
              Back
            </button>
          }
        >
          <MemoryMatch pairs={pairs} onPairsChange={setPairs} />
        </Section>
      )}

      {activeView === "zip" && (
        <Section
          title="Zip"
          right={
            <button className="btn btn--ghost" onClick={() => navigateTo("dashboard")}>
              Back
            </button>
          }
        >
          <ZipGamePlaceholder />
        </Section>
      )}

      <footer className="footer">
        <span>© GameHub • Built with React + TypeScript</span>
      </footer>
    </div>
  );
}
