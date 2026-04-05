
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
    currentGroups: [],
    currentAggregation: null,
    currentSettings: null,
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
    state.currentGroups = [];
    state.currentAggregation = null;
    state.currentSettings = null;
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
    state.currentGroups = [];
    state.currentAggregation = null;
    state.currentSettings = null;
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


  async function fetchTalks(showLoading, loadingMessage) {
    if (showLoading) {
      refs.status.show(loadingMessage || 'Loading conference text data...', 'info', true);
    }

    const response = await fetch(TALKS_URL, { cache: 'force-cache', credentials: 'omit' });
    if (!response.ok) {
      throw new Error('Conference text data could not be loaded right now.');
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Conference text data was not in the expected format.');
    }

    return data;
  }

  async function runSearch() {
    const query = refs.input.value.trim();
    if (!query) {
      refs.status.show('Enter a word or phrase before clicking Search.', 'error', false);
      clearLegend();
      clearAggregateTable();
      clearTalkRows();
      destroyChart();
      refs.exportAggregate.disabled = true;
      refs.exportTalks.disabled = true;
      state.currentGroups = [];
      state.currentAggregation = null;
      state.currentSettings = null;
      return;
    }

    refs.searchButton.disabled = true;
    refs.status.show('Searching conference text...', 'info', true);

    try {
      const talks = await fetchTalks(false);
      const groups = parseComparisonGroups(query);
      const settings = getSettings();
      const aggregation = buildAggregation(talks, groups, settings);

      state.currentGroups = groups;
      state.currentAggregation = aggregation;
      state.currentSettings = settings;

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
      state.currentGroups = [];
      state.currentAggregation = null;
      state.currentSettings = null;
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

  function parseComparisonGroups(input) {
    const trimmed = String(input || '').trim();
    if (!trimmed) {
      throw new Error('Enter at least one search term or phrase.');
    }

    const groups = [];
    let buffer = '';
    let depth = 0;
    let inQuote = false;

    for (let index = 0; index < trimmed.length; index += 1) {
      const char = trimmed[index];

      if (char === '"' && trimmed[index - 1] !== '\\') {
        inQuote = !inQuote;
        buffer += char;
        continue;
      }

      if (!inQuote && char === '(') {
        if (depth === 0) {
          if (buffer.trim()) {
            throw new Error('Use parentheses only for comparison groups, like (faith) (charity).');
          }
          buffer = '';
          depth = 1;
          continue;
        }
        depth += 1;
      } else if (!inQuote && char === ')') {
        if (depth === 1) {
          if (buffer.trim()) {
            groups.push(parseSingleGroup(buffer.trim()));
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

    if (!groups.length) {
      return [parseSingleGroup(trimmed)];
    }

    if (buffer.trim()) {
      throw new Error('Comparison groups should be wrapped in parentheses.');
    }

    return groups;
  }

  function parseSingleGroup(rawGroup) {
    const terms = splitByOr(rawGroup).map(function(term) {
      const clean = String(term || '').trim();
      if (!clean) {
        return null;
      }
      return {
        raw: clean,
        quoted: /^".*"$/.test(clean),
        value: stripOuterQuotes(clean)
      };
    }).filter(Boolean);

    if (!terms.length) {
      throw new Error('Each comparison group needs at least one search term.');
    }

    return {
      label: rawGroup,
      terms: terms
    };
  }

  function splitByOr(rawGroup) {
    const parts = [];
    let buffer = '';
    let inQuote = false;

    for (let index = 0; index < rawGroup.length; index += 1) {
      const char = rawGroup[index];

      if (char === '"' && rawGroup[index - 1] !== '\\') {
        inQuote = !inQuote;
        buffer += char;
        continue;
      }

      if (!inQuote && rawGroup.slice(index, index + 2) === '||') {
        parts.push(buffer);
        buffer = '';
        index += 1;
        continue;
      }

      buffer += char;
    }

    if (buffer.trim()) {
      parts.push(buffer);
    }

    return parts;
  }

  function stripOuterQuotes(value) {
    const trimmed = String(value || '').trim();
    if (/^".*"$/.test(trimmed)) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  function buildAggregation(talks, groups, settings) {
    const bucketMap = new Map();
    const bucketOrder = new Map();
    const series = groups.map(function(group, groupIndex) {
      return {
        label: group.label,
        color: SERIES_COLORS[groupIndex % SERIES_COLORS.length],
        counts: {}
      };
    });

    talks.forEach(function(talk) {
      if (!passesFilters(talk, settings)) {
        return;
      }

      const text = prepareText(String(talk.text || ''), settings.caseSensitive);
      const wordCount = Math.max(1, countWords(text));
      const bucketKey = settings.byConference
        ? String(talk.month || '') + ' ' + String(talk.year || '')
        : String(talk.year || '');

      if (!bucketOrder.has(bucketKey)) {
        bucketOrder.set(bucketKey, settings.byConference
          ? Number(talk.year || 0) * 10 + conferenceMonthOrder(String(talk.month || ''))
          : Number(talk.year || 0));
        bucketMap.set(bucketKey, bucketKey);
      }

      groups.forEach(function(group, groupIndex) {
        let count = 0;
        group.terms.forEach(function(term) {
          count += countTermInText(text, term, settings.caseSensitive);
        });

        if (count <= 0) {
          return;
        }

        const adjustedCount = settings.metricMode === 'per1000'
          ? roundToOneDecimal((count / wordCount) * 1000)
          : count;

        series[groupIndex].counts[bucketKey] = (series[groupIndex].counts[bucketKey] || 0) + adjustedCount;
      });
    });

    const bucketKeys = Array.from(bucketMap.keys()).sort(function(left, right) {
      return bucketOrder.get(left) - bucketOrder.get(right);
    });

    return {
      bucketKeys: bucketKeys,
      bucketLabels: bucketMap,
      series: series
    };
  }

  function passesFilters(talk, settings) {
    const year = Number(talk.year || 0);
    const month = String(talk.month || '');
    const speaker = String(talk.speaker || '').toLowerCase();

    if (settings.yearFrom && year < settings.yearFrom) {
      return false;
    }
    if (settings.yearTo && year > settings.yearTo) {
      return false;
    }
    if (settings.month && month !== settings.month) {
      return false;
    }
    if (settings.speaker && speaker.indexOf(settings.speaker) === -1) {
      return false;
    }
    return true;
  }

  function prepareText(value, caseSensitive) {
    const normalized = String(value || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return caseSensitive ? normalized : normalized.toLowerCase();
  }

  function countWords(text) {
    if (!text) {
      return 0;
    }
    return text.split(/\s+/).length;
  }

  function countTermInText(text, term, caseSensitive) {
    const value = term.value.trim();
    if (!value || !text) {
      return 0;
    }

    const query = caseSensitive ? value : value.toLowerCase();
    const escaped = window.GBCommon.escapeRegExp(query);
    let regex;

    if (term.quoted || query.indexOf(' ') !== -1) {
      regex = new RegExp('\\b' + escaped.replace(/\s+/g, '\\s+') + '\\b', caseSensitive ? 'g' : 'gi');
    } else {
      regex = new RegExp('\\b' + escaped + '\\b', caseSensitive ? 'g' : 'gi');
    }

    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  function roundToOneDecimal(value) {
    return Math.round(Number(value || 0) * 10) / 10;
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

    if (!window.Chart) {
      return;
    }

    const ctx = refs.plotCanvas.getContext('2d');
    if (!ctx) {
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
          const bucketKey = aggregation.bucketKeys[dataIndex];
          displayTalkMatches(bucketKey, groups[datasetIndex], settings);
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

  async function displayTalkMatches(bucketKey, group, settings) {
    refs.status.show('Loading matching talks...', 'info', true);

    try {
      const talks = await fetchTalks(false);
      const rows = buildTalkRowsForBucket(talks, bucketKey, group, settings);
      renderTalkRows(bucketKey, group, settings, rows);
      refs.exportTalks.disabled = rows.length === 0;
      refs.status.hide();
    } catch (error) {
      clearTalkRows();
      refs.exportTalks.disabled = true;
      refs.status.show(error && error.message ? error.message : 'Matching talks could not be loaded.', 'error', false);
    }
  }

  function buildTalkRowsForBucket(talks, bucketKey, group, settings) {
    const rows = [];

    talks.forEach(function(talk) {
      if (!passesFilters(talk, settings)) {
        return;
      }

      const talkBucketKey = settings.byConference
        ? String(talk.month || '') + ' ' + String(talk.year || '')
        : String(talk.year || '');

      if (talkBucketKey !== bucketKey) {
        return;
      }

      const text = prepareText(String(talk.text || ''), settings.caseSensitive);
      const wordCount = Math.max(1, countWords(text));
      let count = 0;

      group.terms.forEach(function(term) {
        count += countTermInText(text, term, settings.caseSensitive);
      });

      if (count <= 0) {
        return;
      }

      const metricValue = settings.metricMode === 'per1000'
        ? roundToOneDecimal((count / wordCount) * 1000)
        : count;

      rows.push({
        title: String(talk.title || 'Untitled talk'),
        href: String(talk.hyperlink || ''),
        speaker: String(talk.speaker || 'Unknown speaker'),
        year: Number(talk.year || 0),
        month: String(talk.month || ''),
        metricPercent: 0,
        metricDisplay: settings.metricMode === 'per1000' ? metricValue.toFixed(1) : String(count),
        meta: settings.metricMode === 'per1000'
          ? count + ' matches · ' + metricValue.toFixed(1) + ' per 1000 words'
          : count + ' ' + (count === 1 ? 'match' : 'matches'),
        sort: {
          newest: Number(talk.year || 0) * 100000 + conferenceMonthOrder(String(talk.month || '')) * 1000 + Number(talk['talk-id'] || talk.talk_id || 0),
          metric: metricValue,
          speaker: String(talk.speaker || ''),
          title: String(talk.title || '')
        },
        export: {
          Metric: settings.metricMode === 'per1000' ? metricValue.toFixed(1) : String(count),
          RawMatches: String(count),
          Year: Number(talk.year || 0),
          Month: String(talk.month || ''),
          Speaker: String(talk.speaker || ''),
          Title: String(talk.title || ''),
          Link: String(talk.hyperlink || '')
        }
      });
    });

    const maxValue = rows.reduce(function(maximum, row) {
      return Math.max(maximum, Number(row.sort.metric || 0));
    }, 0) || 1;

    rows.forEach(function(row) {
      row.metricPercent = Math.round((Number(row.sort.metric || 0) / maxValue) * 100);
    });

    return rows;
  }

  function renderTalkRows(bucketKey, group, settings, rows) {
    const metricHeader = settings.metricMode === 'per1000' ? 'Per 1000' : 'Matches';

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
