const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const recommendedTargets = [
  'client/src/components/AIButton/AIButton.tsx',
  'client/src/components/NoteEditor/NoteEditor.tsx',
  'client/src/components/ConfirmDialog/ConfirmDialog.tsx',
  'client/src/components/Toast/Toast.tsx',
];

const results = [];

for (const rel of recommendedTargets) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    results.push({ file: rel, applied: false, notes: ['file not found'] });
    continue;
  }

  let src = fs.readFileSync(abs, 'utf8');
  const notes = [];
  let changed = false;

  // ensure styles import exists (simple check)
  const cssImportRegex = /import\s+\w+\s+from\s+['"].*\.module\.css['"]/;
  if (!cssImportRegex.test(src)) {
    const moduleCssName = './' + path.basename(abs, path.extname(abs)) + '.module.css';
    src = `import styles from '${moduleCssName}';\n` + src;
    notes.push('Inserted styles import ' + moduleCssName);
    changed = true;
  }

  // replace literal className="a b" occurrences (conservative)
  const classLiteralRegex = /className\s*=\s*\"([^\"]+)\"/g;
  let m;
  const replacements = [];
  while ((m = classLiteralRegex.exec(src)) !== null) {
    const full = m[0];
    const lit = m[1];
    // skip if contains { or } (shouldn't) or dynamic markers
    if (lit.includes('{') || lit.includes('}')) continue;
    const classes = lit.split(/\s+/).filter(Boolean);
    const expr = `{[${classes.map(c => `styles.${c}`).join(', ')}].filter(Boolean).join(' ')}`;
    replacements.push({ from: full, to: `className=${expr}` });
  }

  if (replacements.length) {
    for (const r of replacements) {
      src = src.replace(r.from, r.to);
    }
    notes.push('Replaced ' + replacements.length + ' literal className(s)');
    changed = true;
  }

  // handle template-literal mixed cases: className={`...`} where content mixes `${styles.x}` and literal tokens
  const templateRegex = /className\s*=\s*{\s*`([^`]*)`\s*}/g;
  const tplReplacements = [];
  while ((m = templateRegex.exec(src)) !== null) {
    const full = m[0];
    const inner = m[1];
    // skip if contains arbitrary ${} other than styles
    const dollarMatches = Array.from(inner.matchAll(/\$\{([^}]*)\}/g)).map(x => x[1]);
    const nonStylesDollars = dollarMatches.filter(d => !d.trim().startsWith('styles.'));
    if (nonStylesDollars.length > 0) {
      notes.push('Skipped complex template expression with non-styles interpolation');
      continue;
    }

    // find literal tokens (words with letters, numbers, dash or underscore) outside ${}
    // replace them with ${styles.<camelCase(token)>}
    const parts = [];
    let lastIndex = 0;
    const tokensRegex = /\$\{[^}]*\}|[^\s]+/g;
    let anyChange = false;
    let tokenMatch;
    while ((tokenMatch = tokensRegex.exec(inner)) !== null) {
      const token = tokenMatch[0];
      if (token.startsWith('${')) {
        parts.push(token);
      } else {
        // token is literal like 'primary' or 'ai-stream-content'
        // convert kebab-case to camelCase for module key
        const key = token.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        parts.push(`\${'{'}styles.${key}\}`);
        anyChange = true;
      }
    }

    if (anyChange) {
      const newInner = parts.join(' ');
      const newFull = `className={\`${newInner}\`}`;
      tplReplacements.push({ from: full, to: newFull });
    }
  }

  if (tplReplacements.length) {
    for (const r of tplReplacements) src = src.replace(r.from, r.to);
    notes.push('Rewrote ' + tplReplacements.length + ' template-literal className(s) to use module refs');
    changed = true;
  }

  if (changed) {
    const previewPath = abs + '.preview.jsx';
    fs.writeFileSync(previewPath, src, 'utf8');
    results.push({ file: rel, applied: false, notes });
  } else {
    results.push({ file: rel, applied: false, notes: notes.length ? notes : ['no changes needed'] });
  }
}

fs.writeFileSync(path.join(ROOT, 'migration-report.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('done');
