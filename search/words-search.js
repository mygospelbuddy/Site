(function(window, document) {
  'use strict';

  const TALKS_URL = 'https://kameronyork.com/datasets/general-conference-talks.json';
  const DEFAULTS = {
    query: '',
    byConference: false,
    tableMode: false,
    metricMode: 'per1000',
    chartType: 'scatter',
    caseSensitive: false,
    yearFrom: '',
    yearTo: '',
    month: '',
    speaker: ''
  };

  const SERIES_COLORS = ['#E74C3C', '#191970', '#229954', '#F39C12', '#7D3C98', '#0096c7', '#d97706', '#475569'];

  const state = {
    chart: null,
    rawTalks: null,
    currentGroups: [],
    currentAggregation: null,
    currentTalkRows: [],
    currentTalkRenderer: null
  };

  const refs = {};

  document.addEventListener('DOMContentLoaded', initialize);

  function initialize() {
    cacheDom();
    bindEvents();
    applyDefaults();
    loadFromUrl();
    if (window.GBCommon && typeof window.GBCommon.initTooltips === 'function') {
      window.GBCommon.initTooltips();
    }
  }

  function cacheDom() {
    refs.input = document.getElementById('wordInput');
    refs.searchButton = document.getElementById('wordSearchButton');
    refs.clearButton = document.getElementById('wordClearButton');
    refs.resetButton = document.getElementById('wordsResetDefaults');
    refs.status = window.GBCommon.createStatusController('wordStatus');
    refs.byConference = document.getElementById('wordsByConference');
    refs.tableMode = document.getElementById('wordsTableMode');
    refs.metricPer1000 = document.getElementById('wordsMetricPer1000');
    refs.metricPerTalk = document.getElementById('wordsMetricPerTalk');
    refs.chartType = document.getElementById('wordsChartType');
    refs.caseSensitive = document.getElementById('wordsCaseSensitive');
    refs.yearFrom = document.getElementById('wordsYearFrom');
    refs.yearTo = document.getElementById('wordsYearTo');
    refs.month = document.getElementById('wordsMonth');
    refs.speaker = document.getElementById('wordsSpeaker');
    refs.plotCanvas = document.getElementById('plotCanvas');
    refs.legend = document.getElementById('legendContainer');
    refs.aggregateTable = document.getElementById('aggregateTableContainer');
    refs.talks = document.getElementById('talksTableContainer');
    refs.exportAggregate = document.getElementById('wordsExportAggregate');
    refs.exportTalks = document.getElementById('wordsExportTalks');
  }

  function bindEvents() {
    if (refs.searchButton) {
      refs.searchButton.addEventListener('click', function(event) {
        event.preventDefault();
        runSearch();
      });
    }

    if (refs.clearButton) {
      refs.clearButton.addEventListener('click', function(event) {
        event.preventDefault();
        clearQuery();
      });
    }

    if (refs.resetButton) {
      refs.resetButton.addEventListener('click', function(event) {
        event.preventDefault();
        resetDefaults();
      });
    }

    if (refs.exportAggregate) {
      refs.exportAggregate.addEventListener('click', function(event) {
        event.preventDefault();
        exportAggregateData();
      });
    }

    if (refs.exportTalks) {
      refs.exportTalks.addEventListener('click', function(event) {
        event.preventDefault();
        exportTalkRows();
      });
    }

    if (refs.input) {
      refs.input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          runSearch();
        }
      });
    }

    if (refs.metricPer1000 && refs.metricPerTalk) {
      refs.metricPer1000.addEventListener('change', function() {
        if (refs.metricPer1000.checked) {
          refs.metricPerTalk.checked = false;
        }
      });

      refs.metricPerTalk.addEventListener('change', function() {
        if (refs.metricPerTalk.checked) {
          refs.metricPer1000.checked = false;
        }
      });
    }
  }

  function applyDefaults() {
    refs.input.value = DEFAULTS.query;
    refs.byConference.checked = DEFAULTS.byConference;
    refs.tableMode.checked = DEFAULTS.tableMode;
    refs.metricPer1000.checked = DEFAULTS.metricMode === 'per1000';
    refs.metricPerTalk.checked = DEFAULTS.metricMode === 'perTalk';
    refs.chartType.value = DEFAULTS.chartType;
    refs.caseSensitive.checked = DEFAULTS.caseSensitive;
    refs.yearFrom.value = DEFAULTS.yearFrom;
    refs.yearTo.value = DEFAULTS.yearTo;
    refs.month.value = DEFAULTS.month;
    refs.speaker.value = DEFAULTS.speaker;
    refs.exportAggregate.disabled = true;
    refs.exportTalks.disabled = true;
    clearLegend();
    clearAggregateTable();
    clearTalkRows();
    destroyChart();
  }

  function resetDefaults() {
    applyDefaults();
    updateUrlFromState();
  }

  function clearQuery() {
    refs.input.value = '';
    refs.status.hide();
    clearLegend();
    clearAggregateTable();
    clearTalkRows();
    destroyChart();
    refs.exportAggregate.disabled = true;
    refs.exportTalks.disabled = true;
    updateUrlFromState();
  }

  function loadFromUrl() {
    const params = window.GBCommon.readUrlParams();
    if (!Object.keys(params).length) {
      return;
    }

    refs.input.value = params.query || '';
    refs.byConference.checked = params.byConference === '1';
    refs.tableMode.checked = params.tableMode === '1';
    refs.metricPer1000.checked = (params.metric || DEFAULTS.metricMode) !== 'perTalk';
    refs.metricPerTalk.checked = (params.metric || DEFAULTS.metricMode) === 'perTalk';
    refs.chartType.value = ['scatter', 'line', 'bar'].includes(params.chartType) ? params.chartType : DEFAULTS.chartType;
    refs.caseSensitive.checked = params.caseSensitive === '1';
    refs.yearFrom.value = params.yearFrom || '';
    refs.yearTo.value = params.yearTo || '';
    refs.month.value = params.month || '';
    refs.speaker.value = params.speaker || '';

    if (refs.input.value) {
      window.setTimeout(function() {
        runSearch();
      }, 0);
    }
  }

  function updateUrlFromState() {
    window.GBCommon.updateUrl({
      query: refs.input.value,
      byConference: refs.byConference.checked ? 1 : '',
      tableMode: refs.tableMode.checked ? 1 : '',
      metric: getMetricMode(),
      chartType: refs.chartType.value !== DEFAULTS.chartType ? refs.chartType.value : '',
      caseSensitive: refs.caseSensitive.checked ? 1 : '',
      yearFrom: refs.yearFrom.value,
      yearTo: refs.yearTo.value,
      month: refs.month.value,
      speaker: refs.speaker.value
    });
  }

  function getMetricMode() {
    return refs.metricPerTalk.checked ? 'perTalk' : 'per1000';
  }

  async function ensureTalksLoaded(showLoading) {
    if (state.rawTalks) {
      return state.rawTalks;
    }

    if (showLoading) {
      refs.status.show('Loading conference text data...', 'info', true);
    }

    const rawTalks = await window.GBCommon.fetchJsonCached(TALKS_URL, { cacheKey: 'general-conference-talks' });
    state.rawTalks = Array.isArray(rawTalks) ? rawTalks.map(prepareTalkRecord) : [];
    return state.rawTalks;
  }

  function prepareTalkRecord(talk) {
    return {
      title: String(talk.title || 'Untitled talk'),
      speaker: String(talk.speaker || 'Unknown speaker'),
      year: Number(talk.year || 0),
      month: String(talk.month || ''),
      conferenceLabel: String(talk.month || '') + ' ' + String(talk.year || ''),
      hyperlink: String(talk.hyperlink || ''),
      talkId: Number(talk['talk-id'] || talk.talk_id || 0),
      text: String(talk.text || ''),
      _normalizedLower: null,
      _normalizedCase: null,
      _wordFreqLower: null,
      _wordFreqCase: null,
      _wordCount: null
    };
  }

  function normalizeTalkText(value, preserveCase) {
    const normalized = String(value || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–-]/g, ' ')
      .replace(/[^A-Za-z0-9*'" ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return preserveCase ? normalized : normalized.toLowerCase();
  }

  function getTalkText(talk, caseSensitive) {
    if (caseSensitive) {
      if (talk._normalizedCase == null) {
        talk._normalizedCase = normalizeTalkText(talk.text, true);
      }
      return talk._normalizedCase;
    }

    if (talk._normalizedLower == null) {
      talk._normalizedLower = normalizeTalkText(talk.text, false);
    }
    return talk._normalizedLower;
  }

  function getTalkWordFrequency(talk, caseSensitive) {
    if (caseSensitive) {
      if (!talk._wordFreqCase) {
        talk._wordFreqCase = buildWordFrequency(getTalkText(talk, true));
      }
      return talk._wordFreqCase;
    }

    if (!talk._wordFreqLower) {
      talk._wordFreqLower = buildWordFrequency(getTalkText(talk, false));
    }
    return talk._wordFreqLower;
  }

  function getTalkWordCount(talk) {
    if (talk._wordCount == null) {
      const normalizedLower = getTalkText(talk, false);
      talk._wordCount = normalizedLower ? normalizedLower.split(' ').length : 1;
    }
    return talk._wordCount;
  }

  function buildWordFrequency(normalizedText) {
    const frequency = new Map();
    if (!normalizedText) {
      return frequency;
    }

    normalizedText.split(' ').forEach(function(word) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return frequency;
  }

  async function runSearch() {
    const query = refs.input.value.trim();
    if (!query) {
      refs.status.show('Enter a word, phrase, or search expression before clicking Search.', 'error', false);
      clearLegend();
      clearAggregateTable();
      clearTalkRows();
      destroyChart();
      refs.exportAggregate.disabled = true;
      refs.exportTalks.disabled = true;
      return;
    }

    refs.searchButton.disabled = true;
    refs.status.show('Searching conference text...', 'info', true);

    try {
      const talks = await ensureTalksLoaded(true);
      const groups = parseComparisonGroups(query);
      const settings = getSettings();
      const filteredTalks = applyTalkFilters(talks, settings);
      const aggregation = buildAggregation(filteredTalks, groups, settings);
      state.currentGroups = groups;
      state.currentAggregation = aggregation;

      renderLegend(groups);
      if (settings.tableMode) {
        destroyChart();
        renderAggregateTable(aggregation, groups, settings);
      } else {
        clearAggregateTable();
        renderChart(aggregation, groups, settings);
      }

      refs.exportAggregate.disabled = aggregation.bucketKeys.length === 0;
      clearTalkRows();
      refs.status.hide();
      updateUrlFromState();
    } catch (error) {
      destroyChart();
      clearLegend();
      clearAggregateTable();
      clearTalkRows();
      refs.exportAggregate.disabled = true;
      refs.exportTalks.disabled = true;
      refs.status.show(error && error.message ? error.message : 'Something went wrong while searching conference text.', 'error', false);
    } finally {
      refs.searchButton.disabled = false;
    }
  }

  function getSettings() {
    return {
      byConference: refs.byConference.checked,
      tableMode: refs.tableMode.checked,
      metricMode: getMetricMode(),
      chartType: refs.chartType.value,
      caseSensitive: refs.caseSensitive.checked,
      yearFrom: refs.yearFrom.value ? Number(refs.yearFrom.value) : null,
      yearTo: refs.yearTo.value ? Number(refs.yearTo.value) : null,
      month: refs.month.value || '',
      speaker: String(refs.speaker.value || '').trim().toLowerCase()
    };
  }

  function applyTalkFilters(talks, settings) {
    return talks.filter(function(talk) {
      if (settings.yearFrom && talk.year < settings.yearFrom) {
        return false;
      }
      if (settings.yearTo && talk.year > settings.yearTo) {
        return false;
      }
      if (settings.month && talk.month !== settings.month) {
        return false;
      }
      if (settings.speaker && talk.speaker.toLowerCase().indexOf(settings.speaker) === -1) {
        return false;
      }
      return true;
    });
  }

  function parseComparisonGroups(input) {
    const normalized = input.trim();
    const groups = [];
    let buffer = '';
    let depth = 0;
    let inQuote = false;
    let sawGroups = false;

    for (let index = 0; index < normalized.length; index += 1) {
      const char = normalized[index];
      if (char === '"' && normalized[index - 1] !== '\\') {
        inQuote = !inQuote;
        buffer += char;
        continue;
      }

      if (!inQuote && char === '(') {
        if (depth === 0) {
          sawGroups = true;
          if (buffer.trim()) {
            groups.push(buffer.trim());
            buffer = '';
          }
          depth = 1;
          continue;
        }
        depth += 1;
      } else if (!inQuote && char === ')') {
        if (depth === 1) {
          if (buffer.trim()) {
            groups.push(buffer.trim());
          }
          buffer = '';
          depth = 0;
          continue;
        }
        if (depth > 1) {
          depth -= 1;
        }
      }

      buffer += char;
    }

    if (inQuote || depth !== 0) {
      throw new Error('Close every quote and parenthesis before running the text search.');
    }

    if (buffer.trim()) {
      groups.push(buffer.trim());
    }

    const cleanGroups = (sawGroups ? groups.filter(Boolean) : [normalized]).map(function(group) {
      return parseGroupExpression(group);
    });

    if (!cleanGroups.length) {
      throw new Error('Enter at least one search term or phrase.');
    }

    return cleanGroups;
  }

  function parseGroupExpression(rawGroup) {
    const tokens = tokenizeGroup(rawGroup);
    const clauses = [];
    let currentClause = { include: [], exclude: [] };

    tokens.forEach(function(token) {
      if (token.type === 'OR') {
        if (currentClause.include.length || currentClause.exclude.length) {
          clauses.push(currentClause);
        }
        currentClause = { include: [], exclude: [] };
        return;
      }

      if (token.negative) {
        currentClause.exclude.push(buildPattern(token));
      } else {
        currentClause.include.push(buildPattern(token));
      }
    });

    if (currentClause.include.length || currentClause.exclude.length) {
      clauses.push(currentClause);
    }

    const validClauses = clauses.filter(function(clause) {
      return clause.include.length > 0;
    });

    if (!validClauses.length) {
      throw new Error('Each comparison group needs at least one positive search term.');
    }

    return {
      raw: rawGroup.trim(),
      label: rawGroup.trim(),
      clauses: validClauses
    };
  }

  function tokenizeGroup(rawGroup) {
    const tokens = [];
    let index = 0;

    while (index < rawGroup.length) {
      const char = rawGroup[index];
      if (/\s/.test(char)) {
        index += 1;
        continue;
      }

      if (rawGroup.slice(index, index + 2) === '||') {
        tokens.push({ type: 'OR' });
        index += 2;
        continue;
      }

      if (/^OR\b/i.test(rawGroup.slice(index))) {
        const orMatch = rawGroup.slice(index).match(/^OR\b/i);
        tokens.push({ type: 'OR' });
        index += orMatch[0].length;
        continue;
      }

      let negative = false;
      if (char === '-') {
        negative = true;
        index += 1;
        while (/\s/.test(rawGroup[index] || '')) {
          index += 1;
        }
      }

      if (rawGroup[index] === '"') {
        let endIndex = index + 1;
        let phrase = '';
        while (endIndex < rawGroup.length) {
          const nextChar = rawGroup[endIndex];
          if (nextChar === '"' && rawGroup[endIndex - 1] !== '\\') {
            break;
          }
          phrase += nextChar;
          endIndex += 1;
        }
        if (endIndex >= rawGroup.length) {
          throw new Error('Close every quoted phrase before searching.');
        }
        tokens.push({
          type: 'TERM',
          raw: phrase,
          quoted: true,
          negative: negative
        });
        index = endIndex + 1;
        continue;
      }

      let tokenText = '';
      while (index < rawGroup.length) {
        const nextChar = rawGroup[index];
        if (/\s/.test(nextChar) || rawGroup.slice(index, index + 2) === '||') {
          break;
        }
        tokenText += nextChar;
        index += 1;
      }

      if (tokenText.toUpperCase() === 'AND') {
        continue;
      }

      tokens.push({
        type: 'TERM',
        raw: tokenText,
        quoted: false,
        negative: negative
      });
    }

    return tokens;
  }

  function buildPattern(token) {
    const raw = token.raw.trim();
    if (!raw) {
      throw new Error('Empty search terms are not allowed.');
    }

    let fuzzy = false;
    let wildcard = false;
    let value = raw;

    if (!token.quoted && value.endsWith('~')) {
      fuzzy = true;
      value = value.slice(0, -1);
    }

    if (!token.quoted && value.includes('*')) {
      wildcard = true;
    }

    const normalized = normalizeQueryValue(value, false);
    const normalizedCase = normalizeQueryValue(value, true);

    return {
      id: [token.quoted ? 'phrase' : 'term', normalized, fuzzy ? 'fuzzy' : '', wildcard ? 'wildcard' : ''].join('|'),
      raw: raw,
      normalized: normalized,
      normalizedCase: normalizedCase,
      quoted: token.quoted,
      fuzzy: fuzzy,
      wildcard: wildcard
    };
  }

  function normalizeQueryValue(value, preserveCase) {
    const normalized = String(value || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–-]/g, ' ')
      .replace(/[^A-Za-z0-9*'" ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return preserveCase ? normalized : normalized.toLowerCase();
  }

  function buildAggregation(talks, groups, settings) {
    const bucketMap = new Map();
    const bucketOrder = new Map();
    const talkMatches = new Map();
    const series = groups.map(function(group, groupIndex) {
      return {
        label: group.label,
        color: SERIES_COLORS[groupIndex % SERIES_COLORS.length],
        counts: {}
      };
    });

    talks.forEach(function(talk) {
      const bucketKey = settings.byConference ? talk.conferenceLabel : String(talk.year);
      const orderValue = settings.byConference ? (talk.year * 10 + conferenceMonthOrder(talk.month)) : talk.year;

      if (!bucketOrder.has(bucketKey)) {
        bucketOrder.set(bucketKey, orderValue);
        bucketMap.set(bucketKey, bucketKey);
      }

      groups.forEach(function(group, groupIndex) {
        const evaluation = evaluateGroup(group, talk, settings.caseSensitive);
        if (!evaluation.match || evaluation.count <= 0) {
          return;
        }

        const adjustedCount = settings.metricMode === 'per1000'
          ? Math.round((evaluation.count / Math.max(1, getTalkWordCount(talk))) * 1000 * 10) / 10
          : evaluation.count;

        series[groupIndex].counts[bucketKey] = (series[groupIndex].counts[bucketKey] || 0) + adjustedCount;

        const talkKey = group.label + '|' + bucketKey;
        if (!talkMatches.has(talkKey)) {
          talkMatches.set(talkKey, []);
        }

        talkMatches.get(talkKey).push({
          title: talk.title,
          href: talk.hyperlink,
          speaker: talk.speaker,
          year: talk.year,
          month: talk.month,
          talkId: talk.talkId,
          metricValue: adjustedCount,
          rawCount: evaluation.count,
          metricDisplay: settings.metricMode === 'per1000'
            ? adjustedCount.toFixed(1)
            : String(evaluation.count),
          meta: settings.metricMode === 'per1000'
            ? evaluation.count + ' matches · ' + adjustedCount.toFixed(1) + ' per 1000 words'
            : evaluation.count + ' ' + (evaluation.count === 1 ? 'match' : 'matches')
        });
      });
    });

    const bucketKeys = Array.from(bucketMap.keys()).sort(function(left, right) {
      return bucketOrder.get(left) - bucketOrder.get(right);
    });

    return {
      bucketKeys: bucketKeys,
      bucketLabels: bucketMap,
      talkMatches: talkMatches,
      series: series
    };
  }

  function conferenceMonthOrder(month) {
    if (month === 'April') {
      return 4;
    }
    if (month === 'October') {
      return 10;
    }
    return 1;
  }

  function evaluateGroup(group, talk, caseSensitive) {
    const countCache = new Map();

    function getCount(pattern) {
      if (countCache.has(pattern.id)) {
        return countCache.get(pattern.id);
      }
      const count = countPattern(talk, pattern, caseSensitive);
      countCache.set(pattern.id, count);
      return count;
    }

    let matched = false;
    group.clauses.forEach(function(clause) {
      if (matched) {
        return;
      }
      const includesPass = clause.include.every(function(pattern) {
        return getCount(pattern) > 0;
      });
      const excludesPass = clause.exclude.every(function(pattern) {
        return getCount(pattern) === 0;
      });
      if (includesPass && excludesPass) {
        matched = true;
      }
    });

    if (!matched) {
      return { match: false, count: 0 };
    }

    const seen = new Set();
    let total = 0;
    group.clauses.forEach(function(clause) {
      clause.include.forEach(function(pattern) {
        if (!seen.has(pattern.id)) {
          seen.add(pattern.id);
          total += getCount(pattern);
        }
      });
    });

    return { match: true, count: total };
  }

  function countPattern(talk, pattern, caseSensitive) {
    if (pattern.fuzzy && !pattern.quoted && !pattern.wildcard) {
      return countFuzzyMatches(talk, pattern, caseSensitive);
    }

    const sourceText = getTalkText(talk, caseSensitive);
    const query = caseSensitive ? pattern.normalizedCase : pattern.normalized;
    if (!query || !sourceText) {
      return 0;
    }

    let regex;
    if (pattern.wildcard) {
      const regexBody = query.split('*').map(window.GBCommon.escapeRegExp).join('[A-Za-z0-9]*');
      regex = new RegExp('\\b' + regexBody + '\\b', caseSensitive ? 'g' : 'gi');
    } else if (pattern.quoted || query.indexOf(' ') !== -1) {
      regex = new RegExp('\\b' + window.GBCommon.escapeRegExp(query).replace(/\s+/g, '\\s+') + '\\b', caseSensitive ? 'g' : 'gi');
    } else {
      regex = new RegExp('\\b' + window.GBCommon.escapeRegExp(query) + '\\b', caseSensitive ? 'g' : 'gi');
    }

    const matches = sourceText.match(regex);
    return matches ? matches.length : 0;
  }

  function countFuzzyMatches(talk, pattern, caseSensitive) {
    const query = caseSensitive ? pattern.normalizedCase : pattern.normalized;
    const frequency = getTalkWordFrequency(talk, caseSensitive);
    let total = 0;

    frequency.forEach(function(count, word) {
      if (Math.abs(word.length - query.length) > 1) {
        return;
      }
      if (levenshtein(word, query) <= 1) {
        total += count;
      }
    });

    return total;
  }

  function levenshtein(left, right) {
    const matrix = [];
    for (let i = 0; i <= right.length; i += 1) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= left.length; j += 1) {
      matrix[0][j] = j;
    }
    for (let row = 1; row <= right.length; row += 1) {
      for (let col = 1; col <= left.length; col += 1) {
        if (right.charAt(row - 1) === left.charAt(col - 1)) {
          matrix[row][col] = matrix[row - 1][col - 1];
        } else {
          matrix[row][col] = Math.min(
            matrix[row - 1][col - 1] + 1,
            matrix[row][col - 1] + 1,
            matrix[row - 1][col] + 1
          );
        }
      }
    }
    return matrix[right.length][left.length];
  }

  function renderLegend(groups) {
    refs.legend.innerHTML = '';
    groups.forEach(function(group, index) {
      const item = document.createElement('div');
      item.className = 'gb-legend__item';
      item.innerHTML = '<span class="gb-legend__swatch" style="background:' + SERIES_COLORS[index % SERIES_COLORS.length] + '"></span><span>' + window.GBCommon.escapeHtml(group.label) + '</span>';
      refs.legend.appendChild(item);
    });
  }

  function clearLegend() {
    refs.legend.innerHTML = '';
  }

  function renderChart(aggregation, groups, settings) {
    if (!refs.plotCanvas) {
      return;
    }

    refs.plotCanvas.style.display = 'block';
    clearAggregateTable();
    destroyChart();

    const ctx = refs.plotCanvas.getContext('2d');
    if (!ctx || !window.Chart) {
      return;
    }

    const datasets = aggregation.series.map(function(seriesItem) {
      const points = aggregation.bucketKeys.map(function(key) {
        return {
          x: key,
          y: Number(seriesItem.counts[key] || 0)
        };
      });

      return {
        label: seriesItem.label,
        data: points,
        borderColor: seriesItem.color,
        backgroundColor: seriesItem.color,
        showLine: settings.chartType !== 'scatter',
        pointRadius: settings.chartType === 'bar' ? 0 : 4,
        pointHoverRadius: settings.chartType === 'bar' ? 0 : 5,
        tension: 0.2
      };
    });

    const chartType = settings.chartType === 'bar' ? 'bar' : 'scatter';
    state.chart = new window.Chart(ctx, {
      type: chartType,
      data: {
        labels: aggregation.bucketKeys.map(function(key) { return aggregation.bucketLabels.get(key); }),
        datasets: datasets
      },
      options: {
        maintainAspectRatio: true,
        responsive: true,
        animation: false,
        parsing: chartType !== 'bar',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: {
            type: 'category',
            ticks: {
              maxRotation: 45,
              minRotation: 0,
              autoSkip: true
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: settings.metricMode === 'per1000' ? 'Matches per 1000 words' : 'Matches'
            }
          }
        },
        onClick: function(event, elements) {
          if (!elements || !elements.length) {
            return;
          }
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const dataIndex = element.index;
          const group = groups[datasetIndex];
          const bucketKey = aggregation.bucketKeys[dataIndex];
          displayTalkMatches(bucketKey, group, settings);
        }
      }
    });
  }

  function destroyChart() {
    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }
  }

  function renderAggregateTable(aggregation, groups, settings) {
    refs.plotCanvas.style.display = 'none';
    const headers = groups.map(function(group) {
      return group.label;
    });

    let html = '<div class="gb-aggregate-table-wrap"><table class="gb-aggregate-table"><thead><tr><th>' + (settings.byConference ? 'Conference' : 'Year') + '</th>';
    headers.forEach(function(header) {
      html += '<th>' + window.GBCommon.escapeHtml(header) + '</th>';
    });
    html += '</tr></thead><tbody>';

    aggregation.bucketKeys.forEach(function(key) {
      html += '<tr><td>' + window.GBCommon.escapeHtml(aggregation.bucketLabels.get(key)) + '</td>';
      groups.forEach(function(group, index) {
        const value = aggregation.series[index].counts[key] || 0;
        const displayValue = settings.metricMode === 'per1000' ? Number(value).toFixed(1) : String(value);
        html += '<td class="is-clickable" data-bucket="' + window.GBCommon.escapeHtml(key) + '" data-group="' + index + '">' + window.GBCommon.escapeHtml(displayValue) + '</td>';
      });
      html += '</tr>';
    });

    if (!aggregation.bucketKeys.length) {
      html += '<tr><td colspan="' + String(headers.length + 1) + '" class="gb-empty-row">No conferences matched the current search.</td></tr>';
    }

    html += '</tbody></table></div>';
    refs.aggregateTable.innerHTML = html;

    refs.aggregateTable.querySelectorAll('td.is-clickable').forEach(function(cell) {
      cell.addEventListener('click', function() {
        const bucketKey = cell.getAttribute('data-bucket');
        const groupIndex = Number(cell.getAttribute('data-group'));
        displayTalkMatches(bucketKey, groups[groupIndex], settings);
      });
    });
  }

  function clearAggregateTable() {
    refs.aggregateTable.innerHTML = '';
    if (refs.plotCanvas) {
      refs.plotCanvas.style.display = 'block';
    }
  }

  function displayTalkMatches(bucketKey, group, settings) {
    const talkKey = group.label + '|' + bucketKey;
    const talks = (state.currentAggregation && state.currentAggregation.talkMatches.get(talkKey)) || [];
    const metricHeader = settings.metricMode === 'per1000' ? 'Per 1000' : 'Matches';
    const maxValue = talks.reduce(function(maximum, talk) {
      return Math.max(maximum, Number(talk.metricValue || 0));
    }, 0) || 1;

    const rows = talks.map(function(talk) {
      return {
        title: talk.title,
        href: talk.href,
        speaker: talk.speaker,
        year: talk.year,
        month: talk.month,
        metricPercent: Math.round((Number(talk.metricValue || 0) / maxValue) * 100),
        metricDisplay: settings.metricMode === 'per1000' ? Number(talk.metricValue || 0).toFixed(1) : String(talk.metricValue || 0),
        meta: talk.meta,
        sort: {
          newest: talk.year * 100000 + conferenceMonthOrder(talk.month) * 1000 + Number(talk.talkId || 0),
          metric: Number(talk.metricValue || 0),
          speaker: talk.speaker,
          title: talk.title
        },
        export: {
          Metric: settings.metricMode === 'per1000' ? Number(talk.metricValue || 0).toFixed(1) : String(talk.metricValue || 0),
          RawMatches: String(talk.rawCount || 0),
          Year: talk.year,
          Month: talk.month,
          Speaker: talk.speaker,
          Title: talk.title,
          Link: talk.href
        }
      };
    });

    const sortOptions = [
      { value: 'metric', label: settings.metricMode === 'per1000' ? 'Highest rate first' : 'Most matches first' },
      { value: 'newest', label: 'Newest first' },
      { value: 'speaker', label: 'Speaker A–Z' },
      { value: 'title', label: 'Title A–Z' }
    ];

    const sorters = {
      metric: function(left, right) {
        if (right.sort.metric !== left.sort.metric) {
          return right.sort.metric - left.sort.metric;
        }
        return right.sort.newest - left.sort.newest;
      },
      newest: function(left, right) {
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

    if (state.currentTalkRenderer) {
      state.currentTalkRenderer.clear();
    }

    state.currentTalkRows = rows.slice();
    refs.exportTalks.disabled = rows.length === 0;

    state.currentTalkRenderer = window.GBCommon.renderTalkResults(refs.talks, {
      idPrefix: 'word-talks',
      title: group.label + ' — ' + bucketKey,
      note: 'Click any row to open the talk on the Church website.',
      summaries: [
        { label: 'Talks', value: String(rows.length), active: false },
        { label: 'Metric', value: metricHeader, active: false }
      ],
      rows: rows,
      metricHeader: metricHeader,
      sortOptions: sortOptions,
      defaultSort: 'metric',
      sorters: sorters,
      pageSize: 25,
      emptyMessage: 'No talks matched that point on the chart.',
      exportHeaders: ['Metric', 'RawMatches', 'Year', 'Month', 'Speaker', 'Title', 'Link'],
      exportFileName: window.GBCommon.slugify(group.label + '-' + bucketKey) + '-text-search.csv'
    });
  }

  function clearTalkRows() {
    if (state.currentTalkRenderer) {
      state.currentTalkRenderer.clear();
      state.currentTalkRenderer = null;
    }
    state.currentTalkRows = [];
    refs.talks.innerHTML = '';
  }

  function exportAggregateData() {
    if (!state.currentAggregation || !state.currentAggregation.bucketKeys.length) {
      return;
    }

    const headers = [(refs.byConference.checked ? 'Conference' : 'Year')].concat(state.currentGroups.map(function(group) {
      return group.label;
    }));

    const rows = state.currentAggregation.bucketKeys.map(function(key) {
      const row = {};
      row[headers[0]] = state.currentAggregation.bucketLabels.get(key);
      state.currentGroups.forEach(function(group, index) {
        const value = state.currentAggregation.series[index].counts[key] || 0;
        row[group.label] = refs.metricPer1000.checked ? Number(value).toFixed(1) : String(value);
      });
      return row;
    });

    window.GBCommon.downloadCsv('conference-text-search-data.csv', headers, rows);
  }

  function exportTalkRows() {
    if (!state.currentTalkRows.length) {
      return;
    }

    const headers = ['Metric', 'RawMatches', 'Year', 'Month', 'Speaker', 'Title', 'Link'];
    const rows = state.currentTalkRows.map(function(row) {
      return row.export;
    });

    window.GBCommon.downloadCsv('conference-text-search-talks.csv', headers, rows);
  }
})(window, document);
