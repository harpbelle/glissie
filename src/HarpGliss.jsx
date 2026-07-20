import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { SAMPLE_MIDIS, HARP_SAMPLES } from "./samples/harpSamples.js";
import { HARMONIC_SAMPLES } from "./samples/harmonicSamples.js";
import { XYLOPHONIC_SAMPLES, XYLOPHONIC_MIDIS } from "./samples/xylophonic.js";
import { PDLT_SAMPLES, PDLT_MIDIS } from "./samples/pdlt.js";
import { NAIL_SAMPLES, NAIL_MIDIS } from "./samples/nail.js";
import { ETOUFFE_SAMPLES, ETOUFFE_MIDIS } from "./samples/etouffe.js";

// ─── STRING SYSTEM ──────────────────────────────────────────────────────────
// 47 fixed strings, index 0 (7C, lowest) to 46 (0G, highest).
// Octave numbers decrease as pitch rises; each octave group starts at F.
// Sounding pitch = naturalMidi + pedal accidental. Reference: 3A = A 440 Hz.

function buildStrings() {
  const s = [];
  s.push({ oct: 7, letter: "C", midi: 24 });
  s.push({ oct: 7, letter: "D", midi: 26 });
  s.push({ oct: 7, letter: "E", midi: 28 });
  for (let o = 6; o >= 1; o--) {
    const f = 29 + (6 - o) * 12;
    [["F", 0], ["G", 2], ["A", 4], ["B", 6], ["C", 7], ["D", 9], ["E", 11]]
      .forEach(([L, off]) => s.push({ oct: o, letter: L, midi: f + off }));
  }
  s.push({ oct: 0, letter: "F", midi: 101 });
  s.push({ oct: 0, letter: "G", midi: 103 });
  return s;
}
const STRINGS = buildStrings(); // 47 strings

const IDX = {};
STRINGS.forEach((s, i) => { IDX[`${s.oct}${s.letter}`] = i; });

const RANGES = {
  scaleAsc:  [IDX["7C"], IDX["1G"]],
  scaleDesc: [IDX["6C"], IDX["0G"]],
  glissAsc:  [IDX["7C"], IDX["0F"]],
  glissDesc: [IDX["7D"], IDX["0G"]],
};
const AUTO = {
  scale:     [IDX["4A"], IDX["3G"]],
  glissAsc:  [IDX["5A"], IDX["4G"]],
  glissDesc: [IDX["2A"], IDX["1G"]],
};

function accSymbol(a) { return a === -1 ? "♭" : a === 1 ? "♯" : ""; }
function noteLabel(idx, pedals) {
  const s = STRINGS[idx];
  return `${s.oct}${s.letter}${accSymbol(pedals[s.letter])}`;
}
function rng(a, b) {
  const r = [], step = a <= b ? 1 : -1;
  for (let i = a; i !== b + step; i += step) r.push(i);
  return r;
}

// ─── CHORD NOTATION PREVIEW ─────────────────────────────────────────────────
// Grand-staff SVG of the currently selected chord. Module-level (not inline in
// the main component) so React never remounts it. Notes are placed by diatonic
// step (octave*7 + letter index, scientific octave from the natural MIDI), so
// a string always sits on the same line/space and only its accidental changes
// with the pedals. Middle C and above go on the treble staff, B3 and below on
// the bass. Whole noteheads; seconds get the conventional right-offset; ♭/♯
// glyphs stagger into a second column when they would collide vertically.
// Clef outlines extracted from Bravura (Steinberg Media Technologies, SIL OFL
// 1.1), the SMuFL reference font, so the preview matches engraved notation and
// never depends on system symbol fonts. Paths are in font units (1000/em, one
// staff space = 250 units), Y already flipped for SVG; the glyph origin sits
// exactly on the clef's reference line (G4 for treble, F3 for bass), so they
// are placed with translate(x, y(refLine)) scale(gap/250).
// Accidentals from the same font; origin is vertically centred on the
// notehead's line/space, per SMuFL.
const FLAT_PATH = "M12 170C15 174 18 175 21 175C24 175 27 173 27 173C57 156 81 129 106 112C195 50 226 -11 226 -57C226 -114 182 -150 136 -153C119 -153 95 -145 81 -136C75 -131 64 -122 59 -122C57 -122 56 -122 54 -123C47 -126 43 -133 43 -140C44 -162 50 -402 50 -422C50 -433 41 -439 31 -439C17 -439 1 -429 0 -411C0 -411 4 160 12 170ZM47 81C47 81 44 21 44 -19C44 -35 45 -47 46 -51C53 -71 93 -100 116 -100C145 -100 157 -67 157 -42C157 12 111 66 68 93C64 95 61 96 58 96C49 96 47 86 47 81Z";
const SHARP_PATH = "M237 -118C244 -121 249 -129 249 -135V-206C249 -211 246 -214 242 -214C240 -214 239 -214 237 -213C237 -213 217 -205 212 -204C205 -204 198 -209 198 -217V-339C198 -345 192 -350 184 -350C174 -350 168 -345 168 -339V-209C167 -199 164 -186 155 -180C143 -173 109 -159 92 -155C83 -155 80 -167 80 -175V-295C80 -301 73 -306 66 -306C56 -306 50 -301 50 -295V-160C50 -146 44 -136 38 -133C32 -130 12 -122 12 -122C5 -120 0 -112 0 -106V-35C0 -29 3 -26 9 -26L11 -27C12 -27 27 -33 35 -37L36 -38C44 -38 50 -28 50 -20V79C50 90 45 99 39 102C33 104 12 113 12 113C5 115 0 123 0 129V200C0 206 3 209 9 209L11 208C12 208 26 202 35 199C36 198 37 198 38 198C45 198 50 209 50 214V337C50 343 56 348 63 348C73 348 80 343 80 337V198C80 185 85 178 90 176L151 151C151 151 152 151 152 151L154 150C163 150 168 162 168 168V293C168 299 174 304 181 304C192 304 198 299 198 293V151C198 143 202 131 209 128C216 125 237 117 237 117C244 114 249 106 249 100V29C249 24 246 21 242 21C240 21 239 21 237 22L211 32C205 32 198 26 198 14V-79C198 -86 203 -105 211 -108ZM168 45C162 65 115 85 92 85C86 85 81 83 80 80C78 76 77 54 77 30C77 -1 78 -36 80 -44C82 -61 128 -82 153 -82C160 -82 166 -80 168 -76C170 -71 172 -46 172 -19C172 8 170 36 168 45Z";
const GCLEF_PATH = "M376 -415C374 -427 376 -428 382 -434C490 -535 572 -662 572 -815C572 -902 548 -988 507 -1048C492 -1070 466 -1098 455 -1098C441 -1098 410 -1072 390 -1050C316 -968 292 -843 292 -739C292 -681 299 -616 306 -575C308 -563 309 -561 297 -551C153 -432 0 -289 0 -87C0 87 119 252 364 252C387 252 413 250 433 246C444 244 446 243 448 255C460 322 475 409 475 456C475 604 375 622 316 622C262 622 236 606 236 593C236 586 245 583 268 576C299 567 335 540 335 482C335 427 300 380 239 380C172 380 132 433 132 495C132 560 171 658 322 658C389 658 519 628 519 458C519 401 501 306 490 244C488 232 489 233 503 227C604 187 671 102 671 -11C671 -139 577 -252 430 -252C404 -252 404 -252 401 -270ZM470 -943C503 -943 530 -916 530 -861C530 -750 435 -660 356 -591C349 -585 345 -586 343 -599C339 -625 337 -659 337 -691C337 -847 409 -943 470 -943ZM361 -262C364 -243 364 -244 346 -238C258 -208 201 -129 201 -44C201 46 248 110 316 133C324 136 336 139 343 139C351 139 355 134 355 128C355 121 347 118 340 115C298 97 268 54 268 8C268 -49 307 -92 368 -109C384 -113 386 -112 388 -101L438 197C440 208 439 208 424 211C408 214 388 216 368 216C193 216 80 119 80 -20C80 -79 90 -158 173 -252C233 -319 279 -356 326 -394C336 -402 338 -401 340 -390ZM430 -103C428 -115 429 -118 441 -117C522 -110 589 -42 589 46C589 109 551 160 495 188C483 194 481 194 479 182Z";
const FCLEF_PATH = "M252 -262C78 -262 0 -135 0 -39C0 41 42 110 123 110C186 110 229 66 229 4C229 -60 182 -100 133 -100C106 -100 96 -93 83 -93C70 -93 67 -101 67 -111C67 -151 127 -224 229 -224C335 -224 381 -120 381 37C381 316 243 472 10 605C1 610 -5 615 -5 623C-5 629 -1 635 8 635C13 635 19 633 25 630C271 510 531 332 531 28C531 -146 425 -262 252 -262ZM629 -180C598 -180 574 -156 574 -125C574 -94 598 -70 629 -70C660 -70 684 -94 684 -125C684 -156 660 -180 629 -180ZM630 71C599 71 576 94 576 125C576 156 599 179 630 179C661 179 684 156 684 125C684 94 661 71 630 71Z";
// Grand-staff brace (accolade); 997 units tall in the font. Scaled to
// span from the treble top line to the bass bottom line.
const BRACE_PATH = "M20 -498C49 -516 82 -587 82 -646C82 -651 82 -657 81 -662C74 -722 44 -815 44 -869C44 -921 67 -971 72 -980C75 -986 77 -987 77 -990C77 -993 74 -997 71 -997C69 -997 67 -995 63 -990C41 -963 14 -905 14 -805C14 -706 49 -666 49 -603C49 -556 30 -530 2 -498C20 -478 49 -462 49 -397C49 -327 14 -265 14 -192C14 -92 41 -34 63 -6C67 -1 69 0 71 0C74 0 77 -3 77 -6C77 -9 76 -11 72 -17C67 -25 44 -75 44 -128C44 -181 74 -275 81 -334C82 -339 82 -344 82 -350C82 -409 49 -480 20 -498Z";
// Engraved whole-note notehead (422 units wide, one staff space tall);
// origin at the left edge, vertically centred on its line/space.
const WHOLE_PATH = "M216 -125C83 -125 0 -70 0 -2C0 65 57 125 206 125C370 125 422 68 422 -2C422 -73 309 -125 216 -125ZM111 -63C122 -98 159 -103 190 -103C259 -103 314 -29 314 31C314 62 301 90 268 98C258 101 247 102 237 102C201 102 164 78 143 50C123 27 108 -7 108 -39C108 -47 109 -55 111 -63Z";
// Harmonic circle (Bravura U+E614 stringsHarmonic, fonttools-extracted like
// the glyphs above): 200×200 font units, origin at bottom-left, so after the
// Y-flip it occupies y ∈ [−200, 0] — translating puts its *bottom* at y.
// Nail sign (Bravura U+E636 pluckedWithFingernails, fonttools-style
// extraction via opentype.js): outlined crescent, 398×250 font units,
// horns pointing down at y≈0, body extending up — same y-negated,
// scale(k) convention as the other glyphs.
const NAIL_PATH = "M1 1C52 -42 146 -81 199 -81C252 -81 344 -56 398 1C398 1 388 -250 199 -250C5 -250 1 1 1 1ZM199 -216C282 -216 346 -154 363 -59C312 -102 266 -115 199 -115C143 -115 82 -89 38 -59C60 -144 122 -216 199 -216Z";
const HARM_PATH = "M200 -100C200 -156 155 -200 100 -200C45 -200 0 -156 0 -100C0 -45 45 0 100 0C155 0 200 -45 200 -100ZM100 -173C141 -173 173 -141 173 -100C173 -60 141 -27 100 -27C60 -27 27 -60 27 -100C27 -141 60 -173 100 -173Z";
// Étouffé "+" sign: Bravura pluckedLeftHandPizzicato (U+E633), extracted via
// fonttools like the other glyphs. 272 units square, origin at bottom-left.
const ETOUF_PATH = "M272 -152H152V-272H120V-152H0V-120H120V0H152V-120H272Z";
const LETTER_STEP = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
function ChordStaff({ noteIdxs, pedals, t, dark, techs, live }) {
  // techs (Live mode only): Map string index → technique it was struck with.
  // Notation marks follow the per-note technique, so notes keep their own
  // marking while ringing even after the technique picker changes.
  const u = 3.5, gap = 2 * u;                 // half-space unit, line gap
  const notes = noteIdxs.map(i => {
    const s = STRINGS[i];
    const octSci = Math.floor(s.midi / 12) - 1;      // scientific octave of the natural
    return { step: octSci * 7 + LETTER_STEP[s.letter], acc: pedals[s.letter],
      tech: techs ? techs.get(i) : null };
  }).sort((a, b) => a.step - b.step);

  const TRE_TOP = 38, TRE_BOT = 30, BAS_TOP = 26, BAS_BOT = 18; // F5 E4 A3 G2
  // Fixed canvas covering the harp's full range (0G step 53 down to 7C step 7):
  // the staff never moves when high or low notes are added, and the permanent
  // headroom clears the treble clef's ascender (~31px above the G4 line).
  const topExt = 53, botExt = 7;
  const padT = 18, padB = 13, W = 96;
  const y = step => padT + (topExt - step) * u;
  const H = padT + (topExt - botExt) * u + padB;

  // Accidental column assignment per standard engraving practice (Gould,
  // Behind Bars): work from the outermost notes inward (highest first, then
  // lowest, then second-highest…), placing each accidental in the rightmost
  // column where its glyph doesn't collide with one already there. Collision
  // uses the real Bravura extents in step units (1 space = 2 steps): a sharp
  // spans ±2.8 steps around its note; a flat is asymmetric, −1.4 below to
  // +3.5 above (its stem points up). Columns march leftward from the chord.
  // Runs before x-positions are fixed, because the number of columns decides
  // the horizontal layout below.
  const accOff = 9, MAX_COLS = 4, CLEAR = 0.5;
  const EXTENT = { [-1]: [-1.4, 3.5], [1]: [-2.8, 2.8] };
  const withAcc = notes.filter(n => n.acc);
  // Zigzag order: indices from both ends of the (ascending) list, top first.
  const order = [];
  for (let hi = withAcc.length - 1, lo = 0; hi >= lo; hi--, lo++) {
    order.push(withAcc[hi]);
    if (lo < hi) order.push(withAcc[lo]);
  }
  const cols = [];                               // per column: occupied [lo,hi] spans
  const accCols = [];                            // { step, acc, col }
  order.forEach(n => {
    const [dLo, dHi] = EXTENT[n.acc];
    const span = [n.step + dLo - CLEAR, n.step + dHi + CLEAR];
    let col = cols.findIndex(c => c.every(([lo, hi]) => span[1] <= lo || span[0] >= hi));
    if (col === -1) {
      if (cols.length < MAX_COLS) { col = cols.length; cols.push([]); }
      else {
        // All columns collide (extreme cluster): take the least-crowded one.
        let best = 0, bestGap = -Infinity;
        cols.forEach((c, i) => {
          const gap = Math.min(...c.map(([lo, hi]) =>
            Math.max(lo - span[1], span[0] - hi)));
          if (gap > bestGap) { bestGap = gap; best = i; }
        });
        col = best;
      }
    }
    cols[col].push(span);
    accCols.push({ step: n.step, acc: n.acc, col });
  });

  // Horizontal layout. Compact placement by default; when the accidentals
  // need all four columns, the leftmost would crowd the bass clef, so the
  // whole note+accidental assembly slides right just for those chords.
  const shiftR = cols.length >= 4 ? 8 : 0;
  const accX = 52 + shiftR;
  const accs = accCols.map(a => ({ ...a, x: accX - a.col * accOff }));

  // Notehead placement. Seconds follow standard engraving (Gould): the main
  // column keeps the majority of the chord — scanning from the top, the upper
  // note of each second stays in the column and the lower note is displaced
  // one notehead-width to the LEFT (stem-down arrangement), so unpaired chord
  // notes align with the upper note of the pair. The scan runs first (it's
  // x-independent); the column then sits close to the accidentals and only
  // moves right when a displaced note actually needs the room.
  const k = gap / 250, headW = 422 * k;   // Bravura whole-note width
  const headOff = headW;
  let prevStep = null, prevShift = false;
  const shifts = [...notes].reverse().map(n => {
    const shift = prevStep !== null && prevStep - n.step === 1 && !prevShift;
    prevStep = n.step; prevShift = shift;
    return shift;
  }).reverse();
  // Left-aligned anchoring: without seconds, noteheads sit exactly where a
  // displaced-left note would (77 − headW), so the chord's left edge — and
  // its ledger lines — never move when a second appears; only the main
  // column steps right.
  const headX = (shifts.some(Boolean) ? 77 : 77 - headW) + shiftR;
  const placed = notes.map((n, i) => ({ ...n, x: headX - (shifts[i] ? headOff : 0) }));

  // Ledger lines: per step, extend symmetrically (±8px) around each notehead
  // that needs it, widening to cover offset seconds when both columns occur.
  const ledger = new Map();                      // step → {x1, x2}
  const addLedger = (s, x) => {
    const e = ledger.get(s) || { x1: Infinity, x2: -Infinity };
    e.x1 = Math.min(e.x1, x - 8); e.x2 = Math.max(e.x2, x + 8);
    ledger.set(s, e);
  };
  placed.forEach(n => {
    if (n.step > TRE_TOP) for (let s = TRE_TOP + 2; s <= n.step; s += 2) addLedger(s, n.x);
    if (n.step >= 28 && n.step < TRE_BOT) addLedger(28, n.x);         // middle C
    if (n.step < BAS_BOT) for (let s = BAS_BOT - 2; s >= n.step; s -= 2) addLedger(s, n.x);
  });

  const lines = [];
  for (let s = TRE_TOP; s >= TRE_BOT; s -= 2) lines.push(s);
  for (let s = BAS_TOP; s >= BAS_BOT; s -= 2) lines.push(s);
  // Notation is always ink-on-paper: in dark mode the panel becomes a light
  // blue "paper" card with near-black ink rather than inverting the staff.
  const ink = dark ? "#1c2230" : t.text;
  const paper = dark ? "#5c81bd" : "none";

  return (
    <svg width={W + 8} height={H} viewBox={`-8 0 ${W + 8} ${H}`} aria-label="Selected chord in musical notation"
      style={{ background: paper, borderRadius: 8 }}>
      {lines.map(s => (
        <line key={s} x1={2} x2={W - 4} y1={y(s)} y2={y(s)} stroke={ink} strokeWidth={0.9} opacity={0.85}/>
      ))}
      {/* Connecting barline across both staves */}
      <line x1={2} x2={2} y1={y(TRE_TOP)} y2={y(BAS_BOT)} stroke={ink} strokeWidth={1.2}/>
      {/* Grand-staff brace; scaled to span from treble top to bass bottom */}
      {(() => {
        const span = y(BAS_BOT) - y(TRE_TOP);      // pixel height of both staves
        const sy = span / 997;                       // font units → px
        const sx = sy;                               // uniform scaling
        const bx = 2 - 82 * sx;                     // right edge of glyph flush with barline
        return <path d={BRACE_PATH} fill={ink}
          transform={`translate(${bx} ${y(BAS_BOT)}) scale(${sx} ${sy})`}/>;
      })()}
      {/* Clefs: Bravura outlines, origin on the reference line (G4 / F3) */}
      <path d={GCLEF_PATH} transform={`translate(6 ${y(32)}) scale(${k})`} fill={ink}/>
      <path d={FCLEF_PATH} transform={`translate(6 ${y(24)}) scale(${k})`} fill={ink}/>
      {[...ledger].map(([s, e]) => (
        <line key={`l${s}`} x1={e.x1} x2={e.x2} y1={y(s)} y2={y(s)}
          stroke={ink} strokeWidth={0.9} opacity={0.85}/>
      ))}
      {accs.map((a, i) => (
        <path key={`a${i}`} d={a.acc === -1 ? FLAT_PATH : SHARP_PATH} fill={ink}
          transform={`translate(${a.x - 4} ${y(a.step)}) scale(${k})`}/>
      ))}
      {placed.map((n, i) => (
        <path key={`n${i}`} d={WHOLE_PATH} fill={ink}
          transform={`translate(${n.x - headW / 2} ${y(n.step)}) scale(${k})`}/>
      ))}
      {/* Harmonics: per printed convention the circles form a single column
          above the staff rather than hugging each notehead. Treble notes
          (4C / middle C and up) stack above the treble staff; bass-clef
          notes (4B and below) stack just above the bass staff, even though
          that overlaps the treble clef. Each group's stack base clears both
          the staff's top line and the group's own highest notehead, circles
          run bottom-to-top in ascending note order, and each circle sits
          directly above its own notehead's x, so a displaced second's
          circle follows the displaced note. */}
      {placed.some(n => n.tech === "harm") && (() => {
        const dia = 200 * k, gapPx = 2;
        const harmNotes = placed.filter(n => n.tech === "harm");
        const groups = [
          harmNotes.filter(n => n.step >= 28),   // treble: 4C (middle C) and up
          harmNotes.filter(n => n.step < 28),    // bass: 4B and below
        ];
        const baseLine = [TRE_TOP, BAS_TOP];
        const out = [];
        groups.forEach((g, gi) => {
          if (!g.length) return;
          const topStep = Math.max(baseLine[gi], Math.max(...g.map(n => n.step)) + 1);
          let bot = y(topStep) - gapPx;       // bottom edge of the lowest circle
          g.forEach((n, i) => {
            out.push(<path key={`h${gi}-${i}`} d={HARM_PATH} fill={ink}
              transform={`translate(${n.x - 100 * k} ${bot}) scale(${k})`}/>);
            bot -= dia + gapPx;
          });
        });
        return out;
      })()}
      {/* Xylophonic: printed convention is the text "Xyl." followed by an
          extension line with a downward end-hook, spanning the affected
          notes. Drawn once above the treble staff only — xylophonic is an
          exclusively right-hand technique (the left hand damps the string
          end) — clearing both the staff's top line and the highest notehead.
          Upright serif per standard engraved technique indications. */}
      {placed.some(n => n.tech === "xylo") && (() => {
        const xyloNotes = placed.filter(n => n.tech === "xylo");
        // Resting height: fixed comfortably above the treble clef's ascender,
        // so mid-range playing never makes the marking jump. Only noteheads
        // high enough to reach it (above ~G5) push it further up, keeping
        // 2 steps of clearance over the group's highest note.
        // Clamped to 16 at the top so the very highest strings (≈0G) keep
        // the text on-canvas; the rule still clears their notehead.
        const base = Math.max(16, Math.min(54,
          y(Math.max(...xyloNotes.map(n => n.step)) + 2) - 10)); // text baseline
        const lineY = base - 4;                    // rule sits at ~cap height
        const x0 = 6, textW = 25;                  // "Xyl." at 12px serif
        const xEnd = Math.max(x0 + textW + 12, Math.max(...xyloNotes.map(n => n.x)) + headW / 2 + 4);
        return (
          <g>
            <text x={x0} y={base} fill={ink} fontSize={12}
              fontFamily="Georgia, 'Times New Roman', serif">Xyl.</text>
            <line x1={x0 + textW + 2} x2={xEnd} y1={lineY} y2={lineY}
              stroke={ink} strokeWidth={1}/>
            <line x1={xEnd} x2={xEnd} y1={lineY} y2={lineY + 4}
              stroke={ink} strokeWidth={1}/>
          </g>
        );
      })()}
      {/* Près de la table: "p.d.l.t." text, printed per hand — above the
          treble staff for treble-group notes and below the bass staff for
          bass-group notes (either hand can play near the soundboard).
          Vertical behavior mirrors the Xyl. marking: a fixed resting spot
          clear of the staff, pushed outward only by ledger notes that
          reach it, clamped so the text stays on-canvas at the extremes. */}
      {placed.some(n => n.tech === "pdlt") && (() => {
        const pn = placed.filter(n => n.tech === "pdlt");
        const treb = pn.filter(n => n.step >= 28);   // 4C (middle C) and up
        const bass = pn.filter(n => n.step < 28);    // 4B and below
        const out = [];
        const style = { fill: ink, fontSize: 12, textAnchor: "middle",
          fontFamily: "Georgia, 'Times New Roman', serif" };
        // Fixed x aligned with the default (no-seconds, no-accidental-shift)
        // notehead centre, so the text never jumps when chord layout changes.
        const cx = 77 - headW / 2;
        if (treb.length) {
          const base = Math.max(16, Math.min(54,
            y(Math.max(...treb.map(n => n.step)) + 2) - 10));
          out.push(<text key="pt" x={cx} y={base} {...style}>p.d.l.t.</text>);
        }
        if (bass.length) {
          const base = Math.min(H - 3, Math.max(y(BAS_BOT) + 16,
            y(Math.min(...bass.map(n => n.step)) - 2) + 8));
          out.push(<text key="pb" x={cx} y={base} {...style}>p.d.l.t.</text>);
        }
        return out;
      })()}
      {/* Nail: crescent-moon sign, one above the treble staff for treble-group
          notes and one below the bass staff for bass-group notes (no stacking
          per note, unlike harmonic circles). Same fixed x as p.d.l.t. so it
          aligns with the note column without jumping when seconds displace a
          notehead. Crescent = outer semicircle plus a shallower inner arc;
          horns point toward the notes. */}
      {placed.some(n => n.tech === "nail") && (() => {
        const nn = placed.filter(n => n.tech === "nail");
        const treb = nn.filter(n => n.step >= 28);   // 4C (middle C) and up
        const bass = nn.filter(n => n.step < 28);    // 4B and below
        const cx = 77 - headW / 2;
        const out = [];
        if (treb.length) {
          const base = Math.max(16, Math.min(54,
            y(Math.max(...treb.map(n => n.step)) + 2) - 10));
          out.push(<path key="nt" d={NAIL_PATH} fill={ink}
            transform={`translate(${cx - 199 * k} ${base}) scale(${k})`}/>);
        }
        if (bass.length) {
          const base = Math.min(H - 3, Math.max(y(BAS_BOT) + 16,
            y(Math.min(...bass.map(n => n.step)) - 2) + 8));
          out.push(<path key="nb" d={NAIL_PATH} fill={ink}
            transform={`translate(${cx - 199 * k} ${base - 250 * k}) scale(${k} ${-k})`}/>);
        }
        return out;
      })()}
      {/* Étouffé: "+" (Bravura left-hand-pizzicato glyph, U+E633). In Live —
          monophonic, one note at a time — it sits at its own note's x:
          above the treble staff for treble-group notes (4C / middle C and
          up), rising as the note climbs; and below the bass staff for
          4B-and-below, sinking as the note descends — a mirror image of the
          treble placement, staying clear of the bass clef. In Chord mode the
          selection is one damped chord, so the sign is applied once per
          staff group like the nail crescent — above the treble staff and
          below the bass staff, at the fixed note column — never stacked. */}
      {placed.some(n => n.tech === "etouf") && (() => {
        const en = placed.filter(n => n.tech === "etouf");
        if (live) {
          // The glyph draws upward from its origin (272 units tall), so the
          // origin is the sign's bottom. Treble: origin 2 px above the top
          // reference line. Bass: shift the origin down by the glyph height
          // so the sign hangs 2 px below the bottom reference line.
          const H_GLYPH = 272 * k;
          return en.map((n, i) => {
            const base = n.step >= 28
              ? y(Math.max(TRE_TOP, n.step + 1)) - 2
              : Math.min(H - 1, y(Math.min(BAS_BOT, n.step - 1)) + 2 + H_GLYPH);
            return <path key={`e${i}`} d={ETOUF_PATH} fill={ink}
              transform={`translate(${n.x - 136 * k} ${base}) scale(${k})`}/>;
          });
        }
        const treb = en.filter(n => n.step >= 28);   // 4C (middle C) and up
        const bass = en.filter(n => n.step < 28);    // 4B and below
        const cx = 77 - headW / 2;
        // Salzedo muffle sign per Yijun's reference: a ring with the cross
        // arms extending past it (Bravura's U+E68C keeps the cross inside
        // the ring, so this is drawn directly instead of extracted).
        const sign = (key, cy) => (
          <g key={key} stroke={ink} strokeWidth={1.2} fill="none">
            <circle cx={cx} cy={cy} r={3}/>
            <line x1={cx - 4.8} x2={cx + 4.8} y1={cy} y2={cy}/>
            <line x1={cx} x2={cx} y1={cy - 4.8} y2={cy + 4.8}/>
          </g>
        );
        const out = [];
        if (treb.length) {
          const base = Math.max(16, Math.min(54,
            y(Math.max(...treb.map(n => n.step)) + 2) - 10));
          out.push(sign("et", base - 5));
        }
        if (bass.length) {
          const base = Math.min(H - 3, Math.max(y(BAS_BOT) + 16,
            y(Math.min(...bass.map(n => n.step)) - 2) + 8));
          out.push(sign("eb", base - 5));
        }
        return out;
      })()}
    </svg>
  );
}

// ─── SEQUENCE BUILDERS (pure; used at play start and at each loop boundary) ──
// Scale/arpeggio: returns the ordered list of string indices for one pass.
function buildScaleSequence(scaleStart, octaveCount, arpMask, direction, bothStart) {
  const s = scaleStart;
  const baseDegrees = [0,1,2,3,4,5,6].filter(d => arpMask[d]);
  const octaveOn = arpMask[7];
  // One ascending pass from the start note upward across the octave span.
  const ascendPass = () => {
    const up = [];
    for (let o = 0; o < octaveCount; o++) {
      for (const d of baseDegrees) {
        const idx = s + o * 7 + d;
        if (idx >= 0 && idx <= 46) up.push(idx);
      }
    }
    if (octaveOn) { const top = s + octaveCount * 7; if (top <= 46) up.push(top); }
    return up;
  };
  // One descending pass from the start note downward. The octave note (if on)
  // sits at the top, so the run begins on it.
  const descendPass = () => {
    const up = [];
    const bottom = s - octaveCount * 7;
    for (let o = 0; o < octaveCount; o++) {
      for (const d of baseDegrees) {
        const idx = bottom + o * 7 + d;
        if (idx >= 0 && idx <= 46) up.push(idx);
      }
    }
    if (octaveOn) { if (s <= 46) up.push(s); }
    return up.reverse();
  };
  if (direction === "asc") return ascendPass();
  if (direction === "desc") return descendPass();
  // both: bounce out and back. Defaults to starting upward; "down" starts with
  // the descending pass (and the descending range/octave logic applies in the UI).
  const first = bothStart === "down" ? descendPass() : ascendPass();
  return [...first, ...first.slice(0, -1).reverse()];
}
// Gliss non-both: a straight run from start to end.
function buildGlissSequence(glissStart, glissEnd) {
  return rng(glissStart, glissEnd);
}

