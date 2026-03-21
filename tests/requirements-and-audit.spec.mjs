import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relPath) =>
  fs.readFileSync(path.join(root, relPath), "utf8");

const indexHtml = read("index.html");
const appJs = read("app.js");
const graphsJs = read("graphs.js");

test("login form supports username/email and password inputs", () => {
  assert.match(indexHtml, /id=\"identifier\"/);
  assert.match(indexHtml, /id=\"password\"/);
  assert.match(indexHtml, /autocomplete=\"username\"/);
  assert.match(indexHtml, /autocomplete=\"current-password\"/);
});

test("dashboard contains three required data sections", () => {
  assert.match(indexHtml, /id=\"section-user\"/);
  assert.match(indexHtml, /id=\"section-xp\"/);
  assert.match(indexHtml, /id=\"section-audit\"/);
});

test("statistics section exists and includes at least two graph containers", () => {
  assert.match(indexHtml, /id=\"section-graphs\"/);

  const graphContainerMatches = indexHtml.match(/id=\"(xp-line-chart|project-bar-chart|audit-donut-chart|passfail-pie-chart)\"/g) ?? [];
  assert.ok(graphContainerMatches.length >= 2, "Expected at least two graph containers");
});

test("graph rendering uses native SVG API", () => {
  assert.match(graphsJs, /document\.createElementNS\(/);
  assert.match(graphsJs, /SVG_NS\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/);
  assert.match(graphsJs, /renderXPLineChart/);
  assert.match(graphsJs, /renderProjectBarChart/);
});

test("XP by Project graph uses dynamic container-based row layout", () => {
  assert.match(graphsJs, /computeProjectBarLayout/);
  assert.match(graphsJs, /container\.clientHeight/);
  assert.doesNotMatch(graphsJs, /\.slice\(0,\s*15\)/);
});

test("logout flow exists and clears auth token", () => {
  assert.match(appJs, /logoutBtn\?\.addEventListener\(\"click\"/);
  assert.match(appJs, /clearToken\(\)/);
});
