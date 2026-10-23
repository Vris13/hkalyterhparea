'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import type { WrappedStats } from '@/lib/wrapped';

type Slide = {
  id: string;
  bg: string;
  dark?: boolean;
  emoji?: string;
  node: ReactNode;
};

const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* ---------- small building blocks ---------- */

function Reveal({ d = 0, className = '', children }: { d?: number; className?: string; children: ReactNode }) {
  return (
    <div className={`pw-in ${className}`} style={{ animationDelay: `${d}ms` }}>
      {children}
    </div>
  );
}

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const duration = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toFixed(decimals)}</>;
}

const Kicker = ({ children }: { children: ReactNode }) => (
  <p className="text-xl font-bold opacity-80">{children}</p>
);

const Huge = ({ children }: { children: ReactNode }) => (
  <p className="text-[7.5rem] font-black leading-[0.9] tracking-tight">{children}</p>
);

const Word = ({ children }: { children: ReactNode }) => (
  <p className="text-5xl font-black capitalize leading-tight [overflow-wrap:anywhere]">{children}</p>
);

const Title = ({ children }: { children: ReactNode }) => (
  <p className="text-4xl font-black leading-tight [overflow-wrap:anywhere]">{children}</p>
);

const Note = ({ children }: { children: ReactNode }) => (
  <p className="text-lg font-semibold opacity-80">{children}</p>
);