// Chord mode, hand-span rule: can `pts` (sorted string indices) be played by
// two hands? Each hand holds at most 4 notes assigned to fingers 4-3-2-1
// (thumb = highest note; harpists don't use the 5th finger), possibly skipping
// fingers — e.g. (4,1) alone on a wide tenth. Two constraint layers:
//   1. Whole-hand span: lowest to highest ≤ `span` strings (interval sense,
//      so index difference ≤ span−1).
//   2. Adjacent-finger stretch: each consecutive pair of *used* fingers has a
//      maximum reach, calibrated at the instrument. The lower adjacent pairs
//      (4-3, 3-2) reach half the hand span: a 5th at span 8–9, a 6th at
//      10–11, a 7th at 12–13, and an octave only for span-14+ monster hands,
//      if such hands exist. Thumb-index scales with the hand: two intervals less than the
//      span setting — an octave at span 10, a 9th at span 11. Skipping a
//      finger frees the hand further: 4-2 or 3-1 manage span − 2, and 4-1
//      alone takes the whole span (4C + 3E with just fingers 4 and 1).
// Hands can't interleave in a block chord, so feasibility = some split point
// where both contiguous halves admit a valid finger assignment. Greedy packing
// is no longer optimal with per-gap limits, hence the exhaustive search
// (trivial at ≤ 8 notes).
function pairMaxPluck(hi, lo, span) {         // hi, lo = finger numbers, hi > lo
  const d = hi - lo;
  if (d >= 3) return span - 1;                // 4-1: full hand
  if (d === 2) return span - 2;               // 4-2, 3-1: one finger skipped
  if (lo === 1) return span - 3;              // thumb-index: octave at span 10, 9th at 11
  if (hi === 3) return Math.floor(span / 2) + 1; // 3-2: one step roomier than 4-3 — 6th at span 8–9, 7th at 10–11, octave at 12–13
  return Math.floor(span / 2);                // 4-3: half the span — 5th at 8–9, 6th at 10–11, 7th at 12–13, octave at 14–15
}
// Pdlt/nail (identical model): playing near the soundboard cramps the adjacent
// low pairs (4-3, 3-2) to ceil(span/3), while pairs that skip a finger keep
// nearly the whole span (limits.csv; same index-difference units as
// pairMaxPluck).
function pairMaxThird(hi, lo, span) {
  const d = hi - lo;
  if (d >= 2) return span - 1;                // 4-2, 3-1, 4-1: the whole hand span
  if (lo === 1) return span - 2;              // thumb-index: one string shy of the span
  return Math.ceil(span / 3);                 // 4-3 and 3-2
}
// Per-technique chord limits (limits.csv). fingers = max notes per [left,
// right] hand; span* = the hand-span slider's bounds and default; pair =
// which adjacent-finger stretch model applies ("none": harmonics — the tight
// finger counts and span do all the limiting); canBreak = whether Break
// chord is available (harmonics and étouffé chords are always simultaneous).
const TECH_LIMITS = {
  default: { fingers: [4, 4], spanMin: 8, spanMax: 15, spanDef: 10, pair: "pluck", canBreak: true },
  harm:    { fingers: [3, 1], spanMin: 3, spanMax: 8,  spanDef: 5,  pair: "none",  canBreak: false },
  xylo:    { fingers: [0, 4], spanMin: 4, spanMax: 10, spanDef: 6,  pair: "pluck", canBreak: true },
  pdlt:    { fingers: [4, 4], spanMin: 4, spanMax: 12, spanDef: 8,  pair: "third", canBreak: true },
  nail:    { fingers: [4, 4], spanMin: 4, spanMax: 12, spanDef: 8,  pair: "third", canBreak: true },
  etouf:   { fingers: [4, 4], spanMin: 8, spanMax: 15, spanDef: 10, pair: "pluck", canBreak: false },
};
function handFeasible(notes, span, cap, pair) {
  const k = notes.length;
  if (k === 0) return true;
  if (k > cap) return false;
  if (notes[k - 1] - notes[0] > span - 1) return false;
  if (k === 1 || pair === "none") return true;
  const pm = pair === "third" ? pairMaxThird : pairMaxPluck;
  // Choose k fingers out of 4-3-2-1 (descending finger = ascending pitch).
  const combos = { 2: [[4,3],[4,2],[4,1],[3,2],[3,1],[2,1]],
                   3: [[4,3,2],[4,3,1],[4,2,1],[3,2,1]],
                   4: [[4,3,2,1]] }[k];
  return combos.some(fs => notes.every((n, j) =>
    j === 0 || n - notes[j - 1] <= pm(fs[j - 1], fs[j], span)
  ));
}
function handsFeasible(pts, span, lim = TECH_LIMITS.default) {
  const [lF, rF] = lim.fingers;   // lower slice = left hand, upper = right
  if (pts.length === 0) return true;
  if (pts.length > lF + rF) return false;
  for (let s = 0; s <= pts.length; s++) {
    if (handFeasible(pts.slice(0, s), span, lF, lim.pair) &&
        handFeasible(pts.slice(s), span, rF, lim.pair)) return true;
  }
  return false;
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
function sameConfig(a, b) { return LETTERS.every(L => a[L] === b[L]); }

// ─── MAJOR SCALES (auto-detect base note from manual pedalling) ─────────────
const MAJOR_SCALES = [
  { name: "C♭ major", rootL: "C", p: { C:-1,D:-1,E:-1,F:-1,G:-1,A:-1,B:-1 } },
  { name: "G♭ major", rootL: "G", p: { C:-1,D:-1,E:-1,F:0, G:-1,A:-1,B:-1 } },
  { name: "D♭ major", rootL: "D", p: { C:0, D:-1,E:-1,F:0, G:-1,A:-1,B:-1 } },
  { name: "A♭ major", rootL: "A", p: { C:0, D:-1,E:-1,F:0, G:0, A:-1,B:-1 } },
  { name: "E♭ major", rootL: "E", p: { C:0, D:0, E:-1,F:0, G:0, A:-1,B:-1 } },
  { name: "B♭ major", rootL: "B", p: { C:0, D:0, E:-1,F:0, G:0, A:0, B:-1 } },
  { name: "F major",  rootL: "F", p: { C:0, D:0, E:0, F:0, G:0, A:0, B:-1 } },
  { name: "C major",  rootL: "C", p: { C:0, D:0, E:0, F:0, G:0, A:0, B:0 } },
  { name: "G major",  rootL: "G", p: { C:0, D:0, E:0, F:1, G:0, A:0, B:0 } },
  { name: "D major",  rootL: "D", p: { C:1, D:0, E:0, F:1, G:0, A:0, B:0 } },
  { name: "A major",  rootL: "A", p: { C:1, D:0, E:0, F:1, G:1, A:0, B:0 } },
  { name: "E major",  rootL: "E", p: { C:1, D:1, E:0, F:1, G:1, A:0, B:0 } },
  { name: "B major",  rootL: "B", p: { C:1, D:1, E:0, F:1, G:1, A:1, B:0 } },
  { name: "F♯ major", rootL: "F", p: { C:1, D:1, E:1, F:1, G:1, A:1, B:0 } },
  { name: "C♯ major", rootL: "C", p: { C:1, D:1, E:1, F:1, G:1, A:1, B:1 } },
];
function detectMajor(pedals) {
  return MAJOR_SCALES.find(s => sameConfig(s.p, pedals)) || null;
}
function findStringByLetter(lo, hi, letter) {
  for (let i = lo; i <= hi; i++) if (STRINGS[i].letter === letter) return i;
  return null;
}

// ─── NESTED PRESETS ─────────────────────────────────────────────────────────
// Each item: chip (short label), name (full, for detection), rootL (start-note
// string letter), pedals. Minors use their own root, not the relative major's.
const MINOR_DEFS = [
  ["A♭", "A", "C♭ major"], ["E♭", "E", "G♭ major"], ["B♭", "B", "D♭ major"],
  ["F", "F", "A♭ major"], ["C", "C", "E♭ major"], ["G", "G", "B♭ major"],
  ["D", "D", "F major"], ["A", "A", "C major"], ["E", "E", "G major"],
  ["B", "B", "D major"], ["F♯", "F", "A major"], ["C♯", "C", "E major"],
  ["G♯", "G", "B major"], ["D♯", "D", "F♯ major"], ["A♯", "A", "C♯ major"],
];
// Major pentatonics: canonical configs prefer root+5th enharmonic doubling.
// rootL = string of the "higher" enharmonic root within the detection window.
const PENTATONIC_DEFS = [
  { chip: "C♭", rootL: "C", p: { D:-1, C:-1, B:0, E:-1, F:1, G:-1, A:-1 } },
  { chip: "C", rootL: "C", p: { D:0, C:0, B:1, E:0, F:-1, G:0, A:0 } },
  { chip: "C♯", rootL: "C", p: { D:1, C:1, B:-1, E:-1, F:0, G:1, A:-1 } },
  { chip: "D♭", rootL: "D", p: { D:-1, C:1, B:-1, E:-1, F:0, G:1, A:-1 } },
  { chip: "D", rootL: "D", p: { D:0, C:-1, B:0, E:0, F:-1, G:-1, A:0 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:0, B:-1, E:1, F:0, G:0, A:1 } },
  { chip: "E♭", rootL: "E", p: { D:1, C:0, B:-1, E:-1, F:0, G:0, A:1 } },
  { chip: "E", rootL: "E", p: { D:-1, C:-1, B:0, E:0, F:1, G:-1, A:-1 } },
  { chip: "F♭", rootL: "F", p: { D:-1, C:-1, B:0, E:0, F:-1, G:-1, A:-1 } },
  { chip: "F", rootL: "F", p: { D:0, C:0, B:1, E:1, F:0, G:0, A:0 } },
  { chip: "F♯", rootL: "F", p: { D:-1, C:1, B:-1, E:-1, F:1, G:1, A:-1 } },
  { chip: "G♭", rootL: "G", p: { D:-1, C:1, B:-1, E:-1, F:1, G:-1, A:-1 } },
  { chip: "G", rootL: "G", p: { D:0, C:-1, B:0, E:0, F:-1, G:0, A:0 } },
  { chip: "G♯", rootL: "G", p: { D:1, C:0, B:-1, E:-1, F:0, G:1, A:1 } },
  { chip: "A♭", rootL: "A", p: { D:1, C:0, B:-1, E:-1, F:0, G:1, A:-1 } },
  { chip: "A", rootL: "A", p: { D:-1, C:-1, B:0, E:0, F:-1, G:-1, A:0 } },
  { chip: "A♯", rootL: "A", p: { D:0, C:0, B:1, E:1, F:0, G:0, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:0, C:0, B:-1, E:1, F:0, G:0, A:1 } },
  { chip: "B", rootL: "B", p: { D:-1, C:1, B:0, E:-1, F:1, G:-1, A:-1 } },
];

// Dominant 7ths: 5 of 12 pitch-class sets, 8 configs.
const DOM7_DEFS = [
  { chip: "C♯", rootL: "C", p: { D:-1, C:1, B:0, E:1, F:0, G:1, A:-1 } },
  { chip: "D♭", rootL: "D", p: { D:-1, C:-1, B:0, E:1, F:0, G:1, A:-1 } },
  { chip: "E", rootL: "E", p: { D:0, C:-1, B:0, E:0, F:-1, G:1, A:-1 } },
  { chip: "F♯", rootL: "F", p: { D:-1, C:1, B:-1, E:0, F:1, G:-1, A:1 } },
  { chip: "G♭", rootL: "G", p: { D:-1, C:1, B:-1, E:0, F:-1, G:-1, A:1 } },
  { chip: "G♯", rootL: "G", p: { D:1, C:0, B:1, E:-1, F:1, G:1, A:-1 } },
  { chip: "A♭", rootL: "A", p: { D:1, C:0, B:1, E:-1, F:1, G:-1, A:-1 } },
  { chip: "B", rootL: "B", p: { D:1, C:-1, B:0, E:-1, F:1, G:-1, A:0 } },
];

// Minor pentatonics share configs with their relative major pentatonics
// (identical pitch-class sets); start note follows the minor root.
// 19 root names, 45 configs; sharp roots split out where the enharmonic
// string spells the root (e.g. C:♯ in a D♭ config → its own C♯ chip).
const MINOR_PENT_DEFS = [
  { chip: "C", rootL: "C", p: { D:1, C:0, B:-1, E:-1, F:0, G:0, A:1 } },
  { chip: "C♯", rootL: "C", p: { D:-1, C:1, B:0, E:0, F:-1, G:-1, A:-1 } },
  { chip: "D♭", rootL: "D", p: { D:-1, C:-1, B:0, E:0, F:-1, G:-1, A:-1 } },
  { chip: "D", rootL: "D", p: { D:0, C:0, B:1, E:1, F:0, G:0, A:0 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:1, B:-1, E:-1, F:1, G:-1, A:-1 } },
  { chip: "E♭", rootL: "E", p: { D:-1, C:1, B:-1, E:-1, F:1, G:-1, A:-1 } },
  { chip: "E", rootL: "E", p: { D:0, C:-1, B:0, E:0, F:-1, G:0, A:0 } },
  { chip: "E♯", rootL: "E", p: { D:1, C:0, B:-1, E:1, F:0, G:1, A:-1 } },
  { chip: "F", rootL: "F", p: { D:1, C:0, B:-1, E:-1, F:0, G:1, A:-1 } },
  { chip: "F♯", rootL: "F", p: { D:-1, C:-1, B:0, E:0, F:1, G:-1, A:0 } },
  { chip: "G♭", rootL: "G", p: { D:-1, C:-1, B:0, E:0, F:-1, G:-1, A:0 } },
  { chip: "G", rootL: "G", p: { D:0, C:0, B:-1, E:1, F:0, G:0, A:1 } },
  { chip: "G♯", rootL: "G", p: { D:-1, C:-1, B:0, E:-1, F:1, G:1, A:-1 } },
  { chip: "A♭", rootL: "A", p: { D:-1, C:-1, B:0, E:-1, F:1, G:-1, A:-1 } },
  { chip: "A", rootL: "A", p: { D:0, C:0, B:1, E:0, F:-1, G:0, A:0 } },
  { chip: "A♯", rootL: "A", p: { D:-1, C:1, B:-1, E:-1, F:0, G:1, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:-1, C:1, B:-1, E:-1, F:0, G:1, A:-1 } },
  { chip: "B", rootL: "B", p: { D:0, C:-1, B:0, E:0, F:-1, G:-1, A:0 } },
  { chip: "B♯", rootL: "B", p: { D:1, C:0, B:1, E:-1, F:0, G:0, A:1 } },
];

// Diminished 7ths: only 3 distinct collections exist (the chord is symmetric,
// so e.g. C°7 = E♭°7 = G♭°7 = A°7). Each has exactly one possible config;
// every string letter has a single valid pedal position.
const DIM7_DEFS = [
  { chip: "On C (C–E♭–G♭–A)",   rootL: "C", p: { D:1,  C:0,  B:1,  E:-1, F:1,  G:-1, A:0 } },  // D♯ C B♯ E♭ F♯ G♭ A
  { chip: "On C♯ (C♯–E–G–B♭)",  rootL: "C", p: { D:-1, C:1,  B:-1, E:0,  F:-1, G:0,  A:1 } },  // D♭ C♯ B♭ E F♭ G A♯
  { chip: "On D (D–F–A♭–B)",    rootL: "D", p: { D:0,  C:-1, B:0,  E:1,  F:0,  G:1,  A:-1 } }, // D C♭ B E♯ F G♯ A♭
];
// Hirajoshi (1, 2, ♭3, 5, ♭6): only 4 roots are possible; the scale
// has two major-third gaps, each of which can strand a string letter. All four
// canonical configs double root and 5th.
const HIRAJOSHI_DEFS = [
  { chip: "D♯", rootL: "D", p: { D:1, C:-1, B:-1, E:1, F:0, G:-1, A:1 } },
  { chip: "E♭", rootL: "E", p: { D:1, C:-1, B:-1, E:-1, F:0, G:-1, A:1 } },
  { chip: "F", rootL: "F", p: { D:-1, C:0, B:1, E:1, F:0, G:0, A:-1 } },
  { chip: "G♯", rootL: "G", p: { D:1, C:-1, B:-1, E:-1, F:-1, G:1, A:1 } },
  { chip: "A♭", rootL: "A", p: { D:1, C:-1, B:-1, E:-1, F:-1, G:1, A:-1 } },
  { chip: "A♯", rootL: "A", p: { D:-1, C:0, B:1, E:1, F:0, G:-1, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:-1, C:0, B:-1, E:1, F:0, G:-1, A:1 } },
];

// Harmonic minors: all 12 roots, conventional spellings (7 notes, no doublings).
// G♯/D♯/A♯ spellings would need double-sharps, so their flat-side enharmonic
// spellings are used; identical pitches.
const HARM_MINOR_DEFS = [
  { chip: "C",     rootL: "C", p: { D:0,  C:0,  B:0,  E:-1, F:0,  G:0,  A:-1 } },
  { chip: "C♯",    rootL: "C", p: { D:1, C:1, B:1, E:0, F:1, G:1, A:0 } },
  { chip: "D",     rootL: "D", p: { D:0,  C:1,  B:-1, E:0,  F:0,  G:0,  A:0 } },
  { chip: "E♭",    rootL: "E", p: { D:0, C:-1, B:-1, E:-1, F:0, G:-1, A:-1 } },
  { chip: "E",     rootL: "E", p: { D:1,  C:0,  B:0,  E:0,  F:1,  G:0,  A:0 } },
  { chip: "F",     rootL: "F", p: { D:-1, C:0,  B:-1, E:0,  F:0,  G:0,  A:-1 } },
  { chip: "F♯",    rootL: "F", p: { D:0, C:1, B:0, E:1, F:1, G:1, A:0 } },
  { chip: "G",     rootL: "G", p: { D:0,  C:0,  B:-1, E:-1, F:1,  G:0,  A:0 } },
  { chip: "A♭",    rootL: "A", p: { D:-1, C:-1, B:-1, E:-1, F:-1, G:0, A:-1 } },
  { chip: "A",     rootL: "A", p: { D:0,  C:0,  B:0,  E:0,  F:0,  G:1,  A:0 } },
  { chip: "B♭",    rootL: "B", p: { D:-1, C:0, B:-1, E:-1, F:0, G:-1, A:0 } },
  { chip: "B",     rootL: "B", p: { D:0,  C:1,  B:0,  E:0,  F:1,  G:0,  A:1 } },
];
// Melodic minor, ascending form (1 2 ♭3 4 5 6 7): all 12 roots. Equivalent to
// the major scale with a lowered 3rd (a.k.a. "jazz minor"). The descending form
// is the natural minor, already listed above, so only the ascending form is new.
// G♯/D♯/A♯ spellings would need double-sharps, so their flat-side enharmonic
// spellings are used; identical pitches.
const MELODIC_MINOR_DEFS = [
  { chip: "C",     rootL: "C", p: { D:0,  C:0,  B:0,  E:-1, F:0,  G:0,  A:0 } },
  { chip: "C♯",    rootL: "C", p: { D:1,  C:1,  B:1,  E:0,  F:1,  G:1,  A:1 } },
  { chip: "D♭",    rootL: "D", p: { D:-1, C:0,  B:-1, E:-1, F:-1, G:-1, A:-1 } },
  { chip: "D",     rootL: "D", p: { D:0,  C:1,  B:0,  E:0,  F:0,  G:0,  A:0 } },
  { chip: "E♭",    rootL: "E", p: { D:0, C:0, B:-1, E:-1, F:0, G:-1, A:-1 } },
  { chip: "E",     rootL: "E", p: { D:1,  C:1,  B:0,  E:0,  F:1,  G:0,  A:0 } },
  { chip: "F",     rootL: "F", p: { D:0,  C:0,  B:-1, E:0,  F:0,  G:0,  A:-1 } },
  { chip: "F♯",    rootL: "F", p: { D:1, C:1, B:0, E:1, F:1, G:1, A:0 } },
  { chip: "G",     rootL: "G", p: { D:0,  C:0,  B:-1, E:0,  F:1,  G:0,  A:0 } },
  { chip: "A♭",    rootL: "A", p: { D:-1, C:-1, B:-1, E:-1, F:0, G:0, A:-1 } },
  { chip: "A",     rootL: "A", p: { D:0,  C:0,  B:0,  E:0,  F:1,  G:1,  A:0 } },
  { chip: "B♭",    rootL: "B", p: { D:-1, C:0, B:-1, E:-1, F:0, G:0, A:0 } },
  { chip: "B",     rootL: "B", p: { D:0,  C:1,  B:0,  E:0,  F:1,  G:1,  A:1 } },
];
// Hungarian minor (1, 2, ♭3, ♯4, 5, ♭6, 7): 11 of 12 roots; C♯/D♭ is
// impossible (its set forces B♯ and F♭, leaving the E string with no pitch).
const HUNGARIAN_DEFS = [
  { chip: "C",     rootL: "C", p: { D:0,  C:0,  B:0,  E:-1, F:1,  G:0,  A:-1 } },
  { chip: "D",     rootL: "D", p: { D:0,  C:1,  B:-1, E:0,  F:0,  G:1,  A:0 } },
  { chip: "E♭",    rootL: "E", p: { D:0, C:-1, B:-1, E:-1, F:0, G:-1, A:0 } },
  { chip: "E",     rootL: "E", p: { D:1,  C:0,  B:0,  E:0,  F:1,  G:0,  A:1 } },
  { chip: "F",     rootL: "F", p: { D:-1, C:0,  B:0,  E:0,  F:0,  G:0,  A:-1 } },
  { chip: "F♯",    rootL: "F", p: { D:0, C:1, B:1, E:1, F:1, G:1, A:0 } },
  { chip: "G",     rootL: "G", p: { D:0,  C:1,  B:-1, E:-1, F:1,  G:0,  A:0 } },
  { chip: "A♭",    rootL: "A", p: { D:0, C:-1, B:-1, E:-1, F:-1, G:0, A:-1 } },
  { chip: "A",     rootL: "A", p: { D:1,  C:0,  B:0,  E:0,  F:0,  G:1,  A:0 } },
  { chip: "B♭",    rootL: "B", p: { D:-1, C:0, B:-1, E:0, F:0, G:-1, A:0 } },
  { chip: "B",     rootL: "B", p: { D:0,  C:1,  B:0,  E:1,  F:1,  G:0,  A:1 } },
];
// Blues major (1, 2, ♭3, 3, 5, 6): hexatonic; exactly one enharmonic doubling.
// 11 of 12 roots; F is impossible. Doubling preference: root > 5th > 6th.
const BLUES_MAJOR_DEFS = [
  { chip: "C", rootL: "C", p: { D:0, C:0, B:1, E:-1, F:-1, G:0, A:0 } },
  { chip: "C♯", rootL: "C", p: { D:1, C:1, B:-1, E:0, F:0, G:1, A:-1 } },
  { chip: "D", rootL: "D", p: { D:0, C:-1, B:0, E:0, F:0, G:-1, A:0 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:0, B:-1, E:1, F:1, G:0, A:1 } },
  { chip: "E", rootL: "E", p: { D:-1, C:-1, B:0, E:0, F:1, G:0, A:-1 } },
  { chip: "F♯", rootL: "F", p: { D:-1, C:1, B:-1, E:-1, F:1, G:1, A:0 } },
  { chip: "G", rootL: "G", p: { D:0, C:-1, B:-1, E:0, F:-1, G:0, A:0 } },
  { chip: "G♯", rootL: "G", p: { D:1, C:0, B:0, E:-1, F:0, G:1, A:1 } },
  { chip: "A", rootL: "A", p: { D:-1, C:0, B:0, E:0, F:-1, G:-1, A:0 } },
  { chip: "A♯", rootL: "A", p: { D:0, C:1, B:1, E:1, F:0, G:0, A:1 } },
  { chip: "B", rootL: "B", p: { D:0, C:1, B:0, E:-1, F:1, G:-1, A:-1 } },
];

// Blues minor (1, ♭3, 4, ♭5, 5, ♭7): hexatonic. 18 root names; D is
// impossible. Relative of blues major (C blues major = A blues minor).
const BLUES_MINOR_DEFS = [
  { chip: "C", rootL: "C", p: { D:1, C:0, B:-1, E:1, F:1, G:0, A:1 } },
  { chip: "C♯", rootL: "C", p: { D:-1, C:1, B:0, E:0, F:1, G:0, A:-1 } },
  { chip: "D♭", rootL: "D", p: { D:-1, C:-1, B:0, E:0, F:1, G:0, A:-1 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:1, B:-1, E:-1, F:1, G:1, A:0 } },
  { chip: "E♭", rootL: "E", p: { D:-1, C:1, B:-1, E:-1, F:1, G:1, A:0 } },
  { chip: "E", rootL: "E", p: { D:0, C:-1, B:-1, E:0, F:-1, G:0, A:0 } },
  { chip: "E♯", rootL: "E", p: { D:1, C:0, B:0, E:1, F:0, G:1, A:1 } },
  { chip: "F", rootL: "F", p: { D:1, C:0, B:0, E:-1, F:0, G:1, A:1 } },
  { chip: "F♯", rootL: "F", p: { D:-1, C:0, B:0, E:0, F:1, G:-1, A:0 } },
  { chip: "G♭", rootL: "G", p: { D:-1, C:0, B:0, E:0, F:-1, G:-1, A:0 } },
  { chip: "G", rootL: "G", p: { D:0, C:1, B:1, E:1, F:0, G:0, A:1 } },
  { chip: "G♯", rootL: "G", p: { D:0, C:1, B:0, E:-1, F:1, G:1, A:-1 } },
  { chip: "A♭", rootL: "A", p: { D:0, C:1, B:0, E:-1, F:1, G:-1, A:-1 } },
  { chip: "A", rootL: "A", p: { D:0, C:0, B:1, E:-1, F:-1, G:0, A:0 } },
  { chip: "A♯", rootL: "A", p: { D:1, C:1, B:-1, E:0, F:0, G:1, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:1, C:1, B:-1, E:0, F:0, G:1, A:-1 } },
  { chip: "B", rootL: "B", p: { D:0, C:-1, B:0, E:0, F:0, G:-1, A:0 } },
  { chip: "B♯", rootL: "B", p: { D:1, C:0, B:1, E:1, F:1, G:0, A:1 } },
];

// ── Completing the ≤7-note scale survey ──
// Harmonic major (1 2 3 4 5 ♭6 7): all 12 roots.
const HARM_MAJOR_DEFS = [
  { chip: "C", rootL: "C", p: { D:0, C:0, B:0, E:0, F:0, G:0, A:-1 } },
  { chip: "C♯",    rootL: "C", p: { D:1, C:1, B:1, E:1, F:1, G:1, A:0 } },
  { chip: "D", rootL: "D", p: { D:0, C:1, B:-1, E:0, F:1, G:0, A:0 } },
  { chip: "E♭",    rootL: "E", p: { D:0, C:-1, B:-1, E:-1, F:0, G:0, A:-1 } },
  { chip: "E", rootL: "E", p: { D:1, C:0, B:0, E:0, F:1, G:1, A:0 } },
  { chip: "F", rootL: "F", p: { D:-1, C:0, B:-1, E:0, F:0, G:0, A:0 } },
  { chip: "F♯",    rootL: "F", p: { D:0, C:1, B:0, E:1, F:1, G:1, A:1 } },
  { chip: "G", rootL: "G", p: { D:0, C:0, B:0, E:-1, F:1, G:0, A:0 } },
  { chip: "A♭",    rootL: "A", p: { D:-1, C:0, B:-1, E:-1, F:-1, G:0, A:-1 } },
  { chip: "A", rootL: "A", p: { D:0, C:1, B:0, E:0, F:0, G:1, A:0 } },
  { chip: "B♭",    rootL: "B", p: { D:0, C:0, B:-1, E:-1, F:0, G:-1, A:0 } },
  { chip: "B", rootL: "B", p: { D:1, C:1, B:0, E:0, F:1, G:0, A:1 } },
];
// Double harmonic major (1 ♭2 3 4 5 ♭6 7): 11 of 12; G♯/A♭ impossible.
const DBL_HARM_DEFS = [
  { chip: "C", rootL: "C", p: { D:-1, C:0, B:0, E:0, F:0, G:0, A:-1 } },
  { chip: "C♯",    rootL: "C", p: { D:0, C:1, B:1, E:1, F:1, G:1, A:0 } },
  { chip: "D", rootL: "D", p: { D:0, C:1, B:-1, E:-1, F:1, G:0, A:0 } },
  { chip: "E♭",    rootL: "E", p: { D:0, C:-1, B:-1, E:-1, F:-1, G:0, A:-1 } },
  { chip: "E", rootL: "E", p: { D:1, C:0, B:0, E:0, F:0, G:1, A:0 } },
  { chip: "F", rootL: "F", p: { D:-1, C:0, B:-1, E:0, F:0, G:-1, A:0 } },
  { chip: "F♯",    rootL: "F", p: { D:0, C:1, B:0, E:1, F:1, G:0, A:1 } },
  { chip: "G", rootL: "G", p: { D:0, C:0, B:0, E:-1, F:1, G:0, A:-1 } },
  { chip: "A", rootL: "A", p: { D:0, C:1, B:-1, E:0, F:0, G:1, A:0 } },
  { chip: "B♭",    rootL: "B", p: { D:0, C:-1, B:-1, E:-1, F:0, G:-1, A:0 } },
  { chip: "B", rootL: "B", p: { D:1, C:0, B:0, E:0, F:1, G:0, A:1 } },
];
// Neapolitan major (1 ♭2 ♭3 4 5 6 7): 11 of 12; G♯/A♭ impossible.
const NEAP_MAJOR_DEFS = [
  { chip: "C", rootL: "C", p: { D:-1, C:0, B:0, E:-1, F:0, G:0, A:0 } },
  { chip: "C♯",    rootL: "C", p: { D:0, C:1, B:1, E:0, F:1, G:1, A:1 } },
  { chip: "D", rootL: "D", p: { D:0, C:1, B:0, E:-1, F:0, G:0, A:0 } },
  { chip: "E♭",    rootL: "E", p: { D:0, C:0, B:-1, E:-1, F:-1, G:-1, A:-1 } },
  { chip: "E", rootL: "E", p: { D:1, C:1, B:0, E:0, F:0, G:0, A:0 } },
  { chip: "F", rootL: "F", p: { D:0, C:0, B:-1, E:0, F:0, G:-1, A:-1 } },
  { chip: "F♯",    rootL: "F", p: { D:1, C:1, B:0, E:1, F:1, G:0, A:0 } },
  { chip: "G", rootL: "G", p: { D:0, C:0, B:-1, E:0, F:1, G:0, A:-1 } },
  { chip: "A", rootL: "A", p: { D:0, C:0, B:-1, E:0, F:1, G:1, A:0 } },
  { chip: "B♭",    rootL: "B", p: { D:-1, C:-1, B:-1, E:-1, F:0, G:0, A:0 } },
  { chip: "B", rootL: "B", p: { D:0, C:0, B:0, E:0, F:1, G:1, A:1 } },
];
// Neapolitan minor (1 ♭2 ♭3 4 5 ♭6 7): 11 of 12; G♯/A♭ impossible.
const NEAP_MINOR_DEFS = [
  { chip: "C", rootL: "C", p: { D:-1, C:0, B:0, E:-1, F:0, G:0, A:-1 } },
  { chip: "C♯",    rootL: "C", p: { D:0, C:1, B:1, E:0, F:1, G:1, A:0 } },
  { chip: "D", rootL: "D", p: { D:0, C:1, B:-1, E:-1, F:0, G:0, A:0 } },
  { chip: "E♭",    rootL: "E", p: { D:0, C:-1, B:-1, E:-1, F:-1, G:-1, A:-1 } },
  { chip: "E", rootL: "E", p: { D:1, C:0, B:0, E:0, F:0, G:0, A:0 } },
  { chip: "F", rootL: "F", p: { D:-1, C:0, B:-1, E:0, F:0, G:-1, A:-1 } },
  { chip: "F♯",    rootL: "F", p: { D:0, C:1, B:0, E:1, F:1, G:0, A:0 } },
  { chip: "G", rootL: "G", p: { D:0, C:0, B:-1, E:-1, F:1, G:0, A:-1 } },
  { chip: "A", rootL: "A", p: { D:0, C:0, B:-1, E:0, F:0, G:1, A:0 } },
  { chip: "B♭",    rootL: "B", p: { D:-1, C:-1, B:-1, E:-1, F:0, G:-1, A:0 } },
  { chip: "B", rootL: "B", p: { D:0, C:0, B:0, E:0, F:1, G:0, A:1 } },
];
// Hungarian major (1 ♯2 3 ♯4 5 6 ♭7): 10 of 12; E and B impossible.
const HUNG_MAJOR_DEFS = [
  { chip: "C", rootL: "C", p: { D:1, C:0, B:-1, E:0, F:1, G:0, A:0 } },
  { chip: "D♭",    rootL: "D", p: { D:-1, C:-1, B:-1, E:0, F:0, G:0, A:-1 } },
  { chip: "D", rootL: "D", p: { D:0, C:0, B:0, E:1, F:1, G:1, A:0 } },
  { chip: "E♭", rootL: "E", p: { D:-1, C:0, B:-1, E:-1, F:1, G:0, A:0 } },
  { chip: "F", rootL: "F", p: { D:0, C:0, B:0, E:-1, F:0, G:1, A:0 } },
  { chip: "G♭",    rootL: "G", p: { D:-1, C:0, B:-1, E:-1, F:-1, G:-1, A:0 } },
  { chip: "G", rootL: "G", p: { D:0, C:1, B:0, E:0, F:0, G:0, A:1 } },
  { chip: "A♭",    rootL: "A", p: { D:0, C:0, B:0, E:-1, F:0, G:-1, A:-1 } },
  { chip: "A", rootL: "A", p: { D:1, C:1, B:1, E:0, F:1, G:0, A:0 } },
  { chip: "B♭", rootL: "B", p: { D:0, C:1, B:-1, E:0, F:0, G:0, A:-1 } },
];
// Augmented scale (1 ♯2 3 5 ♭6 7): symmetric; 4 distinct collections, 5 configs.
const AUGMENTED_DEFS = [
  { chip: "On C", rootL: "C", p: { D:1, C:0, B:0, E:-1, F:-1, G:0, A:-1 } },
  { chip: "On C♯", rootL: "C", p: { D:-1, C:1, B:1, E:0, F:0, G:1, A:0 } },
  { chip: "On D♭", rootL: "D", p: { D:-1, C:0, B:1, E:0, F:0, G:1, A:0 } },
  { chip: "On D", rootL: "D", p: { D:0, C:1, B:-1, E:1, F:0, G:-1, A:0 } },
  { chip: "On E♭", rootL: "E", p: { D:0, C:-1, B:-1, E:-1, F:1, G:0, A:1 } },
];
// Prometheus / mystic (1 2 3 ♯4 6 ♭7): all 12 roots.
const PROMETHEUS_DEFS = [
  { chip: "C♭", rootL: "C", p: { D:-1, C:-1, B:0, E:-1, F:0, G:1, A:0 } },
  { chip: "C", rootL: "C", p: { D:0, C:0, B:-1, E:0, F:-1, G:-1, A:0 } },
  { chip: "C♯", rootL: "C", p: { D:1, C:1, B:0, E:-1, F:0, G:0, A:1 } },
  { chip: "D♭", rootL: "D", p: { D:-1, C:-1, B:-1, E:-1, F:0, G:0, A:1 } },
  { chip: "D", rootL: "D", p: { D:0, C:0, B:0, E:0, F:-1, G:-1, A:-1 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:1, B:1, E:1, F:0, G:0, A:0 } },
  { chip: "E♭", rootL: "E", p: { D:-1, C:0, B:1, E:-1, F:0, G:0, A:0 } },
  { chip: "E", rootL: "E", p: { D:0, C:1, B:-1, E:0, F:1, G:-1, A:-1 } },
  { chip: "F♭", rootL: "F", p: { D:0, C:1, B:-1, E:0, F:-1, G:-1, A:-1 } },
  { chip: "F", rootL: "F", p: { D:0, C:-1, B:0, E:-1, F:0, G:0, A:0 } },
  { chip: "F♯", rootL: "F", p: { D:1, C:0, B:-1, E:0, F:1, G:1, A:-1 } },
  { chip: "G♭", rootL: "G", p: { D:1, C:0, B:-1, E:-1, F:-1, G:-1, A:-1 } },
  { chip: "G", rootL: "G", p: { D:-1, C:-1, B:0, E:0, F:0, G:0, A:0 } },
  { chip: "G♯", rootL: "G", p: { D:0, C:0, B:-1, E:1, F:1, G:1, A:1 } },
  { chip: "A♭", rootL: "A", p: { D:0, C:0, B:-1, E:1, F:0, G:-1, A:-1 } },
  { chip: "A", rootL: "A", p: { D:-1, C:-1, B:0, E:-1, F:1, G:0, A:0 } },
  { chip: "B♭", rootL: "B", p: { D:0, C:0, B:-1, E:0, F:-1, G:0, A:-1 } },
  { chip: "B", rootL: "B", p: { D:-1, C:1, B:0, E:-1, F:0, G:1, A:0 } },
];

// Kumoi (1 2 ♭3 5 6): 5 of 12.
const KUMOI_DEFS = [
  { chip: "C♯", rootL: "C", p: { D:1, C:1, B:-1, E:-1, F:-1, G:1, A:-1 } },
  { chip: "D♭", rootL: "D", p: { D:-1, C:1, B:-1, E:-1, F:-1, G:1, A:-1 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:0, B:-1, E:1, F:0, G:-1, A:1 } },
  { chip: "E♭", rootL: "E", p: { D:1, C:0, B:-1, E:-1, F:0, G:-1, A:1 } },
  { chip: "F", rootL: "F", p: { D:0, C:0, B:1, E:1, F:0, G:0, A:-1 } },
  { chip: "G♯", rootL: "G", p: { D:1, C:-1, B:-1, E:-1, F:0, G:1, A:1 } },
  { chip: "A♭", rootL: "A", p: { D:1, C:-1, B:-1, E:-1, F:0, G:1, A:-1 } },
  { chip: "A♯", rootL: "A", p: { D:-1, C:0, B:1, E:1, F:0, G:0, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:-1, C:0, B:-1, E:1, F:0, G:0, A:1 } },
];

// Iwato (1 ♭2 4 ♭5 ♭7): 4 of 12; a mode of Hirajoshi (same collections).
const IWATO_DEFS = [
  { chip: "C", rootL: "C", p: { D:-1, C:0, B:-1, E:1, F:0, G:-1, A:1 } },
  { chip: "E♯", rootL: "E", p: { D:1, C:-1, B:-1, E:1, F:1, G:-1, A:1 } },
  { chip: "F", rootL: "F", p: { D:1, C:-1, B:-1, E:-1, F:0, G:-1, A:1 } },
  { chip: "G", rootL: "G", p: { D:-1, C:0, B:1, E:1, F:0, G:0, A:-1 } },
  { chip: "A♯", rootL: "A", p: { D:1, C:-1, B:0, E:-1, F:-1, G:1, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:1, C:-1, B:-1, E:-1, F:-1, G:1, A:-1 } },
  { chip: "B♯", rootL: "B", p: { D:-1, C:1, B:1, E:1, F:0, G:-1, A:1 } },
];

// In / sakura (1 ♭2 4 5 ♭6): 4 of 12; also a mode of Hirajoshi.
const IN_DEFS = [
  { chip: "C", rootL: "C", p: { D:-1, C:0, B:1, E:1, F:0, G:0, A:-1 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:-1, B:-1, E:0, F:-1, G:1, A:-1 } },
  { chip: "E♭", rootL: "E", p: { D:1, C:-1, B:-1, E:-1, F:-1, G:1, A:-1 } },
  { chip: "E♯", rootL: "E", p: { D:-1, C:0, B:-1, E:1, F:1, G:-1, A:1 } },
  { chip: "F", rootL: "F", p: { D:-1, C:0, B:-1, E:1, F:0, G:-1, A:1 } },
  { chip: "A♯", rootL: "A", p: { D:1, C:-1, B:0, E:-1, F:0, G:-1, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:1, C:-1, B:-1, E:-1, F:0, G:-1, A:1 } },
  { chip: "B♯", rootL: "B", p: { D:-1, C:1, B:1, E:1, F:0, G:0, A:-1 } },
];

// Insen (1 ♭2 4 5 ♭7): 5 of 12; a distinct collection.
const INSEN_DEFS = [
  { chip: "C", rootL: "C", p: { D:-1, C:0, B:-1, E:1, F:0, G:0, A:1 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:1, B:-1, E:0, F:-1, G:1, A:-1 } },
  { chip: "E♭", rootL: "E", p: { D:-1, C:1, B:-1, E:-1, F:-1, G:1, A:-1 } },
  { chip: "E♯", rootL: "E", p: { D:1, C:0, B:-1, E:1, F:1, G:-1, A:1 } },
  { chip: "F", rootL: "F", p: { D:1, C:0, B:-1, E:-1, F:0, G:-1, A:1 } },
  { chip: "G", rootL: "G", p: { D:0, C:0, B:1, E:1, F:0, G:0, A:-1 } },
  { chip: "A♯", rootL: "A", p: { D:1, C:-1, B:0, E:-1, F:0, G:1, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:1, C:-1, B:-1, E:-1, F:0, G:1, A:-1 } },
  { chip: "B♯", rootL: "B", p: { D:-1, C:1, B:1, E:1, F:0, G:0, A:1 } },
];


// ── Alternate pedal configs (same pitch set, fewer flats) ──
const PENTATONIC_ALT_DEFS = [
  { chip: "C♭ (1)", rootL: "C", p: { D:-1, C:-1, B:0, E:-1, F:1, G:1, A:-1 } },
  { chip: "C♯ (1)", rootL: "C", p: { D:1, C:1, B:-1, E:-1, F:0, G:1, A:1 } },
  { chip: "C♯ (2)", rootL: "C", p: { D:1, C:1, B:-1, E:1, F:0, G:1, A:-1 } },
  { chip: "C♯ (3)", rootL: "C", p: { D:1, C:1, B:-1, E:1, F:0, G:1, A:1 } },
  { chip: "D♭ (1)", rootL: "D", p: { D:-1, C:1, B:-1, E:-1, F:0, G:1, A:1 } },
  { chip: "D (1)", rootL: "D", p: { D:0, C:-1, B:0, E:0, F:1, G:-1, A:0 } },
  { chip: "D♯ (1)", rootL: "D", p: { D:1, C:0, B:1, E:1, F:0, G:0, A:1 } },
  { chip: "E♭ (1)", rootL: "E", p: { D:1, C:0, B:1, E:-1, F:0, G:0, A:1 } },
  { chip: "E (1)", rootL: "E", p: { D:-1, C:-1, B:0, E:0, F:1, G:1, A:-1 } },
  { chip: "E (2)", rootL: "E", p: { D:-1, C:1, B:0, E:0, F:1, G:-1, A:-1 } },
  { chip: "E (3)", rootL: "E", p: { D:-1, C:1, B:0, E:0, F:1, G:1, A:-1 } },
  { chip: "F♭ (1)", rootL: "F", p: { D:-1, C:1, B:0, E:0, F:-1, G:-1, A:-1 } },
  { chip: "F♯ (1)", rootL: "F", p: { D:-1, C:1, B:-1, E:-1, F:1, G:1, A:1 } },
  { chip: "F♯ (2)", rootL: "F", p: { D:1, C:1, B:-1, E:-1, F:1, G:1, A:-1 } },
  { chip: "F♯ (3)", rootL: "F", p: { D:1, C:1, B:-1, E:-1, F:1, G:1, A:1 } },
  { chip: "G♭ (1)", rootL: "G", p: { D:1, C:1, B:-1, E:-1, F:1, G:-1, A:-1 } },
  { chip: "G♯ (1)", rootL: "G", p: { D:1, C:0, B:-1, E:1, F:0, G:1, A:1 } },
  { chip: "G♯ (2)", rootL: "G", p: { D:1, C:0, B:1, E:-1, F:0, G:1, A:1 } },
  { chip: "G♯ (3)", rootL: "G", p: { D:1, C:0, B:1, E:1, F:0, G:1, A:1 } },
  { chip: "A♭ (1)", rootL: "A", p: { D:1, C:0, B:-1, E:1, F:0, G:1, A:-1 } },
  { chip: "A (1)", rootL: "A", p: { D:-1, C:-1, B:0, E:0, F:1, G:-1, A:0 } },
  { chip: "A (2)", rootL: "A", p: { D:-1, C:1, B:0, E:0, F:-1, G:-1, A:0 } },
  { chip: "A (3)", rootL: "A", p: { D:-1, C:1, B:0, E:0, F:1, G:-1, A:0 } },
  { chip: "B (1)", rootL: "B", p: { D:-1, C:1, B:0, E:-1, F:1, G:1, A:-1 } },
  { chip: "B (2)", rootL: "B", p: { D:1, C:1, B:0, E:-1, F:1, G:-1, A:-1 } },
  { chip: "B (3)", rootL: "B", p: { D:1, C:1, B:0, E:-1, F:1, G:1, A:-1 } },
];

const MINOR_PENT_ALT_DEFS = [
  { chip: "C (1)", rootL: "C", p: { D:1, C:0, B:-1, E:1, F:0, G:0, A:1 } },
  { chip: "C♯ (1)", rootL: "C", p: { D:-1, C:1, B:0, E:0, F:1, G:-1, A:-1 } },
  { chip: "C♯ (2)", rootL: "C", p: { D:-1, C:1, B:0, E:0, F:1, G:1, A:-1 } },
  { chip: "D♭ (1)", rootL: "D", p: { D:-1, C:-1, B:0, E:0, F:1, G:-1, A:-1 } },
  { chip: "D♭ (2)", rootL: "D", p: { D:-1, C:-1, B:0, E:0, F:1, G:1, A:-1 } },
  { chip: "D♯ (1)", rootL: "D", p: { D:1, C:1, B:-1, E:-1, F:1, G:1, A:-1 } },
  { chip: "D♯ (2)", rootL: "D", p: { D:1, C:1, B:-1, E:-1, F:1, G:1, A:1 } },
  { chip: "E♭ (1)", rootL: "E", p: { D:-1, C:1, B:-1, E:-1, F:1, G:1, A:-1 } },
  { chip: "E♭ (2)", rootL: "E", p: { D:-1, C:1, B:-1, E:-1, F:1, G:1, A:1 } },
  { chip: "E♯ (1)", rootL: "E", p: { D:1, C:0, B:-1, E:1, F:0, G:1, A:1 } },
  { chip: "E♯ (2)", rootL: "E", p: { D:1, C:0, B:1, E:1, F:0, G:1, A:1 } },
  { chip: "F (1)", rootL: "F", p: { D:1, C:0, B:-1, E:-1, F:0, G:1, A:1 } },
  { chip: "F (2)", rootL: "F", p: { D:1, C:0, B:1, E:-1, F:0, G:1, A:1 } },
  { chip: "F♯ (1)", rootL: "F", p: { D:-1, C:1, B:0, E:0, F:1, G:-1, A:0 } },
  { chip: "G♭ (1)", rootL: "G", p: { D:-1, C:1, B:0, E:0, F:-1, G:-1, A:0 } },
  { chip: "G (1)", rootL: "G", p: { D:0, C:0, B:1, E:1, F:0, G:0, A:1 } },
  { chip: "G♯ (1)", rootL: "G", p: { D:-1, C:1, B:0, E:-1, F:1, G:1, A:-1 } },
  { chip: "G♯ (2)", rootL: "G", p: { D:1, C:1, B:0, E:-1, F:1, G:1, A:-1 } },
  { chip: "A♭ (1)", rootL: "A", p: { D:-1, C:1, B:0, E:-1, F:1, G:-1, A:-1 } },
  { chip: "A♭ (2)", rootL: "A", p: { D:1, C:1, B:0, E:-1, F:1, G:-1, A:-1 } },
  { chip: "A♯ (1)", rootL: "A", p: { D:1, C:1, B:-1, E:-1, F:0, G:1, A:1 } },
  { chip: "A♯ (2)", rootL: "A", p: { D:1, C:1, B:-1, E:1, F:0, G:1, A:1 } },
  { chip: "B♭ (1)", rootL: "B", p: { D:1, C:1, B:-1, E:-1, F:0, G:1, A:-1 } },
  { chip: "B♭ (2)", rootL: "B", p: { D:1, C:1, B:-1, E:1, F:0, G:1, A:-1 } },
  { chip: "B (1)", rootL: "B", p: { D:0, C:-1, B:0, E:0, F:1, G:-1, A:0 } },
  { chip: "B♯ (1)", rootL: "B", p: { D:1, C:0, B:1, E:1, F:0, G:0, A:1 } },
];

const HIRAJOSHI_ALT_DEFS = [
  { chip: "D♯ (1)", rootL: "D", p: { D:1, C:-1, B:0, E:1, F:0, G:-1, A:1 } },
  { chip: "D♯ (2)", rootL: "D", p: { D:1, C:-1, B:-1, E:1, F:1, G:-1, A:1 } },
  { chip: "D♯ (3)", rootL: "D", p: { D:1, C:-1, B:0, E:1, F:1, G:-1, A:1 } },
  { chip: "E♭ (1)", rootL: "E", p: { D:1, C:-1, B:0, E:-1, F:0, G:-1, A:1 } },
  { chip: "F (1)", rootL: "F", p: { D:-1, C:1, B:1, E:1, F:0, G:0, A:-1 } },
  { chip: "G♯ (1)", rootL: "G", p: { D:1, C:-1, B:-1, E:0, F:-1, G:1, A:1 } },
  { chip: "G♯ (2)", rootL: "G", p: { D:1, C:-1, B:0, E:-1, F:-1, G:1, A:1 } },
  { chip: "G♯ (3)", rootL: "G", p: { D:1, C:-1, B:0, E:0, F:-1, G:1, A:1 } },
  { chip: "A♭ (1)", rootL: "A", p: { D:1, C:-1, B:-1, E:0, F:-1, G:1, A:-1 } },
  { chip: "A♯ (1)", rootL: "A", p: { D:-1, C:0, B:1, E:1, F:1, G:-1, A:1 } },
  { chip: "A♯ (2)", rootL: "A", p: { D:-1, C:1, B:1, E:1, F:0, G:-1, A:1 } },
  { chip: "A♯ (3)", rootL: "A", p: { D:-1, C:1, B:1, E:1, F:1, G:-1, A:1 } },
  { chip: "B♭ (1)", rootL: "B", p: { D:-1, C:0, B:-1, E:1, F:1, G:-1, A:1 } },
];

const KUMOI_ALT_DEFS = [
  { chip: "C♯ (1)", rootL: "C", p: { D:1, C:1, B:-1, E:0, F:-1, G:1, A:-1 } },
  { chip: "C♯ (2)", rootL: "C", p: { D:1, C:1, B:-1, E:-1, F:-1, G:1, A:1 } },
  { chip: "C♯ (3)", rootL: "C", p: { D:1, C:1, B:-1, E:0, F:-1, G:1, A:1 } },
  { chip: "D♭ (1)", rootL: "D", p: { D:-1, C:1, B:-1, E:-1, F:-1, G:1, A:1 } },
  { chip: "D♯ (1)", rootL: "D", p: { D:1, C:0, B:-1, E:1, F:1, G:-1, A:1 } },
  { chip: "D♯ (2)", rootL: "D", p: { D:1, C:0, B:1, E:1, F:0, G:-1, A:1 } },
  { chip: "D♯ (3)", rootL: "D", p: { D:1, C:0, B:1, E:1, F:1, G:-1, A:1 } },
  { chip: "E♭ (1)", rootL: "E", p: { D:1, C:0, B:1, E:-1, F:0, G:-1, A:1 } },
  { chip: "G♯ (1)", rootL: "G", p: { D:1, C:-1, B:0, E:-1, F:0, G:1, A:1 } },
  { chip: "G♯ (2)", rootL: "G", p: { D:1, C:-1, B:-1, E:1, F:0, G:1, A:1 } },
  { chip: "G♯ (3)", rootL: "G", p: { D:1, C:-1, B:0, E:1, F:0, G:1, A:1 } },
  { chip: "A♭ (1)", rootL: "A", p: { D:1, C:-1, B:-1, E:1, F:0, G:1, A:-1 } },
  { chip: "A♯ (1)", rootL: "A", p: { D:-1, C:1, B:1, E:1, F:0, G:0, A:1 } },
];

const IWATO_ALT_DEFS = [
  { chip: "C (1)", rootL: "C", p: { D:-1, C:0, B:-1, E:1, F:1, G:-1, A:1 } },
  { chip: "C (2)", rootL: "C", p: { D:-1, C:0, B:1, E:1, F:0, G:-1, A:1 } },
  { chip: "C (3)", rootL: "C", p: { D:-1, C:0, B:1, E:1, F:1, G:-1, A:1 } },
  { chip: "E♯ (1)", rootL: "E", p: { D:1, C:-1, B:0, E:1, F:1, G:-1, A:1 } },
  { chip: "F (1)", rootL: "F", p: { D:1, C:-1, B:0, E:-1, F:0, G:-1, A:1 } },
  { chip: "F (2)", rootL: "F", p: { D:1, C:-1, B:-1, E:1, F:0, G:-1, A:1 } },
  { chip: "F (3)", rootL: "F", p: { D:1, C:-1, B:0, E:1, F:0, G:-1, A:1 } },
  { chip: "G (1)", rootL: "G", p: { D:-1, C:1, B:1, E:1, F:0, G:0, A:-1 } },
  { chip: "A♯ (1)", rootL: "A", p: { D:1, C:-1, B:0, E:0, F:-1, G:1, A:1 } },
  { chip: "B♭ (1)", rootL: "B", p: { D:1, C:-1, B:-1, E:0, F:-1, G:1, A:-1 } },
  { chip: "B♭ (2)", rootL: "B", p: { D:1, C:-1, B:-1, E:-1, F:-1, G:1, A:1 } },
  { chip: "B♭ (3)", rootL: "B", p: { D:1, C:-1, B:-1, E:0, F:-1, G:1, A:1 } },
  { chip: "B♯ (1)", rootL: "B", p: { D:-1, C:1, B:1, E:1, F:1, G:-1, A:1 } },
];

const IN_ALT_DEFS = [
  { chip: "D♯ (1)", rootL: "D", p: { D:1, C:-1, B:-1, E:0, F:-1, G:1, A:1 } },
  { chip: "D♯ (2)", rootL: "D", p: { D:1, C:-1, B:0, E:0, F:-1, G:1, A:1 } },
  { chip: "E♭ (1)", rootL: "E", p: { D:1, C:-1, B:-1, E:-1, F:-1, G:1, A:1 } },
  { chip: "E♭ (2)", rootL: "E", p: { D:1, C:-1, B:0, E:-1, F:-1, G:1, A:1 } },
  { chip: "E♯ (1)", rootL: "E", p: { D:-1, C:0, B:1, E:1, F:1, G:-1, A:1 } },
  { chip: "E♯ (2)", rootL: "E", p: { D:-1, C:1, B:1, E:1, F:1, G:-1, A:1 } },
  { chip: "F (1)", rootL: "F", p: { D:-1, C:0, B:1, E:1, F:0, G:-1, A:1 } },
  { chip: "F (2)", rootL: "F", p: { D:-1, C:1, B:1, E:1, F:0, G:-1, A:1 } },
  { chip: "A♯ (1)", rootL: "A", p: { D:1, C:-1, B:0, E:1, F:0, G:-1, A:1 } },
  { chip: "A♯ (2)", rootL: "A", p: { D:1, C:-1, B:0, E:1, F:1, G:-1, A:1 } },
  { chip: "B♭ (1)", rootL: "B", p: { D:1, C:-1, B:-1, E:1, F:0, G:-1, A:1 } },
  { chip: "B♭ (2)", rootL: "B", p: { D:1, C:-1, B:-1, E:1, F:1, G:-1, A:1 } },
];

const INSEN_ALT_DEFS = [
  { chip: "C (1)", rootL: "C", p: { D:-1, C:0, B:1, E:1, F:0, G:0, A:1 } },
  { chip: "D♯ (1)", rootL: "D", p: { D:1, C:1, B:-1, E:0, F:-1, G:1, A:1 } },
  { chip: "E♭ (1)", rootL: "E", p: { D:-1, C:1, B:-1, E:-1, F:-1, G:1, A:1 } },
  { chip: "E♭ (2)", rootL: "E", p: { D:1, C:1, B:-1, E:-1, F:-1, G:1, A:-1 } },
  { chip: "E♭ (3)", rootL: "E", p: { D:1, C:1, B:-1, E:-1, F:-1, G:1, A:1 } },
  { chip: "E♯ (1)", rootL: "E", p: { D:1, C:0, B:1, E:1, F:1, G:-1, A:1 } },
  { chip: "F (1)", rootL: "F", p: { D:1, C:0, B:-1, E:1, F:0, G:-1, A:1 } },
  { chip: "F (2)", rootL: "F", p: { D:1, C:0, B:1, E:-1, F:0, G:-1, A:1 } },
  { chip: "F (3)", rootL: "F", p: { D:1, C:0, B:1, E:1, F:0, G:-1, A:1 } },
  { chip: "A♯ (1)", rootL: "A", p: { D:1, C:-1, B:0, E:1, F:0, G:1, A:1 } },
  { chip: "B♭ (1)", rootL: "B", p: { D:1, C:-1, B:-1, E:-1, F:0, G:1, A:1 } },
  { chip: "B♭ (2)", rootL: "B", p: { D:1, C:-1, B:-1, E:1, F:0, G:1, A:-1 } },
  { chip: "B♭ (3)", rootL: "B", p: { D:1, C:-1, B:-1, E:1, F:0, G:1, A:1 } },
];

const BLUES_MAJOR_ALT_DEFS = [
  { chip: "C♯ (1)", rootL: "C", p: { D:1, C:1, B:-1, E:0, F:0, G:1, A:1 } },
  { chip: "C♯ (2) ⚠E♯", rootL: "C", p: { D:1, C:1, B:-1, E:1, F:-1, G:1, A:-1 } },
  { chip: "C♯ (3) ⚠E♯", rootL: "C", p: { D:1, C:1, B:-1, E:1, F:-1, G:1, A:1 } },
  { chip: "D (1) ⚠E♯", rootL: "D", p: { D:0, C:-1, B:0, E:1, F:-1, G:-1, A:0 } },
  { chip: "D♯ (1)", rootL: "D", p: { D:1, C:0, B:1, E:1, F:1, G:0, A:1 } },
  { chip: "E (1)", rootL: "E", p: { D:-1, C:1, B:0, E:0, F:1, G:0, A:-1 } },
  { chip: "F♯ (1)", rootL: "F", p: { D:1, C:1, B:-1, E:-1, F:1, G:1, A:0 } },
  { chip: "G♯ (1)", rootL: "G", p: { D:1, C:0, B:0, E:1, F:0, G:1, A:1 } },
  { chip: "G♯ (2) ⚠B♯", rootL: "G", p: { D:1, C:-1, B:1, E:-1, F:0, G:1, A:1 } },
  { chip: "G♯ (3) ⚠B♯", rootL: "G", p: { D:1, C:-1, B:1, E:1, F:0, G:1, A:1 } },
  { chip: "A (1)", rootL: "A", p: { D:-1, C:0, B:0, E:0, F:1, G:-1, A:0 } },
  { chip: "A (2) ⚠B♯", rootL: "A", p: { D:-1, C:-1, B:1, E:0, F:-1, G:-1, A:0 } },
  { chip: "A (3) ⚠B♯", rootL: "A", p: { D:-1, C:-1, B:1, E:0, F:1, G:-1, A:0 } },
  { chip: "B (1)", rootL: "B", p: { D:0, C:1, B:0, E:-1, F:1, G:1, A:-1 } },
];

const BLUES_MINOR_ALT_DEFS = [
  { chip: "E♯ (1) ⚠B♯", rootL: "E", p: { D:1, C:-1, B:1, E:1, F:0, G:1, A:1 } },
  { chip: "F (1) ⚠B♯", rootL: "F", p: { D:1, C:-1, B:1, E:-1, F:0, G:1, A:1 } },
  { chip: "F♯ (1) ⚠B♯", rootL: "F", p: { D:-1, C:-1, B:1, E:0, F:1, G:-1, A:0 } },
  { chip: "G♭ (1) ⚠B♯", rootL: "G", p: { D:-1, C:-1, B:1, E:0, F:-1, G:-1, A:0 } },
  { chip: "A♯ (1) ⚠E♯", rootL: "A", p: { D:1, C:1, B:-1, E:1, F:-1, G:1, A:1 } },
  { chip: "B♭ (1) ⚠E♯", rootL: "B", p: { D:1, C:1, B:-1, E:1, F:-1, G:1, A:-1 } },
  { chip: "B (1) ⚠E♯", rootL: "B", p: { D:0, C:-1, B:0, E:1, F:-1, G:-1, A:0 } },
];

const PROMETHEUS_ALT_DEFS = [
  { chip: "C (1)", rootL: "C", p: { D:0, C:0, B:-1, E:0, F:1, G:-1, A:0 } },
  { chip: "C♯ (1)", rootL: "C", p: { D:1, C:1, B:0, E:1, F:0, G:0, A:1 } },
  { chip: "D♭ (1)", rootL: "D", p: { D:-1, C:-1, B:0, E:-1, F:0, G:0, A:1 } },
  { chip: "D♭ (2)", rootL: "D", p: { D:-1, C:1, B:0, E:-1, F:0, G:0, A:1 } },
  { chip: "D (1)", rootL: "D", p: { D:0, C:0, B:0, E:0, F:1, G:-1, A:-1 } },
  { chip: "D (2)", rootL: "D", p: { D:0, C:0, B:0, E:0, F:1, G:1, A:-1 } },
  { chip: "D (3) ⚠B♯", rootL: "D", p: { D:0, C:-1, B:1, E:0, F:-1, G:-1, A:-1 } },
  { chip: "D (4) ⚠B♯", rootL: "D", p: { D:0, C:-1, B:1, E:0, F:1, G:-1, A:-1 } },
  { chip: "D (5) ⚠B♯", rootL: "D", p: { D:0, C:-1, B:1, E:0, F:1, G:1, A:-1 } },
  { chip: "E♭ (1)", rootL: "E", p: { D:-1, C:1, B:1, E:-1, F:0, G:0, A:0 } },
  { chip: "E♭ (2)", rootL: "E", p: { D:1, C:1, B:1, E:-1, F:0, G:0, A:0 } },
  { chip: "E (1)", rootL: "E", p: { D:0, C:1, B:-1, E:0, F:1, G:1, A:-1 } },
  { chip: "E (2)", rootL: "E", p: { D:0, C:1, B:-1, E:0, F:1, G:1, A:1 } },
  { chip: "F♯ (1)", rootL: "F", p: { D:1, C:0, B:-1, E:0, F:1, G:1, A:1 } },
  { chip: "F♯ (2)", rootL: "F", p: { D:1, C:0, B:1, E:0, F:1, G:1, A:1 } },
  { chip: "G♭ (1)", rootL: "G", p: { D:1, C:0, B:-1, E:0, F:-1, G:-1, A:-1 } },
  { chip: "G♭ (2)", rootL: "G", p: { D:1, C:0, B:-1, E:0, F:1, G:-1, A:-1 } },
  { chip: "G (1)", rootL: "G", p: { D:-1, C:1, B:0, E:0, F:0, G:0, A:0 } },
  { chip: "G (2) ⚠E♯", rootL: "G", p: { D:-1, C:-1, B:0, E:1, F:-1, G:0, A:0 } },
  { chip: "G (3) ⚠E♯", rootL: "G", p: { D:-1, C:1, B:0, E:1, F:-1, G:0, A:0 } },
  { chip: "G♯ (1)", rootL: "G", p: { D:0, C:0, B:1, E:1, F:1, G:1, A:1 } },
  { chip: "A♭ (1)", rootL: "A", p: { D:0, C:0, B:-1, E:1, F:1, G:-1, A:-1 } },
  { chip: "A♭ (2)", rootL: "A", p: { D:0, C:0, B:-1, E:1, F:1, G:1, A:-1 } },
  { chip: "A (1)", rootL: "A", p: { D:-1, C:1, B:0, E:-1, F:1, G:0, A:0 } },
  { chip: "A (2)", rootL: "A", p: { D:1, C:1, B:0, E:-1, F:1, G:0, A:0 } },
  { chip: "B (1)", rootL: "B", p: { D:1, C:1, B:0, E:-1, F:0, G:1, A:0 } },
  { chip: "B (2)", rootL: "B", p: { D:1, C:1, B:0, E:1, F:0, G:1, A:0 } },
];

const MAJ7_ALT_DEFS = [];

const MIN7_ALT_DEFS = [];

const DOM7_ALT_DEFS = [];

const HALFDIM_ALT_DEFS = [];

const DIM7_ALT_DEFS = [];

const AUGMENTED_ALT_DEFS = [
  { chip: "On C (1)", rootL: "C", p: { D:1, C:0, B:0, E:0, F:-1, G:0, A:-1 } },
  { chip: "On C♯ (1) ⚠E♯", rootL: "C", p: { D:-1, C:1, B:1, E:1, F:-1, G:1, A:0 } },
  { chip: "On D♭ (1) ⚠E♯", rootL: "D", p: { D:-1, C:0, B:1, E:1, F:-1, G:1, A:0 } },
  { chip: "On D (1)", rootL: "D", p: { D:0, C:1, B:-1, E:1, F:1, G:-1, A:0 } },
  { chip: "On E♭ (1)", rootL: "E", p: { D:0, C:-1, B:0, E:-1, F:1, G:0, A:1 } },
  { chip: "On B♯ (1) ⚠B♯", rootL: "B", p: { D:1, C:-1, B:1, E:-1, F:-1, G:0, A:-1 } },
  { chip: "On B♯ (2) ⚠B♯", rootL: "B", p: { D:1, C:-1, B:1, E:0, F:-1, G:0, A:-1 } },
];


// Major 7th arpeggio (1 3 5 7): 4 of 12 pitch-class sets, 8 configs.
const MAJ7_DEFS = [
  { chip: "C♭", rootL: "C", p: { D:1, C:-1, B:-1, E:-1, F:1, G:-1, A:1 } },
  { chip: "C♯", rootL: "C", p: { D:-1, C:1, B:1, E:1, F:0, G:1, A:-1 } },
  { chip: "D♭", rootL: "D", p: { D:-1, C:0, B:1, E:1, F:0, G:1, A:-1 } },
  { chip: "E", rootL: "E", p: { D:1, C:-1, B:0, E:0, F:-1, G:1, A:-1 } },
  { chip: "F♭", rootL: "F", p: { D:1, C:-1, B:0, E:-1, F:-1, G:1, A:-1 } },
  { chip: "F♯", rootL: "F", p: { D:-1, C:1, B:-1, E:1, F:1, G:-1, A:1 } },
  { chip: "G♭", rootL: "G", p: { D:-1, C:1, B:-1, E:1, F:0, G:-1, A:1 } },
  { chip: "B", rootL: "B", p: { D:1, C:-1, B:0, E:-1, F:1, G:-1, A:1 } },
];

// Minor 7th arpeggio (1 ♭3 5 ♭7): 5 of 12 pitch-class sets, 10 configs.
const MIN7_DEFS = [
  { chip: "C♯", rootL: "C", p: { D:-1, C:1, B:0, E:0, F:-1, G:1, A:-1 } },
  { chip: "D♭", rootL: "D", p: { D:-1, C:-1, B:0, E:0, F:-1, G:1, A:-1 } },
  { chip: "D♯", rootL: "D", p: { D:1, C:1, B:-1, E:-1, F:1, G:-1, A:1 } },
  { chip: "E♭", rootL: "E", p: { D:-1, C:1, B:-1, E:-1, F:1, G:-1, A:1 } },
  { chip: "E♯", rootL: "E", p: { D:1, C:0, B:1, E:1, F:0, G:1, A:-1 } },
  { chip: "F", rootL: "F", p: { D:1, C:0, B:1, E:-1, F:0, G:1, A:-1 } },
  { chip: "G♯", rootL: "G", p: { D:1, C:-1, B:0, E:-1, F:1, G:1, A:-1 } },
  { chip: "A♭", rootL: "A", p: { D:1, C:-1, B:0, E:-1, F:1, G:-1, A:-1 } },
  { chip: "A♯", rootL: "A", p: { D:-1, C:1, B:-1, E:1, F:0, G:1, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:-1, C:1, B:-1, E:1, F:0, G:1, A:-1 } },
];

// Half-diminished 7th arpeggio (1 ♭3 ♭5 ♭7): 5 of 12 pitch-class sets, 8 configs.
const HALFDIM_DEFS = [
  { chip: "C", rootL: "C", p: { D:1, C:0, B:-1, E:-1, F:1, G:-1, A:1 } },
  { chip: "D", rootL: "D", p: { D:0, C:0, B:1, E:1, F:0, G:1, A:-1 } },
  { chip: "E♯", rootL: "E", p: { D:1, C:-1, B:0, E:1, F:0, G:1, A:-1 } },
  { chip: "F", rootL: "F", p: { D:1, C:-1, B:0, E:-1, F:0, G:1, A:-1 } },
  { chip: "G", rootL: "G", p: { D:-1, C:1, B:-1, E:1, F:0, G:0, A:1 } },
  { chip: "A♯", rootL: "A", p: { D:-1, C:1, B:-1, E:0, F:-1, G:1, A:1 } },
  { chip: "B♭", rootL: "B", p: { D:-1, C:1, B:-1, E:0, F:-1, G:1, A:-1 } },
  { chip: "B♯", rootL: "B", p: { D:1, C:0, B:1, E:-1, F:1, G:-1, A:1 } },
];

// Out-of-order (⚠) enharmonic respellings of the heptatonic scales. A seven-note
// collection maps bijectively onto the seven strings, so each of these has a
// unique root anchor; several land on root names (B♯, E♯, F♭, C♭) that exist
// only here, as alternates — by rule, ⚠ configs can never be defaults.
const MAJOR_ALT_DEFS = [
  { chip: "C (1) ⚠E♯", rootL: "C", p: { D:0, C:0, B:0, E:1, F:-1, G:0, A:0 } },
  { chip: "E♯ (1) ⚠E♯", rootL: "E", p: { D:0, C:0, B:-1, E:1, F:-1, G:0, A:0 } },
  { chip: "G (1) ⚠B♯", rootL: "G", p: { D:0, C:-1, B:1, E:0, F:1, G:0, A:0 } },
  { chip: "B♯ (1) ⚠B♯", rootL: "B", p: { D:0, C:-1, B:1, E:0, F:0, G:0, A:0 } },
  { chip: "B♯ (2) ⚠E♯,B♯", rootL: "B", p: { D:0, C:-1, B:1, E:1, F:-1, G:0, A:0 } },
];
const NATURAL_MINOR_ALT_DEFS = [
  { chip: "D (1) ⚠E♯", rootL: "D", p: { D:0, C:0, B:-1, E:1, F:-1, G:0, A:0 } },
  { chip: "E (1) ⚠B♯", rootL: "E", p: { D:0, C:-1, B:1, E:0, F:1, G:0, A:0 } },
  { chip: "A (1) ⚠B♯", rootL: "A", p: { D:0, C:-1, B:1, E:0, F:0, G:0, A:0 } },
  { chip: "A (2) ⚠E♯", rootL: "A", p: { D:0, C:0, B:0, E:1, F:-1, G:0, A:0 } },
  { chip: "A (3) ⚠E♯,B♯", rootL: "A", p: { D:0, C:-1, B:1, E:1, F:-1, G:0, A:0 } },
];
const HARM_MINOR_ALT_DEFS = [
  { chip: "D (1) ⚠E♯", rootL: "D", p: { D:0, C:1, B:-1, E:1, F:-1, G:0, A:0 } },
  { chip: "E (1) ⚠B♯", rootL: "E", p: { D:1, C:-1, B:1, E:0, F:1, G:0, A:0 } },
  { chip: "E♯ (1) ⚠E♯", rootL: "E", p: { D:-1, C:0, B:-1, E:1, F:-1, G:0, A:-1 } },
  { chip: "A (1) ⚠B♯", rootL: "A", p: { D:0, C:-1, B:1, E:0, F:0, G:1, A:0 } },
  { chip: "A (2) ⚠E♯", rootL: "A", p: { D:0, C:0, B:0, E:1, F:-1, G:1, A:0 } },
  { chip: "A (3) ⚠E♯,B♯", rootL: "A", p: { D:0, C:-1, B:1, E:1, F:-1, G:1, A:0 } },
  { chip: "B♯ (1) ⚠B♯", rootL: "B", p: { D:0, C:-1, B:1, E:-1, F:0, G:0, A:-1 } },
];
const MELODIC_MINOR_ALT_DEFS = [
  { chip: "D (1) ⚠E♯", rootL: "D", p: { D:0, C:1, B:0, E:1, F:-1, G:0, A:0 } },
  { chip: "E♯ (1) ⚠E♯", rootL: "E", p: { D:0, C:0, B:-1, E:1, F:-1, G:0, A:-1 } },
  { chip: "A (1) ⚠B♯", rootL: "A", p: { D:0, C:-1, B:1, E:0, F:1, G:1, A:0 } },
  { chip: "B♯ (1) ⚠B♯", rootL: "B", p: { D:0, C:-1, B:1, E:-1, F:0, G:0, A:0 } },
];
const HUNGARIAN_MINOR_ALT_DEFS = [
  { chip: "D (1) ⚠E♯", rootL: "D", p: { D:0, C:1, B:-1, E:1, F:-1, G:1, A:0 } },
  { chip: "E (1) ⚠B♯", rootL: "E", p: { D:1, C:-1, B:1, E:0, F:1, G:0, A:1 } },
  { chip: "E♯ (1) ⚠E♯", rootL: "E", p: { D:-1, C:0, B:0, E:1, F:-1, G:0, A:-1 } },
  { chip: "E♯ (2) ⚠E♯,B♯", rootL: "E", p: { D:-1, C:-1, B:1, E:1, F:-1, G:0, A:-1 } },
  { chip: "F (1) ⚠B♯", rootL: "F", p: { D:-1, C:-1, B:1, E:0, F:0, G:0, A:-1 } },
  { chip: "A (1) ⚠B♯", rootL: "A", p: { D:1, C:-1, B:1, E:0, F:0, G:1, A:0 } },
  { chip: "A (2) ⚠E♯", rootL: "A", p: { D:1, C:0, B:0, E:1, F:-1, G:1, A:0 } },
  { chip: "A (3) ⚠E♯,B♯", rootL: "A", p: { D:1, C:-1, B:1, E:1, F:-1, G:1, A:0 } },
  { chip: "B♭ (1) ⚠E♯", rootL: "B", p: { D:-1, C:0, B:-1, E:1, F:-1, G:-1, A:0 } },
  { chip: "B♯ (1) ⚠B♯", rootL: "B", p: { D:0, C:-1, B:1, E:-1, F:1, G:0, A:-1 } },
];
const HUNG_MAJOR_ALT_DEFS = [
  { chip: "D♭ (1) ⚠E♯", rootL: "D", p: { D:-1, C:-1, B:-1, E:1, F:-1, G:0, A:-1 } },
  { chip: "D (1) ⚠B♯", rootL: "D", p: { D:0, C:-1, B:1, E:1, F:1, G:1, A:0 } },
  { chip: "F (1) ⚠B♯", rootL: "F", p: { D:0, C:-1, B:1, E:-1, F:0, G:1, A:0 } },
  { chip: "G (1) ⚠E♯", rootL: "G", p: { D:0, C:1, B:0, E:1, F:-1, G:0, A:1 } },
  { chip: "A♭ (1) ⚠B♯", rootL: "A", p: { D:0, C:-1, B:1, E:-1, F:0, G:-1, A:-1 } },
  { chip: "B♭ (1) ⚠E♯", rootL: "B", p: { D:0, C:1, B:-1, E:1, F:-1, G:0, A:-1 } },
];
const HARM_MAJOR_ALT_DEFS = [
  { chip: "C (1) ⚠E♯", rootL: "C", p: { D:0, C:0, B:0, E:1, F:-1, G:0, A:-1 } },
  { chip: "E (1) ⚠B♯", rootL: "E", p: { D:1, C:-1, B:1, E:0, F:1, G:1, A:0 } },
  { chip: "E♯ (1) ⚠E♯", rootL: "E", p: { D:-1, C:0, B:-1, E:1, F:-1, G:0, A:0 } },
  { chip: "G (1) ⚠B♯", rootL: "G", p: { D:0, C:-1, B:1, E:-1, F:1, G:0, A:0 } },
  { chip: "A (1) ⚠E♯", rootL: "A", p: { D:0, C:1, B:0, E:1, F:-1, G:1, A:0 } },
  { chip: "B♯ (1) ⚠B♯", rootL: "B", p: { D:0, C:-1, B:1, E:0, F:0, G:0, A:-1 } },
  { chip: "B♯ (2) ⚠E♯,B♯", rootL: "B", p: { D:0, C:-1, B:1, E:1, F:-1, G:0, A:-1 } },
];
const DBL_HARM_ALT_DEFS = [
  { chip: "C♭ (1) ⚠B♯", rootL: "C", p: { D:1, C:-1, B:1, E:0, F:1, G:0, A:1 } },
  { chip: "C (1) ⚠E♯", rootL: "C", p: { D:-1, C:0, B:0, E:1, F:-1, G:0, A:-1 } },
  { chip: "E (1) ⚠B♯", rootL: "E", p: { D:1, C:-1, B:1, E:0, F:0, G:1, A:0 } },
  { chip: "E♯ (1) ⚠E♯", rootL: "E", p: { D:-1, C:0, B:-1, E:1, F:-1, G:-1, A:0 } },
  { chip: "F♭ (1) ⚠E♯", rootL: "F", p: { D:1, C:0, B:0, E:1, F:-1, G:1, A:0 } },
  { chip: "F♭ (2) ⚠E♯,B♯", rootL: "F", p: { D:1, C:-1, B:1, E:1, F:-1, G:1, A:0 } },
  { chip: "G (1) ⚠B♯", rootL: "G", p: { D:0, C:-1, B:1, E:-1, F:1, G:0, A:-1 } },
  { chip: "A (1) ⚠E♯", rootL: "A", p: { D:0, C:1, B:-1, E:1, F:-1, G:1, A:0 } },
  { chip: "B♯ (1) ⚠B♯", rootL: "B", p: { D:-1, C:-1, B:1, E:0, F:0, G:0, A:-1 } },
  { chip: "B♯ (2) ⚠E♯,B♯", rootL: "B", p: { D:-1, C:-1, B:1, E:1, F:-1, G:0, A:-1 } },
];
const NEAP_MAJOR_ALT_DEFS = [
  { chip: "C♭ (1) ⚠B♯", rootL: "C", p: { D:0, C:-1, B:1, E:0, F:1, G:1, A:1 } },
  { chip: "E♯ (1) ⚠E♯", rootL: "E", p: { D:0, C:0, B:-1, E:1, F:-1, G:-1, A:-1 } },
  { chip: "F♭ (1) ⚠E♯", rootL: "F", p: { D:1, C:1, B:0, E:1, F:-1, G:0, A:0 } },
  { chip: "B♯ (1) ⚠B♯", rootL: "B", p: { D:-1, C:-1, B:1, E:-1, F:0, G:0, A:0 } },
];
const NEAP_MINOR_ALT_DEFS = [
  { chip: "C♭ (1) ⚠B♯", rootL: "C", p: { D:0, C:-1, B:1, E:0, F:1, G:0, A:1 } },
  { chip: "E (1) ⚠B♯", rootL: "E", p: { D:1, C:-1, B:1, E:0, F:0, G:0, A:0 } },
  { chip: "E♯ (1) ⚠E♯", rootL: "E", p: { D:-1, C:0, B:-1, E:1, F:-1, G:-1, A:-1 } },
  { chip: "F♭ (1) ⚠E♯", rootL: "F", p: { D:1, C:0, B:0, E:1, F:-1, G:0, A:0 } },
  { chip: "F♭ (2) ⚠E♯,B♯", rootL: "F", p: { D:1, C:-1, B:1, E:1, F:-1, G:0, A:0 } },
  { chip: "A (1) ⚠E♯", rootL: "A", p: { D:0, C:0, B:-1, E:1, F:-1, G:1, A:0 } },
  { chip: "B♯ (1) ⚠B♯", rootL: "B", p: { D:-1, C:-1, B:1, E:-1, F:0, G:0, A:-1 } },
];

const PRESET_CATEGORIES = [
  {
    category: "Major",
    items: MAJOR_SCALES.map(s => ({
      chip: s.name.replace(" major", ""), name: s.name, rootL: s.rootL, pedals: { ...s.p },
    })),
    altItems: MAJOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} major`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Natural minor",
    items: MINOR_DEFS.map(([chip, rootL, majorName]) => {
      const maj = MAJOR_SCALES.find(m => m.name === majorName);
      return { chip, name: `${chip} minor`, rootL, pedals: { ...maj.p } };
    }),
    altItems: NATURAL_MINOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Harmonic minor",
    items: HARM_MINOR_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} harmonic minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: HARM_MINOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} harmonic minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Melodic minor (ascending)",
    items: MELODIC_MINOR_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} melodic minor (ascending)`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: MELODIC_MINOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} melodic minor (ascending)`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Hungarian major",
    items: HUNG_MAJOR_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Hungarian major`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: HUNG_MAJOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Hungarian major`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Hungarian minor",
    items: HUNGARIAN_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Hungarian minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: HUNGARIAN_MINOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Hungarian minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Harmonic major",
    items: HARM_MAJOR_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} harmonic major`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: HARM_MAJOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} harmonic major`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Double harmonic major",
    items: DBL_HARM_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} double harmonic major`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: DBL_HARM_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} double harmonic major`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Neapolitan major",
    items: NEAP_MAJOR_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Neapolitan major`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: NEAP_MAJOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Neapolitan major`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Neapolitan minor",
    items: NEAP_MINOR_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Neapolitan minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: NEAP_MINOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Neapolitan minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Major pentatonic",
    items: PENTATONIC_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} major pentatonic`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: PENTATONIC_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} major pentatonic`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Minor pentatonic",
    items: MINOR_PENT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} minor pentatonic`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: MINOR_PENT_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} minor pentatonic`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Hirajoshi",
    items: HIRAJOSHI_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Hirajoshi`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: HIRAJOSHI_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Hirajoshi`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Kumoi",
    items: KUMOI_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} kumoi`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: KUMOI_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} kumoi`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Iwato",
    items: IWATO_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} iwato`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: IWATO_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} iwato`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "In (sakura)",
    items: IN_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} in (sakura)`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: IN_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} in (sakura)`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Insen",
    items: INSEN_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} insen`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: INSEN_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} insen`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Blues major",
    items: BLUES_MAJOR_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} blues major`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: BLUES_MAJOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} blues major`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Blues minor",
    items: BLUES_MINOR_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} blues minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: BLUES_MINOR_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} blues minor`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Augmented scale",
    items: AUGMENTED_DEFS.map(d => ({
      chip: d.chip.replace("On ", ""), name: `${d.chip.replace("On ", "")} augmented scale`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: AUGMENTED_ALT_DEFS.map(d => ({
      chip: d.chip.replace("On ", ""), name: `${d.chip.replace("On ", "")} augmented scale`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Prometheus",
    items: PROMETHEUS_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Prometheus`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: PROMETHEUS_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} Prometheus`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Major 7th",
    items: MAJ7_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} major 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: MAJ7_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} major 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Minor 7th",
    items: MIN7_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} minor 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: MIN7_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} minor 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Dominant 7th",
    items: DOM7_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} dominant 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: DOM7_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} dominant 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Half-diminished 7th",
    items: HALFDIM_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} half-diminished 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
    altItems: HALFDIM_ALT_DEFS.map(d => ({
      chip: d.chip, name: `${d.chip} half-diminished 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Diminished 7th",
    items: DIM7_DEFS.map(d => ({
      chip: d.chip.split(" (")[0].replace("On ", ""), name: `${d.chip.split(" (")[0].replace("On ", "")} diminished 7th`, rootL: d.rootL, pedals: { ...d.p },
    })),
  },
  {
    category: "Whole tone",
    items: [
      { chip: "C (F♭=E)",  name: "Whole tone on C",  rootL: "C", pedals: { C:0,D:0,E:0,F:-1,G:-1,A:-1,B:-1 } },
      { chip: "C♯ (D♯=E♭)", name: "Whole tone on C♯", rootL: "C", pedals: { C:1,D:1,E:-1,F:0,G:0,A:0,B:0 } },
      { chip: "D♭ (C♭=B)", name: "Whole tone on D♭", rootL: "D", pedals: { C:-1,D:-1,E:-1,F:0,G:0,A:0,B:0 } },
      { chip: "B♯ (B♯=C)", name: "Whole tone on B♯", rootL: "B", pedals: { C:0,D:0,E:0,F:1,G:1,A:1,B:1 } },
    ],
    // Mixed-doubling respellings. All anchor pc 0 on the open C string except the
    // last two; the C♯=D♭ config anchors on both C♯ and D♭, so by rule it stays
    // in the flat (D♭) family. The old pure-sharp C♯ spelling (E♯=F, 3♯) is now
    // alternate (1) — flat preference gives the D♯=E♭ doubling (2♯) the default.
    altItems: [
      { chip: "C (1) (F♯=G♭)", name: "Whole tone on C (1)", rootL: "C", pedals: { C:0,D:0,E:0,F:1,G:-1,A:-1,B:-1 } },
      { chip: "C (2) (G♯=A♭)", name: "Whole tone on C (2)", rootL: "C", pedals: { C:0,D:0,E:0,F:1,G:1,A:-1,B:-1 } },
      { chip: "C (3) (A♯=B♭)", name: "Whole tone on C (3)", rootL: "C", pedals: { C:0,D:0,E:0,F:1,G:1,A:1,B:-1 } },
      { chip: "C♯ (1) (E♯=F)", name: "Whole tone on C♯ (1)", rootL: "C", pedals: { C:1,D:1,E:1,F:0,G:0,A:0,B:0 } },
      { chip: "D♭ (1) (C♯=D♭)", name: "Whole tone on D♭ (1)", rootL: "D", pedals: { C:1,D:-1,E:-1,F:0,G:0,A:0,B:0 } },
    ],
  },
];
// Three-level hierarchy: group → category → roots. Groups reference categories
// by name; the category data above is the single source of truth.
const PRESET_GROUPS = [
  { group: "Major", categories: [
    "Major", "Harmonic major", "Double harmonic major", "Hungarian major", "Neapolitan major",
  ] },
  { group: "Minor", categories: [
    "Natural minor", "Harmonic minor", "Melodic minor (ascending)", "Hungarian minor", "Neapolitan minor",
  ] },
  { group: "Hexatonic", categories: [
    "Blues major", "Blues minor", "Prometheus", "Whole tone", "Augmented scale",
  ] },
  { group: "Pentatonic", categories: [
    "Major pentatonic", "Minor pentatonic", "Hirajoshi", "Kumoi", "Iwato", "In (sakura)", "Insen",
  ] },
  { group: "7th chords", categories: [
    "Major 7th", "Minor 7th", "Dominant 7th", "Half-diminished 7th", "Diminished 7th",
  ] },
];
const CATEGORY_BY_NAME = Object.fromEntries(PRESET_CATEGORIES.map(c => [c.category, c]));
const ALL_PRESETS_FLAT = PRESET_CATEGORIES.flatMap(c =>
  [...c.items, ...(c.altItems || [])].map(it => ({ ...it, category: c.category }))
);
function matchPresets(pedals, userPresets) {
  const hits = [];
  ALL_PRESETS_FLAT.forEach(p => { if (sameConfig(p.pedals, pedals)) hits.push(p.name); });
  userPresets.forEach(p => { if (sameConfig(p.pedals, pedals)) hits.push(p.name); });
  return hits;
}

// ─── KARPLUS-STRONG (placeholder voice; to be replaced with samples) ───────
// Measured start of audible signal in a decoded sample, in seconds: the first
// frame above 10% of the buffer's peak, backed off 4 ms. Every bank is trimmed
// to leave ~15 ms of lead-in before the attack (see the processing recipe),
// which in Live mode reads as lag between the tap and the sound. Starting
// playback from this offset puts the attack on the tap. The threshold is
// deliberately low so a slow swell (harmonics) keeps its whole attack; only
// the near-silent run-in is skipped.
function bufferOnset(buf) {
  const ch = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; }
  if (!peak) return 0;
  const thr = peak * 0.1;
  let i = 0;
  while (i < ch.length && Math.abs(ch[i]) < thr) i++;
  return Math.max(0, i / buf.sampleRate - 0.004);
}
// [midi, buffer] pairs → { midi: onsetSeconds }, keys kept verbatim so the
// float midis of the self-recorded banks round-trip exactly.
function onsetsOf(entries) {
  return Object.fromEntries(entries.map(([midi, buf]) => [midi, bufferOnset(buf)]));
}

// Wire/gut string-material boundary. On the harp, strings 7C..5G are steel
// wire and 5A upward are gut/nylon — a large timbral change. Samples recorded
// on a wire string must not be borrowed for a gut note or vice versa, even
// when a cross-boundary sample is nearer in pitch; otherwise the enharmonic
// pair 5G# (wire G string, sharp) and 5A♭ (gut A string, flat) — identical in
// pitch — collapse to one sound. The self-recorded banks carry a 5G♭ (wire)
// and a 5A♭ (gut) either side of the gap, so 5G# draws the wire sample shifted
// up and 5A♭ the gut sample directly. Strings above 5A (Savarez vs Nycor) are
// treated as one zone; that boundary's timbre change is minor.
const WIRE_HI_IDX = IDX["5G"];   // highest wire string index
const WIRE_SAMPLE_MAX = 43;      // string-pitch keys <= this are wire recordings
// Nearest recorded sample to `target`, restricted to the played string's
// material zone. keyOffset lets banks whose keys are the *sounding* pitch
// (harmonics: an octave above the string) shift the split accordingly.
function pickSample(table, target, idx, keyOffset) {
  const wire = idx <= WIRE_HI_IDX;
  const thr = WIRE_SAMPLE_MAX + keyOffset;
  let best = null;
  for (const m of table) {
    if ((m <= thr) !== wire) continue;           // same-zone samples only
    if (best === null || Math.abs(m - target) < Math.abs(best - target)) best = m;
  }
  if (best !== null) return best;
  // No sample in the note's zone (e.g. a bank with no wire recordings): fall
  // back to the global nearest so the note still sounds.
  best = table[0];
  for (const m of table) if (Math.abs(m - target) < Math.abs(best - target)) best = m;
  return best;
}
function pluck(ctx, dest, freq, duration, volume, when) {
  const sr = ctx.sampleRate;
  const N = Math.round(sr / freq);
  if (N < 2) return;
  const total = Math.round(sr * duration);
  const out = new Float32Array(total);
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
  for (let i = 0; i < total; i++) {
    const a = i % N, b = (a + 1) % N;
    out[i] = buf[a];
    buf[a] = 0.4985 * (buf[a] + buf[b]);
  }
  const ab = ctx.createBuffer(1, total, sr);
  ab.copyToChannel(out, 0);
  const src = ctx.createBufferSource();
  src.buffer = ab;
  const g = ctx.createGain();
  const t = when != null ? when : ctx.currentTime;
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(g); g.connect(dest);
  src.start(t);
}

const DEFAULT_PEDALS = { D:0, C:0, B:0, E:0, F:0, G:0, A:0 };

// ─── PERSISTENCE (localStorage) ─────────────────────────────────────────────
// Saved configs and sound preferences persist on the user's own device.
const LS_PRESETS = "glissie.userPresets.v1";
const LS_SETTINGS = "glissie.settings.v1";
const LS_DARK = "glissie.darkMode";
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveJSON(key, value) {
  // Returns true on success so callers can surface quota/blocked failures
  // instead of silently losing data on reload.
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; /* storage full or blocked */ }
}
// Hard ceiling on distinct saveable (pedals, root) pairs: 3^7 pedal
// configurations × 7 root letters. Nothing beyond this can be distinct,
// so imports and the library itself are capped here.
const MAX_LIBRARY = 2187 * 7; // 15,309
const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // a full 15,309-entry export is ~1.5–1.8 MB
// Strip Unicode control and bidi-override characters from names. These render
// invisibly or reverse text direction, letting a crafted file visually spoof
// list entries. Applied on both import and save.
function cleanName(s) {
  return s.replace(/[\u0000-\u001F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "");
}

// ── Per-mode sound settings ─────────────────────────────────────────────────
// Each mode keeps its own Sostenuto and Max voices. Units differ deliberately:
// gliss measures Sostenuto in notes (ring scales with playback speed), while
// scale/arpeggio and chord measure it in seconds — their previous behavior was
// a hard-coded 3.4 s ring, which these defaults reproduce exactly.
// Chord defaults Max voices to 47 (every string on the harp) so a full-board
// chord is never cut short by voice-stealing.
const SOUND_DEFAULTS = {
  gliss: { tail: 24,  maxVoices: 24 }, // tail in notes
  scale: { tail: 3.4, maxVoices: 24 }, // tail in seconds
  chord: { tail: 3.4, maxVoices: 47 }, // tail in seconds
};
function initSoundSettings(saved) {
  const clamp = (v, lo, hi, d) =>
    (typeof v === "number" && Number.isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : d;
  const s = (saved && saved.sound) || {};
  // Migrate pre-split settings: the old single tailNotes/maxVoices pair only
  // ever affected gliss playback, so it seeds the gliss slot.
  const legacy = {};
  if (saved && typeof saved.tailNotes === "number") legacy.tail = saved.tailNotes;
  if (saved && typeof saved.maxVoices === "number") legacy.maxVoices = saved.maxVoices;
  const build = (m, tailLo, tailHi, mvHi, extra) => {
    const src = { ...(extra || {}), ...(s[m] || {}) };
    return {
      tail: clamp(src.tail, tailLo, tailHi, SOUND_DEFAULTS[m].tail),
      maxVoices: clamp(src.maxVoices, 4, mvHi, SOUND_DEFAULTS[m].maxVoices),
    };
  };
  return {
    gliss: build("gliss", 1, 60, 70, legacy),
    scale: build("scale", 0.5, 8, 70),
    chord: build("chord", 0.5, 8, 94),
  };
}
// A custom config is portable as a compact object. Validate on import.
function isValidPedals(p) {
  return p && typeof p === "object" &&
    LETTERS.every(L => [-1,0,1].includes(p[L]));
}
function sanitizeImported(obj) {
  // Accept a single config or an array; return { configs, malformed }.
  // A malformed entry is one that looked like data but lacked a valid pedal set.
  const arr = Array.isArray(obj) ? obj : [obj];
  const out = [];
  let malformed = 0;
  for (const it of arr) {
    if (!it || !isValidPedals(it.pedals)) { malformed++; continue; }
    const rawName = typeof it.name === "string" ? cleanName(it.name).trim() : "";
    const name = rawName ? rawName.slice(0, 60) : "Imported config";
    const rootL = LETTERS.includes(it.rootL) ? it.rootL : null;
    out.push({ name, pedals: {
      C: it.pedals.C, D: it.pedals.D, E: it.pedals.E, F: it.pedals.F,
      G: it.pedals.G, A: it.pedals.A, B: it.pedals.B,
    }, rootL, user: true });
  }
  return { configs: out, malformed };
}

// Pure merge of imported configs into the saved library, O(incoming + library)
// via Maps keyed on pedal-config+root (identity) and lowercased name — a full
// 15,309-entry import stays fast instead of freezing the tab.
// prev: existing user presets; incoming: sanitized entries (rootL already
// resolved to a real letter); builtins: ALL_PRESETS_FLAT.
// Returns { accepted, skippedNames, rejectedDups, cappedCount } where
// rejectedDups entries are { name, matched } naming the library entry matched.
function mergeImportedConfigs(prev, incoming, builtins) {
  const cfgKey = (pedals, rootL) =>
    LETTERS.map(L => pedals[L]).join("") + "|" + (rootL ?? "");
  // config key → { display: first library name with this config, names: Set(lowercased) }
  const configMap = new Map();
  const nameSet = new Set(); // lowercased names across the whole library
  const register = (entry) => {
    const k = cfgKey(entry.pedals, entry.rootL ?? null);
    const lc = entry.name.toLowerCase();
    const slot = configMap.get(k);
    if (slot) slot.names.add(lc);
    else configMap.set(k, { display: entry.name, names: new Set([lc]) });
    nameSet.add(lc);
  };
  for (const p of builtins) register({ name: p.name, pedals: p.pedals, rootL: p.rootL ?? null });
  for (const p of prev) register(p);

  const accepted = [];
  const skippedNames = [];
  const rejectedDups = [];
  let userCount = prev.length;
  let cappedCount = 0;

  for (const inc of incoming) {
    const slot = configMap.get(cfgKey(inc.pedals, inc.rootL ?? null));
    if (slot) {
      if (slot.names.has(inc.name.toLowerCase())) skippedNames.push(inc.name); // true duplicate
      else rejectedDups.push({ name: inc.name, matched: slot.display });       // same config, new name
      continue;
    }
    if (userCount >= MAX_LIBRARY) { cappedCount++; continue; }
    // Distinct config; suffix the name if taken, truncating the base first so
    // base + suffix stays ≤ 60 (truncating after suffixing risks re-collision).
    let name = inc.name;
    if (nameSet.has(name.toLowerCase())) {
      let n = 1;
      do {
        const suf = ` ${n}`;
        name = inc.name.slice(0, 60 - suf.length) + suf;
        n++;
      } while (nameSet.has(name.toLowerCase()));
    }
    const entry = { name, pedals: { ...inc.pedals }, rootL: inc.rootL ?? null, user: true };
    accepted.push(entry);
    register(entry);
    userCount++;
  }
  return { accepted, skippedNames, rejectedDups, cappedCount };
}

const HARMONIC_MIDIS = Object.keys(HARMONIC_SAMPLES).map(Number).sort((a, b) => a - b);
// Playable string range for harmonics in Live mode (inclusive): 6E … 2F.
const HARM_LO = IDX["6E"], HARM_HI = IDX["2F"];
// Playable string range for xylophonics in Live mode (inclusive): 5A … 0G.
const XYLO_LO = IDX["5A"], XYLO_HI = IDX["0G"];
// Playable string range per technique (inclusive index bounds); techniques
// not listed cover all 47 strings. Applies in every mode: Live/Chord grid
// gating and the Scale start-note/octave dropdowns.
const TECH_RANGE = { harm: [HARM_LO, HARM_HI], xylo: [XYLO_LO, XYLO_HI] };
const techRange = tech => TECH_RANGE[tech] || [0, 46];
// Scale/Arpeggio play-speed ceiling (notes/s) for the self-recorded sample
// techniques; unlisted techniques keep the normal 20 notes/s slider maximum.
const SCALE_SPEED_CAP = { harm: 4, xylo: 4, pdlt: 4, nail: 4, etouf: 4 };
// Technique picker options, in 2×3 reading order (top row first). Gliss
// offers only the gliss-suitable techniques, with the pluck bank labelled
// "Single" (a glissando isn't plucked note-by-note).
const TECH_OPTS = [
  ["default", "Pluck"], ["harm", "Harmonics"], ["pdlt", "Près de la table"],
  ["nail", "Nail"], ["xylo", "Xylophonic"], ["etouf", "Étouffé"],
];
const GLISS_TECH_OPTS = [
  ["default", "Single"], ["pdlt", "Près de la table"], ["nail", "Nail"],
];
// Étouffé (Live): self-recorded samples (each cut just before the audible
// damp contact), with the app supplying the damp. Ring = pluck-to-damp time
// for a lone note (start at 300 ms; tune by ear — samples hold up to ~380 ms
// of real ring on the bass wires; most trebles end naturally sooner). Damp =
// gain truncation + a lowpass sweeping from open to closed over ETOUF_DAMP,
// so the highs die first and a brief low thud remains — like the palm
// landing on the string.
const ETOUF_RING = 0.3;                          // s, lone-note auto-damp delay
const ETOUF_DAMP = 0.08;                         // s, damp length (gain + sweep)
const ETOUF_LP_OPEN = 16000, ETOUF_LP_CLOSED = 250; // Hz, lowpass sweep endpoints

// ─── 47-STRING CHART (help graphic) ─────────────────────────────────────────
function StringChart({ dark, wide }) {
  const wrapRef = useRef(null);
  const [fillW, setFillW] = useState(0);
  useLayoutEffect(() => {
    if (!wide) { setFillW(0); return; }
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setFillW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);
  const BAR_W = 3, H = 76;
  // Mobile keeps the original fixed spacing (scrolls if narrow); desktop spreads the
  // 47 strings across the full help-panel width, keeping bar height and labels constant.
  const SP = (wide && fillW > 0) ? Math.max(9, (fillW - 12) / 47) : 9;
  const W = 47 * SP + 10;
  const groups = [];
  let gStart = 0;
  for (let i = 1; i <= 47; i++) {
    if (i === 47 || STRINGS[i].oct !== STRINGS[gStart].oct) {
      groups.push([gStart, i - 1, STRINGS[gStart].oct]);
      gStart = i;
    }
  }
  const x = i => 6 + i * SP;
  const colorFor = L => L === "C" ? "#c0392b" : L === "F" ? "#4a3f8f" : "#9a9a9a";
  return (
    <div ref={wrapRef} style={{ overflowX: wide ? "hidden" : "auto", marginTop: 8 }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        {STRINGS.map((s, i) => (
          <g key={i}>
            <rect x={x(i)} y={6} width={BAR_W} height={30} rx={1} fill={colorFor(s.letter)} />
            <text x={x(i) + BAR_W / 2} y={48} fontSize={wide ? 8.5 : 6.5} fill={colorFor(s.letter)}
              textAnchor="middle" fontFamily="Georgia, serif">{s.letter}</text>
          </g>
        ))}
        {groups.map(([a, b, oct], gi) => {
          const x1 = x(a), x2 = x(b) + BAR_W;
          const cx = (x1 + x2) / 2;
          return (
            <g key={gi} stroke={dark?"#808098":"#777"} strokeWidth={1}>
              <line x1={x1} y1={62} x2={Math.max(x1, cx - 7)} y2={62} />
              <text x={cx} y={65} fontSize={wide ? 11 : 9} fill={dark?"#b0b0c0":"#555"} stroke="none"
                textAnchor="middle" fontFamily="Georgia, serif">{oct}</text>
              <line x1={Math.min(x2, cx + 7)} y1={62} x2={x2} y2={62} />
              <line x1={x1} y1={59} x2={x1} y2={65} />
              <line x1={x2} y1={59} x2={x2} y2={65} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────
export default function HarpGliss() {
  const [pedals, setPedals] = useState(DEFAULT_PEDALS);
  const [presetRoot, setPresetRoot] = useState(null); // string letter from selected preset
  const [mode, setMode] = useState("scale");
  const [direction, setDirection] = useState("asc");
  const [bothStart, setBothStart] = useState("up"); // scale "both": bounce up-first or down-first
  const [scaleStart, setScaleStart] = useState(IDX["4C"]);
  const [octaveCount, setOctaveCount] = useState(1);
  const [glissStart, setGlissStart] = useState(IDX["5C"]);
  const [glissEnd, setGlissEnd] = useState(IDX["2C"]);
  // Chord mode: which strings are selected (indices into STRINGS), empty by default.
  const [chordSel, setChordSel] = useState(() => new Set());
  // Chord / Live: when liveMode is on the grid becomes a playable instrument —
  // tapping a string sounds it immediately (multi-touch via per-button
  // pointerdown), and none of the chord-building machinery (selection, limits,
  // break/loop/direction, Play button) applies. chordSel is left untouched in
  // the background and comes back intact when Live is toggled off.
  const [liveMode, setLiveMode] = useState(false);
  // Technique (sample bank + limits), remembered per mode. chordTech is
  // shared by the Chord and Live sub-modes: "default" = the normal plucks
  // ("Pluck"); "harm" = harmonics (6E…2F only); "xylo" = xylophonics
  // (5A…0G only); "pdlt"; "nail"; "etouf" = étouffé (monophonic in Live —
  // see ETOUF_* constants). Buttons outside the active technique's range
  // grey out. Gliss offers only the gliss-suitable subset ("default"
  // labelled "Single", "pdlt", "nail").
  const [chordTech, setChordTech] = useState("default");
  const [scaleTech, setScaleTech] = useState("default");
  const [glissTech, setGlissTech] = useState("default");
  // liveRing: struck strings still sounding — drives the staff preview, each
  // note expiring after the chord-mode Sostenuto (re-strike refreshes it).
  // liveFlash: brief (~0.2 s) per-button press feedback so buttons visibly
  // "bounce back" and never look stuck down.
  // Map string index → technique it was struck with: notation (harmonic
  // circles, Xyl. line) follows each note's own strike, so switching
  // technique mid-ring doesn't relabel notes still sounding.
  const [liveRing, setLiveRing] = useState(() => new Map());
  const [liveFlash, setLiveFlash] = useState(() => new Set());
  const liveTimersRef = useRef({ ring: new Map(), flash: new Map() });
  const [breakChord, setBreakChord] = useState(false); // off = block chord (all at once)
  const [enforce8, setEnforce8] = useState(false);     // cap selection at 8 notes (two hands)
  const [handSpanOn, setHandSpanOn] = useState(false); // per-hand span rule (needs enforce8)
  // Hand-span limit, remembered per technique; bounds and defaults come from
  // TECH_LIMITS. The active value is derived below as handSpan.
  const [spanByTech, setSpanByTech] = useState(() =>
    Object.fromEntries(Object.entries(TECH_LIMITS).map(([k, v]) => [k, v.spanDef])));
  const [handSpanField, setHandSpanField] = useState("10");
  const [chordSpeed, setChordSpeed] = useState(15);    // broken-chord notes per second
  const [chordSpeedField, setChordSpeedField] = useState("15");
  // "Both" direction, per mode: continuous ping-pong (ends not repeated, no pause)
  // vs a full out-and-back pass with a 1 s pause between loops. Defaults preserve
  // each mode's original behaviour.
  const [scaleContinuous, setScaleContinuous] = useState(false);
  const [glissContinuous, setGlissContinuous] = useState(true);
  const [chordContinuous, setChordContinuous] = useState(false);
  // Loop, per mode: on = repeat with a settable gap between passes (the previous
  // fixed behaviour, 1 s scale/gliss, 4 s chord); off = play the sequence once
  // and stop. When Continuous is Yes (Both direction), a checked Loop plays
  // seamlessly and the interval is ignored; an unchecked Loop still plays a
  // single out-and-back pass then stops.
  const [scaleLoop, setScaleLoop] = useState(true);
  const [glissLoop, setGlissLoop] = useState(true);
  const [chordLoop, setChordLoop] = useState(true);
  const [scaleLoopSec, setScaleLoopSec] = useState(1);  // gap between passes (scale/gliss 0–20 s, chord 1–20)
  const [glissLoopSec, setGlissLoopSec] = useState(1);
  const [chordLoopSec, setChordLoopSec] = useState(4);
  const [scaleLoopSecField, setScaleLoopSecField] = useState("1");
  const [glissLoopSecField, setGlissLoopSecField] = useState("1");
  const [chordLoopSecField, setChordLoopSecField] = useState("4");
  const [speed, setSpeed] = useState(15);
  // Scale/arpeggio notes per second, remembered per technique; sampled
  // techniques (harmonics, xylophonic, nail, étouffé) cap at 4 notes/s.
  const [scaleSpeedByTech, setScaleSpeedByTech] = useState(() =>
    Object.fromEntries(Object.keys(TECH_LIMITS).map(k => [k, 2])));
  const [speedField, setSpeedField] = useState("15");
  const [scaleSpeedField, setScaleSpeedField] = useState("2");
  // Active per-technique values (chordTech/scaleTech select the slot).
  const handSpan = spanByTech[chordTech];
  const scaleSpeed = scaleSpeedByTech[scaleTech];
  const setScaleSpeed = v => setScaleSpeedByTech(m => ({ ...m, [scaleTech]: v }));
  const scaleSpeedMax = SCALE_SPEED_CAP[scaleTech] || 20;
  const [tuning, setTuning] = useState(440);
  const [tuningField, setTuningField] = useState("440");
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [detExpand, setDetExpand] = useState(false);
  const [openAlts, setOpenAlts] = useState(new Set());
  const [detOverflow, setDetOverflow] = useState(false);
  const detRef = useRef(null);
  const [viewportW, setViewportW] = useState(typeof window !== "undefined" ? window.innerWidth : 520);
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const wide = viewportW >= 1024;   // two-column desktop layout above this width
  const roomy = viewportW >= 560;   // grid + staff side by side in Chord / Live: any
                                    // desktop window incl. compact, but not phones
  useEffect(() => { setDetExpand(false); }, [pedals]);
  useEffect(() => {
    const el = detRef.current;
    if (!el) { setDetOverflow(false); return; }
    const check = () => setDetOverflow(el.scrollWidth > el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  });
  const [showPresets, setShowPresets] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const [userPresets, setUserPresets] = useState(() => loadJSON(LS_PRESETS, []));
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [resetAllArmed, setResetAllArmed] = useState(false);
  const resetArmTimer = useRef(null);
  const [importMsg, setImportMsg] = useState("");
  const importMsgTimer = useRef(null);
  // Show an import message; clean-import messages fade after 7s, anything
  // that names skipped/rejected/malformed entries stays until dismissed.
  function showImportMsg(msg, autoFade) {
    if (importMsgTimer.current) { clearTimeout(importMsgTimer.current); importMsgTimer.current = null; }
    setImportMsg(msg);
    if (autoFade && msg) importMsgTimer.current = setTimeout(() => setImportMsg(""), 7000);
  }
  const [storageWarn, setStorageWarn] = useState(""); // localStorage quota/blocked warning
  const fileInputRef = useRef(null);
  const [pendingOverwrite, setPendingOverwrite] = useState(null); // name awaiting overwrite confirm
  const [builtinNameClash, setBuiltinNameClash] = useState(false); // typed name matches a built-in preset
  const [renameIdx, setRenameIdx] = useState(null);   // which saved config is being renamed
  const [renameText, setRenameText] = useState("");
  const [renameErr, setRenameErr] = useState(false);
  const [exportMode, setExportMode] = useState(false);       // selecting configs to export
  const [exportSel, setExportSel] = useState(() => new Set()); // chosen indices
  // Advanced gliss settings (user-resettable, persisted)
  const _savedSettings = loadJSON(LS_SETTINGS, {});
  // Scale / Arpeggio mode: 8 toggles over scale degrees 1..7 plus the octave (1*).
  // All lit = a full scale; deselect any to make an arpeggio. Default = full scale.
  const [arpMask, setArpMask] = useState(() => {
    const saved = loadJSON(LS_SETTINGS, {});
    return Array.isArray(saved.arpMask) && saved.arpMask.length === 8
      ? saved.arpMask
      : [true, true, true, true, true, true, true, true];
  });
  const [showTuner, setShowTuner] = useState(false);
  // Per-mode sound settings (Sostenuto + Max voices), see SOUND_DEFAULTS.
  const [soundSettings, setSoundSettings] = useState(() => initSoundSettings(_savedSettings));
  const setSound = (patch) =>
    setSoundSettings(s => ({ ...s, [mode]: { ...s[mode], ...patch } }));
  const [rootSnap, setRootSnap] = useState(_savedSettings.rootSnap ?? true);
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem(LS_DARK) === "1"; } catch { return false; } });
  // Refs mirror the *current mode's* values so scheduled notes read live settings.
  const tailRef = useRef(SOUND_DEFAULTS.gliss.tail);
  const maxVoicesRef = useRef(SOUND_DEFAULTS.gliss.maxVoices);
  useEffect(() => {
    tailRef.current = soundSettings[mode].tail;
    maxVoicesRef.current = soundSettings[mode].maxVoices;
  }, [soundSettings, mode]);
  // Persist to the user's device. localStorage is shared per-origin (~5 MB
  // across all harpbelle.github.io projects), so a full quota means saves
  // look fine on screen but vanish on reload — warn instead of losing data.
  const STORAGE_WARN_TEXT = "Couldn't save to this browser's storage (it may be full or blocked). Your configurations are safe on screen, but recent changes may be lost on reload. Export them to a file to be safe.";
  useEffect(() => {
    const ok = saveJSON(LS_PRESETS, userPresets);
    setStorageWarn(ok ? "" : STORAGE_WARN_TEXT);
  }, [userPresets]);
  useEffect(() => {
    const ok = saveJSON(LS_SETTINGS, { sound: soundSettings, rootSnap, arpMask });
    if (!ok) setStorageWarn(STORAGE_WARN_TEXT);
  }, [soundSettings, rootSnap, arpMask]);
  useEffect(() => { try { localStorage.setItem(LS_DARK, darkMode ? "1" : "0"); } catch {} }, [darkMode]);
  useEffect(() => { document.body.style.backgroundColor = darkMode ? "#1a1a2e" : "#fafafa"; }, [darkMode]);

  const pedalsRef = useRef(pedals);
  const speedRef = useRef(speed);
  const tuningRef = useRef(tuning);
  const tempoRef = useRef(scaleSpeed);
  // Refs for selection values, so a running loop can rebuild its sequence at
  // each loop boundary using the latest choices (live-update on next loop).
  const modeRef = useRef(mode);
  const directionRef = useRef(direction);
  const bothStartRef = useRef(bothStart);
  const scaleStartRef = useRef(scaleStart);
  const octaveCountRef = useRef(octaveCount);
  const arpMaskRef = useRef(arpMask);
  const glissStartRef = useRef(glissStart);
  const glissEndRef = useRef(glissEnd);
  const chordSelRef = useRef(chordSel);
  const chordSpeedRef = useRef(chordSpeed);
  const scaleLoopSecRef = useRef(scaleLoopSec);
  const glissLoopSecRef = useRef(glissLoopSec);
  const chordLoopSecRef = useRef(chordLoopSec);
  const playRef = useRef({ on: false, timer: null });
  const cycleDirRef = useRef({});
  const dragRef = useRef({}); // active pedal drags keyed by pointerId (up to two fingers)
  const audioRef = useRef(null);

  useEffect(() => { pedalsRef.current = pedals; }, [pedals]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { tempoRef.current = scaleSpeed; }, [scaleSpeed]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { bothStartRef.current = bothStart; }, [bothStart]);
  useEffect(() => { scaleStartRef.current = scaleStart; }, [scaleStart]);
  useEffect(() => { octaveCountRef.current = octaveCount; }, [octaveCount]);
  useEffect(() => { arpMaskRef.current = arpMask; }, [arpMask]);
  useEffect(() => { glissStartRef.current = glissStart; }, [glissStart]);
  useEffect(() => { glissEndRef.current = glissEnd; }, [glissEnd]);
  useEffect(() => { chordSelRef.current = chordSel; }, [chordSel]);
  useEffect(() => { chordSpeedRef.current = chordSpeed; }, [chordSpeed]);
  useEffect(() => { scaleLoopSecRef.current = scaleLoopSec; }, [scaleLoopSec]);
  useEffect(() => { glissLoopSecRef.current = glissLoopSec; }, [glissLoopSec]);
  useEffect(() => { chordLoopSecRef.current = chordLoopSec; }, [chordLoopSec]);
  useEffect(() => { setScaleLoopSecField(String(scaleLoopSec)); }, [scaleLoopSec]);
  useEffect(() => { setGlissLoopSecField(String(glissLoopSec)); }, [glissLoopSec]);
  useEffect(() => { setChordLoopSecField(String(chordLoopSec)); }, [chordLoopSec]);
  useEffect(() => { setChordSpeedField(String(chordSpeed)); }, [chordSpeed]);
  useEffect(() => { setSpeedField(String(speed)); }, [speed]);
  useEffect(() => { setScaleSpeedField(String(scaleSpeed)); }, [scaleSpeed]);
  useEffect(() => { tuningRef.current = tuning; }, [tuning]);

  const presetMatches = matchPresets(pedals, userPresets);
  // For the SAVE guard specifically, a config is only a true duplicate when both
  // pedals AND root match an existing preset/saved config. Same pedals with a
  // different root (e.g. C major vs A minor) is a distinct config and may be saved.
  const currentRootLetter = STRINGS[mode === "gliss" ? glissStart : scaleStart].letter;
  const exactMatches = [
    ...ALL_PRESETS_FLAT.filter(p => sameConfig(p.pedals, pedals) && (p.rootL ?? null) === currentRootLetter),
    ...userPresets.filter(p => sameConfig(p.pedals, pedals) && (p.rootL ?? null) === currentRootLetter),
  ].map(p => p.name);

  // ── Auto-detect base notes + clamp ──
  // Priority: root of an explicitly selected preset > root of the first preset
  // matching the manually pedalled config (Major category is checked first, so
  // ambiguous configs default to the major interpretation) > keep last
  // selection (clamped to the valid range).
  useEffect(() => {
    const matched = rootSnap ? ALL_PRESETS_FLAT.find(p => sameConfig(p.pedals, pedals)) : null;
    const rootL = presetRoot ?? matched?.rootL ?? null;
    if (rootL) {
      const si = findStringByLetter(AUTO.scale[0], AUTO.scale[1], rootL);
      if (si !== null) setScaleStart(si);
      if (direction === "desc") {
        const gs = findStringByLetter(AUTO.glissDesc[0], AUTO.glissDesc[1], rootL);
        if (gs !== null) { setGlissStart(gs); setGlissEnd(gs - 21); }
      } else {
        const gs = findStringByLetter(AUTO.glissAsc[0], AUTO.glissAsc[1], rootL);
        if (gs !== null) { setGlissStart(gs); setGlissEnd(gs + 21); }
      }
    } else {
      const sR = (direction === "desc" || (direction === "both" && bothStart === "down"))
        ? RANGES.scaleDesc : RANGES.scaleAsc;
      setScaleStart(v => Math.min(Math.max(v, sR[0]), sR[1]));
      const gR = direction === "desc" ? RANGES.glissDesc
               : direction === "both" ? [0, 46]
               : RANGES.glissAsc;
      setGlissStart(v => {
        const nv = Math.min(Math.max(v, gR[0]), gR[1]);
        setGlissEnd(e => {
          if (direction === "desc") return e >= nv ? Math.max(nv - 1, 0) : e;
          if (direction === "both") return e === nv ? (nv < 46 ? nv + 1 : nv - 1) : e;
          return e <= nv ? Math.min(nv + 1, 46) : e;
        });
        return nv;
      });
    }
  }, [pedals, direction, presetRoot, rootSnap]);

  // ── Audio ──
  // onsets: per-bank { midiKey: seconds } of measured lead-in, skipped at
  // playback so the attack lands on the tap rather than ~15-35 ms after it.
  const samplesRef = useRef({ buffers: null, loading: false, onsets: {} });
  const voicesRef = useRef([]); // active { src, gain, endsAt } for voice-stealing
  // Étouffé's single sounding voice: { idx, src, gain, filt }. Monophonic by
  // definition, so it lives outside the voice-stealing pool — Max voices is
  // effectively fixed at 1 and the sound panel's setting is ignored.
  const etoufVoiceRef = useRef(null);

  // Pre-warm the audio engine on the user's first interaction with the page,
  // so the samples are already decoded and the AudioContext resumed by the time
  // they press Play. This removes the first-press lag and the initial note pile-up.
  useEffect(() => {
    let done = false;
    const warm = () => {
      if (done) return;
      done = true;
      try {
        const { ctx } = getAudio();
        unlockAudio(); // unlock within this first gesture too
        ensureSamples(ctx);
      } catch (e) { /* ignore; will init on Play instead */ }
      window.removeEventListener("pointerdown", warm);
      window.removeEventListener("keydown", warm);
    };
    window.addEventListener("pointerdown", warm, { once: false });
    window.addEventListener("keydown", warm, { once: false });
    return () => {
      window.removeEventListener("pointerdown", warm);
      window.removeEventListener("keydown", warm);
    };
  }, []);

  function getAudio() {
    if (!audioRef.current) {
      // latencyHint "interactive" asks for the smallest buffer the device can
      // sustain, so a Live tap sounds as promptly as possible.
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
      // iOS 16.4+: request the "playback" audio session so output is NOT silenced
      // by the phone's physical mute/ringer switch (the default "ambient" session
      // is). No-op where unsupported (desktop, older Safari, Chrome, Firefox).
      try {
        if (navigator.audioSession) navigator.audioSession.type = "playback";
      } catch (e) { /* not supported; ignore */ }
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      comp.connect(ctx.destination);
      audioRef.current = { ctx, dest: comp };
    }
    if (audioRef.current.ctx.state === "suspended") audioRef.current.ctx.resume();
    return audioRef.current;
  }

  // Play one silent sample inside a user gesture to fully "unlock" audio on
  // browsers with strict autoplay policies (notably iOS Safari). Once unlocked,
  // notes scheduled later from timers are allowed to sound. Safe to call often.
  function unlockAudio() {
    try {
      const { ctx, dest } = getAudio();
      const b = ctx.createBuffer(1, 1, ctx.sampleRate);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(dest);
      s.start(0);
    } catch (e) { /* ignore */ }
  }

  async function ensureSamples(ctx) {
    const S = samplesRef.current;
    if (S.buffers || S.loading) return;
    S.loading = true;
    try {
      const entries = await Promise.all(
        Object.entries(HARP_SAMPLES).map(async ([midi, b64]) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const buf = await ctx.decodeAudioData(arr.buffer);
          return [Number(midi), buf];
        })
      );
      S.buffers = Object.fromEntries(entries);
      S.onsets.default = onsetsOf(entries);
    } catch (e) {
      S.buffers = null; // fall back to synthesis permanently this session
    }
    // Harmonics decode in their own try: a failure here degrades only the
    // Harmonics technique (synth fallback), never the default pluck samples.
    try {
      const hEntries = await Promise.all(
        Object.entries(HARMONIC_SAMPLES).map(async ([midi, b64]) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const buf = await ctx.decodeAudioData(arr.buffer);
          return [midi, buf]; // keep the string key: float midis round-trip exactly
        })
      );
      S.harmBuffers = Object.fromEntries(hEntries);
      S.onsets.harm = onsetsOf(hEntries);
    } catch (e) {
      S.harmBuffers = null;
    }
    // Xylophonics likewise decode in their own try: failure degrades only the
    // Xylophonic technique (synth fallback).
    try {
      const xEntries = await Promise.all(
        Object.entries(XYLOPHONIC_SAMPLES).map(async ([midi, b64]) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const buf = await ctx.decodeAudioData(arr.buffer);
          return [midi, buf]; // keep the string key: float midis round-trip exactly
        })
      );
      S.xyloBuffers = Object.fromEntries(xEntries);
      S.onsets.xylo = onsetsOf(xEntries);
    } catch (e) {
      S.xyloBuffers = null;
    }
    // Près de la table likewise decodes in its own try: failure degrades
    // only the p.d.l.t. technique (synth fallback).
    try {
      const pEntries = await Promise.all(
        Object.entries(PDLT_SAMPLES).map(async ([midi, b64]) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const buf = await ctx.decodeAudioData(arr.buffer);
          return [midi, buf]; // keep the string key: float midis round-trip exactly
        })
      );
      S.pdltBuffers = Object.fromEntries(pEntries);
      S.onsets.pdlt = onsetsOf(pEntries);
    } catch (e) {
      S.pdltBuffers = null;
    }
    // Nail likewise decodes in its own try: failure degrades only the
    // Nail technique (synth fallback).
    try {
      const nEntries = await Promise.all(
        Object.entries(NAIL_SAMPLES).map(async ([midi, b64]) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const buf = await ctx.decodeAudioData(arr.buffer);
          return [midi, buf]; // keep the string key: float midis round-trip exactly
        })
      );
      S.nailBuffers = Object.fromEntries(nEntries);
      S.onsets.nail = onsetsOf(nEntries);
    } catch (e) {
      S.nailBuffers = null;
    }
    // Étouffé likewise decodes in its own try: failure degrades only the
    // Étouffé technique (DSP-on-default-plucks fallback, then synth).
    try {
      const eEntries = await Promise.all(
        Object.entries(ETOUFFE_SAMPLES).map(async ([midi, b64]) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const buf = await ctx.decodeAudioData(arr.buffer);
          return [midi, buf]; // keep the string key: float midis round-trip exactly
        })
      );
      S.etoufBuffers = Object.fromEntries(eEntries);
      S.onsets.etouf = onsetsOf(eEntries);
    } catch (e) {
      S.etoufBuffers = null;
    }
    S.loading = false;
  }

  // Damp the current étouffé voice (if any) right now: cancel its scheduled
  // auto-damp, truncate the gain and sweep the lowpass shut over ETOUF_DAMP,
  // then release it. Safe to call when nothing is sounding or the voice has
  // already auto-damped (the ramps just act on silence).
  function dampEtouf(now) {
    const v = etoufVoiceRef.current;
    if (!v) return;
    etoufVoiceRef.current = null;
    try {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(Math.max(v.gain.gain.value, 0.0001), now);
      v.gain.gain.exponentialRampToValueAtTime(0.0001, now + ETOUF_DAMP);
      v.filt.frequency.cancelScheduledValues(now);
      v.filt.frequency.setValueAtTime(Math.max(v.filt.frequency.value, ETOUF_LP_CLOSED), now);
      v.filt.frequency.exponentialRampToValueAtTime(ETOUF_LP_CLOSED, now + ETOUF_DAMP);
      v.src.stop(now + ETOUF_DAMP + 0.02);
    } catch (e) { /* already stopped */ }
  }

  function soundString(idx, when, volMul = 1, tech = "default") {
    const { ctx, dest } = getAudio();
    ensureSamples(ctx);
    const s = STRINGS[idx];
    const acc = pedalsRef.current[s.letter];
    // Harmonics sound one octave above the (pedalled) string pitch.
    // Xylophonics sound at string pitch, from their own sample bank.
    const harm = tech === "harm";
    const xylo = tech === "xylo";
    const pdlt = tech === "pdlt";
    const nail = tech === "nail";
    const etouf = tech === "etouf";
    const targetMidi = s.midi + acc + (harm ? 12 : 0);
    const isGliss = mode === "gliss";
    const vol = (isGliss ? Math.min(0.55, 1.6 / Math.sqrt(speedRef.current)) : 0.5) * volMul;
    const t = when != null ? when : ctx.currentTime; // audio-clock start time for this note

    const bufs = harm ? samplesRef.current.harmBuffers
      : xylo ? samplesRef.current.xyloBuffers
      : pdlt ? samplesRef.current.pdltBuffers
      : nail ? samplesRef.current.nailBuffers
      : samplesRef.current.buffers;

    // ── Étouffé: self-recorded samples, app-damped (Live only) ──
    // Plays Yijun's étouffé recordings (each cut just before the audible
    // damp contact); the app's damp — gain truncation + lowpass sweep —
    // supplies the ending: at ETOUF_RING for a lone note, instantly on
    // force-damp. Falls back to DSP-damped Default plucks if the étouffé
    // bank failed to decode, then to synth. Monophonic: this strike
    // force-damps whatever is still sounding (the staff side of that lives
    // in liveStrike). The auto-damp is scheduled upfront on the audio clock
    // (no JS-timer jitter); a force-damp cancels those ramps and re-damps
    // from the live values. Sostenuto and Max voices are deliberately
    // ignored.
    if (etouf) {
      // Monophonic force-damping and single-voice tracking are Live-only
      // (an immediate strike has no `when`). Scheduled étouffé notes —
      // chord and scale playback — each ring and self-damp independently
      // at t + ETOUF_RING, so a block chord damps as one.
      const isLiveStrike = when == null;
      if (isLiveStrike) dampEtouf(ctx.currentTime);
      const eBufs = samplesRef.current.etoufBuffers;
      const bank = eBufs || bufs;
      const table = eBufs ? ETOUFFE_MIDIS : SAMPLE_MIDIS;
      if (bank) {
        const best = pickSample(table, targetMidi, idx, 0); // zone-locked (étouffé sounds at string pitch)
        const rate = (tuningRef.current / 440) * Math.pow(2, (targetMidi - best) / 12);
        const src = ctx.createBufferSource();
        src.buffer = bank[best];
        src.playbackRate.value = rate;
        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass";
        filt.frequency.setValueAtTime(ETOUF_LP_OPEN, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.003); // declick only; the 4 ms
        // of run-in left by bufferOnset means this ramp finishes before the
        // attack, so the transient stays sharp instead of being smoothed off.
        g.gain.setValueAtTime(vol, t + ETOUF_RING);
        g.gain.exponentialRampToValueAtTime(0.0001, t + ETOUF_RING + ETOUF_DAMP);
        filt.frequency.setValueAtTime(ETOUF_LP_OPEN, t + ETOUF_RING);
        filt.frequency.exponentialRampToValueAtTime(ETOUF_LP_CLOSED, t + ETOUF_RING + ETOUF_DAMP);
        src.connect(filt); filt.connect(g); g.connect(dest);
        // Skip the lead-in, as in the sampled path above; the ring/damp
        // envelope stays anchored to t, so it times from the attack.
        src.start(t, samplesRef.current.onsets?.[eBufs ? "etouf" : "default"]?.[best] || 0);
        src.stop(t + ETOUF_RING + ETOUF_DAMP + 0.05);
        if (isLiveStrike) etoufVoiceRef.current = { idx, src, gain: g, filt };
      } else {
        // Synth fallback: a short pluck approximates the damped ring.
        const freq = tuningRef.current * Math.pow(2, (targetMidi - 69) / 12);
        pluck(ctx, dest, freq, ETOUF_RING + ETOUF_DAMP, vol * 0.6, t);
      }
      // No early return: fall through to the shared played-string highlight
      // below (an early return here left Scale-mode étouffé notes unlit).
    } else if (bufs) {
      // Nearest recorded sample, pitch-shifted; tuning scales the rate.
      // Harmonic keys are exact measured midis (floats), so the recordings'
      // few-cent tuning residuals cancel out in the rate here.
      const table = harm ? HARMONIC_MIDIS : xylo ? XYLOPHONIC_MIDIS
        : pdlt ? PDLT_MIDIS : nail ? NAIL_MIDIS : SAMPLE_MIDIS;
      // Zone-locked pick so the wire/gut boundary at 5G|5A is respected
      // (harmonic keys sound an octave above the string, hence the +12).
      const best = pickSample(table, targetMidi, idx, harm ? 12 : 0);
      const rate = (tuningRef.current / 440) * Math.pow(2, (targetMidi - best) / 12);
      const src = ctx.createBufferSource();
      src.buffer = bufs[best];
      src.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.003); // declick only; the 4 ms
      // of run-in left by bufferOnset means this ramp finishes before the
      // attack, so the transient stays sharp instead of being smoothed off.
      // Sostenuto length, live-tunable per mode via the sound panel.
      // Gliss: measured in notes (scales with speed). Scale/chord: seconds.
      const noteGap = 1 / speedRef.current;
      const tail = isGliss
        ? Math.max(0.18, noteGap * tailRef.current)
        : Math.max(0.18, tailRef.current);
      const fade = Math.min(0.4, tail * 0.45);
      g.gain.setValueAtTime(vol, t + tail - fade);
      g.gain.exponentialRampToValueAtTime(0.0001, t + tail);
      src.connect(g); g.connect(dest);
      // Skip the measured in-buffer lead-in so the attack lands on the tap
      // (Live) or the scheduled beat and string highlight (Scale/Gliss).
      src.start(t, samplesRef.current.onsets?.[tech]?.[best] || 0);
      src.stop(t + tail + 0.05);

      // ── Voice-stealing (cap live-tunable) ──
      const MAX_VOICES = maxVoicesRef.current;
      const pool = voicesRef.current;
      pool.push({ src, gain: g, endsAt: t + tail });
      const now = ctx.currentTime;
      while (pool.length && pool[0].endsAt <= now) pool.shift(); // drop finished
      while (pool.length > MAX_VOICES) {
        const old = pool.shift();
        try {
          old.gain.gain.cancelScheduledValues(now);
          old.gain.gain.setValueAtTime(old.gain.gain.value, now);
          old.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
          old.src.stop(now + 0.14);
        } catch (e) { /* already stopped */ }
      }
    } else {
      const freq = tuningRef.current * Math.pow(2, (targetMidi - 69) / 12);
      pluck(ctx, dest, freq, 1.8, vol * 0.6, t);
    }
    // Light the played string at its actual sounding moment, not at schedule time
    // (notes are queued up to ~150ms ahead). The gen check stops a stale highlight
    // from a previous play session firing after Stop/restart.
    const gen = playRef.current.gen;
    const lead = Math.max(0, (t - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (playRef.current.on && playRef.current.gen === gen) setCurrentIdx(idx);
    }, lead);
  }

  // ── Playback engine ──
  const stop = useCallback(() => {
    playRef.current.on = false;
    if (playRef.current.timer) clearTimeout(playRef.current.timer);
    // Let ringing voices fade naturally, but drop our references so the pool
    // starts clean on the next play.
    voicesRef.current = [];
    setPlaying(false);
    setCurrentIdx(null);
  }, []);

  async function start() {
    stop();
    playRef.current.on = true;
    playRef.current.gen = (playRef.current.gen || 0) + 1; // play-session token (stale-highlight guard)
    setPlaying(true);
    const { ctx } = getAudio();
    unlockAudio(); // silent 1-sample buffer within the gesture; satisfies iOS autoplay
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch (e) { /* ignore */ }
    }
    await ensureSamples(ctx); // instant if already pre-warmed on first interaction
    if (!playRef.current.on) return;
    const PAUSE = 1000;      // ms wait while the selection/sequence is empty (poll interval)
    const LOOKAHEAD = 0.15;  // queue notes up to this far ahead on the audio clock (s)
    const TICK = 25;        // how often the scheduler wakes (ms)
    const TAIL = 1;         // s after a one-shot pass's last note before playback stops
    // Loop settings for the current mode. loopOn is captured at Play (toggling
    // the checkbox stops playback anyway); the interval is read live from refs
    // at each loop boundary, like speed.
    const loopOn = mode === "chord" ? chordLoop : mode === "scale" ? scaleLoop : glissLoop;
    const loopGap = () =>
      mode === "chord" ? chordLoopSecRef.current :
      mode === "scale" ? scaleLoopSecRef.current :
      glissLoopSecRef.current;
    // Technique for this play session — captured at Play, like loopOn:
    // switching technique stops playback, so it can't change mid-session.
    const tech = mode === "scale" ? scaleTech : mode === "gliss" ? glissTech : chordTech;

    // pullEvent(): advance the playback state by one note and return { idx, gap }
    // — idx is the string to sound (null means a silent wait) and gap is the
    // seconds from this note to the next. One definition per mode; the scheduler
    // below is shared. Sequences are rebuilt at loop/turnaround boundaries from the
    // live refs, so changes to range, degrees, direction, speed, or endpoints take
    // effect at the next boundary, exactly as the old loop did.
    let pullEvent;

    if (mode === "chord") {
      const sortedSel = () => [...chordSelRef.current].sort((a, b) => a - b);
      if (!breakChord) {
        // Block chord: every selected string sounds at once (gap 0 between
        // scheduled notes), then the loop interval before the chord repeats
        // (or, with Loop off, once and stop). Direction and speed settings are
        // ignored. Per-note volume scales by 1/√n so large chords don't
        // overload; selection changes apply at the next repeat.
        let notes = sortedSel();
        let i = 0;
        let ended = false;
        pullEvent = () => {
          if (ended) return { done: true };
          if (notes.length === 0) { notes = sortedSel(); return { idx: null, gap: PAUSE / 1000 }; }
          const volMul = Math.min(1, 1.7 / Math.sqrt(notes.length));
          const idx = notes[i]; i++;
          if (i >= notes.length) {
            if (!loopOn) { ended = true; return { idx, gap: TAIL, volMul }; }
            notes = sortedSel(); i = 0;
            return { idx, gap: loopGap(), volMul };
          }
          return { idx, gap: 0, volMul };
        };
      } else if (direction === "both" && chordContinuous && chordLoop) {
        // Broken chord, continuous ping-pong over the selection (gliss style):
        // no pause, turnaround notes not repeated. Selection changes apply at
        // each turnaround. (With Loop off, the sequenced branch below plays a
        // single out-and-back pass instead — Continuous only matters when
        // looping.)
        let sel = sortedSel();
        let dir = bothStartRef.current === "down" ? -1 : 1;
        let pos = dir === 1 ? 0 : Math.max(0, sel.length - 1);
        let first = true;
        pullEvent = () => {
          if (sel.length === 0) {
            sel = sortedSel();
            dir = bothStartRef.current === "down" ? -1 : 1;
            pos = dir === 1 ? 0 : Math.max(0, sel.length - 1);
            first = true;
            return { idx: null, gap: PAUSE / 1000 };
          }
          if (first) { first = false; return { idx: sel[pos], gap: 1 / chordSpeedRef.current }; }
          let next = pos + dir;
          if (next >= sel.length || next < 0) {
            sel = sortedSel(); // refresh selection at the turnaround
            if (sel.length === 0) return { idx: null, gap: PAUSE / 1000 };
            pos = Math.max(0, Math.min(pos, sel.length - 1));
            dir = -dir;
            next = Math.max(0, Math.min(pos + dir, sel.length - 1));
          }
          pos = next;
          return { idx: sel[pos], gap: 1 / chordSpeedRef.current };
        };
      } else {
        // Broken chord, sequenced pass (asc / desc / both scale-style) with the
        // loop interval between passes, or a single pass with Loop off.
        const buildChord = () => {
          const sel = sortedSel();
          const d = directionRef.current;
          if (d === "asc") return sel;
          if (d === "desc") return [...sel].reverse();
          const firstPass = bothStartRef.current === "down" ? [...sel].reverse() : sel;
          return firstPass.length > 1
            ? [...firstPass, ...firstPass.slice(0, -1).reverse()]
            : firstPass;
        };
        let seq = buildChord();
        let i = 0;
        let ended = false;
        pullEvent = () => {
          if (ended) return { done: true };
          if (i >= seq.length) {
            seq = buildChord();
            i = 0;
            if (seq.length === 0) return { idx: null, gap: PAUSE / 1000 };
          }
          const idx = seq[i]; i++;
          let gap = 1 / chordSpeedRef.current;
          if (i >= seq.length) {
            if (!loopOn) { ended = true; gap += TAIL; }
            else { seq = buildChord(); i = 0; gap += loopGap(); }
          }
          return { idx, gap };
        };
      }
    } else if (mode === "scale") {
      // Continuous "both": loop seamlessly with neither end repeated — drop the
      // pass's final note (the repeated bottom) and skip the inter-loop pause.
      // With Loop off, a single full pass plays (final note included) and stops,
      // so Continuous is moot.
      const cont = direction === "both" && scaleContinuous && scaleLoop;
      const buildScale = () => {
        const seq = buildScaleSequence(
          scaleStartRef.current, octaveCountRef.current, arpMaskRef.current,
          directionRef.current, bothStartRef.current);
        return (cont && seq.length > 1) ? seq.slice(0, -1) : seq;
      };
      let seq = buildScale();
      let i = 0;
      let ended = false;
      pullEvent = () => {
        if (ended) return { done: true };
        if (i >= seq.length) {
          seq = buildScale();
          i = 0;
          if (seq.length === 0) return { idx: null, gap: PAUSE / 1000 };
        }
        const idx = seq[i]; i++;
        let gap = 1 / tempoRef.current;
        if (i >= seq.length) { // just emitted the last note → pause before the next loop
          if (!loopOn) { ended = true; gap += TAIL; }
          else {
            seq = buildScale();
            i = 0;
            if (!cont) gap += loopGap();
          }
        }
        return { idx, gap };
      };
    } else if (direction === "both" && (!glissContinuous || !glissLoop)) {
      // Gliss "both", non-continuous (or Loop off): a full out-and-back pass
      // (scale style, ending back on the start note), then the loop interval
      // before the next pass — or, with Loop off, a single pass and stop.
      const buildBoth = () => {
        const run = rng(glissStartRef.current, glissEndRef.current);
        return run.length > 1 ? [...run, ...run.slice(0, -1).reverse()] : run;
      };
      let seq = buildBoth();
      let i = 0;
      let ended = false;
      pullEvent = () => {
        if (ended) return { done: true };
        if (i >= seq.length) {
          seq = buildBoth();
          i = 0;
          if (seq.length === 0) return { idx: null, gap: PAUSE / 1000 };
        }
        const idx = seq[i]; i++;
        let gap = 1 / speedRef.current;
        if (i >= seq.length) {
          if (!loopOn) { ended = true; gap += TAIL; }
          else { seq = buildBoth(); i = 0; gap += loopGap(); }
        }
        return { idx, gap };
      };
    } else if (direction === "both") {
      // Ping-pong; re-read endpoints at each turnaround so From/To changes apply at
      // the next bounce.
      let lo = Math.min(glissStartRef.current, glissEndRef.current);
      let hi = Math.max(glissStartRef.current, glissEndRef.current);
      let cur = glissStartRef.current;
      let dir = glissStartRef.current <= glissEndRef.current ? 1 : -1;
      let first = true;
      pullEvent = () => {
        if (first) { first = false; return { idx: cur, gap: 1 / speedRef.current }; }
        let next = cur + dir;
        if (next > hi || next < lo) {
          lo = Math.min(glissStartRef.current, glissEndRef.current);
          hi = Math.max(glissStartRef.current, glissEndRef.current);
          if (next > hi) { dir = -1; next = hi - 1; }
          if (next < lo) { dir = 1; next = lo + 1; }
          next = Math.max(lo, Math.min(hi, next)); // clamp if bounds shrank
        }
        cur = next;
        return { idx: cur, gap: 1 / speedRef.current };
      };
    } else {
      let seq = buildGlissSequence(glissStartRef.current, glissEndRef.current);
      let i = 0;
      let ended = false;
      pullEvent = () => {
        if (ended) return { done: true };
        if (i >= seq.length) {
          seq = buildGlissSequence(glissStartRef.current, glissEndRef.current);
          i = 0;
          if (seq.length === 0) return { idx: null, gap: PAUSE / 1000 };
        }
        const idx = seq[i]; i++;
        let gap = 1 / speedRef.current;
        if (i >= seq.length) {
          if (!loopOn) { ended = true; gap += TAIL; }
          else {
            seq = buildGlissSequence(glissStartRef.current, glissEndRef.current);
            i = 0;
            gap += loopGap();
          }
        }
        return { idx, gap };
      };
    }

    // ── Lookahead scheduler ──
    // Notes are queued on the Web Audio clock at exact times, and each note's time
    // is the previous time plus its gap — so spacing is correct regardless of
    // main-thread jank at startup (mounts, re-renders, the audio clock just
    // beginning to advance). That decoupling is what removes the "crowded burst
    // then settles" at the first press.
    let nextNoteTime = ctx.currentTime + 0.08; // small lead so note 1 isn't in the past
    const scheduleAhead = () => {
      if (!playRef.current.on) return;
      while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
        const ev = pullEvent();
        if (ev.done) {
          // One-shot pass complete (Loop off): stop once the last note (plus
          // its tail) has actually sounded, so the final highlight still shows.
          const gen = playRef.current.gen;
          playRef.current.timer = setTimeout(() => {
            if (playRef.current.on && playRef.current.gen === gen) stop();
          }, Math.max(0, (nextNoteTime - ctx.currentTime) * 1000));
          return;
        }
        if (ev.idx != null) soundString(ev.idx, nextNoteTime, ev.volMul ?? 1, tech);
        nextNoteTime += ev.gap;
      }
      playRef.current.timer = setTimeout(scheduleAhead, TICK);
    };
    scheduleAhead();
  }

  // ── Pedal interaction (manual pedalling clears preset root) ──
  function bouncePedal(L) {
    setPresetRoot(null);
    setPedals(prev => {
      const p = prev[L];
      let d = cycleDirRef.current[L] ?? -1;
      let next = p + d;
      if (next > 1 || next < -1) { d = -d; next = p + d; }
      cycleDirRef.current[L] = d;
      return { ...prev, [L]: next };
    });
  }
  function setPedal(L, pos) {
    setPresetRoot(null);
    setPedals(prev => prev[L] === pos ? prev : { ...prev, [L]: pos });
  }

  // ── Dropdown ranges ──
  // "both" with a down-first bounce follows the descending range/octave logic.
  const scaleDescLogic = direction === "desc" || (direction === "both" && bothStart === "down");
  // The technique's playable range narrows both the start-note options and
  // the octave count: the whole run must stay inside it (harmonics 6E…2F,
  // xylophonic 5A…0G; other techniques cover the full harp).
  const [scaleLo, scaleHi] = techRange(scaleTech);
  const scaleRange = scaleDescLogic
    ? [Math.max(RANGES.scaleDesc[0], scaleLo + 7), Math.min(RANGES.scaleDesc[1], scaleHi)]
    : [Math.max(RANGES.scaleAsc[0], scaleLo), Math.min(RANGES.scaleAsc[1], scaleHi - 7)];
  // How many whole octaves fit from the start note in the playing direction:
  // ascending (and up-first both) extend upward toward the range top; descending
  // (and down-first both) extend downward toward the range bottom.
  const maxOctaves = scaleDescLogic
    ? Math.max(1, Math.floor((scaleStart - scaleLo) / 7))
    : Math.max(1, Math.floor((scaleHi - scaleStart) / 7));
  useEffect(() => {
    if (octaveCount > maxOctaves) setOctaveCount(maxOctaves);
  }, [maxOctaves, octaveCount]);
  useEffect(() => { // clamp when the technique/direction narrows the range
    setScaleStart(s => Math.min(Math.max(s, scaleRange[0]), scaleRange[1]));
  }, [scaleRange[0], scaleRange[1]]);
  // In "both" (ping-pong) mode the start can be any string and the end any other
  // string, since the gliss bounces both ways. Ascending/descending keep their
  // directional limits (end must sit above/below the start). 46 = 0G (top), 0 = 7C.
  const glissStartRange =
    direction === "desc" ? RANGES.glissDesc :
    direction === "both" ? [0, 46] :
    RANGES.glissAsc;
  const glissEndOptions =
    direction === "desc" ? rng(glissStart - 1, 0) :
    direction === "both" ? rng(0, 46).filter(i => i !== glissStart) :
    rng(glissStart + 1, 46);

  const pretuneSelected =
    mode === "scale" ? scaleStart <= 1 :
    mode === "chord" ? (chordSel.has(IDX["7C"]) || chordSel.has(IDX["7D"])) :
    (glissStart <= 1 || glissEnd <= 1);

  // ── Chord grid selection ──
  // A note can be added only if the selection stays legal under the enforced
  // per-technique limits: the technique's note cap (sum of its per-hand
  // finger limits), and (when the hand-span rule is on) playable by two
  // hands under its finger counts, span, and stretch model. Deselection is
  // always allowed.
  const chordAddOK = (sel, i) => {
    // The technique's playable range gates selection even with the limits
    // unenforced — an out-of-range string can't sound at all.
    const [lo, hi] = techRange(chordTech);
    if (i < lo || i > hi) return false;
    if (!enforce8) return true;
    const lim = TECH_LIMITS[chordTech];
    if (sel.size >= lim.fingers[0] + lim.fingers[1]) return false;
    if (!handSpanOn) return true;
    return handsFeasible([...sel, i].sort((a, b) => a - b), handSpan, lim);
  };
  // Technique switches: stop playback, sync the remembered slider field, and
  // (chord) prune strings the incoming technique cannot sound plus Break
  // chord if it no longer applies; (scale) clamp the start note into range.
  function chooseChordTech(v) {
    stop();
    setChordTech(v);
    setHandSpanField(String(spanByTech[v]));
    if (!TECH_LIMITS[v].canBreak) setBreakChord(false);
    if (v === "nail" && direction === "both") setDirection("asc"); // no bounced nail chords
    const [lo, hi] = techRange(v);
    setChordSel(prev => {
      const kept = [...prev].filter(i => i >= lo && i <= hi);
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }
  function chooseScaleTech(v) {
    stop();
    setScaleTech(v);
    setScaleSpeedField(String(scaleSpeedByTech[v]));
  }
  function chooseGlissTech(v) {
    stop();
    setGlissTech(v);
  }
  // Shared technique picker: radios in a 3-per-row grid (2×3 for the full
  // six; gliss's three fill a single row).
  const techPicker = (group, value, choose, opts) => (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3, auto)", gap:"6px 14px",
      justifyContent:"start", marginBottom:8 }}>
      {opts.map(([v, label]) => (
        <label key={v} style={{ display:"flex", alignItems:"center", gap:5,
          fontSize:12.5, color:t.text2, cursor:"pointer", userSelect:"none" }}>
          <input type="radio" name={group} value={v} checked={value === v}
            onChange={() => choose(v)}
            style={{ accentColor:t.accent, margin:0 }}/>
          {label}
        </label>
      ))}
    </div>
  );
  function toggleChordNote(i) {
    setChordSel(prev => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); return next; }
      if (!chordAddOK(prev, i)) return prev;
      next.add(i);
      return next;
    });
  }

  // ── Live play (Chord / Live) ──
  // Sound one string right now (pointerdown is a user gesture, so audio is
  // unlocked), flash its button for FLASH_MS, and keep it on the staff for as
  // long as it rings — the chord-mode Sostenuto, read live from tailRef so the
  // Advanced-settings slider governs both the sound and the visual bleed.
  const LIVE_FLASH_MS = 200;
  function liveStrike(i) {
    // Range gate: some browsers still deliver pointerdown on disabled
    // buttons, so the greyed-out state alone isn't a reliable guard.
    const [rLo, rHi] = techRange(chordTech);
    if (i < rLo || i > rHi) return;
    const T = liveTimersRef.current;
    // Étouffé is monophonic: this strike force-damps the previous voice
    // (audio side in soundString), so clear its staff note immediately too.
    if (chordTech === "etouf") {
      const prev = etoufVoiceRef.current;
      if (prev && prev.idx !== i && T.ring.has(prev.idx)) {
        clearTimeout(T.ring.get(prev.idx));
        T.ring.delete(prev.idx);
        setLiveRing(p => { const n = new Map(p); n.delete(prev.idx); return n; });
      }
    }
    soundString(i, undefined, 1, chordTech);
    setLiveFlash(prev => { const n = new Set(prev); n.add(i); return n; });
    if (T.flash.has(i)) clearTimeout(T.flash.get(i));
    T.flash.set(i, setTimeout(() => {
      T.flash.delete(i);
      setLiveFlash(prev => { const n = new Set(prev); n.delete(i); return n; });
    }, LIVE_FLASH_MS));
    // Étouffé ignores the Sostenuto: the staff note lives exactly as long as
    // the sound does (ring + damp), not the chord-mode tail.
    const ringMs = chordTech === "etouf"
      ? (ETOUF_RING + ETOUF_DAMP) * 1000
      : Math.max(180, tailRef.current * 1000);
    setLiveRing(prev => { const n = new Map(prev); n.set(i, chordTech); return n; });
    if (T.ring.has(i)) clearTimeout(T.ring.get(i));
    T.ring.set(i, setTimeout(() => {
      T.ring.delete(i);
      setLiveRing(prev => { const n = new Map(prev); n.delete(i); return n; });
    }, ringMs));
  }
  // Switch between Chord and Live: stop any scheduled playback and clear all
  // live timers/visuals so neither sub-mode inherits stale state.
  function setLive(on) {
    stop();
    const T = liveTimersRef.current;
    for (const id of T.ring.values()) clearTimeout(id);
    for (const id of T.flash.values()) clearTimeout(id);
    T.ring.clear();
    T.flash.clear();
    setLiveRing(new Map());
    setLiveFlash(new Set());
    setLiveMode(on);
  }

  // ── Tuning ──
  function commitTuning() {
    let v = parseInt(tuningField, 10);
    if (isNaN(v)) v = 440;
    v = Math.max(430, Math.min(450, v));
    setTuning(v);
    setTuningField(String(v));
  }
  function commitSpeed() {
    let v = parseInt(speedField, 10);
    if (isNaN(v)) v = speed;
    v = Math.max(1, Math.min(40, v));
    setSpeed(v);
    setSpeedField(String(v));
  }
  function commitHandSpan() {
    const lim = TECH_LIMITS[chordTech];
    let v = parseInt(handSpanField, 10);
    if (isNaN(v)) v = handSpan;
    v = Math.max(lim.spanMin, Math.min(lim.spanMax, v));
    setSpanByTech(m => ({ ...m, [chordTech]: v }));
    setHandSpanField(String(v));
  }
  function commitLoopSec() {
    const [field, sec, setSec, setField] =
      mode === "scale" ? [scaleLoopSecField, scaleLoopSec, setScaleLoopSec, setScaleLoopSecField] :
      mode === "chord" ? [chordLoopSecField, chordLoopSec, setChordLoopSec, setChordLoopSecField] :
      [glissLoopSecField, glissLoopSec, setGlissLoopSec, setGlissLoopSecField];
    let v = parseInt(field, 10);
    if (isNaN(v)) v = sec;
    // Scale/Arp and Gliss allow 0 s: the scheduler adds the interval on top of
    // the normal 1/speed note gap, so 0 means the next pass simply continues
    // at the playing tempo (no pause). Chord keeps a 1 s floor.
    const lo = mode === "chord" ? 1 : 0;
    v = Math.max(lo, Math.min(20, v));
    setSec(v);
    setField(String(v));
  }
  function commitChordSpeed() {
    let v = parseInt(chordSpeedField, 10);
    if (isNaN(v)) v = chordSpeed;
    v = Math.max(1, Math.min(40, v));
    setChordSpeed(v);
    setChordSpeedField(String(v));
  }
  function commitScaleSpeed() {
    let v = parseInt(scaleSpeedField, 10);
    if (isNaN(v)) v = scaleSpeed;
    v = Math.max(1, Math.min(scaleSpeedMax, v));
    setScaleSpeed(v);
    setScaleSpeedField(String(v));
  }

  // ── Reset ──
  function resetSettings() {
    stop();
    setPedals(DEFAULT_PEDALS);
    setPresetRoot(null);
    setMode("scale");
    setDirection("asc");
    setBothStart("up");
    setScaleStart(IDX["4C"]);
    setOctaveCount(1);
    setChordTech("default");
    setScaleTech("default");
    setGlissTech("default");
    setScaleSpeedByTech(Object.fromEntries(Object.keys(TECH_LIMITS).map(k => [k, 2])));
    setScaleSpeedField("2");
    setGlissStart(IDX["5C"]);
    setGlissEnd(IDX["2C"]);
    setSpeed(15);
    setChordSel(new Set());
    setLive(false);
    setBreakChord(false);
    setEnforce8(false);
    setHandSpanOn(false);
    setSpanByTech(Object.fromEntries(Object.entries(TECH_LIMITS).map(([k, v]) => [k, v.spanDef])));
    setHandSpanField("10");
    setChordSpeed(15);
    setScaleContinuous(false);
    setGlissContinuous(true);
    setChordContinuous(false);
    setScaleLoop(true);
    setGlissLoop(true);
    setChordLoop(true);
    setScaleLoopSec(1);
    setGlissLoopSec(1);
    setChordLoopSec(4);
    setScaleLoopSecField("1");
    setGlissLoopSecField("1");
    setChordLoopSecField("4");
    setTuning(440);
    setTuningField("440");
    setSoundSettings(initSoundSettings(null));
    setRootSnap(true);
    setArpMask([true, true, true, true, true, true, true, true]);
    cycleDirRef.current = {};
  }
  function resetAll() {
    if (!resetAllArmed) {
      setResetAllArmed(true);
      clearTimeout(resetArmTimer.current);
      resetArmTimer.current = setTimeout(() => setResetAllArmed(false), 4000);
      return;
    }
    clearTimeout(resetArmTimer.current);
    setResetAllArmed(false);
    resetSettings();
    setUserPresets([]);
  }

  // ── Presets ──
  function applyPreset(p) {
    setPedals({ ...p.pedals });
    setPresetRoot(p.rootL ?? null);
    // Leave the presets menu and the open category as-is after a pick, so the user
    // can keep browsing/comparing. Only the Presets toggle button collapses the menu.
  }
  function savePreset() {
    if (!saveName.trim() || exactMatches.length > 0) return;
    const name = cleanName(saveName).trim();
    if (!name) return; // name was only control/invisible characters
    // Reject names that belong to a built-in preset, so custom configs never
    // collide with the library (and survive an export/re-import round-trip).
    if (ALL_PRESETS_FLAT.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setBuiltinNameClash(true);
      return;
    }
    const clash = userPresets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    if (clash !== -1 && !pendingOverwrite) {
      setPendingOverwrite(name); // ask the user before overwriting
      return;
    }
    const rootL = STRINGS[mode === "gliss" ? glissStart : scaleStart].letter;
    const entry = { name, pedals: { ...pedals }, rootL, user: true };
    setUserPresets(prev => {
      if (clash !== -1) {
        const next = [...prev];
        next[clash] = entry;
        return next;
      }
      return [...prev, entry];
    });
    setSaveName("");
    setShowSave(false);
    setPendingOverwrite(null);
  }
  function renamePreset(index, newName) {
    const trimmed = cleanName(newName).trim();
    if (!trimmed) return false;
    // Disallow renaming to a built-in preset name or another saved config's name.
    if (ALL_PRESETS_FLAT.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return false;
    const clash = userPresets.some((p, i) => i !== index && p.name.toLowerCase() === trimmed.toLowerCase());
    if (clash) return false;
    setUserPresets(prev => prev.map((p, i) => i === index ? { ...p, name: trimmed } : p));
    return true;
  }
  function deletePreset(index) {
    setUserPresets(prev => prev.filter((_, i) => i !== index));
  }

  // ── Import / Export ──
  // Export a chosen subset of saved configs as a small JSON file.
  function exportSelected(indices) {
    // An empty selection exports nothing — never an implicit "export all".
    // Callers wanting everything must pass all indices explicitly.
    if (indices.length === 0) return;
    const chosen = indices.map(i => userPresets[i]).filter(Boolean);
    if (chosen.length === 0) return;
    const payload = chosen.map(p => ({ name: p.name, pedals: p.pedals, rootL: p.rootL ?? null }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = chosen.length === 1
      ? `glissie-${chosen[0].name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`
      : "glissie-configs.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function importConfigs(file) {
    // Guard 1: reject oversized files before reading. A full 15,309-entry
    // export is ~1.5-1.8 MB, so anything over 2 MB can't be a legitimate export.
    if (file.size > MAX_IMPORT_BYTES) {
      showImportMsg(`That file is too large to be a Glissie export (over ${Math.round(MAX_IMPORT_BYTES / (1024 * 1024))} MB).`, false);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      // Unreadable file (locked, deleted mid-read, permission issue): say so
      // instead of silently doing nothing.
      showImportMsg("That file couldn't be read. It may be locked, deleted, or inaccessible; please try again.", false);
    };
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        // Guard 2: reject impossible entry counts before classifying anything.
        const rawArr = Array.isArray(parsed) ? parsed : [parsed];
        if (rawArr.length > MAX_LIBRARY) {
          showImportMsg(`That file has ${rawArr.length.toLocaleString()} entries, but only ${MAX_LIBRARY.toLocaleString()} distinct configurations can exist. Import cancelled.`, false);
          return;
        }
        const { configs: sanitized, malformed } = sanitizeImported(parsed);
        if (sanitized.length === 0 && malformed === 0) { showImportMsg("No valid configurations found in that file.", false); return; }
        if (sanitized.length === 0) {
          showImportMsg(`No valid configurations found; ${malformed} entr${malformed === 1 ? "y was" : "ies were"} malformed and skipped.`, false);
          return;
        }

        // Resolve null rootL at import time (not apply time), baking in the
        // current start-note letter, so the entry never sits in the library
        // rootless where the duplicate check would treat it as always-distinct.
        // savePreset always writes a letter; null can only come from
        // hand-edited files, so nothing legitimate is lost.
        const startL = STRINGS[mode === "gliss" ? glissStart : scaleStart].letter;
        const incoming = sanitized.map(c => c.rootL == null ? { ...c, rootL: startL } : c);

        const { accepted, skippedNames, rejectedDups, cappedCount } =
          mergeImportedConfigs(userPresets, incoming, ALL_PRESETS_FLAT);

        // List at most 5 names, then "\u2026and N more."
        const listNames = (arr, fmt = x => x) => {
          const shown = arr.slice(0, 5).map(fmt);
          const more = arr.length - shown.length;
          return shown.join(", ") + (more > 0 ? `, \u2026and ${more} more` : "");
        };
        const parts = [];
        if (accepted.length) parts.push(`Imported ${accepted.length} configuration${accepted.length === 1 ? "" : "s"}.`);
        if (skippedNames.length) parts.push(
          `Skipped ${skippedNames.length} already saved (${listNames(skippedNames)}).`
        );
        if (rejectedDups.length) parts.push(
          `Rejected ${rejectedDups.length} matching an existing configuration under a different name (${listNames(rejectedDups, d => `${d.name} matches ${d.matched}`)}).`
        );
        if (malformed) parts.push(
          `${malformed} entr${malformed === 1 ? "y was" : "ies were"} malformed and skipped; fix and re-import to add ${malformed === 1 ? "it" : "them"}.`
        );
        if (cappedCount) parts.push(
          `${cappedCount} not added: the library is at its ${MAX_LIBRARY.toLocaleString()}-configuration limit.`
        );
        // Clean imports fade after 7 seconds; anything with skips, rejections,
        // malformed entries, or cap hits stays until dismissed.
        const sticky = skippedNames.length > 0 || rejectedDups.length > 0 || malformed > 0 || cappedCount > 0;
        showImportMsg(parts.join(" ") || "Nothing to import.", !sticky);

        if (accepted.length) setUserPresets(prev => [...prev, ...accepted]);
      } catch {
        showImportMsg("That file couldn't be read as Glissie configurations.", false);
      }
    };
    reader.readAsText(file);
  }

  // ── Pedal component ──
  function Pedal({ L }) {
    const pos = pedals[L];
    const topFor = p => (p === -1 ? 6 : p === 0 ? 36 : 66);

    function onPointerDown(e) {
      // Track each finger separately by pointerId so two pedals can be dragged at
      // once on touch. A mouse has a single pointer, so desktop stays single. The
      // single-pointer path is identical to the original — no cap that could wedge
      // the board, and no left/right-foot grouping.
      // Only the left (primary) mouse button starts a drag; right/middle
      // clicks are left to the browser. Touch pointers all qualify.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current[e.pointerId] = { L, startY: e.clientY, startPos: pos, moved: false };
    }
    function onPointerMove(e) {
      const d = dragRef.current[e.pointerId];
      if (!d || d.L !== L) return;
      // If the button was released but pointerup never reached us (pointer
      // capture is lost when the node is replaced mid-drag), end the drag here
      // so the pedal never follows an unpressed mouse.
      if (e.pointerType === "mouse" && (e.buttons & 1) === 0) {
        delete dragRef.current[e.pointerId];
        return;
      }
      const dy = e.clientY - d.startY;
      if (Math.abs(dy) > 8) d.moved = true;
      if (d.moved) {
        const np = Math.min(1, Math.max(-1, d.startPos + Math.round(dy / 30)));
        setPedal(L, np);
      }
    }
    function onPointerUp(e) {
      const d = dragRef.current[e.pointerId];
      if (d && d.L === L && !d.moved) bouncePedal(L);
      delete dragRef.current[e.pointerId];
    }
    function onPointerCancel(e) {
      // Drag interrupted (capture lost, touch cancelled): keep the pedal where
      // it is and just drop the tracking entry — no bounce, no jump.
      delete dragRef.current[e.pointerId];
    }

    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, userSelect:"none", touchAction:"none" }}>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onPointerCancel}
          style={{
            width:32, height:90, background:t.card2, borderRadius:6,
            border:`1.5px solid ${t.bdrS}`, position:"relative", cursor:"pointer",
            boxShadow:"inset 0 1px 3px rgba(0,0,0,0.15)", touchAction:"none",
          }}
        >
          {[-1,0,1].map(p => (
            <div key={p} style={{
              position:"absolute", left:3, right:3, top: topFor(p)+7,
              height:2, background:t.bdr2, borderRadius:1,
            }}/>
          ))}
          <div style={{
            position:"absolute", left:4, right:4, top: topFor(pos), height:16,
            background: pos===0 ? t.pedN : pos===-1 ? t.pedF : t.pedS,
            borderRadius:4, boxShadow:"0 2px 4px rgba(0,0,0,0.3)",
            transition:"top 0.15s ease",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <span style={{ fontSize:9, color:"white", fontWeight:"bold" }}>{L}</span>
          </div>
        </div>
        <div style={{
          fontSize:13, fontWeight:600, letterSpacing:0.5, lineHeight:1.4,
          color: pos===0 ? t.pedNtx : pos===-1 ? t.pedFtx : t.pedStx,
        }}>
          {L}<span style={{ display:"inline-block", width:"0.75em", textAlign:"left" }}>{pos===-1?"♭":pos===1?"♯":"♮"}</span>
        </div>
      </div>
    );
  }

  // ── Theme ──
  const dk = darkMode;
  const t = {
    bg:       dk?'#1a1a2e':'#fafafa',
    card:     dk?'#252540':'white',
    card2:    dk?'#2e2e4a':'#f5f5f5',
    card3:    dk?'#282845':'#f7f7f7',
    text:     dk?'#e0e0e0':'#2a2a2a',
    text2:    dk?'#b0b0c0':'#555',
    text3:    dk?'#9090a8':'#666',
    text4:    dk?'#808098':'#777',
    text5:    dk?'#7a7a92':'#888',
    text6:    dk?'#70708a':'#999',
    text7:    dk?'#606078':'#aaa',
    bdr:      dk?'#3a3a58':'#ddd',
    bdr2:     dk?'#404060':'#ccc',
    bdr3:     dk?'#353550':'#e4e4e4',
    bdrS:     dk?'#4a4a68':'#bbb',
    accent:   dk?'#5a5a80':'#555',
    accent2:  dk?'#4a4a70':'#444',
    accent3:  dk?'#b8b8d8':'#333',
    help:     dk?'#252548':'#f0f4ff',
    helpBdr:  dk?'#3a3a68':'#c0cde8',
    info:     dk?'#252548':'#eef3fb',
    infoBdr:  dk?'#3a3a68':'#c9d9ee',
    infoTx:   dk?'#8aaac8':'#3a5572',
    grn:      dk?'#3a8a3a':'#3a7a3a',
    grnLt:    dk?'#1e3e2a':'#dceadc',
    grnLt2:   dk?'#1e3828':'#eef5ee',
    grnLt3:   dk?'#2a4a30':'#e7f1e7',
    grnBdr:   dk?'#2a5a2a':'#cfe3cf',
    grnTx:    dk?'#5aaa5a':'#3a6a3a',
    grnTx2:   dk?'#6acc6a':'#2a5a2a',
    grnTx3:   dk?'#5aaa5a':'#5a8a5a',
    red:      dk?'#8a3333':'#b04a4a',
    redLt:    dk?'#3a2020':'#fdeeee',
    redBdr:   dk?'#5a2a2a':'#f0c9c9',
    redTx:    dk?'#cc7a7a':'#9a4444',
    redTx2:   dk?'#cc7a7a':'#a33',
    redTx3:   dk?'#aa7070':'#b07a7a',
    ylw:      dk?'#33301a':'#fff8e1',
    ylwBdr:   dk?'#5a5530':'#ffe082',
    ylwBdr2:  dk?'#4a4530':'#d9c87a',
    ylwBdr3:  dk?'#444030':'#ddd6c4',
    ylwTx:    dk?'#d0b050':'#7a5c00',
    ylwTx2:   dk?'#c0a848':'#5a4a1a',
    ylwTx3:   dk?'#b09050':'#8a7a4a',
    ylwTx4:   dk?'#b09858':'#8a7a55',
    ylwLt:    dk?'#2e2b20':'#f6f3ec',
    ylwLt2:   dk?'#3a3520':'#f3ecc9',
    ylwDiv:   dk?'#444030':'#e6dfce',
    shadow:   dk?'0 1px 3px rgba(0,0,0,0.4)':'0 1px 3px rgba(0,0,0,0.06)',
    shadowL:  dk?'0 2px 6px rgba(0,0,0,0.5)':'0 2px 6px rgba(0,0,0,0.15)',
    link:     dk?'#7ab07a':'#9a8',
    eee:      dk?'#2e2e4a':'#eee',
    pedN:     dk?'#4a4a6a':'#555',
    pedF:     dk?'#3a5a80':'#7a9cc7',
    pedS:     dk?'#8a4a4a':'#c97b7b',
    pedNtx:   dk?'#c0c0d0':'#333',
    pedFtx:   dk?'#7aaad0':'#4a7ab5',
    pedStx:   dk?'#d09090':'#b04a4a',
    dgn:      dk?'#d9b':'#d9b',
  };

  // ── Shared styles ──
  const inputStyle = { padding:"4px 8px", borderRadius:4, border:`1px solid ${t.bdr2}`, fontSize:13, background:t.card };
  const btn = (active) => ({
    padding:"5px 14px", borderRadius:4,
    // Explicit line-height: the ▼/▲ in "Presets" come from a fallback font on
    // Android whose taller metrics otherwise inflate that one button's height.
    lineHeight:"19px",
    border:"1.5px solid " + (active ? t.accent : t.bdr2),
    background: active ? t.accent : t.card2,
    color: active ? "white" : t.text,
    cursor:"pointer", fontSize:13, fontWeight: active ? 600 : 400,
    display:"inline-grid",
  });
  // Width-stable button label: invisible bold copy reserves the widest width.
  const btnLabel = (label, active) => (
    <>
      <span style={{ gridArea:"1/1", visibility:"hidden", fontWeight:600 }}>{label}</span>
      <span style={{ gridArea:"1/1", fontWeight: active ? 600 : 400 }}>{label}</span>
    </>
  );
  // Compact variant for the Presets…Reset-all toolbar so it fits one line on desktop; mobile keeps roomy padding.
  // Compact padding matches wide (9px sides): six preset/reset buttons must
  // share one ~496px line, and 14px sides wrapped "Reset all" onto its own row.
  const btnRow = (active) => ({ ...btn(active), padding: "5px 9px" });
  const seg = (active) => ({
    // Horizontal padding trimmed (14→10 on wide) so the mode row — grown by
    // the "Chord / Live" label — still shares one line with Asc/Desc/Both on
    // a maximized desktop window. Applies to every seg button for consistency.
    padding: wide ? "6px 10px" : "6px 8px", border:"none", whiteSpace:"nowrap",
    background: active ? t.accent3 : t.card,
    color: active ? (dk?"#1a1a2e":"white") : t.text,
    cursor:"pointer", fontSize:13, fontWeight: active ? 600 : 400,
    display:"inline-grid",
  });
  // Width-stable toggle button: an invisible bold copy always reserves the
  // bold-text width, so toggling fontWeight never changes the button size.
  const segLabel = (label, active) => (
    <>
      <span style={{ gridArea:"1/1", visibility:"hidden", fontWeight:600 }}>{label}</span>
      <span style={{ gridArea:"1/1", fontWeight: active ? 600 : 400 }}>{label}</span>
    </>
  );

  // ── Chord grid: one colour per octave (legend shown above the grid) ──
  const OCT_COLORS = dk
    ? { 7:"#a06ad0", 6:"#6a8ad8", 5:"#4aacac", 4:"#5ab55a", 3:"#b0a848", 2:"#d09050", 1:"#d07070", 0:"#b08868" }
    : { 7:"#7a3aa5", 6:"#3a5aa5", 5:"#1a7a7a", 4:"#3a7a3a", 3:"#8a7a1a", 2:"#b06a1a", 1:"#a53a3a", 0:"#7a4a2a" };

  // ── "Continuous" option for the Both direction, one state per mode ──
  const continuousValue =
    mode === "scale" ? scaleContinuous :
    mode === "chord" ? chordContinuous :
    glissContinuous;
  const setContinuousValue = (v) => {
    if (mode === "scale") setScaleContinuous(v);
    else if (mode === "chord") setChordContinuous(v);
    else setGlissContinuous(v);
    stop();
  };
  // ── "Loop" option, one state + interval per mode ──
  const loopValue =
    mode === "scale" ? scaleLoop :
    mode === "chord" ? chordLoop :
    glissLoop;
  const setLoopValue = (v) => {
    if (mode === "scale") setScaleLoop(v);
    else if (mode === "chord") setChordLoop(v);
    else setGlissLoop(v);
    stop();
  };
  const loopSecField =
    mode === "scale" ? scaleLoopSecField :
    mode === "chord" ? chordLoopSecField :
    glissLoopSecField;
  const setLoopSecField =
    mode === "scale" ? setScaleLoopSecField :
    mode === "chord" ? setChordLoopSecField :
    setGlissLoopSecField;
  // With Continuous = Yes (Both direction) a checked Loop repeats seamlessly,
  // so the interval is ignored — dim it. Block chords ignore direction (and
  // therefore Continuous) entirely, hence the breakChord condition.
  const continuousApplies = direction === "both" && (mode !== "chord" || breakChord);
  const intervalOn = loopValue && !(continuousApplies && continuousValue);
  const loopRow = () => (
    // The interval input is always rendered (dimmed when unused) so the row
    // height never changes; minHeight matches the input so toggling other
    // rows around it doesn't reflow either.
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, minHeight:28 }}>
      <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, color:t.text2, cursor:"pointer" }}>
        <input type="checkbox" checked={loopValue}
          onChange={e => setLoopValue(e.target.checked)} />
        Loop
      </label>
      <label style={{ fontSize:12, color:t.text3, opacity: intervalOn ? 1 : 0.5 }}>every</label>
      <input type="text" inputMode="numeric" value={loopSecField}
        disabled={!intervalOn}
        onChange={e => setLoopSecField(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={commitLoopSec}
        onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
        style={{ ...inputStyle, width:40, textAlign:"center", opacity: intervalOn ? 1 : 0.5 }}/>
      <span style={{ fontSize:12, color:t.text3, opacity: intervalOn ? 1 : 0.5 }}>s</span>
    </div>
  );

  const continuousRow = () => (
    // With Loop unchecked, playback is a single pass and Continuous is moot —
    // the whole row dims and the radios disable until Loop is re-ticked.
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10, flexWrap:"wrap", opacity: loopValue ? 1 : 0.5 }}>
      <label style={{ fontSize:12, color:t.text3 }}>Continuous:</label>
      <label style={{ display:"flex", gap:5, alignItems:"center", fontSize:12, color:t.text2, cursor: loopValue ? "pointer" : "default" }}>
        <input type="radio" name="continuousBoth" checked={continuousValue}
          disabled={!loopValue}
          onChange={() => setContinuousValue(true)} />
        Yes
      </label>
      <label style={{ display:"flex", gap:5, alignItems:"center", fontSize:12, color:t.text2, cursor: loopValue ? "pointer" : "default" }}>
        <input type="radio" name="continuousBoth" checked={!continuousValue}
          disabled={!loopValue}
          onChange={() => setContinuousValue(false)} />
        No
      </label>
    </div>
  );


  // ─────────────────────────────────────────────────────────────────────────
  // Play button + status line, shared by both layouts: under the pedal card
  // on wide screens (pedals + Play = the two live-performance controls, and
  // it balances the columns), in the playback column flow on compact.
  const playBlock = (
    <>
      {/* Play */}
      {(() => {
        const noChordNotes = mode === "chord" && chordSel.size === 0 && !playing;
        const noScaleNotes = mode === "scale" && !arpMask.some(Boolean) && !playing;
        // Live play: the grid itself is the instrument, so scheduled playback
        // is irrelevant (setLive already stopped anything running).
        const liveOn = mode === "chord" && liveMode;
        const playDisabled = noChordNotes || noScaleNotes || liveOn;
        return (
      <button
        disabled={playDisabled}
        onClick={() => (playing ? stop() : start())}
        style={{
          width:"100%", padding:12, borderRadius:8, border:"none",
          background: playing ? t.red : playDisabled ? t.text6 : t.grn, color:"white",
          fontSize:16, fontWeight:"bold", cursor: playDisabled ? "default" : "pointer", letterSpacing:1,
          lineHeight:1.5, boxShadow:t.shadowL, opacity: playDisabled ? 0.5 : 1,
        }}
      >
        {playing ? "⏹ Stop" : "▶ Play"}
      </button>
        );
      })()}

      <div style={{ marginTop:10, fontSize:12, color:t.text5, textAlign:"center", minHeight:16, lineHeight:"16px" }}>
        {playing && currentIdx !== null
          ? <>Now playing: <strong style={{ display:"inline-block", minWidth:"2.6em", textAlign:"left", lineHeight:"16px" }}>{noteLabel(currentIdx, pedals)}</strong></>
          : mode === "chord" && liveMode
          ? "Live play: click/tap the grid"
          : mode === "chord" && chordSel.size === 0
          ? "Select notes on the grid to build a chord"
          : "Pedal changes apply live during playback"}
      </div>
    </>
  );

  return (
    <div style={{
      maxWidth: wide ? 1080 : 520, margin:"0 auto", padding:"16px 12px",
      fontFamily:"Georgia, serif", color:t.text, background:t.bg, minHeight:"100vh", colorScheme: dk ? "dark" : "light",
    }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:52, fontWeight:400, letterSpacing:0.5, lineHeight:1, fontFamily:"'Italianno', cursive" }}>Glissie</h1>
          <div style={{ fontSize:22, color:t.text5, marginTop:-2, lineHeight:1.1, fontFamily:"'Ephesis', cursive" }}>Pedal Harp Simulator</div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button onClick={() => setDarkMode(d => !d)} style={{ ...btn(false), fontSize:12, padding:"5px 10px" }} title="Toggle dark mode">
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={() => setShowHelp(h => !h)} style={{ ...btn(showHelp), fontSize:12 }}>
            {/* Reserve wider label so button width is stable */}
            <span style={{ gridArea:"1/1", visibility:"hidden", fontWeight:600 }}>Close help</span>
            <span style={{ gridArea:"1/1", fontWeight: showHelp ? 600 : 400 }}>
              {showHelp ? "Close help" : "? Help"}
            </span>
          </button>
        </div>
      </div>
      {/* Help */}
      {showHelp && (
        <div style={{ background:t.help, border:`1px solid ${t.helpBdr}`, borderRadius:6, padding:12, marginBottom:12, fontSize:14, lineHeight:1.6 }}>
          <strong>Octave numbering:</strong> Harp octave numbers follow string numbering; they decrease as pitch rises, and each octave begins at F. Ascending from middle: 4C → 4D → 4E → 3F → 3G → 3A → 3B → 3C…
          <StringChart dark={darkMode} wide={wide} />
          <div style={{ fontSize:13, color:t.text4, marginTop:2, marginBottom:10 }}>
            The 47 strings of a concert grand pedal harp, lowest (7C, left) to highest (0G, right).
          </div>
          <strong>Pedals:</strong> D C B = left foot, E F G A = right foot. Up = flat (♭), middle = natural (♮), down = sharp (♯). Click to move the pedal one notch (it bounces: up, middle, down, middle, up…), or drag it directly.<br/><br/>
          <strong>Live pedalling:</strong> Pedal changes apply immediately, even during playback.<br/><br/>
          <strong>Reset:</strong> Restores all settings (pedals, mode, direction, notes, speed, tuning) to their defaults, but keeps your saved configurations. <strong>Reset all</strong> does the same and also deletes your saved configurations; it asks for a second tap to confirm.<br/><br/>
          <strong>Enharmonic doublings:</strong> Some presets (pentatonics, whole tone) set two adjacent strings to the same pitch; e.g. B♯=C. This is how harpists achieve scales of fewer than seven notes in a glissando; the doubled notes reinforce the sound. A few root names (e.g. D♯ major pentatonic, G♭ blues minor) simply name the string the run starts on, where the configuration offers no theoretically cleaner enharmonic root.<br/><br/>
          <strong>Out-of-order configurations:</strong> A glissando sweeps the strings in playing order, so its pitches should climb steadily. A few enharmonic spellings break this: a sharpened E♯ sounds above the following F♭, or a B♯ above the next C♭ at the octave change, so the run dips mid-sweep. The default for each scale always avoids this. Configurations that don't are still kept; the effect can be striking, but are listed last among a root's alternates and marked ⚠ with the pitch class that falls out of order, e.g. ⚠E♯ (or ⚠E♯,B♯ when both octave breaks invert).<br/><br/>
          <strong>7C and 7D:</strong> On a real concert grand these two strings are not connected to the pedal mechanism and must be pre-tuned by hand. In this app they follow the pedals for convenience.<br/><br/>
          <strong>Saving &amp; sharing:</strong> Saved configurations are stored on your own device and persist between visits; except if you choose "Reset all" or clear your browser data, which removes them. To save a copy on your local disk or to share with other users, use Export. Each appears under "My configurations," where you can rename (✎) or delete (🗑) it; saving a name you've already used asks whether to overwrite. <strong>Export</strong> lets you tick which configurations to download as a small file you can back up or send to another user; <strong>Import</strong> loads configurations from such a file. On import, identical configurations you already have are skipped, and one whose name you already use for a <em>different</em> setting is automatically renamed.<br/><br/>
          <strong>Modes:</strong> <em>Scale / Arpeggio</em> plays a run from your start note. The eight buttons are the scale degrees (1–7 plus the octave, 1*): with all lit it's a full scale, and deselecting some makes an arpeggio; for example, leave 1, 3, 5 and 1* for a triad. The <em>Range</em> dropdown sets how many octaves it spans (the choices adapt to how much room the start note leaves before the edge of the harp), and your chosen degree pattern repeats in each octave. <em>Speed</em> sets how many notes play per second. <em>Chord / Live</em> displays 47 strings as a grid. In Chord mode, notes are selected, then can be either played as a block chord by default, or arpeggiated by checking <em>Break chord</em>, following the direction buttons and its own speed. Switching the panel to Live turns the grid into a playable interface: click or tap notes to play them immediately, with multi-touch on touch screens. <em>Glissando</em> sweeps every string between two notes.<br/><br/>
          <strong>Sound techniques:</strong> Each mode lets you pick how the strings are played, and the notation preview marks the choice with its standard sign. <em>Pluck</em> is the ordinary plucked tone. <em>Harmonics</em> ring an octave above the string that sounds them, soft and bell-like; the staff displays where the note is played rather than where it sounds, from 6E to 2F. <em>Près de la table</em> is played close to the soundboard for a thinner, guitar-like tone. <em>Nail</em> is plucked with the fingernail for a bright, sharp attack. <em>Xylophonic</em> is plucked while the far end of the string is damped, giving a wooden, muted, dry and percussive sound, played from 5A to 0G. <em>Étouffé</em> is plucked and immediately muffled for a dry, staccato note. Glissando offers only the techniques that suit sliding: Single (one finger), Près de la table, and Nail. Each mode remembers its own technique.<br/><br/>
          <strong>Loop:</strong> When ticked (the default), playback repeats with the given gap between passes; untick it to play a single pass and stop. For the Both direction that means one full out-and-back pass. Scale/Arpeggio and Glissando allow a gap from 0 to 20 seconds (0 runs straight into the next pass at the playing speed, with no pause); Chord uses 1 to 20 seconds. Each mode remembers its own value. With Continuous set to Yes, a ticked Loop repeats seamlessly and the interval is ignored.<br/><br/>
          <strong>Continuous (Both direction):</strong> <em>Yes</em> ping-pongs seamlessly with no pause and neither turnaround note repeated; <em>No</em> plays one full out-and-back pass, then pauses for the Loop interval before repeating. Each mode remembers its own choice.<br/><br/>
          <strong>Note limit:</strong> A harpist plays with four fingers of each hand (the little fingers are not used), so only so many strings can be sounded at once. In Chord mode, ticking <em>Enforce: Note limit</em> caps the selection and greys out the rest once you reach the cap; untick it to select freely. The cap depends on the technique, and was set empirically from what the hand can realistically manage rather than by a strict rule.<br/><br/>
          <strong>Hand span limit:</strong> Available when the note limit is enforced. It bounds how far apart the notes in one hand can sit, and how the two hands can split the selection. The reachable spans were calibrated by testing on a real harp rather than computed, and they vary by technique. Strings that no legal two-hand arrangement could still include are greyed out. These figures are approximations rather than strict rules: hands differ from player to player, so treat them as a guide.<br/><br/>
          <strong>Snap to root:</strong> When on, pedalling into a configuration that matches a known scale automatically moves the start (and end) notes to that scale's root. Turn it off to pedal around freely without the notes jumping. Choosing a preset from the menu always snaps, regardless of this setting.<br/><br/>
          <strong>Sound:</strong> The plucked tone is the sampled concert harp from the Versilian Community Sample Library (VCSL, CC0). Harmonics, près de la table, nail, xylophonic, and étouffé are samples recorded on a concert harp by the author (CC0). The reference pitch is adjustable (A = 430 to 450 Hz). In Advanced settings you can set the sostenuto length and the number of simultaneous voices; these do not affect Étouffé, which manages its own damping.
        </div>
      )}

      {/* Presets + resets */}
      <div style={{ marginBottom:12 }}>
        {/* Two mirrored columns matching the body below (same flex and gap),
            so the mode buttons left-align with the play panel on wide screens.
            Compact stacks them: presets row first, mode+direction second. */}
        <div style={{ display:"flex", flexDirection: wide ? "row" : "column", gap: wide ? 22 : 8, alignItems:"flex-start", marginBottom: (showPresets || showSave) ? 8 : 0 }}>
        <div style={{ flex: wide ? "1 1 0" : "0 1 auto", minWidth:0, width: wide ? "auto" : "100%", display:"flex", gap: wide ? 5 : 6, flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={() => { setShowPresets(p => !p); setOpenCategory(null); }} style={btnRow(showPresets)}>
            <span style={{ gridArea:"1/1", visibility:"hidden", fontWeight:600 }}>Presets ▲</span>
            <span style={{ gridArea:"1/1", fontWeight: showPresets ? 600 : 400 }}>
              {`Presets ${showPresets ? "▲" : "▼"}`}
            </span>
          </button>
          <button onClick={() => setShowSave(s => !s)} style={btnRow(showSave)}>{btnLabel("Save", showSave)}</button>
          <button
            onClick={() => {
              if (userPresets.length === 0) { setImportMsg("You have no saved configurations to export yet."); return; }
              setExportMode(m => !m);
              setExportSel(new Set());
              setShowPresets(true);
              setOpenCategory("__user");
            }}
            style={btnRow(exportMode)}
          >
            {btnLabel("Export", exportMode)}
          </button>
          <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={btnRow(false)}>{btnLabel("Import", false)}</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display:"none" }}
            onChange={e => { const f = e.target.files[0]; if (f) importConfigs(f); e.target.value = ""; }}
          />
          <button onClick={resetSettings} style={btnRow(false)}>{btnLabel("Reset", false)}</button>
          <button onClick={resetAll} style={resetAllArmed
            ? { ...btnRow(true), background:t.red, borderColor:t.red }
            : { ...btnRow(false), color:t.redTx2, borderColor:t.dgn }}>
            {/* Both labels occupy the same cell; button takes the wider one's width */}
            <span style={{ gridArea:"1/1", visibility:"hidden", fontWeight:600 }}>Reset all</span>
            <span style={{ gridArea:"1/1", visibility:"hidden", fontWeight:600 }}>Confirm?</span>
            <span style={{ gridArea:"1/1", fontWeight:600 }}>
              {resetAllArmed ? "Confirm?" : "Reset all"}
            </span>
          </button>
        </div>
        <div style={{ flex: wide ? "1 1 0" : "0 1 auto", minWidth:0, width: wide ? "auto" : "100%", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", border:`1.5px solid ${t.bdr2}`, borderRadius:6, overflow:"hidden" }}>
          <button onClick={() => { setMode("scale"); stop(); }} style={seg(mode==="scale")}>{segLabel("Scale / Arpeggio", mode==="scale")}</button>
          <button onClick={() => { setMode("chord"); stop(); }} style={seg(mode==="chord")}>{segLabel("Chord / Live", mode==="chord")}</button>
          <button onClick={() => { setMode("gliss"); stop(); }} style={seg(mode==="gliss")}>{segLabel("Glissando", mode==="gliss")}</button>
        </div>
        {/* Direction is ignored (and dimmed) for an unbroken chord and in Live play. */}
        {(() => {
          const dirOff = mode === "chord" && (liveMode || !breakChord);
          // A broken nail chord can't bounce back: Both is out for Nail in
          // Chord mode only (Scale/Arp and Gliss keep it).
          const bothOff = dirOff || (mode === "chord" && chordTech === "nail");
          const dirSeg = (off) => (active) => ({ ...seg(active), ...(off ? { opacity:0.4, cursor:"default" } : {}) });
          return (
            <div style={{ display:"flex", border:`1.5px solid ${t.bdr2}`, borderRadius:6, overflow:"hidden", opacity: dirOff ? 0.75 : 1 }}>
              <button disabled={dirOff} onClick={() => { setDirection("asc"); stop(); }} style={dirSeg(dirOff)(direction==="asc")}>{segLabel("↑ Asc.", direction==="asc")}</button>
              <button disabled={dirOff} onClick={() => { setDirection("desc"); stop(); }} style={dirSeg(dirOff)(direction==="desc")}>{segLabel("↓ Desc.", direction==="desc")}</button>
              <button disabled={bothOff} onClick={() => { setDirection("both"); stop(); }} style={dirSeg(bothOff)(direction==="both")}>{segLabel("⇅ Both", direction==="both")}</button>
            </div>
          );
        })()}
        </div>
        </div>

        {showSave && (
          exactMatches.length > 0 ? (
            <div style={{ background:t.card2, border:`1px solid ${t.bdr}`, borderRadius:6, padding:"8px 12px", marginBottom:8, fontSize:12, color:t.text3 }}>
              This configuration already exists as <strong>{exactMatches.join(" · ")}</strong>; only custom configurations can be saved.
            </div>
          ) : (
            <div style={{ marginBottom:8 }}>
              {presetMatches.length > 0 && (
                <div style={{ background:t.info, border:`1px solid ${t.infoBdr}`, borderRadius:6, padding:"8px 12px", marginBottom:8, fontSize:12, color:t.infoTx }}>
                  These pedals are also read as <strong>{presetMatches.join(" · ")}</strong>, but your chosen root (<strong>{currentRootLetter}</strong>) is different; so this saves as a distinct configuration.
                </div>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <input
                  value={saveName}
                  onChange={e => { setSaveName(e.target.value); setPendingOverwrite(null); setBuiltinNameClash(false); }}
                  placeholder="Name this pedal configuration…"
                  style={{ ...inputStyle, flex:1 }}
                  onKeyDown={e => e.key === "Enter" && savePreset()}
                />
                <button onClick={savePreset} style={btn(true)}>Save</button>
              </div>
              {pendingOverwrite && (
                <div style={{ background:t.ylw, border:`1px solid ${t.ylwBdr}`, borderRadius:6, padding:"8px 12px", marginTop:8, fontSize:12, color:t.ylwTx }}>
                  You already have a saved configuration called <strong>{pendingOverwrite}</strong>.
                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    <button onClick={savePreset} style={{ ...btn(false), borderColor:t.ylwTx, color:t.ylwTx }}>Overwrite it</button>
                    <button onClick={() => setPendingOverwrite(null)} style={btn(false)}>Keep both; I'll rename</button>
                  </div>
                </div>
              )}
              {builtinNameClash && (
                <div style={{ background:t.redLt, border:`1px solid ${t.redBdr}`, borderRadius:6, padding:"8px 12px", marginTop:8, fontSize:12, color:t.redTx }}>
                  <strong>{saveName.trim()}</strong> is the name of a built-in preset; please choose a different name for your configuration.
                </div>
              )}
            </div>
          )
        )}

        {storageWarn && (
          <div style={{ background:t.redLt, border:`1px solid ${t.redBdr}`, borderRadius:6, padding:"7px 12px", marginBottom:8, fontSize:12, color:t.redTx, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
            <span>⚠ {storageWarn}</span>
            <button onClick={() => setStorageWarn("")} style={{ background:"none", border:"none", cursor:"pointer", color:t.redTx, fontSize:14 }}>×</button>
          </div>
        )}

        {importMsg && (
          <div style={{ background:t.grnLt2, border:`1px solid ${t.grnBdr}`, borderRadius:6, padding:"7px 12px", marginBottom:8, fontSize:12, color:t.grnTx, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>{importMsg}</span>
            <button onClick={() => { if (importMsgTimer.current) { clearTimeout(importMsgTimer.current); importMsgTimer.current = null; } setImportMsg(""); }} style={{ background:"none", border:"none", cursor:"pointer", color:t.grnTx, fontSize:14 }}>×</button>
          </div>
        )}

        {showPresets && (
          <div style={{ background:t.card, border:`1px solid ${t.bdr}`, borderRadius:6, padding:8 }}>
            {/* User presets; placed first so the Export checkboxes are immediately visible */}
            <div style={{ marginBottom:4 }}>
              <button
                onClick={() => setOpenCategory(c => c === "__user" ? null : "__user")}
                style={{
                  width:"100%", textAlign:"left", padding:"6px 10px",
                  border:"none", borderRadius:4,
                  background: openCategory === "__user" ? t.eee : "transparent",
                  cursor:"pointer", fontSize:13, fontWeight:600, color:t.ylwTx,
                }}
              >
                {openCategory === "__user" ? "▾" : "▸"} My configurations ({userPresets.length})
              </button>
              {openCategory === "__user" && (
                <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"6px 10px",
                  // A long saved-configuration list scrolls within itself
                  // instead of shoving the pedal card and play panel far
                  // down the page.
                  maxHeight:240, overflowY:"auto" }}>
                  {userPresets.length === 0 && (
                    <span style={{ fontSize:12, color:t.text6 }}>Nothing saved yet; use "Save" after setting a custom configuration.</span>
                  )}
                  {exportMode && userPresets.length > 0 && (
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", paddingBottom:4 }}>
                      <button
                        onClick={() => exportSel.size === userPresets.length ? setExportSel(new Set()) : setExportSel(new Set(userPresets.map((_, i) => i)))}
                        style={{ ...btn(false), fontSize:11, padding:"3px 10px", display:"inline-grid" }}
                      >
                        <span style={{ gridArea:"1/1", visibility:"hidden" }}>Select all</span>
                        <span style={{ gridArea:"1/1" }}>
                          {exportSel.size === userPresets.length ? "Clear all" : "Select all"}
                        </span>
                      </button>
                      <button
                        onClick={() => { exportSelected([...exportSel]); setExportMode(false); setExportSel(new Set()); }}
                        disabled={exportSel.size === 0}
                        style={{ ...btn(exportSel.size > 0), fontSize:11, padding:"3px 10px", opacity: exportSel.size === 0 ? 0.5 : 1, cursor: exportSel.size === 0 ? "not-allowed" : "pointer" }}
                      >
                        Export {exportSel.size > 0 ? `(${exportSel.size})` : ""}
                      </button>
                      <button onClick={() => { setExportMode(false); setExportSel(new Set()); }} style={{ ...btn(false), fontSize:11, padding:"3px 10px" }}>Cancel</button>
                    </div>
                  )}
                  {userPresets.map((p, i) => (
                    renameIdx === i ? (
                      <div key={i} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <input
                            value={renameText}
                            autoFocus
                            onChange={e => { setRenameText(e.target.value); setRenameErr(false); }}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                if (renamePreset(i, renameText)) { setRenameIdx(null); }
                                else setRenameErr(true);
                              } else if (e.key === "Escape") setRenameIdx(null);
                            }}
                            style={{ ...inputStyle, flex:1, borderColor: renameErr ? t.redTx3 : t.bdr2 }}
                          />
                          <button onClick={() => { if (renamePreset(i, renameText)) setRenameIdx(null); else setRenameErr(true); }} style={btn(true)}>Save</button>
                          <button onClick={() => setRenameIdx(null)} style={btn(false)}>Cancel</button>
                        </div>
                        {renameErr && <span style={{ fontSize:11, color:t.red }}>That name is already used by a built-in preset or another saved configuration.</span>}
                      </div>
                    ) : (
                      <div key={i} style={{
                        display:"flex", alignItems:"center", gap:6,
                        background: (exportMode ? exportSel.has(i) : sameConfig(p.pedals, pedals)) ? t.ylwLt2 : t.ylw,
                        border:`1px solid ${t.ylwBdr2}`, borderRadius:4, padding:"3px 4px 3px 10px",
                      }}>
                        {exportMode ? (
                          <label style={{ flex:1, display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:12, color:t.ylwTx2, padding:"2px 0" }}>
                            <input
                              type="checkbox"
                              checked={exportSel.has(i)}
                              onChange={() => setExportSel(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                            />
                            {p.name}
                          </label>
                        ) : (
                          <>
                            <button onClick={() => applyPreset(p)} style={{
                              flex:1, textAlign:"left", background:"none", border:"none",
                              cursor:"pointer", fontSize:12, color:t.ylwTx2, padding:"2px 0",
                            }}>
                              {p.name}
                            </button>
                            <button onClick={() => { setRenameIdx(i); setRenameText(p.name); setRenameErr(false); }}
                              title="Rename" style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, padding:"2px 4px", color:t.ylwTx3 }}>✎</button>
                            <button onClick={() => deletePreset(i)}
                              title="Delete" style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, padding:"2px 4px", color:t.redTx3 }}>🗑</button>
                          </>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
            <div style={{ borderTop:`1px solid ${t.eee}`, margin:"8px 0" }} />
            {/* Level 1: groups */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {PRESET_GROUPS.map(g => {
                const open = openGroup === g.group;
                return (
                  <button
                    key={g.group}
                    onClick={() => { setOpenGroup(x => x === g.group ? null : g.group); setOpenCategory(null); }}
                    style={{
                      padding:"5px 11px", borderRadius:4,
                      border:"1.5px solid " + (open ? t.accent2 : t.bdrS),
                      background: open ? t.accent2 : t.eee,
                      color: open ? "white" : t.text,
                      cursor:"pointer", fontSize:12.5, fontWeight:600,
                    }}
                  >
                    {g.group}
                  </button>
                );
              })}
            </div>
            {/* Level 2: categories within the open group */}
            {(() => {
              const g = PRESET_GROUPS.find(x => x.group === openGroup);
              if (!g) return null;
              return (
                <div style={{ marginTop:8, padding:"8px 10px", background:t.card3, border:`1px solid ${t.bdr3}`, borderRadius:6 }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {g.categories.map(name => {
                      const open = openCategory === name;
                      return (
                        <button
                          key={name}
                          onClick={() => setOpenCategory(c => c === name ? null : name)}
                          style={{
                            padding:"4px 10px", borderRadius:4,
                            border:"1.5px solid " + (open ? t.accent : t.bdr2),
                            background: open ? t.accent : t.card,
                            color: open ? "white" : t.text,
                            cursor:"pointer", fontSize:12, fontWeight: open ? 600 : 400,
                            display:"inline-grid",
                          }}
                        >
                          <span style={{ gridArea:"1/1", visibility:"hidden", fontWeight:600 }}>{name}</span>
                          <span style={{ gridArea:"1/1", fontWeight: open ? 600 : 400 }}>{name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Level 3: roots within the open category */}
                  {(() => {
                    const cat = CATEGORY_BY_NAME[openCategory];
                    if (!cat || !g.categories.includes(openCategory)) return null;
                    return (
                      <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${t.bdr3}` }}>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {cat.items.map((p, i) => (
                            <button key={i} onClick={() => applyPreset(p)} style={{
                              padding:"4px 10px", borderRadius:4, border:`1px solid ${t.bdr2}`,
                              background: sameConfig(p.pedals, pedals) ? t.grnLt : t.card,
                              cursor:"pointer", fontSize:12, lineHeight:"20px", minHeight:28,
                            }}>
                              {p.chip}
                            </button>
                          ))}
                        </div>
                        {cat.altItems && cat.altItems.length > 0 && (() => {
                          const altOpen = openAlts.has(cat.category);
                          const altMatch = cat.altItems.some(p => sameConfig(p.pedals, pedals));
                          return (
                          <div style={{ marginTop:6, paddingTop:6, borderTop:`1px dashed ${t.bdr3}` }}>
                            <button onClick={() => setOpenAlts(s => {
                              const n = new Set(s); n.has(cat.category) ? n.delete(cat.category) : n.add(cat.category); return n;
                            })} style={{
                              background:"none", border:"none", cursor:"pointer", padding:0,
                              fontSize:10, color: altMatch ? t.grnTx : t.text6,
                            }}>
                              {altOpen ? "▼" : "▶"} Alternate configs ({cat.altItems.length}){altMatch ? " ●" : ""}
                            </button>
                            {altOpen && (
                              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4 }}>
                                {cat.altItems.map((p, i) => (
                                  <button key={`alt-${i}`} onClick={() => applyPreset(p)} style={{
                                    padding:"3px 8px", borderRadius:4, border:`1px solid ${t.bdr3}`,
                                    background: sameConfig(p.pedals, pedals) ? t.grnLt : t.card,
                                    cursor:"pointer", fontSize:11, lineHeight:"18px", minHeight:24,
                                  }}>
                                    {p.chip}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>);
                        })()}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Responsive body: two columns on wide screens, single column on mobile */}
      <div style={{ display:"flex", flexDirection: wide ? "row" : "column", gap: wide ? 22 : 0, alignItems:"flex-start" }}>
      <div style={{ flex: wide ? "1 1 0" : "0 1 auto", minWidth:0, width: wide ? "auto" : "100%" }}>

      <div style={{ fontSize:12, lineHeight:"18px", color:t.text3, marginBottom:12, minHeight:18 }}>
        {presetMatches.length === 0
          ? "Custom pedal configuration"
          : <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <div ref={detRef} style={{
                flex:1, overflow:"hidden",
                ...(detExpand ? {} : { whiteSpace:"nowrap", textOverflow:"ellipsis" }),
              }}>
                Detected: <strong>{presetMatches.join(" · ")}</strong>
              </div>
              {(detOverflow || detExpand) && <button onClick={() => setDetExpand(x => !x)} style={{
                background:"none", border:"none", cursor:"pointer", padding:0,
                fontSize:11, color:t.text5, flexShrink:0,
              }}>{detExpand ? "▲" : "▼"}</button>}
            </div>}
      </div>
      {/* Pedal diagram */}
      <div style={{ background:t.card, border:`1px solid ${t.bdr}`, borderRadius:8, padding:"10px 12px", marginBottom:12, boxShadow:t.shadow }}>
        <div style={{ fontSize:11, color:t.text6, textAlign:"center", marginBottom:8, letterSpacing:1, textTransform:"uppercase" }}>
          Pedal configuration
        </div>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
          <div style={{ display:"flex", gap:14, paddingRight:16 }}>
            {["D","C","B"].map(L => <Pedal key={L} L={L} />)}
          </div>
          <div style={{ width:2, height:110, background:t.text6, marginTop:4, flexShrink:0 }}/>
          <div style={{ display:"flex", gap:14, paddingLeft:16 }}>
            {["E","F","G","A"].map(L => <Pedal key={L} L={L} />)}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:8 }}>
          <span style={{ fontSize:10, color:t.text7 }}>← left foot</span>
          <span style={{ fontSize:10, color:t.text7 }}>right foot →</span>
        </div>
      </div>

      {wide && playBlock}
      </div>{/* end config column */}
      <div style={{ flex: wide ? "1 1 0" : "0 1 auto", minWidth:0, width: wide ? "auto" : "100%" }}>

      {/* Mode controls */}
      <div style={{ background:t.card, border:`1px solid ${t.bdr}`, borderRadius:8, padding:14, marginBottom:12 }}>
        {mode !== "chord" && (
          <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, color:t.text2, cursor:"pointer", marginBottom:12 }}>
            <input type="checkbox" checked={rootSnap} onChange={e => setRootSnap(e.target.checked)} />
            Snap to root when pedalling into a known scale
          </label>
        )}
        {mode === "scale" && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
            <label style={{ fontSize:12, color:t.text3 }}>Start note:</label>
            <select
              value={scaleStart}
              onChange={e => setScaleStart(Number(e.target.value))}
              style={inputStyle}
            >
              {rng(scaleRange[0], scaleRange[1]).map(i => (
                <option key={i} value={i}>{noteLabel(i, pedals)}</option>
              ))}
            </select>
            <label style={{ fontSize:12, color:t.text3 }}>Range:</label>
            <select
              value={octaveCount}
              onChange={e => setOctaveCount(Number(e.target.value))}
              style={inputStyle}
            >
              {rng(1, maxOctaves).map(n => (
                <option key={n} value={n}>{n} octave{n > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "scale" && direction === "both" && (
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10, flexWrap:"wrap" }}>
            <label style={{ fontSize:12, color:t.text3 }}>Bounce:</label>
            <label style={{ display:"flex", gap:5, alignItems:"center", fontSize:12, color:t.text2, cursor:"pointer" }}>
              <input type="radio" name="bothStart" checked={bothStart === "up"}
                onChange={() => { setBothStart("up"); setScaleStart(v => Math.min(Math.max(v, RANGES.scaleAsc[0]), RANGES.scaleAsc[1])); stop(); }} />
              Up first ↑↓
            </label>
            <label style={{ display:"flex", gap:5, alignItems:"center", fontSize:12, color:t.text2, cursor:"pointer" }}>
              <input type="radio" name="bothStart" checked={bothStart === "down"}
                onChange={() => { setBothStart("down"); setScaleStart(v => Math.min(Math.max(v, RANGES.scaleDesc[0]), RANGES.scaleDesc[1])); stop(); }} />
              Down first ↓↑
            </label>
          </div>
        )}

        {mode === "scale" && direction === "both" && continuousRow()}

        {mode === "scale" && (
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", gap:4, justifyContent:"space-between" }}>
              {[0,1,2,3,4,5,6,7].map(d => {
                // Degree notes run upward from the start note when the pass
                // ascends, and downward (one octave below the start, up to the
                // start) when it descends — matching what the sequence builder
                // plays, so each button shows the note its toggle controls.
                const stringIdx = scaleDescLogic ? scaleStart - 7 + d : scaleStart + d;
                const s = STRINGS[Math.max(0, Math.min(stringIdx, STRINGS.length - 1))];
                const name = s ? `${s.letter}${accSymbol(pedals[s.letter])}` : "–";
                const degLabel = d === 7 ? "1*" : String(d + 1);
                const on = arpMask[d];
                return (
                  <button
                    key={d}
                    onClick={() => setArpMask(m => m.map((v, i) => i === d ? !v : v))}
                    style={{
                      flex:1, padding:"6px 2px", borderRadius:5, cursor:"pointer",
                      border:"1.5px solid " + (on ? t.grn : t.bdr),
                      background: on ? t.grnLt3 : t.card3,
                      display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                    }}
                  >
                    <span style={{ fontSize:13, fontWeight:600, lineHeight:1.4, color: on ? t.grnTx2 : t.text6 }}>{name}</span>
                    <span style={{ fontSize:10, color: on ? t.grnTx3 : t.bdrS }}>{degLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "scale" && techPicker("scaleTech", scaleTech, chooseScaleTech, TECH_OPTS)}

        {mode === "scale" && (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <label style={{ fontSize:12, color:t.text3, whiteSpace:"nowrap" }}>Speed:</label>
            <input type="range" min={1} max={scaleSpeedMax} step={1} value={scaleSpeed}
              onChange={e => setScaleSpeed(Number(e.target.value))} style={{ flex:1 }}/>
            <input type="text" inputMode="numeric" value={scaleSpeedField}
              onChange={e => setScaleSpeedField(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={commitScaleSpeed}
              onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
              style={{ ...inputStyle, width:46, textAlign:"center" }}/>
            <span style={{ fontSize:12, color:t.text3, whiteSpace:"nowrap" }}>notes/s</span>
          </div>
        )}

        {mode === "scale" && loopRow()}

        {mode === "gliss" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
              <label style={{ fontSize:12, color:t.text3 }}>From:</label>
              <select
                value={glissStart}
                onChange={e => {
                  const v = Number(e.target.value);
                  setGlissStart(v);
                  setGlissEnd(prev => {
                    if (direction === "desc") return prev >= v ? Math.max(v - 1, 0) : prev;
                    // both: end only needs to differ from start; nudge only on collision
                    if (direction === "both") return prev === v ? (v < 46 ? v + 1 : v - 1) : prev;
                    return prev <= v ? Math.min(v + 1, 46) : prev;
                  });
                }}
                style={inputStyle}
              >
                {rng(glissStartRange[0], glissStartRange[1]).map(i => (
                  <option key={i} value={i}>{noteLabel(i, pedals)}</option>
                ))}
              </select>
              <label style={{ fontSize:12, color:t.text3 }}>To:</label>
              <select
                value={glissEnd}
                onChange={e => setGlissEnd(Number(e.target.value))}
                style={inputStyle}
              >
                {glissEndOptions.map(i => (
                  <option key={i} value={i}>{noteLabel(i, pedals)}</option>
                ))}
              </select>
            </div>
            {techPicker("glissTech", glissTech, chooseGlissTech, GLISS_TECH_OPTS)}
            {direction === "both" && continuousRow()}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <label style={{ fontSize:12, color:t.text3, whiteSpace:"nowrap" }}>Speed:</label>
              <input type="range" min={1} max={40} step={1} value={speed}
                onChange={e => setSpeed(Number(e.target.value))} style={{ flex:1 }}/>
              <input type="text" inputMode="numeric" value={speedField}
                onChange={e => setSpeedField(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={commitSpeed}
                onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
                style={{ ...inputStyle, width:46, textAlign:"center" }}/>
              <span style={{ fontSize:12, color:t.text3, whiteSpace:"nowrap" }}>notes/s</span>
            </div>
            {loopRow()}
          </>
        )}

        {mode === "chord" && (
          <>
            {/* Chord | Live toggle. Chord = build a selection and use Play;
                Live = the grid itself is the instrument (tap to sound, with
                multi-touch). Switching either way stops playback and clears
                the live ring/flash state; chordSel survives untouched. */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
              <div style={{ display:"flex", border:`1.5px solid ${t.bdr2}`, borderRadius:6, overflow:"hidden" }}>
                <button onClick={() => setLive(false)} style={seg(!liveMode)}>{segLabel("Chord", !liveMode)}</button>
                <button onClick={() => setLive(true)} style={seg(liveMode)}>{segLabel("Live", liveMode)}</button>
              </div>
              <span style={{ fontSize:12, color:t.text5 }}>
                {liveMode ? "Click/tap the notes to play them" : "Select notes, then press Play"}
              </span>
            </div>

            {/* Octave legend: colour codes the octave number of each button below */}
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, color:t.text3 }}>Octave:</span>
              {[7,6,5,4,3,2,1,0].map(o => (
                <span key={o} style={{
                  fontSize:11, fontWeight:700, color:"white", background:OCT_COLORS[o],
                  borderRadius:4, padding:"1px 7px", lineHeight:"16px",
                }}>{o}</span>
              ))}
              <span style={{ fontSize:10.5, color:t.text7 }}>low → high</span>
            </div>

            {/* 47-string grid: bottom-left = 7C, rising left-to-right then upward.
                Top row (1C…0G) has 5 strings; spacers keep the columns aligned.
                Selected/greyed styling matches the Scale/Arpeggio degree toggles;
                the octave colour lives in the thin accent bar along the bottom
                edge (see legend above). Fixed height + flex centring keep the
                text steady when ♭/♯ appear. */}
            {/* Roomy viewports (both sub-modes, incl. compact desktop windows;
                phones excluded): grid and staff share one row —
                the 1fr columns simply narrow to make room, so no fixed button
                widths are needed and mobile (stacked) keeps its current sizing. */}
            <div style={{ display: roomy ? "flex" : "block", gap:12, alignItems:"flex-start" }}>
            {/* Grid + technique radios stack in one column so the
                radios always sit directly under the note grid, roomy or not. */}
            <div style={{ flex:"1 1 auto", minWidth:0 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, marginBottom:8 }}>
              {[6,5,4,3,2,1,0].flatMap(r => {
                const cells = rng(r * 7, Math.min(r * 7 + 6, 46)).map(i => {
                  const s = STRINGS[i];
                  // Live: selection styling is suppressed (chordSel persists
                  // silently in the background) and lit = a brief press flash.
                  const sel = !liveMode && chordSel.has(i);
                  const flash = liveMode && liveFlash.has(i);
                  const lit = sel || flash;
                  // Unselectable while the technique's limits (note cap /
                  // hand span) would be broken by adding this note, or when
                  // the string is outside the technique's playable range
                  // (harmonics 6E…2F, xylophonic 5A…0G) — the range gate
                  // applies in both Chord and Live.
                  // `disabled` is not enough on its own — some browsers (and
                  // multi-touch strums) still deliver pointerdown to disabled
                  // buttons — so the handler and liveStrike both re-check.
                  const [gLo, gHi] = techRange(chordTech);
                  const rangeOff = i < gLo || i > gHi;
                  const greyed = rangeOff || (!liveMode && !sel && !chordAddOK(chordSel, i));
                  const isNow = playing && currentIdx === i;
                  const oc = OCT_COLORS[s.oct];
                  // Longhand borders only: mixing the `border` shorthand with a
                  // `borderBottom` longhand makes React drop the accent bar when
                  // the shorthand changes on select/deselect.
                  const edge = `1.5px solid ${lit ? oc : t.bdr}`;
                  return (
                    <button key={i} disabled={greyed} title={noteLabel(i, pedals)}
                      // Live uses pointerdown so each finger in a multi-touch
                      // strum sounds its own string the instant it lands;
                      // Chord keeps plain click-to-toggle.
                      onClick={liveMode ? undefined : () => toggleChordNote(i)}
                      onPointerDown={liveMode ? (e) => {
                        // Touches report button 0; only filter true mouse
                        // secondary buttons so right-click doesn't pluck.
                        if (e.pointerType === "mouse" && e.button !== 0) return;
                        if (greyed) return;
                        liveStrike(i);
                      } : undefined}
                      style={{
                      height:24, padding:"0 1px", borderRadius:5,
                      cursor: greyed ? "default" : "pointer",
                      borderTop:edge, borderLeft:edge, borderRight:edge,
                      borderBottom:`3px solid ${oc}`,
                      background: lit ? oc : t.card3,
                      color: lit ? "white" : greyed ? t.text6 : t.text2,
                      fontSize:12, fontWeight: lit ? 700 : 400,
                      fontFamily:"inherit",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow: isNow ? `0 0 0 2px ${t.accent3}` : "none",
                      // Stops Android treating a strum across buttons as a
                      // scroll/zoom gesture; normal scrolling returns when
                      // Live is off.
                      touchAction: liveMode ? "none" : "auto",
                    }}>
                      <span style={{ fontSize:9, opacity: lit ? 0.85 : 0.5, marginRight:0.5 }}>{s.oct}</span>{s.letter}{accSymbol(pedals[s.letter])}
                    </button>
                  );
                });
                while (cells.length < 7) cells.push(<div key={`sp-${r}-${cells.length}`} />);
                return cells;
              })}
            </div>
            {/* Technique picker — shared by the Chord and Live sub-modes
                (limits, range gating, and playback all follow it). */}
            {techPicker("chordTech", chordTech, chooseChordTech, TECH_OPTS)}
            </div>
            {roomy && (
              <div style={{ flex:"0 0 auto" }}>
                <ChordStaff noteIdxs={[...(liveMode ? liveRing.keys() : chordSel)].sort((a, b) => a - b)} pedals={pedals} t={t} dark={darkMode} techs={liveMode ? liveRing : new Map([...chordSel].map(i => [i, chordTech]))} live={liveMode} />
              </div>
            )}
            </div>

            {/* Two columns: settings (left, flexible) and the live notation
                preview (right-aligned; wraps below on narrow screens). The
                staff only renders once at least one string is selected. */}
            {!(liveMode && roomy) && (
            <div style={{ display:"flex", gap:10, alignItems:"flex-start", flexWrap:"wrap" }}>
            {/* The whole chord-building column (count/Clear, limits, break
                chord, loop) is hidden in Live — none of it applies when the
                grid is the instrument. Only the staff remains. */}
            {!liveMode && <div style={{ flex:"1 1 170px", minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              {/* Fixed min-width + tabular digits so the Clear button never
                  shifts as the count (and singular/plural) changes. */}
              <span style={{ fontSize:12, color:t.text3, minWidth:98, fontVariantNumeric:"tabular-nums" }}>
                {chordSel.size} note{chordSel.size === 1 ? "" : "s"} selected
              </span>
              <button onClick={() => setChordSel(new Set())}
                style={{ ...btn(false), fontSize:11, padding:"3px 10px" }}>
                Clear
              </button>
            </div>

            {/* The hand-span group is always rendered and merely hidden when the
                8-note limit is off, so it reserves identical space in both states
                (including when it wraps to a second line on narrow screens) and
                the row height never changes. */}
            <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:10, minHeight:28 }}>
              <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, color:t.text2, cursor:"pointer" }}>
                Enforce:
                <input type="checkbox" checked={enforce8}
                  onChange={e => setEnforce8(e.target.checked)} />
                Note limit
              </label>
              {(
                <div style={{ display:"flex", gap:6, alignItems:"center", visibility: enforce8 ? "visible" : "hidden" }}>
                  <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:12, color:t.text2, cursor:"pointer" }}>
                    <input type="checkbox" checked={handSpanOn}
                      onChange={e => setHandSpanOn(e.target.checked)} />
                    Hand span limit:
                  </label>
                  <input type="text" inputMode="numeric" value={handSpanField}
                    disabled={!handSpanOn}
                    onChange={e => setHandSpanField(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={commitHandSpan}
                    onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
                    style={{ ...inputStyle, width:40, textAlign:"center", opacity: handSpanOn ? 1 : 0.5 }}/>
                </div>
              )}
            </div>

            {/* Harmonics and étouffé chords are always simultaneous, so the
                Break-chord option greys out under those techniques (the
                technique switch also unchecks it). */}
            <label style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, color:t.text2,
              cursor: TECH_LIMITS[chordTech].canBreak ? "pointer" : "default",
              opacity: TECH_LIMITS[chordTech].canBreak ? 1 : 0.5, marginBottom:10 }}>
              <input type="checkbox" checked={breakChord}
                disabled={!TECH_LIMITS[chordTech].canBreak}
                onChange={e => { setBreakChord(e.target.checked); stop(); }} />
              Break chord
            </label>

            {breakChord && direction === "both" && (
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10, flexWrap:"wrap" }}>
                <label style={{ fontSize:12, color:t.text3 }}>Bounce:</label>
                <label style={{ display:"flex", gap:5, alignItems:"center", fontSize:12, color:t.text2, cursor:"pointer" }}>
                  <input type="radio" name="chordBothStart" checked={bothStart === "up"}
                    onChange={() => { setBothStart("up"); stop(); }} />
                  Up first ↑↓
                </label>
                <label style={{ display:"flex", gap:5, alignItems:"center", fontSize:12, color:t.text2, cursor:"pointer" }}>
                  <input type="radio" name="chordBothStart" checked={bothStart === "down"}
                    onChange={() => { setBothStart("down"); stop(); }} />
                  Down first ↓↑
                </label>
              </div>
            )}

            {breakChord && direction === "both" && continuousRow()}

            {breakChord && (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
                <label style={{ fontSize:12, color:t.text3, whiteSpace:"nowrap" }}>Speed:</label>
                {/* minWidth:0 lets the slider shrink below its ~129px intrinsic
                    width; flex-basis keeps it usable. The count + unit wrap to
                    the next line when the staff leaves too little room. */}
                <input type="range" min={1} max={40} step={1} value={chordSpeed}
                  onChange={e => setChordSpeed(Number(e.target.value))} style={{ flex:"1 1 80px", minWidth:0 }}/>
                <span style={{ display:"inline-flex", alignItems:"center", gap:10 }}>
                  <input type="text" inputMode="numeric" value={chordSpeedField}
                    onChange={e => setChordSpeedField(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={commitChordSpeed}
                    onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
                    style={{ ...inputStyle, width:46, textAlign:"center" }}/>
                  <span style={{ fontSize:12, color:t.text3, whiteSpace:"nowrap" }}>notes/s</span>
                </span>
              </div>
            )}

            {loopRow()}
            </div>}
            {/* Always rendered (empty staves when nothing is selected) so the
                panel height and column widths never jump on first selection.
                Live feeds it the still-ringing strikes instead of the built
                chord: notes bleed on the staff for the Sostenuto length, each
                expiring independently. */}
            {!roomy && <div style={{ marginLeft:"auto", alignSelf:"flex-start" }}>
              <ChordStaff noteIdxs={[...(liveMode ? liveRing.keys() : chordSel)].sort((a, b) => a - b)} pedals={pedals} t={t} dark={darkMode} techs={liveMode ? liveRing : new Map([...chordSel].map(i => [i, chordTech]))} live={liveMode} />
            </div>}
            </div>
            )}
          </>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <label style={{ fontSize:12, color:t.text3 }}>A =</label>
          <input
            type="text"
            inputMode="numeric"
            value={tuningField}
            onChange={e => setTuningField(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commitTuning}
            onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
            style={{ ...inputStyle, width:64 }}
          />
          <span style={{ fontSize:12, color:t.text3 }}>Hz <span style={{ color:t.text7 }}>(430–450)</span></span>
        </div>
      </div>

      {/* Pretune warning */}
      {pretuneSelected && (
        <div style={{ background:t.ylw, border:`1px solid ${t.ylwBdr}`, borderRadius:6, padding:"8px 12px", marginBottom:12, fontSize:12, color:t.ylwTx }}>
          ⚠ <strong>7C and 7D</strong> are not connected to the pedal mechanism on a real harp; they must be pre-tuned by the harpist before performance (including to flat or sharp).
        </div>
      )}

      {/* Advanced settings — per-mode sound tuning. Each mode remembers its
          own Sostenuto and Max voices (see SOUND_DEFAULTS). Gliss measures
          Sostenuto in notes so the ring scales with speed; Scale/Arpeggio and
          Chord measure it in seconds (previously hard-coded at 3.4 s). */}
      <div style={{ marginBottom:12 }}>
        <button onClick={() => setShowTuner(s => !s)} style={{ ...btn(showTuner), fontSize:12 }}>
          <span style={{ gridArea:"1/1", visibility:"hidden", fontWeight:600 }}>🎛 Advanced settings ▲</span>
          <span style={{ gridArea:"1/1", fontWeight: showTuner ? 600 : 400 }}>
            {`🎛 Advanced settings ${showTuner ? "▲" : "▼"}`}
          </span>
        </button>
        {showTuner && (() => {
          const cur = soundSettings[mode];
          const isG = mode === "gliss";
          const mvMax = mode === "chord" ? 94 : 70;
          const modeName = mode === "gliss" ? "Glissando" : mode === "chord" ? "Chord / Live" : "Scale/Arpeggio";
          return (
            <div style={{ background:t.ylwLt, border:`1px solid ${t.ylwBdr3}`, borderRadius:6, padding:12, marginTop:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <label style={{ fontSize:12, color:t.text3, width:130, whiteSpace:"nowrap" }}>
                  Sostenuto: {isG ? `${cur.tail} notes` : `${cur.tail.toFixed(1)} s`}
                </label>
                <input type="range"
                  min={isG ? 1 : 0.5} max={isG ? 60 : 8} step={isG ? 1 : 0.1}
                  value={cur.tail}
                  onChange={e => setSound({ tail: Number(e.target.value) })} style={{ flex:1 }}/>
              </div>
              <div style={{ fontSize:10.5, color:t.text7, marginBottom:12 }}>
                {isG
                  ? "How long each string rings, in notes. Lower = drier and cleaner; higher = lusher wash, but more static (especially on chord-type glisses, which double more strings)."
                  : "How long each string rings after it's plucked, in seconds, regardless of playback speed."}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <label style={{ fontSize:12, color:t.text3, width:130, whiteSpace:"nowrap" }}>
                  Max voices: {cur.maxVoices}
                </label>
                <input type="range" min={4} max={mvMax} step={1} value={cur.maxVoices}
                  onChange={e => setSound({ maxVoices: Number(e.target.value) })} style={{ flex:1 }}/>
              </div>
              <div style={{ fontSize:10.5, color:t.text7, marginBottom:12 }}>
                {mode === "chord"
                  ? "Ceiling on how many strings ring at once. 47 covers every string on the harp, so even a full-board chord is never cut short."
                  : "Ceiling on how many strings ring at once. Lower it to tame static without shortening the ring."}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:8, borderTop:`1px solid ${t.ylwDiv}` }}>
                <span style={{ fontSize:11, color:t.ylwTx4 }}>
                  {isG
                    ? <>At {speed} notes/s, each voice rings ≈ {(cur.tail / speed).toFixed(2)}s.</>
                    : <>Defaults for this mode: {SOUND_DEFAULTS[mode].tail.toFixed(1)} s / {SOUND_DEFAULTS[mode].maxVoices} voices.</>}
                </span>
                <button
                  onClick={() => setSound({ ...SOUND_DEFAULTS[mode] })}
                  style={{ ...btn(false), fontSize:11, padding:"3px 10px" }}
                >
                  Reset these
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Play + status render here in compact view (below the mode panel);
          on wide screens the block moves under the pedal card instead. */}
      {!wide && playBlock}

      </div>{/* end playback column */}
      </div>{/* end responsive body */}

      {/* Attribution */}
      <div style={{ marginTop:20, paddingTop:14, borderTop:`1px solid ${t.bdr3}`, textAlign:"center", fontSize:11, color:t.text7, lineHeight:1.7 }}>
        Design by <a href="https://github.com/harpbelle/glissie" target="_blank" rel="noopener noreferrer"
          style={{ color:t.link, textDecoration:"none" }}>Yijun Lin</a>. Vibe coded with{' '}
		<a href="https://claude.ai" target="_blank" rel="noopener noreferrer"
          	style={{ color:t.link, textDecoration:"none" }}>Claude.ai</a>.
      </div>
    </div>
  );
}
