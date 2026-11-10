// Draft a timeline from the source itself: mark key sentences in reading order,
// highlight them one after another, pan the stage camera to section leads,
// and count up headline numbers. Deterministic: same model in, same cues out.

const STEP = 2.4;
const HOLD = 2.2;
const MAX_ABSTRACT = 4;
const MAX_LEADS = 5;

// Sentences that would collide with inline markup are left unmarked.
const SAFE = /^[^[\]|`*~]{40,240}$/;

function sentences(text) {
  return String(text).split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/).map(s => s.trim()).filter(Boolean);
}

function pick(text, limit) {
  return sentences(text).filter(s => SAFE.test(s)).slice(0, limit);
}

function wrap(text, sentence, id) {
  return text.replace(sentence, () => `[[mark:${id}|${sentence}]]`);
}

/**
 * Return a copy of the model with marks, block ids, and a timeline.
 * A model that already has a timeline is returned unchanged.
 */
export function draftCues(model) {
  if (model.timeline) return model;
  const next = structuredClone(model);
  const cues = [];
  let at = 0.6;
  let n = 0;
  const usedIds = new Set(next.blocks.map(block => block.id).filter(Boolean));
  const blockId = (block, prefix) => {
    if (block.id) return block.id;
    let i = 1;
    while (usedIds.has(`${prefix}-${i}`)) i++;
    block.id = `${prefix}-${i}`;
    usedIds.add(block.id);
    return block.id;
  };

  if (next.meta.abstract) {
    for (const sentence of pick(next.meta.abstract, MAX_ABSTRACT)) {
      const id = `s${++n}`;
      next.meta.abstract = wrap(next.meta.abstract, sentence, id);
      cues.push({ at, dur: HOLD, do: 'highlight', target: `mark:${id}` });
      at += STEP;
    }
  }

  let leads = 0;
  let afterHeading = false;
  let moved = false;
  for (const block of next.blocks) {
    if (block.type === 'heading' && (block.level || 2) === 2) { afterHeading = true; continue; }
    if (block.type === 'stats') {
      cues.push({ at, dur: 1.6, do: 'count', target: blockId(block, 'stats') });
      at += 1;
      continue;
    }
    if (!afterHeading || block.type !== 'prose' || leads >= MAX_LEADS) continue;
    afterHeading = false;
    const [sentence] = pick(block.markdown, 1);
    if (!sentence) continue;
    const id = `s${++n}`;
    block.markdown = wrap(block.markdown, sentence, id);
    cues.push({ at, dur: 1.4, do: 'camera', target: blockId(block, 'lead') });
    cues.push({ at: at + 0.5, dur: HOLD, do: 'highlight', target: `mark:${id}` });
    at += STEP + 0.6;
    leads++;
    moved = true;
  }
  if (moved) cues.push({ at, dur: 1.6, do: 'camera', target: 'page' });

  if (!cues.length) return model;
  next.timeline = { cues };
  return next;
}
