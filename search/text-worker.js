/* Keep dataset parsing and filtering off the main browser thread. */
'use strict';
importScripts('text-engine.js');
let rows = [], matches = [], query = null;
async function load() {
  if (!self.DecompressionStream) throw new Error('Please use a current browser to load the scripture data.');
  const response = await fetch('../assets/data/scriptures.json.gz');
  if (!response.ok) throw new Error('Scripture data could not be loaded. Please try again.');
  const payload = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  if (!Array.isArray(payload.columns) || !Array.isArray(payload.rows) || !payload.columns.includes('text')) throw new Error('Scripture data has an unexpected format.');
  rows = payload.rows.map(values => Object.fromEntries(payload.columns.map((key,i) => [key, values[i]])));
  const choices = {};
  for (const field of ['overall_book', 'book', 'book_chapter']) choices[field] = [...new Set(rows.map(row => row[field]))];
  postMessage({ type: 'ready', count: rows.length, fields: payload.columns, choices });
}
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') { await load(); return; }
    if (data.type === 'search') {
      query = ScriptureTextEngine.compileQuery(data.rules, data.mode, data.matchCase);
      matches = [];
      rows.forEach((row, index) => { if (query(row).match) matches.push(index); });
    }
    if (data.type === 'search' || data.type === 'page') {
      const size = [25,50,100].includes(data.size) ? data.size : 25;
      const pages = Math.max(1, Math.ceil(matches.length / size));
      const page = Math.max(0, Math.min(pages - 1, Number(data.page) || 0));
      const items = matches.slice(page*size, (page+1)*size).map(index => {
        const row = rows[index], result = query(row);
        return { reference: row.scripture, parts: ScriptureTextEngine.snippet(row.text, result.spans), preview: !result.spans.length };
      });
      postMessage({ type: 'results', id: data.id, total: matches.length, page, pages, size, items });
    }
  } catch (error) {
    postMessage({ type: 'error', id: data.id, message: error.message });
  }
};
