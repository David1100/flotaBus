const fs = require('fs');
const cp = require('child_process');

const NEEDED = `active-toggle admin-modal-card bus-grid bus-model bus-photo-avatar bus-visual-stage
buses-card buses-hero buses-page card-arrow driver-code drivers-hero drivers-page error error-state
field-help fleet-card form-actions form-grid full invalid-badge is-closing is-complete is-dragging
is-open is-visible maintenance-card maintenance-grid maintenance-hero maintenance-page maintenance-panel
maintenance-panel-heading mobile-brand modal-bus modal-form-scroll modal-heading modal-subtitle
model-fallback model-fallback-copy model-fallback-mark readonly-field readonly-help remove-leg
search-field skip-link sr-only state switch-copy switch-input switch-label switch-thumb switch-track
system-icon toolbar topbar-status trip-step trip-step-panel unit-badge`.split(/\s+/).filter(Boolean);
const needSet = new Set(NEEDED);

// Parse CSS into top-level statements (handles one-line minified rules too).
function parseTop(css) {
  const out = [];
  let i = 0, start = 0, depth = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        while (end < css.length && /[\s;]/.test(css[end])) {
          if (css[end] === ';') { end++; break; }
          end++;
        }
        out.push(css.slice(start, end).trim());
        start = end;
      }
    }
    i++;
  }
  const rest = css.slice(start).trim();
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

function selectorsOf(rule) {
  const brace = rule.indexOf('{');
  const head = brace < 0 ? rule : rule.slice(0, brace);
  return head.replace(/@media[^{]*/, ' ').split(',').map(s => s.trim()).filter(Boolean);
}

function blockTouches(block) {
  // Any class-like token in the block that belongs to the needed set?
  for (const m of block.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
    if (needSet.has(m[1])) return true;
  }
  return false;
}

function ruleTouches(rule) {
  const sel = selectorsOf(rule).join(' ');
  for (const m of sel.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
    if (needSet.has(m[1])) return true;
  }
  // Ancestor/descendant references such as ".card-actions .link-button" keep the whole rule.
  return false;
}

const head = cp.execSync('git show HEAD:frontend/src/styles/global.css', { encoding: 'utf8' });
const kept = [];

for (const stmt of parseTop(head)) {
  if (/^@media|^@supports/.test(stmt)) {
    const inner = stmt.slice(stmt.indexOf('{') + 1, stmt.lastIndexOf('}'));
    const keptInner = parseTop(inner).filter(blockTouches);
    if (keptInner.length) {
      const prelude = stmt.slice(0, stmt.indexOf('{') + 1);
      kept.push(prelude + '\n  ' + keptInner.join('\n  ') + '\n}');
    }
  } else if (!stmt.startsWith('@') && ruleTouches(stmt)) {
    kept.push(stmt);
  }
}

// Keep the shell section already present in the current file; only append restored rules.
const current = fs.readFileSync('frontend/src/styles/global.css', 'utf8');
const marker = '/* === Reglas restauradas';
if (current.includes(marker)) throw new Error('already restored; refusing to duplicate');
const section = '\n\n/* === Reglas restauradas: clases que seguian en uso (markup o scripts). === */\n' + kept.join('\n') + '\n';
fs.writeFileSync('frontend/src/styles/global.css', current.replace(/\s*$/, '') + section);
console.log('restored blocks:', kept.length, 'lines now:', fs.readFileSync('frontend/src/styles/global.css', 'utf8').split('\n').length);
