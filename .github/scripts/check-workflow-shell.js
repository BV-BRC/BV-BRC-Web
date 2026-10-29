#!/usr/bin/env node
/**
 * Parse-check the shell in every workflow `run:` block.
 *
 * The release and hotfix workflows are dispatched by hand, a few times a year,
 * and nothing runs them on a pull request. A shell syntax error in one of them
 * is therefore invisible until the day someone needs it -- which is the worst
 * possible day to find out.
 *
 * That is not hypothetical. The hotfix workflow's version-compute step embeds a
 * node script as a single-quoted shell word:
 *
 *     VERSION=$(node -e '
 *       ...
 *       console.error("... alpha's next release ...");   // <-- closes the quote
 *     ' "$MASTER_VERSION")
 *
 * The apostrophe in "alpha's" ended the single-quoted string, and bash failed at
 * parse time with "syntax error near unexpected token `('". The step could never
 * have run, under any input. It shipped because the rewrite was reviewed as a
 * diff and never dispatched.
 *
 * `bash -n` catches exactly this class of bug without executing anything.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'workflows');

/**
 * Pull the `run:` block scalars out of a workflow file.
 *
 * Deliberately a line scanner rather than a YAML parse: this script runs before
 * `npm ci` in CI, so it cannot depend on a YAML library, and GitHub's own
 * `run:` blocks are always literal block scalars.
 */
function extractRunBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (current) {
      const indent = line.match(/^\s*/)[0].length;
      // A blank line inside a block scalar stays in the block.
      if (line.trim() === '' || indent > current.indent) {
        current.body.push(line.slice(Math.min(indent, current.indent + 2)));
        continue;
      }
      blocks.push(current);
      current = null;
    }

    const m = line.match(/^(\s*)-?\s*run:\s*\|[-+]?\s*$/);
    if (m) {
      current = { indent: m[1].length, body: [], line: lines.indexOf(line) + 1 };
    }
  }
  if (current) blocks.push(current);

  return blocks;
}

let failures = 0;

for (const file of fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
  const full = path.join(dir, file);
  const blocks = extractRunBlocks(fs.readFileSync(full, 'utf8'));

  blocks.forEach((block, i) => {
    let script = block.body.join('\n');

    // ${{ }} expressions are substituted by Actions before bash sees the script.
    // Replace them with a harmless literal so the check does not trip over the
    // syntax of the expression language itself.
    script = script.replace(/\$\{\{[^}]*\}\}/g, 'ACTIONS_EXPR');

    try {
      execFileSync('bash', ['-n'], { input: script, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      failures++;
      const where = `${file} (run block #${i + 1}, near line ${block.line})`;
      console.error(`\n✗ shell syntax error in ${where}:`);
      console.error(String(err.stderr).trim().replace(/^/gm, '    '));
    }
  });
}

if (failures) {
  console.error(`\n${failures} workflow run block(s) failed \`bash -n\`.`);
  process.exit(1);
}

console.log('All workflow run blocks parse as valid bash.');
