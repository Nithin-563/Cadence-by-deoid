/**
 * Lightweight sanity check for supabase/schema.sql.
 *
 * Postgres has no offline parser we can call from here, so this catches the
 * class of mistake that actually bit us: unbalanced parentheses/brackets, an
 * unterminated dollar-quoted string, and stray semicolons inside a body.
 *
 * Run with: node scripts/check-sql.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, "..", "supabase", "schema.sql");
const source = readFileSync(path, "utf8");

const problems = [];

/* --- strip comments and string literals, keeping offsets stable --- */
let stripped = "";
let i = 0;
let line = 1;

const depth = { paren: 0, bracket: 0 };
const stack = [];

const bump = (text) => {
  for (const ch of text) if (ch === "\n") line += 1;
};

while (i < source.length) {
  const ch = source[i];
  const next = source[i + 1];

  // Line comment
  if (ch === "-" && next === "-") {
    const end = source.indexOf("\n", i);
    const stop = end === -1 ? source.length : end;
    stripped += " ".repeat(stop - i);
    i = stop;
    continue;
  }

  // Block comment (Postgres allows nesting)
  if (ch === "/" && next === "*") {
    let level = 1;
    let j = i + 2;
    const startLine = line;
    while (j < source.length && level > 0) {
      if (source[j] === "/" && source[j + 1] === "*") {
        level += 1;
        j += 2;
      } else if (source[j] === "*" && source[j + 1] === "/") {
        level -= 1;
        j += 2;
      } else {
        if (source[j] === "\n") {
          line += 1;
          stripped += "\n";
        } else {
          stripped += " ";
        }
        j += 1;
      }
    }
    if (level > 0) problems.push(`unterminated block comment starting near line ${startLine}`);
    i = j;
    continue;
  }

  // Dollar-quoted string
  if (ch === "$") {
    const tag = /^\$[A-Za-z0-9_]*\$/.exec(source.slice(i));
    if (tag) {
      const terminator = tag[0];
      const end = source.indexOf(terminator, i + terminator.length);
      if (end === -1) {
        problems.push(`unterminated ${terminator} string starting line ${line}`);
        break;
      }
      const body = source.slice(i, end + terminator.length);
      stripped += body.replace(/[^\n]/g, " ");
      bump(body);
      i = end + terminator.length;
      continue;
    }
  }

  // Single-quoted string ('' escapes a quote)
  if (ch === "'") {
    let j = i + 1;
    while (j < source.length) {
      if (source[j] === "'" && source[j + 1] === "'") {
        j += 2;
        continue;
      }
      if (source[j] === "'") break;
      if (source[j] === "\n") line += 1;
      j += 1;
    }
    if (j >= source.length) {
      problems.push(`unterminated string starting near line ${line}`);
      break;
    }
    const body = source.slice(i, j + 1);
    stripped += body.replace(/[^\n]/g, " ");
    bump(body);
    i = j + 1;
    continue;
  }

  if (ch === "(") {
    depth.paren += 1;
    stack.push({ ch, line });
  } else if (ch === ")") {
    depth.paren -= 1;
    if (depth.paren < 0) {
      problems.push(`unbalanced ')' at line ${line}`);
      depth.paren = 0;
    } else {
      stack.pop();
    }
  } else if (ch === "[") {
    depth.bracket += 1;
    stack.push({ ch, line });
  } else if (ch === "]") {
    depth.bracket -= 1;
    if (depth.bracket < 0) {
      problems.push(`unbalanced ']' at line ${line}`);
      depth.bracket = 0;
    } else {
      stack.pop();
    }
  }

  stripped += ch;
  if (ch === "\n") line += 1;
  i += 1;
}

if (depth.paren !== 0 || depth.bracket !== 0) {
  const unclosed = stack[stack.length - 1];
  problems.push(
    `unclosed '${unclosed?.ch ?? "?"}' opened at line ${unclosed?.line ?? "?"} ` +
      `(${depth.paren} paren, ${depth.bracket} bracket unclosed)`,
  );
}

/* --- a values (...) list with a stray ')' usually looks like this --- */
const badRowEnd = /\)\s*\)\s*(on\s+conflict|;)/gi;
let match;
while ((match = badRowEnd.exec(stripped)) !== null) {
  const at = source.slice(0, match.index).split("\n").length;
  problems.push(`possible stray ')' before "${match[1]}" at line ${at}`);
}

if (problems.length > 0) {
  console.error("supabase/schema.sql looks malformed:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const statements = stripped.split(";").length - 1;
console.log(`schema.sql looks structurally OK (${statements} statements, balanced parens).`);
