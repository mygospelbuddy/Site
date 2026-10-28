(function () {
  'use strict';
  const app = document.getElementById('scriptureTextSearchApp');
  if (!app) return;
  const engine = window.ScriptureTextEngine;
  const el = id => document.getElementById(id);
  const form = el('scriptureForm'), filters = el('scriptureFilters');
  const status = el('scriptureStatus'), results = el('scriptureResults');
  const search = el('scriptureSearch'), add = el('scriptureAdd');
  let worker, choices = {}, availableFields = Object.keys(engine.fields);
  let sequence = 0, latest = 0, currentPage = 0, totalPages = 1, hasResults = false, ready = false;
  function message(text, error = false) {
    status.textContent = text;
    status.className = 'gb-status ' + (error ? 'gb-status--error' : 'gb-status--info');
  }
  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }
  function fieldControl(label, control, id) {
    const wrap = node('div', 'gb-field');
    control.id = id;
    const caption = node('label', 'gb-field__label', label);
    caption.htmlFor = id;
    wrap.append(caption, control);
    return wrap;
  }
  function addFilter(defaultField = 'text') {
    const number = ++sequence, row = node('div', 'gb-scripture-rule');
    const field = node('select', 'gb-select'), op = node('select', 'gb-select');
    const value = node('input', 'gb-input'), upper = node('input', 'gb-input');
    value.maxLength = 250; upper.type = 'number'; upper.min = '0'; upper.step = '1';
    const list = node('datalist'); list.id = 'scriptureChoices' + number;
    const remove = node('button', 'gb-btn gb-btn--ghost', 'Remove');
    remove.type = 'button'; remove.setAttribute('aria-label', 'Remove filter ' + number);
    for (const name of availableFields) if (engine.fields[name]) field.add(new Option(engine.fields[name],name));
    field.value = defaultField;
    const valueWrap = fieldControl('Value', value, 'scriptureValue' + number);
    const upperWrap = fieldControl('Through', upper, 'scriptureUpper' + number);
    row.append(fieldControl('Field', field, 'scriptureField' + number), fieldControl('Condition', op, 'scriptureOp' + number), valueWrap, upperWrap, remove, list);
    function updateValue() {
      valueWrap.hidden = ['empty','notEmpty'].includes(op.value);
      upperWrap.hidden = op.value !== 'between';
      value.required = !valueWrap.hidden; upper.required = !upperWrap.hidden;
    }
    function updateField() {
      const numeric = engine.numeric.has(field.value);
      op.replaceChildren();
      Object.entries(numeric ? engine.numberOps : engine.textOps).forEach(([name,label]) => op.add(new Option(label,name)));
      op.value = ['overall_book','book','book_chapter'].includes(field.value) ? 'equals' : numeric ? 'equals' : 'contains';
      value.value = ''; upper.value = '';
      value.type = numeric ? 'number' : 'text';
      if (numeric) { value.min = '0'; value.step = '1'; }
      else { value.removeAttribute('min'); value.removeAttribute('step'); }
      value.placeholder = field.value === 'text' ? 'e.g. loved the world' : numeric ? 'e.g. 3' : 'Enter a value';
      list.replaceChildren();
      (choices[field.value] || []).forEach(choice => { const option = node('option'); option.value = choice; list.append(option); });
      if (choices[field.value]) value.setAttribute('list', list.id); else value.removeAttribute('list');
      updateValue();
    }
    field.addEventListener('change', updateField); op.addEventListener('change', updateValue);
    remove.addEventListener('click', () => {
      row.remove();
      if (!filters.children.length) addFilter();
      add.disabled = filters.children.length >= 20;
      add.focus();
    });
    row.readRule = () => ({ field: field.value, op: op.value, value: value.value, to: upper.value });
    filters.append(row); updateField(); add.disabled = filters.children.length >= 20;
    return value;
  }
  function send(type, page = 0, rules) {
    latest++;
    worker.postMessage({ type, id: latest, page, size: Number(el('scripturePageSize').value), rules, mode: el('scriptureLogic').value, matchCase: el('scriptureCase').checked });
    results.setAttribute('aria-busy','true'); search.disabled = true;
    el('scripturePrevious').disabled = true; el('scriptureNext').disabled = true;
    message(type === 'search' ? 'Searching scriptures…' : 'Loading page…');
  }
  function render(data) {
    currentPage = data.page; totalPages = data.pages; hasResults = true;
    results.hidden = false; results.setAttribute('aria-busy','false');
    const body = el('scriptureRows'); body.replaceChildren();
    data.items.forEach(item => {
      const row = node('tr'), reference = node('th', '', item.reference);
      reference.scope = 'row';
      const snippet = node('td');
      if (item.preview) snippet.append(node('span','gb-scripture-preview','Verse preview: '));
      item.parts.forEach(part => snippet.append(part.mark ? node('mark','',part.text) : document.createTextNode(part.text)));
      row.append(reference,snippet); body.append(row);
    });
    if (!data.total) {
      const row = node('tr','gb-empty-row'), cell = node('td','','No scriptures match these filters. Try fewer filters or OR.');
      cell.colSpan = 2; row.append(cell); body.append(row);
    }
    const start = data.total ? data.page*data.size+1 : 0;
    const end = Math.min((data.page+1)*data.size,data.total);
    const count = `${data.total.toLocaleString()} matching scriptures`;
    el('scriptureCount').textContent = count;
    el('scripturePage').textContent = `Page ${data.page+1} of ${data.pages} · ${start.toLocaleString()}–${end.toLocaleString()}`;
    el('scripturePrevious').disabled = data.page === 0;
    el('scriptureNext').disabled = data.page+1 >= data.pages;
    search.disabled = false;
    message(`${count}. Showing ${start.toLocaleString()}–${end.toLocaleString()}.`);
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!ready) return;
    const rules = Array.from(filters.children, row => row.readRule());
    try { engine.compileQuery(rules,el('scriptureLogic').value,el('scriptureCase').checked); send('search',0,rules); }
    catch (error) { message(error.message,true); }
  });
  add.addEventListener('click', () => { if (filters.children.length < 20) addFilter().focus(); });
  el('scriptureClear').addEventListener('click', () => {
    latest++; filters.replaceChildren(); addFilter().focus();
    el('scriptureLogic').value = 'all'; el('scriptureCase').checked = false;
    el('scripturePageSize').value = '25'; hasResults = false; results.hidden = true;
    results.setAttribute('aria-busy','false'); search.disabled = !ready;
    message(ready ? 'Enter your filters, then select Search.' : 'Loading scripture data…');
  });
  el('scripturePageSize').addEventListener('change', () => { if (hasResults) send('page'); });
  el('scripturePrevious').addEventListener('click', () => { if (currentPage > 0) send('page',currentPage-1); });
  el('scriptureNext').addEventListener('click', () => { if (currentPage+1 < totalPages) send('page',currentPage+1); });
  addFilter();
  try {
    worker = new Worker(new URL('text-worker.js', window.location.href));
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        ready = true; choices = data.choices; availableFields = data.fields;
        // Preserve anything typed while the data was loading; suggestions apply to new filters.
        search.disabled = false; el('scriptureRetry').hidden = true;
        message(`${data.count.toLocaleString()} verses ready. Enter your filters, then select Search.`);
      } else if (data.id != null && data.id !== latest) return;
      else if (data.type === 'results') render(data);
      else if (data.type === 'error') {
        results.setAttribute('aria-busy','false'); search.disabled = !ready;
        el('scripturePrevious').disabled = currentPage === 0;
        el('scriptureNext').disabled = currentPage+1 >= totalPages;
        message(data.message,true); el('scriptureRetry').hidden = ready;
      }
    };
    worker.onerror = () => { ready = false; search.disabled = true; results.setAttribute('aria-busy','false'); message('Search could not start. Reload this page to try again.',true); };
    el('scriptureRetry').addEventListener('click', () => { message('Loading scripture data…'); el('scriptureRetry').hidden = true; worker.postMessage({ type: 'load' }); });
    worker.postMessage({ type: 'load' });
  } catch (error) { message('This browser cannot start scripture search. Please use a current browser.',true); }
})();
