
(function(window, document) {
  'use strict';

  const DEFAULTS = {
    mode: 'quick',
    apostlesOnly: false,
    countMode: 'footnotes',
    minQuotePercent: 0,
    yearFrom: '',
    yearTo: '',
    month: '',
    speaker: '',
    pageSize: 25,
    quickBook: '',
    quickChapter: '',
    quickVerse: 'all',
    rangeBook: '',
    rangeChapter: '',
    rangeStart: 'all',
    rangeEnd: 'all',
    textReference: ''
  };

  const state = {
    metadataReady: false,
    datasetCache: new Map(),
    currentRenderer: null,
    latestResultRows: [],
    latestSummary: [],
    latestMetricHeader: '% quoted'
  };

  const refs = {};

  document.addEventListener('DOMContentLoaded', initialize);

  async function initialize() {
    cacheDom();
    bindEvents();
    await populateBookSelects();
    applyDefaults();
    loadFromUrl();
    window.GBCommon.initTooltips();
  }

  function cacheDom() {
    refs.modeButtons = Array.from(document.querySelectorAll('[data-reference-mode]'));
    refs.panels = Array.from(document.querySelectorAll('[data-reference-panel]'));
    refs.searchButton = document.getElementById('referenceSearchButton');
    refs.clearButton = document.getElementById('referenceClearButton');
    refs.resetButton = document.getElementById('referenceResetButton');
    refs.status = window.GBCommon.createStatusController('referenceStatus');
    refs.results = document.getElementById('referenceResults');
    refs.quickBook = document.getElementById('quickBook');
    refs.quickChapter = document.getElementById('quickChapter');
    refs.quickVerse = document.getElementById('quickVerse');
    refs.rangeBook = document.getElementById('rangeBook');
    refs.rangeChapter = document.getElementById('rangeChapter');
    refs.rangeStart = document.getElementById('rangeStartVerse');
    refs.rangeEnd = document.getElementById('rangeEndVerse');
    refs.textReference = document.getElementById('textReference');
    refs.apostlesOnly = document.getElementById('referenceApostlesOnly');
    refs.countMode = document.getElementById('referenceCountMode');
    refs.minQuotePercent = document.getElementById('referenceMinQuotePercent');
    refs.minQuotePercentValue = document.getElementById('referenceMinQuotePercentValue');
    refs.yearFrom = document.getElementById('referenceYearFrom');
    refs.yearTo = document.getElementById('referenceYearTo');
    refs.month = document.getElementById('referenceMonth');
    refs.speaker = document.getElementById('referenceSpeaker');
    refs.pageSize = document.getElementById('referencePageSize');
  }

  function bindEvents() {
    refs.modeButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        setMode(button.getAttribute('data-reference-mode'));
      });
    });

    refs.searchButton.addEventListener('click', function() {
      runSearch();
    });

    refs.clearButton.addEventListener('click', function() {
      clearInputsForCurrentMode();
    });

    refs.resetButton.addEventListener('click', function() {
      applyDefaults();
      refs.results.innerHTML = '';
      refs.status.hide();
      updateUrlFromState();
    });

    refs.quickBook.addEventListener('change', function() {
      populateChapterSelect(refs.quickBook.value, refs.quickChapter, refs.quickVerse);
    });

    refs.quickChapter.addEventListener('change', function() {
      populateVerseSelect(refs.quickBook.value, refs.quickChapter.value, refs.quickVerse, { includeAll: true, allLabel: 'All verses' });
    });

    refs.rangeBook.addEventListener('change', function() {
      populateChapterSelect(refs.rangeBook.value, refs.rangeChapter, refs.rangeStart, refs.rangeEnd);
    });

    refs.rangeChapter.addEventListener('change', function() {
      populateVerseSelect(refs.rangeBook.value, refs.rangeChapter.value, refs.rangeStart, { includeAll: true, allLabel: 'All verses' });
      populateVerseSelect(refs.rangeBook.value, refs.rangeChapter.value, refs.rangeEnd, { includeAll: true, allLabel: 'All verses' });
      syncRangeEndOptions();
    });

    refs.rangeStart.addEventListener('change', syncRangeEndOptions);

    refs.minQuotePercent.addEventListener('input', function() {
      refs.minQuotePercentValue.textContent = formatPercentLabel(refs.minQuotePercent.value);
    });
  }

  async function populateBookSelects() {
    const groups = await window.GBScriptureTools.getGroupedBooks();
    [refs.quickBook, refs.rangeBook].forEach(function(select) {
      select.innerHTML = '<option value="">Select a book</option>';
      groups.forEach(function(groupItem) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = groupItem.group;
        groupItem.books.forEach(function(book) {
          const option = document.createElement('option');
          option.value = book;
          option.textContent = book;
          optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
      });
    });
    state.metadataReady = true;
  }

  async function populateChapterSelect(book, chapterSelect) {
    const dependentSelects = Array.prototype.slice.call(arguments, 2);
    chapterSelect.innerHTML = '<option value="">All chapters</option>';
    dependentSelects.forEach(function(select) {
      clearSelect(select, 'All verses');
    });

    if (!book) {
      return;
    }

    const chapters = await window.GBScriptureTools.getChaptersForBook(book);
    chapters.forEach(function(chapter) {
      const option = document.createElement('option');
      option.value = String(chapter);
      option.textContent = String(chapter);
      chapterSelect.appendChild(option);
    });
  }

  async function populateVerseSelect(book, chapter, verseSelect, options) {
    const opts = options || {};
    const allLabel = opts.allLabel || 'All verses';
    verseSelect.innerHTML = '<option value="all">' + allLabel + '</option>';

    if (!book || !chapter) {
      return;
    }

    const verses = await window.GBScriptureTools.getVersesForChapter(book, Number(chapter));
    verses.forEach(function(verse) {
      const option = document.createElement('option');
      option.value = String(verse);
      option.textContent = String(verse);
      verseSelect.appendChild(option);
    });
  }

  async function syncRangeEndOptions() {
    await populateVerseSelect(refs.rangeBook.value, refs.rangeChapter.value, refs.rangeEnd, { includeAll: true, allLabel: 'All verses' });
    const startValue = refs.rangeStart.value;
    if (!startValue || startValue === 'all') {
      return;
    }

    Array.from(refs.rangeEnd.options).forEach(function(option) {
      if (option.value === 'all' || option.value === '') {
        return;
      }
      option.disabled = Number(option.value) < Number(startValue);
    });

    if (refs.rangeEnd.value !== 'all' && Number(refs.rangeEnd.value) < Number(startValue)) {
      refs.rangeEnd.value = 'all';
    }
  }

  function clearSelect(select, allLabel) {
    if (!select) {
      return;
    }
    select.innerHTML = '<option value="all">' + (allLabel || 'All') + '</option>';
  }

  function applyDefaults() {
    setMode(DEFAULTS.mode);
    refs.apostlesOnly.checked = DEFAULTS.apostlesOnly;
    refs.countMode.value = DEFAULTS.countMode;
    refs.minQuotePercent.value = String(DEFAULTS.minQuotePercent);
    refs.minQuotePercentValue.textContent = formatPercentLabel(DEFAULTS.minQuotePercent);
    refs.yearFrom.value = DEFAULTS.yearFrom;
    refs.yearTo.value = DEFAULTS.yearTo;
    refs.month.value = DEFAULTS.month;
    refs.speaker.value = DEFAULTS.speaker;
    refs.pageSize.value = String(DEFAULTS.pageSize);

    refs.quickBook.value = DEFAULTS.quickBook;
    refs.quickChapter.innerHTML = '<option value="">All chapters</option>';
    refs.quickVerse.innerHTML = '<option value="all">All verses</option>';

    refs.rangeBook.value = DEFAULTS.rangeBook;
    refs.rangeChapter.innerHTML = '<option value="">All chapters</option>';
    refs.rangeStart.innerHTML = '<option value="all">All verses</option>';
    refs.rangeEnd.innerHTML = '<option value="all">All verses</option>';

    refs.textReference.value = DEFAULTS.textReference;
  }

  function loadFromUrl() {
    const params = window.GBCommon.readUrlParams();
    if (!Object.keys(params).length) {
      return;
    }

    const mode = params.mode || DEFAULTS.mode;
    setMode(mode);
    refs.apostlesOnly.checked = params.apostles === '1';
    refs.countMode.value = normalizeCountMode(params.countMode);
    refs.minQuotePercent.value = String(normalizePercent(params.minQuotePercent));
    refs.minQuotePercentValue.textContent = formatPercentLabel(refs.minQuotePercent.value);
    refs.yearFrom.value = params.yearFrom || '';
    refs.yearTo.value = params.yearTo || '';
    refs.month.value = params.month || '';
    refs.speaker.value = params.speaker || '';
    refs.pageSize.value = ['25', '50', '100'].includes(params.pageSize) ? params.pageSize : String(DEFAULTS.pageSize);
    refs.textReference.value = params.q || '';

    Promise.resolve().then(async function() {
      if (params.quickBook) {
        refs.quickBook.value = params.quickBook;
        await populateChapterSelect(refs.quickBook.value, refs.quickChapter);
        refs.quickChapter.value = params.quickChapter || '';
        await populateVerseSelect(refs.quickBook.value, refs.quickChapter.value, refs.quickVerse, { includeAll: true, allLabel: 'All verses' });
        refs.quickVerse.value = params.quickVerse || 'all';
      }

      if (params.rangeBook) {
        refs.rangeBook.value = params.rangeBook;
        await populateChapterSelect(refs.rangeBook.value, refs.rangeChapter);
        refs.rangeChapter.value = params.rangeChapter || '';
        await populateVerseSelect(refs.rangeBook.value, refs.rangeChapter.value, refs.rangeStart, { includeAll: true, allLabel: 'All verses' });
        await populateVerseSelect(refs.rangeBook.value, refs.rangeChapter.value, refs.rangeEnd, { includeAll: true, allLabel: 'All verses' });
        refs.rangeStart.value = params.rangeStart || 'all';
        await syncRangeEndOptions();
        refs.rangeEnd.value = params.rangeEnd || 'all';
      }

      const hasSearchParams = Boolean(params.q || params.quickBook || params.rangeBook);
      if (hasSearchParams) {
        runSearch();
      }
    });
  }

  function updateUrlFromState() {
    window.GBCommon.updateUrl({
      mode: getCurrentMode(),
      apostles: refs.apostlesOnly.checked ? 1 : '',
      countMode: refs.countMode.value,
      minQuotePercent: normalizePercent(refs.minQuotePercent.value) || '',
      yearFrom: refs.yearFrom.value,
      yearTo: refs.yearTo.value,
      month: refs.month.value,
      speaker: refs.speaker.value,
      pageSize: refs.pageSize.value !== String(DEFAULTS.pageSize) ? refs.pageSize.value : '',
      quickBook: refs.quickBook.value,
      quickChapter: refs.quickChapter.value,
      quickVerse: refs.quickVerse.value !== 'all' ? refs.quickVerse.value : '',
      rangeBook: refs.rangeBook.value,
      rangeChapter: refs.rangeChapter.value,
      rangeStart: refs.rangeStart.value !== 'all' ? refs.rangeStart.value : '',
      rangeEnd: refs.rangeEnd.value !== 'all' ? refs.rangeEnd.value : '',
      q: refs.textReference.value
    });
  }

  function setMode(mode) {
    refs.modeButtons.forEach(function(button) {
      const buttonMode = button.getAttribute('data-reference-mode');
      button.classList.toggle('gb-mode-switch__button--active', buttonMode === mode);
    });
    refs.panels.forEach(function(panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-reference-panel') === mode);
    });
  }

  function getCurrentMode() {
    const activeButton = refs.modeButtons.find(function(button) {
      return button.classList.contains('gb-mode-switch__button--active');
    });
    return activeButton ? activeButton.getAttribute('data-reference-mode') : DEFAULTS.mode;
  }

  function clearInputsForCurrentMode() {
    const mode = getCurrentMode();
    if (mode === 'quick') {
      refs.quickBook.value = '';
      refs.quickChapter.innerHTML = '<option value="">All chapters</option>';
      refs.quickVerse.innerHTML = '<option value="all">All verses</option>';
    } else if (mode === 'range') {
      refs.rangeBook.value = '';
      refs.rangeChapter.innerHTML = '<option value="">All chapters</option>';
      refs.rangeStart.innerHTML = '<option value="all">All verses</option>';
      refs.rangeEnd.innerHTML = '<option value="all">All verses</option>';
    } else {
      refs.textReference.value = '';
    }
    refs.status.hide();
    refs.results.innerHTML = '';
    updateUrlFromState();
  }

  function normalizeCountMode(value) {
    return value === 'talks' ? 'talks' : 'footnotes';
  }

  function normalizePercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  function formatPercentLabel(value) {
    const normalized = normalizePercent(value);
    return normalized === 0 ? 'All' : normalized + '%+';
  }

  async function resolveScriptureSelection() {
    const mode = getCurrentMode();
    if (mode === 'quick') {
      return resolveQuickSelection();
    }
    if (mode === 'range') {
      return resolveRangeSelection();
    }
    return resolveTextSelection();
  }

  async function resolveQuickSelection() {
    const book = refs.quickBook.value;
    const chapter = refs.quickChapter.value;
    const verse = refs.quickVerse.value;

    if (!book) {
      throw new Error('Choose a book before running a reference search.');
    }
    if (!chapter) {
      throw new Error('Choose a chapter. Whole-book dropdown searches are not supported.');
    }

    if (verse === 'all') {
      return {
        display: book + ' ' + chapter,
        scriptures: await window.GBScriptureTools.getScripturesForChapter(book, Number(chapter))
      };
    }

    return {
      display: book + ' ' + chapter + ':' + verse,
      scriptures: await window.GBScriptureTools.getScripturesForSingleVerse(book, Number(chapter), Number(verse))
    };
  }

  async function resolveRangeSelection() {
    const book = refs.rangeBook.value;
    const chapter = refs.rangeChapter.value;
    const startVerse = refs.rangeStart.value;
    const endVerse = refs.rangeEnd.value;

    if (!book) {
      throw new Error('Choose a book before running a verse range search.');
    }
    if (!chapter) {
      throw new Error('Choose a chapter before selecting a verse range.');
    }

    if (startVerse === 'all' && endVerse === 'all') {
      return {
        display: book + ' ' + chapter,
        scriptures: await window.GBScriptureTools.getScripturesForChapter(book, Number(chapter))
      };
    }

    if (startVerse === 'all' || endVerse === 'all') {
      throw new Error('Choose both a start verse and an end verse, or leave both set to All verses for the whole chapter.');
    }

    return {
      display: book + ' ' + chapter + ':' + startVerse + '-' + endVerse,
      scriptures: await window.GBScriptureTools.getScripturesForVerseRange(book, Number(chapter), Number(startVerse), Number(endVerse))
    };
  }

  async function resolveTextSelection() {
    const result = await window.GBScriptureTools.expandReferenceInput(refs.textReference.value, {
      maxVerses: window.GBScriptureTools.MAX_REFERENCE_VERSES
    });
    return {
      display: result.reference,
      scriptures: result.scriptures
    };
  }

  function buildFootnoteCandidates(apostlesOnly) {
    const prefix = apostlesOnly ? 'apostle-all-footnotes' : 'all-footnotes';
    const year = new Date().getFullYear();
    const candidates = [];
    [year, year - 1, year - 2].forEach(function(candidateYear) {
      candidates.push('https://kameronyork.com/datasets/' + prefix + '-oct-' + candidateYear + '.json');
      candidates.push('https://kameronyork.com/datasets/' + prefix + '-apr-' + candidateYear + '.json');
    });
    return candidates;
  }

  async function fetchFootnoteDataset(apostlesOnly) {
    const cacheKey = apostlesOnly ? 'apostles' : 'all';
    if (state.datasetCache.has(cacheKey)) {
      return state.datasetCache.get(cacheKey);
    }

    const promise = (async function() {
      const candidates = buildFootnoteCandidates(apostlesOnly);
      for (let index = 0; index < candidates.length; index += 1) {
        const url = candidates[index];
        try {
          const response = await fetch(url, { cache: 'force-cache', credentials: 'omit' });
          if (!response.ok) {
            continue;
          }
          return response.json();
        } catch (error) {
          // Try the next candidate.
        }
      }
      throw new Error('The footnote dataset could not be loaded.');
    })();

    state.datasetCache.set(cacheKey, promise);
    return promise;
  }

  async function runSearch() {
    refs.status.show('Searching Gospel Buddy references...', 'info', true);
    refs.searchButton.disabled = true;

    try {
      const selection = await resolveScriptureSelection();
      const settings = getCurrentSettings();
      const dataset = await fetchFootnoteDataset(settings.apostlesOnly);
      const rawEntries = Array.isArray(dataset) ? dataset : [];
      const scriptureSet = new Set(selection.scriptures);
      const filteredEntries = rawEntries.filter(function(entry) {
        return scriptureSet.has(String(entry.scripture || '')) && Number(entry.perc_quoted || 0) >= settings.minQuotePercent;
      });

      const talkRows = buildTalkRows(filteredEntries, selection.scriptures, settings);
      const visibleRows = applyTalkFilters(talkRows, settings);
      renderResults(selection, filteredEntries, visibleRows, settings);
      refs.status.hide();
      updateUrlFromState();
    } catch (error) {
      refs.results.innerHTML = '';
      refs.status.show(error && error.message ? error.message : 'Something went wrong while running the reference search.', 'error', false);
    } finally {
      refs.searchButton.disabled = false;
    }
  }

  function getCurrentSettings() {
    return {
      apostlesOnly: refs.apostlesOnly.checked,
      countMode: normalizeCountMode(refs.countMode.value),
      minQuotePercent: normalizePercent(refs.minQuotePercent.value),
      yearFrom: refs.yearFrom.value ? Number(refs.yearFrom.value) : null,
      yearTo: refs.yearTo.value ? Number(refs.yearTo.value) : null,
      month: refs.month.value || '',
      speaker: String(refs.speaker.value || '').trim().toLowerCase(),
      pageSize: Number(refs.pageSize.value || 25)
    };
  }

  function buildTalkRows(entries, scriptures, settings) {
    const byTalk = new Map();
    const totalScriptures = scriptures.length;

    entries.forEach(function(entry) {
      const talkKey = String(entry.talk_id || entry.hyperlink || [entry.title, entry.talk_year, entry.talk_month, entry.speaker].join('|'));
      if (!byTalk.has(talkKey)) {
        byTalk.set(talkKey, {
          talkKey: talkKey,
          title: String(entry.title || 'Untitled talk'),
          href: String(entry.hyperlink || ''),
          speaker: String(entry.speaker || 'Unknown speaker'),
          year: Number(entry.talk_year || 0),
          month: String(entry.talk_month || ''),
          talkId: Number(entry.talk_id || 0),
          footnoteMentions: 0,
          maxQuoted: 0,
          matchingScriptures: new Set()
        });
      }

      const row = byTalk.get(talkKey);
      row.footnoteMentions += 1;
      row.maxQuoted = Math.max(row.maxQuoted, Number(entry.perc_quoted || 0));
      row.matchingScriptures.add(String(entry.scripture || ''));
    });

    return Array.from(byTalk.values()).map(function(row) {
      const singleVerse = totalScriptures === 1;
      const matchingVerseCount = row.matchingScriptures.size;
      const coveragePercent = singleVerse
        ? Math.round(row.maxQuoted)
        : Math.round((matchingVerseCount / Math.max(1, totalScriptures)) * 100);

      return {
        title: row.title,
        href: row.href,
        speaker: row.speaker,
        year: row.year || '—',
        month: row.month || '—',
        footnoteMentions: row.footnoteMentions,
        matchingVerseCount: matchingVerseCount,
        metricPercent: coveragePercent,
        metricDisplay: coveragePercent + '%',
        meta: singleVerse
          ? row.footnoteMentions + ' ' + (row.footnoteMentions === 1 ? 'footnote mention' : 'footnote mentions') + ' in this talk'
          : matchingVerseCount + ' ' + (matchingVerseCount === 1 ? 'matching verse' : 'matching verses') + ' · ' + row.footnoteMentions + ' footnote mentions',
        sort: {
          newest: buildConferenceSortValue(row.year, row.month, row.talkId, true),
          oldest: buildConferenceSortValue(row.year, row.month, row.talkId, false),
          coverage: coveragePercent,
          mentions: row.footnoteMentions,
          matches: matchingVerseCount,
          speaker: row.speaker,
          title: row.title
        },
        export: {
          Metric: coveragePercent + '%',
          Year: row.year,
          Month: row.month,
          Speaker: row.speaker,
          Title: row.title,
          Footnotes: row.footnoteMentions,
          MatchingVerses: matchingVerseCount,
          Link: row.href
        }
      };
    });
  }

  function applyTalkFilters(rows, settings) {
    return rows.filter(function(row) {
      if (settings.yearFrom && Number(row.year) < settings.yearFrom) {
        return false;
      }
      if (settings.yearTo && Number(row.year) > settings.yearTo) {
        return false;
      }
      if (settings.month && row.month !== settings.month) {
        return false;
      }
      if (settings.speaker && String(row.speaker || '').toLowerCase().indexOf(settings.speaker) === -1) {
        return false;
      }
      return true;
    });
  }

  function buildConferenceSortValue(year, month, talkId, newest) {
    const monthOrder = month === 'October' ? 10 : month === 'April' ? 4 : 1;
    const value = Number(year || 0) * 100000 + monthOrder * 1000 + Number(talkId || 0);
    return newest ? value : -value;
  }

  function renderResults(selection, allEntries, rows, settings) {
    const filteredFootnotes = rows.reduce(function(total, row) {
      return total + row.footnoteMentions;
    }, 0);

    const summaries = [
      { label: 'Talks', value: String(rows.length), active: settings.countMode === 'talks' },
      { label: 'Footnotes', value: String(filteredFootnotes), active: settings.countMode === 'footnotes' },
      { label: 'Verses', value: String(selection.scriptures.length), active: false },
      { label: 'Filter', value: settings.minQuotePercent > 0 ? settings.minQuotePercent + '%+' : 'All', active: false }
    ];

    const sortOptions = [
      { value: 'newest', label: 'Newest first' },
      { value: 'oldest', label: 'Oldest first' },
      { value: 'mentions', label: 'Most footnotes in talk' },
      { value: 'coverage', label: 'Highest % quoted' },
      { value: 'matches', label: 'Most matching verses' },
      { value: 'speaker', label: 'Speaker A–Z' },
      { value: 'title', label: 'Title A–Z' }
    ];

    const sorters = {
      newest: function(left, right) { return right.sort.newest - left.sort.newest; },
      oldest: function(left, right) { return left.sort.oldest - right.sort.oldest; },
      mentions: function(left, right) {
        if (right.sort.mentions !== left.sort.mentions) {
          return right.sort.mentions - left.sort.mentions;
        }
        return right.sort.newest - left.sort.newest;
      },
      coverage: function(left, right) {
        if (right.sort.coverage !== left.sort.coverage) {
          return right.sort.coverage - left.sort.coverage;
        }
        return right.sort.newest - left.sort.newest;
      },
      matches: function(left, right) {
        if (right.sort.matches !== left.sort.matches) {
          return right.sort.matches - left.sort.matches;
        }
        return right.sort.newest - left.sort.newest;
      },
      speaker: function(left, right) {
        const compare = String(left.sort.speaker).localeCompare(String(right.sort.speaker));
        if (compare !== 0) {
          return compare;
        }
        return right.sort.newest - left.sort.newest;
      },
      title: function(left, right) {
        const compare = String(left.sort.title).localeCompare(String(right.sort.title));
        if (compare !== 0) {
          return compare;
        }
        return right.sort.newest - left.sort.newest;
      }
    };

    state.latestResultRows = rows.slice();
    state.latestSummary = summaries.slice();
    state.latestMetricHeader = '% quoted';

    if (state.currentRenderer) {
      state.currentRenderer.clear();
    }

    state.currentRenderer = window.GBCommon.renderTalkResults(refs.results, {
      idPrefix: 'reference-results',
      title: selection.display,
      note: settings.apostlesOnly ? 'Showing apostles-only results from the current dataset.' : 'Showing all General Conference speakers in the current dataset.',
      summaries: summaries,
      rows: rows,
      metricHeader: '% quoted',
      sortOptions: sortOptions,
      defaultSort: settings.countMode === 'footnotes' ? 'mentions' : 'newest',
      sorters: sorters,
      pageSize: settings.pageSize,
      emptyMessage: 'No General Conference talks matched this reference with the current settings.',
      exportHeaders: ['Metric', 'Year', 'Month', 'Speaker', 'Title', 'Footnotes', 'MatchingVerses', 'Link'],
      exportFileName: window.GBCommon.slugify(selection.display) + '-reference-search.csv'
    });
  }
})(window, document);