function Row({ rank, name, value, dark }: { rank: number; name: string; value: string; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${dark ? 'bg-black/10' : 'bg-white/15'}`}>
      <span className="w-7 text-2xl font-black opacity-70">{rank}</span>
      <span className="flex-1 truncate text-xl font-bold">{name}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
}

/* ---------- slides ---------- */

function buildSlides(stats: WrappedStats, close: () => void, restart: () => void): Slide[] {
  const { year } = stats;
  const intro: Slide = {
    id: 'intro',
    bg: 'bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-900',
    emoji: '✨',
    node: (
      <>
        <Reveal><Kicker>Parea Wrapped</Kicker></Reveal>
        <Reveal d={150}><Huge>{year}</Huge></Reveal>
        <Reveal d={400}><Title>Η χρονιά μας, με νούμερα.</Title></Reveal>
        <Reveal d={650}><Note>Έτοιμοι να δούμε τι κάναμε;</Note></Reveal>
      </>
    ),
  };

  if (stats.eventCount === 0) {
    return [
      intro,
      {
        id: 'empty',
        bg: 'bg-gradient-to-b from-slate-700 to-slate-900',
        emoji: '🫥',
        node: (
          <>
            <Reveal><Title>Δεν βρήκαμε events για το {year}.</Title></Reveal>
            <Reveal d={200}><Note>Του χρόνου θα έχουμε πολλά να πούμε.</Note></Reveal>
            <Reveal d={400} className="pointer-events-auto pt-4">
              <button onClick={close} className="rounded-full bg-white px-6 py-3 font-black text-gray-900">Κλείσιμο</button>
            </Reveal>
          </>
        ),
      },
    ];
  }

  const slides: Slide[] = [intro];
  const avg = stats.countedEventCount ? stats.attendanceCount / stats.countedEventCount : 0;
  const eventsVibe =
    stats.eventCount < 6 ? 'Ποιότητα πάνω από ποσότητα!'
    : stats.eventCount < 15 ? 'Σταθερή παρέα, σταθερές εξόδους!'
    : stats.eventCount < 30 ? 'Το ημερολόγιο δεν πρόλαβε να ησυχάσει!'
    : stats.eventCount < 45 ? 'Σχεδόν κάθε εβδομάδα κάτι γινόταν!'
    : `Ένα event κάθε ${(365/stats.eventCount).toFixed(1)} μέρες!`;

  slides.push({
    id: 'events',
    bg: 'bg-gradient-to-b from-orange-500 to-rose-600',
    emoji: '🎉',
    node: (
      <>
        <Reveal><Kicker>Φέτος κάναμε</Kicker></Reveal>
        <Reveal d={150}><Huge><CountUp value={stats.eventCount} /></Huge></Reveal>
        <Reveal d={350}><Title>{pl(stats.eventCount, 'event', 'events')}</Title></Reveal>
        <Reveal d={600}><Note>{eventsVibe}</Note></Reveal>
      </>
    ),
  });

  if (stats.attendanceCount > 0) {
    slides.push({
      id: 'attendance',
      bg: 'bg-gradient-to-b from-sky-500 to-indigo-700',
      emoji: '🙌',
      node: (
        <>
          <Reveal><Kicker>Μετρήσαμε συνολικά</Kicker></Reveal>
          <Reveal d={150}><Huge><CountUp value={stats.attendanceCount} /></Huge></Reveal>
          <Reveal d={350}><Title>{pl(stats.attendanceCount, 'παρουσία', 'παρουσίες')}</Title></Reveal>
          <Reveal d={600}><Note>Κατά μέσο όρο {avg.toFixed(1)} άτομα σε κάθε event!</Note></Reveal>
        </>
      ),
    });
  }

  const busiestMonth = [...stats.eventsByMonth].sort((a, b) => b.count - a.count)[0];
  const quietestMonth = [...stats.eventsByMonth].filter((m) => m.count >= 0).sort((a, b) => a.count - b.count)[0];
  if (busiestMonth && busiestMonth.count > 0) {
    slides.push({
      id: 'month',
      bg: 'bg-gradient-to-b from-yellow-300 to-orange-500',
      dark: true,
      emoji: '🔥',
      node: (
        <>
          <Reveal><Kicker>Ο μήνας μας ήταν ο</Kicker></Reveal>
          <Reveal d={150}><Word>{busiestMonth.month}</Word></Reveal>
          <Reveal d={350}><Title>{busiestMonth.count} {pl(busiestMonth.count, 'event', 'events')}</Title></Reveal>
          {quietestMonth && quietestMonth.month !== busiestMonth.month && (
            <Reveal d={600}>
              <Note>Ο <span className="capitalize">{quietestMonth.month}</span> ήταν ο πιο ήσυχος, με μόλις {quietestMonth.count}.</Note>
            </Reveal>
          )}
        </>
      ),
    });
  }

  const pluralWeekdays: Record<string, string> = {
  'Δευτέρα': 'Δευτέρες',
  'Τρίτη': 'Τρίτες',
  'Τετάρτη': 'Τετάρτες',
  'Πέμπτη': 'Πέμπτες',
  'Παρασκευή': 'Παρασκευές',
  'Σάββατο': 'Σάββατα',
  'Κυριακή': 'Κυριακές'
};

  if (stats.busiestWeekday && stats.eventCount >= 3) {
    slides.push({
      id: 'weekday',
      bg: 'bg-gradient-to-b from-emerald-400 to-teal-700',
      emoji: '🗓️',
      node: (
        <>
          <Reveal><Kicker>Η αγαπημένη μας μέρα</Kicker></Reveal>
          <Reveal d={150}><Word>{stats.busiestWeekday.name}</Word></Reveal>
          <Reveal d={350}><Title>{stats.busiestWeekday.count} {pl(stats.busiestWeekday.count, 'event', 'events')}</Title></Reveal>
          <Reveal d={600}><Note>Αυτό είναι 1 κάθε {Math.round(52 / stats.busiestWeekday.count)} {pluralWeekdays[stats.busiestWeekday.name] || stats.busiestWeekday.name}!</Note></Reveal>
        </>
      ),
    });
  }

  if (stats.busiestEvent) {
    slides.push({
      id: 'crowd',
      bg: 'bg-gradient-to-b from-purple-600 to-fuchsia-500',
      emoji: '🏟️',
      node: (
        <>
          <Reveal><Kicker>Η μεγαλύτερη παρέα</Kicker></Reveal>
          <Reveal d={150}><Title>{stats.busiestEvent.title}</Title></Reveal>
          <Reveal d={280}><Note>{stats.busiestEvent.date}</Note></Reveal>
          <Reveal d={450}><Huge><CountUp value={stats.busiestEvent.count} /></Huge></Reveal>
          <Reveal d={700}><Note>{pl(stats.busiestEvent.count, 'άτομο', 'άτομα')} σε ένα event. Ρεκόρ της χρονιάς.</Note></Reveal>
        </>
      ),
    });
  }

  if (stats.longestEvent) {
    slides.push({
      id: 'long',
      bg: 'bg-gradient-to-b from-cyan-400 to-blue-700',
      emoji: '⏳',
      node: (
        <>
          <Reveal><Kicker>Το πιο μακρύ event</Kicker></Reveal>
          <Reveal d={150}><Title>{stats.longestEvent.title}</Title></Reveal>
          <Reveal d={280}><Note>{stats.longestEvent.date}</Note></Reveal>
          <Reveal d={450}><Huge><CountUp value={stats.longestEvent.days} /></Huge></Reveal>
          <Reveal d={700}><Note>μέρες στη σειρά. Ούτε ο ύπνος δεν μας σταμάτησε.</Note></Reveal>
        </>
      ),
    });
  }

  if (stats.photoChampion) {
    slides.push({
      id: 'photos',
      bg: 'bg-gradient-to-b from-pink-500 to-rose-700',
      emoji: '📸',
      node: (
        <>
          <Reveal><Kicker>Το πιο φωτογραφημένο event</Kicker></Reveal>
          <Reveal d={150}><Title>{stats.photoChampion.title}</Title></Reveal>
          <Reveal d={280}><Note>{stats.photoChampion.date}</Note></Reveal>
          <Reveal d={450}><Huge><CountUp value={stats.photoChampion.count} /></Huge></Reveal>
          <Reveal d={700}><Note>{pl(stats.photoChampion.count, 'φωτογραφία', 'φωτογραφίες')}. Κάποιος είχε το κινητό πάντα έτοιμο.</Note></Reveal>
        </>
      ),
    });
  }

  const top = stats.mostAttendedPeople[0];
  const topNames = top
    ? stats.mostAttendedPeople
      .filter((person) => person.count === top.count)
      .map((person) => person.name)
    : [];
  if (top && top.count > 0) {
    slides.push({
      id: 'soul',
      bg: 'bg-gradient-to-b from-amber-300 to-yellow-500',
      dark: true,
      emoji: '👑',
      node: (
        <>
          <Reveal><Kicker>Η ψυχή της παρέας</Kicker></Reveal>
          <Reveal d={150}><Word>{topNames.join(', ')}</Word></Reveal>
          <Reveal d={400}><Title>{top.count} {pl(top.count, 'event', 'events')}</Title></Reveal>
          <Reveal d={650}><Note>Παρών/ούσα στο {Math.round(top.rate * 100)}% όλων των events.</Note></Reveal>
        </>
      ),
    });

    if (stats.mostAttendedPeople.length > 1) {
      slides.push({
        id: 'top5',
        bg: 'bg-gradient-to-b from-indigo-600 to-purple-800',
        emoji: '🏆',
        node: (
          <>
            <Reveal><Kicker>Το Top {stats.mostAttendedPeople.length}</Kicker></Reveal>
            <div className="space-y-2">
              {stats.mostAttendedPeople.map((p, i) => (
                <Reveal key={p.name} d={200 + i * 150}>
                  <Row rank={i + 1} name={p.name} value={String(p.count)} />
                </Reveal>
              ))}
            </div>
          </>
        ),
      });
    }
  }

  if (stats.perfectAttendance.length > 0 && stats.countedEventCount >= 3) {
    const shownNames = stats.perfectAttendance.slice(0, 8);
    const extra = stats.perfectAttendance.length - shownNames.length;
    slides.push({
      id: 'perfect',
      bg: 'bg-gradient-to-b from-lime-300 to-emerald-500',
      dark: true,
      emoji: '💯',
      node: (
        <>
          <Reveal><Kicker>Δεν έχασαν ούτε ένα</Kicker></Reveal>
          <Reveal d={150}>
            <Title>{shownNames.join(', ')}{extra > 0 ? ` +${extra}` : ''}</Title>
          </Reveal>
          <Reveal d={450}><Note>{stats.countedEventCount} στα {stats.countedEventCount}. Τέλεια παρουσία.</Note></Reveal>
        </>
      ),
    });
  }

  if (stats.longestStreak && stats.longestStreak.count >= 3) {
    slides.push({
      id: 'streak',
      bg: 'bg-gradient-to-b from-red-500 to-orange-500',
      emoji: '⚡',
      node: (
        <>
          <Reveal><Kicker>Το μεγαλύτερο σερί</Kicker></Reveal>
          <Reveal d={150}><Word>{stats.longestStreak.names.join(', ')}</Word></Reveal>
          <Reveal d={400}><Huge><CountUp value={stats.longestStreak.count} /></Huge></Reveal>
          <Reveal d={650}><Note>events στη σειρά. Χωρίς απουσία, χωρίς δικαιολογίες.</Note></Reveal>
        </>
      ),
    });
  }

  if (stats.topDuo && stats.topDuo.count >= 2) {
    slides.push({
      id: 'duo',
      bg: 'bg-gradient-to-b from-pink-400 to-purple-600',
      emoji: '🤝',
      node: (
        <>
          <Reveal><Kicker>Οι αχώριστοι</Kicker></Reveal>
          <Reveal d={150}>
            <Title>{stats.topDuo.names[0]} &amp; {stats.topDuo.names[1]}</Title>
          </Reveal>
          <Reveal d={400}><Huge><CountUp value={stats.topDuo.count} /></Huge></Reveal>
          <Reveal d={650}><Note>events μαζί. Να τους βάζουμε πάντα στο ίδιο τραπέζι.</Note></Reveal>
        </>
      ),
    });
  }

  if (stats.rankedCount > 5 && stats.leastAttendedPeople.length > 0) {
    slides.push({
      id: 'least',
      bg: 'bg-gradient-to-b from-slate-700 to-slate-900',
      emoji: '💌',
      node: (
        <>
          <Reveal><Kicker>Σας περιμέναμε…</Kicker></Reveal>
          <div className="space-y-2">
            {stats.leastAttendedPeople.map((p, i) => (
              <Reveal key={p.name} d={200 + i * 150}>
                <Row rank={i + 1} name={p.name} value={String(p.count)} />
              </Reveal>
            ))}
          </div>
          <Reveal d={1000}><Note>Του χρόνου, περισσότερα invites.</Note></Reveal>
        </>
      ),
    });
  }

  slides.push({
    id: 'finale',
    bg: 'bg-gradient-to-br from-fuchsia-600 via-purple-700 to-orange-500',
    emoji: '🥂',
    node: (
      <>
        <Reveal><Kicker>Αυτό ήταν το {year}</Kicker></Reveal>
        <div className="grid grid-cols-2 gap-3">
          <Reveal d={150} className="rounded-2xl bg-white/15 p-4"><p className="text-4xl font-black">{stats.eventCount}</p><p className="text-sm font-semibold opacity-80">events</p></Reveal>
          <Reveal d={300} className="rounded-2xl bg-white/15 p-4"><p className="text-4xl font-black">{stats.attendanceCount}</p><p className="text-sm font-semibold opacity-80">παρουσίες</p></Reveal>
          <Reveal d={450} className="rounded-2xl bg-white/15 p-4"><p className="truncate text-2xl font-black capitalize">{busiestMonth?.count ? busiestMonth.month : '—'}</p><p className="text-sm font-semibold opacity-80">ο μήνας μας</p></Reveal>
          <Reveal d={600} className="rounded-2xl bg-white/15 p-4"><p className="text-2xl font-black [overflow-wrap:anywhere]">{top?.count ? topNames.join(', ') : '—'}</p><p className="text-sm font-semibold opacity-80">ψυχή της παρέας</p></Reveal>
        </div>
        <Reveal d={800}><Title>Τα λέμε στο {year + 1}!</Title></Reveal>
        <Reveal d={950} className="pointer-events-auto flex gap-3 pt-2">
          <button onClick={restart} className="rounded-full bg-white/20 px-5 py-3 font-bold">Ξανά</button>
          <button onClick={close} className="rounded-full bg-white px-5 py-3 font-black text-gray-900">Κλείσιμο</button>
        </Reveal>
      </>
    ),
  });

  return slides;
}

/* ---------- main component ---------- */

export default function Wrapped({ stats }: { stats: WrappedStats }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const close = useCallback(() => setOpen(false), []);
  const restart = useCallback(() => setIndex(0), []);
  const slides = useMemo(() => buildSlides(stats, close, restart), [stats, close, restart]);
  const last = slides.length - 1;

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, last)), [last]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, next, prev, close]);

  const slide = slides[index];
  const ink = slide.dark ? 'text-gray-900' : 'text-white';

  return (
    <>
      <button
        onClick={() => { setIndex(0); setOpen(true); }}
        className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-700 to-orange-500 p-6 text-left text-white shadow-xl transition hover:shadow-2xl md:p-8"
      >
        <span className="pointer-events-none absolute -bottom-6 right-16 rotate-12 text-[8rem] opacity-20">🎁</span>
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold opacity-80">Η χρονιά {stats.year} είναι έτοιμη</p>
            <h2 className="text-3xl font-black md:text-4xl">Parea Wrapped! ✨</h2>
            <p className="mt-1 font-semibold opacity-90">Δες τι κάναμε φέτος, ένα story τη φορά.</p>
          </div>
          <div className="shrink-0 rounded-full bg-white p-4 text-purple-700 transition group-hover:scale-110">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>
      </button>

      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={`Parea Wrapped ${stats.year}`} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 select-none">
            <style>{`
              @keyframes pw-in{from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:none}}
              @keyframes pw-hint{0%,100%{opacity:.4;transform:translateX(0)}50%{opacity:1;transform:translateX(6px)}}
              .pw-in{animation:pw-in .6s cubic-bezier(.2,.8,.2,1) both}
              .pw-hint{animation:pw-hint 1.4s ease-in-out infinite}
              @media (prefers-reduced-motion: reduce){.pw-in,.pw-hint{animation:none}}
            `}</style>

            <div className={`relative h-full w-full max-w-md overflow-hidden transition-colors md:h-[min(100dvh,54rem)] md:rounded-3xl ${slide.bg} ${ink}`}>
              {/* progress */}
              <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-4 pt-4">
                {slides.map((s, i) => (
                  <div key={s.id} className={`h-1 flex-1 rounded-full ${slide.dark ? 'bg-black/20' : 'bg-white/30'}`}>
                    <div className={`h-full rounded-full transition-all duration-300 ${slide.dark ? 'bg-gray-900' : 'bg-white'}`} style={{ width: i <= index ? '100%' : '0%' }} />
                  </div>
                ))}
              </div>

              <button onClick={close} aria-label="Κλείσιμο" className="absolute right-3 top-8 z-30 rounded-full bg-black/15 p-2 backdrop-blur">
                <X className="h-5 w-5" />
              </button>

              {/* tap zones: left third = back, rest = next */}
              <button aria-label="Προηγούμενο" onClick={prev} className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize focus:outline-none" />
              <button aria-label="Επόμενο" onClick={next} className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize focus:outline-none" />

              {/* slide content */}
              <div key={slide.id} className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-center gap-5 px-8 pb-20 pt-28">
                {slide.emoji && (
                  <span className="pointer-events-none absolute -bottom-4 -right-4 rotate-12 text-[11rem] opacity-20">{slide.emoji}</span>
                )}
                {slide.node}
              </div>

              {index === 0 && last > 0 && (
                <div className="pw-hint pointer-events-none absolute bottom-6 right-6 z-20 flex items-center gap-1 text-sm font-bold">
                  Πάτα δεξιά <span aria-hidden>›</span>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
