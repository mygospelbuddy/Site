/* Shared by the search worker and Node tests. No DOM or third-party dependencies. */
(function (root) {
  'use strict';
  const fields = {
    text: 'Verse text', overall_book: 'Standard work', book: 'Book',
    chapter: 'Chapter', verse: 'Verse', scripture: 'Reference',
    book_chapter: 'Book and chapter', verse_id: 'Verse ID',
    book_sub_order: 'Book order within standard work', book_order: 'Book order',
    chapter_order: 'Chapter order'
  };
  const numeric = new Set(['chapter', 'verse', 'verse_id', 'book_sub_order', 'book_order', 'chapter_order']);
  const textOps = {
    contains: 'Contains phrase', notContains: 'Does not contain phrase',
    starts: 'Begins with', ends: 'Ends with', equals: 'Equals', notEquals: 'Does not equal',
    allWords: 'Contains all words', anyWords: 'Contains any word',
    whole: 'Contains whole word or phrase', wildcard: 'Matches wildcard words',
    empty: 'Is empty', notEmpty: 'Is not empty'
  };
  const numberOps = {
    equals: 'Equals', notEquals: 'Does not equal', gt: 'Greater than',
    gte: 'At least', lt: 'Less than', lte: 'At most', between: 'Between (inclusive)'
  };
  const normalize = value => String(value == null ? '' : value).replace(/\s/g, ' ');
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function literalSpans(text, query, matchCase, whole) {
    const prefix = whole ? '(^|[^\\p{L}\\p{N}_])' : '';
    const suffix = whole ? '(?=$|[^\\p{L}\\p{N}_])' : '';
    const re = new RegExp(prefix + escape(query) + suffix, 'gu' + (matchCase ? '' : 'i'));
    return Array.from(text.matchAll(re), m => [m.index + (whole ? m[1].length : 0), m.index + m[0].length]);
  }
  // Greedy glob matcher: * and ? stay within one word. User input is never a regex.
  function globWord(word, pattern) {
    let i = 0, j = 0, star = -1, retry = 0;
    while (i < word.length) {
      if (pattern[j] === '?' || pattern[j] === word[i]) { i++; j++; }
      else if (pattern[j] === '*') { star = j++; retry = i; }
      else if (star !== -1) { j = star + 1; i = ++retry; }
      else return false;
    }
    while (pattern[j] === '*') j++;
    return j === pattern.length;
  }
  function wildcardSpans(text, query, matchCase) {
    const words = Array.from(text.matchAll(/\S+/g));
    const patterns = (matchCase ? query : query.toLowerCase()).split(/ +/);
    const spans = [];
    for (let i = 0; i <= words.length - patterns.length; i++) {
      if (patterns.every((p, j) => globWord(matchCase ? words[i+j][0] : words[i+j][0].toLowerCase(), p))) {
        const last = words[i + patterns.length - 1];
        spans.push([words[i].index, last.index + last[0].length]);
      }
    }
    return spans;
  }
  function compile(rule, matchCase) {
    if (!Object.hasOwn(fields, rule.field)) throw new Error('Choose a valid search field.');
    const ops = numeric.has(rule.field) ? numberOps : textOps;
    if (!Object.hasOwn(ops, rule.op)) throw new Error('Choose a valid search option.');
    const query = normalize(rule.value).trim();
    if (!['empty', 'notEmpty'].includes(rule.op) && !query) throw new Error('Enter a value for every filter, or remove unused filters.');
    if (query.length > 250) throw new Error('Keep each filter under 251 characters.');
    if (numeric.has(rule.field)) {
      if (!/^\d+$/.test(query)) throw new Error('Numeric filters need a non-negative whole number.');
      const a = Number(query), b = Number(rule.to);
      if (rule.op === 'between' && (!/^\d+$/.test(String(rule.to)) || b < a)) throw new Error('Enter an upper bound at least as large as the lower bound.');
      return { ...rule, test(value) {
        if (value == null || value === '') return { match: false, spans: [] };
        const n = Number(value);
        const match = { equals: n === a, notEquals: n !== a, gt: n > a, gte: n >= a, lt: n < a, lte: n <= a, between: n >= a && n <= b }[rule.op];
        return { match, spans: [] };
      }};
    }
    if (rule.op === 'wildcard' && !/[^*? ]/.test(query)) throw new Error('Include a word or letter in a wildcard filter, such as lov*.');
    return { ...rule, test(value) {
      const text = normalize(value);
      const hay = matchCase ? text : text.toLowerCase();
      const needle = matchCase ? query : query.toLowerCase();
      let spans = [], match = false;
      switch (rule.op) {
        case 'empty': match = text.trim() === ''; break;
        case 'notEmpty': match = text.trim() !== ''; break;
        case 'starts': match = hay.startsWith(needle); if (match) spans = [[0, query.length]]; break;
        case 'ends': match = hay.endsWith(needle); if (match) spans = [[text.length - query.length, text.length]]; break;
        case 'equals': match = hay === needle; if (match) spans = [[0, text.length]]; break;
        case 'notEquals': match = hay !== needle; break;
        case 'notContains': match = !hay.includes(needle); break;
        case 'wildcard': spans = wildcardSpans(text, query, matchCase); match = spans.length > 0; break;
        case 'allWords':
        case 'anyWords': {
          const groups = query.split(/ +/).map(word => literalSpans(text, word, matchCase, true));
          match = rule.op === 'allWords' ? groups.every(g => g.length) : groups.some(g => g.length);
          if (match) spans = groups.flat();
          break;
        }
        default: spans = literalSpans(text, query, matchCase, rule.op === 'whole'); match = spans.length > 0;
      }
      return { match, spans: rule.field === 'text' ? spans : [] };
    }};
  }
  function compileQuery(rules, mode, matchCase) {
    if (!Array.isArray(rules) || !rules.length || rules.length > 20) throw new Error('Use between 1 and 20 filters.');
    if (!['all', 'any'].includes(mode)) throw new Error('Choose AND or OR.');
    const compiled = rules.map(r => compile(r, matchCase));
    return row => {
      const checks = compiled.map(rule => rule.test(row[rule.field]));
      const match = mode === 'all' ? checks.every(x => x.match) : checks.some(x => x.match);
      return { match, spans: match ? checks.filter(x => x.match).flatMap(x => x.spans) : [] };
    };
  }
  function merge(ranges) {
    const merged = [];
    for (const range of ranges.slice().sort((a,b) => a[0]-b[0])) {
      const last = merged[merged.length - 1];
      if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
      else merged.push(range.slice());
    }
    return merged;
  }
  // Return plain text segments; only the UI creates <mark> nodes, never HTML strings.
  function snippet(value, spans) {
    const text = normalize(value), hits = merge(spans);
    let budget = 240;
    const windows = merge(hits.length ? hits.slice(0,3).map(([a,b]) => [Math.max(0,a-45), Math.min(text.length,Math.min(b,a+80)+45)]) : [[0, Math.min(140,text.length)]])
      .map(([start,end]) => { const stop = Math.min(end,start+budget); budget -= stop-start; return [start,stop]; })
      .filter(([start,end]) => end > start);
    const parts = [];
    let previousEnd = 0;
    windows.forEach(([start,end], index) => {
      if (start > previousEnd || index) parts.push({ text: '…', mark: false });
      let cursor = start;
      for (const [a,b] of hits) {
        if (b <= start || a >= end) continue;
        if (a > cursor) parts.push({ text: text.slice(cursor,a), mark: false });
        parts.push({ text: text.slice(Math.max(cursor,a),Math.min(end,b)), mark: true });
        cursor = Math.min(end,b);
      }
      if (cursor < end) parts.push({ text: text.slice(cursor,end), mark: false });
      previousEnd = end;
    });
    if (previousEnd < text.length) parts.push({ text: '…', mark: false });
    return parts;
  }
  const api = { fields, numeric, textOps, numberOps, normalize, compileQuery, snippet, globWord };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ScriptureTextEngine = api;
})(typeof self !== 'undefined' ? self : globalThis);
