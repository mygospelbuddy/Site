const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const vm = require('node:vm');
const path = require('node:path');
const E = require('../search/text-engine.js');
const rule = (value, op = 'contains', field = 'text', to) => ({ field, op, value, to });
const run = (row, rules, mode = 'all', matchCase = false) => E.compileQuery(rules,mode,matchCase)(row);

test('phrases normalize dataset non-breaking spaces and return exact highlight ranges', () => {
  const row = { text: 'For God so\u00a0loved the world, that he gave his only begotten Son.' };
  const result = run(row,[rule('loved the world')]);
  assert.equal(result.match,true);
  const excerpt = E.snippet(row.text,result.spans);
  assert.equal(excerpt.filter(p => p.mark).map(p => p.text).join(''),'loved the world');
  assert.equal(run(row,[rule('LOVED THE WORLD')]).match,true);
  assert.equal(run(row,[rule('LOVED THE WORLD')],'all',true).match,false);
});
test('AND, OR, exclusions, field filters and inclusive numeric ranges compose', () => {
  const row = { text: 'Faith and hope', book: 'John', chapter: 3 };
  assert.equal(run(row,[rule('faith'),rule('John','equals','book'),rule('2','between','chapter','3')]).match,true);
  assert.equal(run(row,[rule('faith'),rule('hope','notContains')]).match,false);
  assert.equal(run(row,[rule('charity'),rule('hope')],'any').match,true);
  assert.equal(run(row,[rule('John','equals','book')]).spans.length,0);
  assert.equal(run(row,[rule('faith','notEquals')]).match,true);
  assert.equal(run(row,[rule('3','gt','chapter')]).match,false);
});
test('whole words, all words, starts, ends, wildcard and literal metacharacters', () => {
  const row = { text: 'Faithful people love the Lord; faith grows.' };
  assert.equal(run(row,[rule('faith','whole')]).spans.length,1);
  assert.equal(run(row,[rule('faith love','allWords')]).match,true);
  assert.equal(run(row,[rule('faithful charity','allWords')]).match,false);
  assert.equal(run(row,[rule('charity love','anyWords')]).match,true);
  assert.equal(run(row,[rule('Faithful','starts')]).match,true);
  assert.equal(run(row,[rule('grows.','ends')]).match,true);
  assert.equal(run(row,[rule('lov*','wildcard')]).match,true);
  assert.equal(run(row,[rule('fai?h','wildcard')]).spans.length,1);
  assert.equal(run({text:'[faith] (hope) *'},[rule('[faith] (hope) *')]).match,true);
  assert.equal(E.globWord('aaaaab','*a*a*c'),false);
});
test('invalid filters are rejected before searching and excerpts remain plain data', () => {
  for (const rules of [[],[rule('')],[rule('x','gt','chapter')],[rule('5','between','chapter','2')],[rule('***','wildcard')],[rule('x','contains','bogus')]]) {
    assert.throws(() => E.compileQuery(rules,'all',false));
  }
  const text = '<img src=x onerror=alert(1)> faith & hope';
  const excerpt = E.snippet(text,run({text},[rule('faith')]).spans);
  assert.equal(excerpt.map(p => p.text).join(''),text);
  assert.equal(excerpt.find(p => p.mark).text,'faith');
  assert.ok(E.snippet('a'.repeat(500),[]).map(p => p.text).join('').endsWith('…'));
  const frequent = 'faith '.repeat(500);
  const parts = E.snippet(frequent, run({text:frequent},[rule('faith')]).spans);
  assert.ok(parts.map(p => p.text).join('').length <= 245);
});
test('bundled corpus covers all five works, preserves IDs, and finds John 3:16', () => {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(__dirname + '/../assets/data/scriptures.json.gz')));
  const rows = data.rows.map(values => Object.fromEntries(data.columns.map((key,i) => [key,values[i]])));
  assert.equal(rows.length,42002);
  assert.equal(new Set(rows.map(r => r.overall_book)).size,5);
  assert.equal(new Set(rows.map(r => r.verse_id)).size,rows.length);
  const query = E.compileQuery([rule('loved the world'),rule('John','equals','book')],'all',false);
  const found = rows.filter(row => query(row).match);
  assert.ok(found.some(row => row.scripture === 'John 3:16'));
  const faith = E.compileQuery([rule('faith','whole')],'all',false);
  assert.ok(rows.filter(row => faith(row).match).length > 100);
});

test('worker loads the compressed snapshot and returns bounded result pages', async () => {
  const messages = [];
  const context = { DecompressionStream, Response,
    fetch: async url => new Response(fs.readFileSync(path.resolve(__dirname,'../search',url))),
    postMessage: data => messages.push(data)
  };
  context.self = context;
  vm.createContext(context);
  context.importScripts = file => vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../search',file),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../search/text-worker.js'),'utf8'),context);
  await context.onmessage({data:{type:'load'}});
  assert.equal(messages.at(-1).type,'ready');
  assert.equal(messages.at(-1).count,42002);
  await context.onmessage({data:{type:'search',id:1,rules:[rule('faith')],mode:'all',matchCase:false,page:0,size:25}});
  const first = messages.at(-1);
  assert.equal(first.items.length,25);
  assert.ok(first.total > 100);
  assert.ok(first.items.some(item => item.parts.some(part => part.mark)));
  await context.onmessage({data:{type:'page',id:2,page:1,size:25}});
  assert.equal(messages.at(-1).page,1);
  assert.notEqual(messages.at(-1).items[0].reference,first.items[0].reference);
  await context.onmessage({data:{type:'page',id:3,page:0,size:100}});
  assert.equal(messages.at(-1).items.length,100);
  await context.onmessage({data:{type:'page',id:4,page:0,size:99999}});
  assert.equal(messages.at(-1).items.length,25);
  await context.onmessage({data:{type:'search',id:5,rules:[rule('zzzznoscripturezzzz')],mode:'all',page:0,size:25}});
  assert.equal(messages.at(-1).total,0);
  await context.onmessage({data:{type:'search',id:6,rules:[rule('')],mode:'all'}});
  assert.equal(messages.at(-1).type,'error');
});
