(function(window, document) {
  'use strict';

  var TALKS_URL = 'https://kameronyork.com/datasets/general-conference-talks.json';
  var DEFAULTS = {
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

  var SERIES_COLORS = ['#E74C3C', '#191970', '#229954', '#F39C12', '#7D3C98', '#0096c7', '#d97706', '#475569'];
  var refs = {};
  var state = {
    currentGroups: [],
    currentAggregation: null,
    currentSettings: null,
    currentTalkRows: [],
    currentPoints: []
  };

  document.addEventListener('DOMContentLoaded', initialize);

  function initialize() {
    cacheDom();
    bindEvents();
    applyDefaults();
    loadFromUrl();
    renderEmptyCanvas();
    if (window.GBCommon && typeof window.GBCommon.initTooltips === 'function') {
      window.GBCommon.initTooltips();
    }
  }

  function cacheDom() {
    refs.input = document.getElementById('wordInput');
    refs.searchButton = document.getElementById('wordSearchButton');
    refs.clearButton = document.getElementById('wordClearButton');
    refs.resetButton = document.getElementById('wordsResetDefaults');
    refs.status = window.GBCommon && window.GBCommon.createStatusController ? window.GBCommon.createStatusController('wordStatus') : createFallbackStatusController();
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

  function createFallbackStatusController() {
    var statusEl = document.getElementById('wordStatus');
    return {
      show: function(message) {
        if (statusEl) {
          statusEl.textContent = message;
          statusEl.style.display = 'block';
        }
      },
      hide: function() {
        if (statusEl) {
          statusEl.textContent = '';
          statusEl.style.display = 'none';
        }
      }
    };
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

    if (refs.plotCanvas) {
      refs.plotCanvas.addEventListener('click', handleCanvasClick);
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
    if (refs.input) { refs.input.value = DEFAULTS.query; }
    if (refs.byConference) { refs.byConference.checked = DEFAULTS.byConference; }
    if (refs.tableMode) { refs.tableMode.checked = DEFAULTS.tableMode; }
    if (refs.metricPer1000) { refs.metricPer1000.checked = DEFAULTS.metricMode === 'per1000'; }
    if (refs.metricPerTalk) { refs.metricPerTalk.checked = DEFAULTS.metricMode === 'perTalk'; }
    if (refs.chartType) { refs.chartType.value = DEFAULTS.chartType; }
    if (refs.caseSensitive) { refs.caseSensitive.checked = DEFAULTS.caseSensitive; }
    if (refs.yearFrom) { refs.yearFrom.value = DEFAULTS.yearFrom; }
    if (refs.yearTo) { refs.yearTo.value = DEFAULTS.yearTo; }
    if (refs.month) { refs.month.value = DEFAULTS.month; }
    if (refs.speaker) { refs.speaker.value = DEFAULTS.speaker; }
    if (refs.exportAggregate) { refs.exportAggregate.disabled = true; }
    if (refs.exportTalks) { refs.exportTalks.disabled = true; }
    clearLegend();
    clearAggregateTable();
    clearTalkRows();
    state.currentGroups = [];
    state.currentAggregation = null;
    state.currentSettings = null;
    state.currentTalkRows = [];
    state.currentPoints = [];
  }

  function resetDefaults() {
    applyDefaults();
    updateUrlFromState();
    renderEmptyCanvas();
  }

  function clearQuery() {
    if (refs.input) { refs.input.value = ''; }
    refs.status.hide();
    clearLegend();
    clearAggregateTable();
    clearTalkRows();
    state.currentGroups = [];
    state.currentAggregation = null;
    state.currentSettings = null;
    state.currentTalkRows = [];
    state.currentPoints = [];
    if (refs.exportAggregate) { refs.exportAggregate.disabled = true; }
    if (refs.exportTalks) { refs.exportTalks.disabled = true; }
    updateUrlFromState();
    renderEmptyCanvas();
  }

  function loadFromUrl() {
    if (!window.GBCommon || typeof window.GBCommon.readUrlParams !== 'function') {
      return;
    }
    var params = window.GBCommon.readUrlParams();
    if (!params || !Object.keys(params).length) {
      return;
    }

    if (refs.input) { refs.input.value = params.query || ''; }
    if (refs.byConference) { refs.byConference.checked = params.byConference === '1'; }
    if (refs.tableMode) { refs.tableMode.checked = params.tableMode === '1'; }
    if (refs.metricPer1000) { refs.metricPer1000.checked = (params.metric || DEFAULTS.metricMode) !== 'perTalk'; }
    if (refs.metricPerTalk) { refs.metricPerTalk.checked = (params.metric || DEFAULTS.metricMode) === 'perTalk'; }
    if (refs.chartType) {
      refs.chartType.value = (params.chartType === 'line' || params.chartType === 'bar' || params.chartType === 'scatter') ? params.chartType : DEFAULTS.chartType;
    }
    if (refs.caseSensitive) { refs.caseSensitive.checked = params.caseSensitive === '1'; }
    if (refs.yearFrom) { refs.yearFrom.value = params.yearFrom || ''; }
    if (refs.yearTo) { refs.yearTo.value = params.yearTo || ''; }
    if (refs.month) { refs.month.value = params.month || ''; }
    if (refs.speaker) { refs.speaker.value = params.speaker || ''; }
  }

  function updateUrlFromState() {
    if (!window.GBCommon || typeof window.GBCommon.updateUrl !== 'function') {
      return;
    }
    window.GBCommon.updateUrl({
      query: refs.input ? refs.input.value : '',
      byConference: refs.byConference && refs.byConference.checked ? 1 : '',
      tableMode: refs.tableMode && refs.tableMode.checked ? 1 : '',
      metric: getMetricMode(),
      chartType: refs.chartType && refs.chartType.value !== DEFAULTS.chartType ? refs.chartType.value : '',
      caseSensitive: refs.caseSensitive && refs.caseSensitive.checked ? 1 : '',
      yearFrom: refs.yearFrom ? refs.yearFrom.value : '',
      yearTo: refs.yearTo ? refs.yearTo.value : '',
      month: refs.month ? refs.month.value : '',
      speaker: refs.speaker ? refs.speaker.value : ''
    });
  }

  function getMetricMode() {
    return refs.metricPerTalk && refs.metricPerTalk.checked ? 'perTalk' : 'per1000';
  }

  function getSettings() {
    return {
      byConference: !!(refs.byConference && refs.byConference.checked),
      tableMode: !!(refs.tableMode && refs.tableMode.checked),
      metricMode: getMetricMode(),
      chartType: refs.chartType ? refs.chartType.value : 'scatter',
      caseSensitive: !!(refs.caseSensitive && refs.caseSensitive.checked),
      yearFrom: refs.yearFrom && refs.yearFrom.value ? Number(refs.yearFrom.value) : null,
      yearTo: refs.yearTo && refs.yearTo.value ? Number(refs.yearTo.value) : null,
      month: refs.month && refs.month.value ? refs.month.value : '',
      speaker: refs.speaker ? String(refs.speaker.value || '').trim().toLowerCase() : ''
    };
  }

  async function fetchTalks(showLoading, loadingMessage) {
    if (showLoading) {
      refs.status.show(loadingMessage || 'Loading conference text data...', 'info', true);
    }
    var response = await fetch(TALKS_URL, { cache: 'force-cache', credentials: 'omit' });
    if (!response.ok) {
      throw new Error('Conference text data could not be loaded right now.');
    }
    var data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Conference text data was not in the expected format.');
    }
    return data;
  }

  async function runSearch() {
    var query = refs.input ? String(refs.input.value || '').trim() : '';
    if (!query) {
      refs.status.show('Enter a word or phrase before clicking Search.', 'error', false);
      clearLegend();
      clearAggregateTable();
      clearTalkRows();
      renderEmptyCanvas();
      return;
    }

    if (refs.searchButton) { refs.searchButton.disabled = true; }
    refs.status.show('Searching conference text...', 'info', true);

    try {
      var talks = await fetchTalks(false);
      var groups = parseGroupsLite(query);
      var settings = getSettings();
      var aggregation = buildAggregationLite(talks, groups, settings);

      state.currentGroups = groups;
      state.currentAggregation = aggregation;
      state.currentSettings = settings;
      state.currentTalkRows = [];

      renderLegend(groups);

      if (settings.tableMode) {
        renderAggregateTable(aggregation, groups, settings);
      } else {
        clearAggregateTable();
        renderCanvasChart(aggregation, groups, settings);
      }

      clearTalkRows();
      if (refs.exportAggregate) { refs.exportAggregate.disabled = aggregation.bucketKeys.length === 0; }
      if (refs.exportTalks) { refs.exportTalks.disabled = true; }
      refs.status.hide();
      updateUrlFromState();
    } catch (error) {
      clearLegend();
      clearAggregateTable();
      clearTalkRows();
      renderEmptyCanvas();
      if (refs.exportAggregate) { refs.exportAggregate.disabled = true; }
      if (refs.exportTalks) { refs.exportTalks.disabled = true; }
      refs.status.show(error && error.message ? error.message : 'Something went wrong while searching conference text.', 'error', false);
    } finally {
      if (refs.searchButton) { refs.searchButton.disabled = false; }
    }
  }

  function parseGroupsLite(input) {
    var trimmed = String(input || '').trim();
    if (!trimmed) {
      throw new Error('Enter at least one search term.');
    }
    var groups = [];
    var matches = trimmed.match(/\([^()]+\)/g);
    if (matches && matches.length) {
      matches.forEach(function(chunk) {
        var raw = chunk.slice(1, -1).trim();
        if (raw) {
          groups.push(makeGroup(raw));
        }
      });
    } else {
      groups.push(makeGroup(trimmed));
    }
    if (!groups.length) {
      throw new Error('Enter at least one search term.');
    }
    return groups;
  }

  function makeGroup(raw) {
    var parts = String(raw || '').split('||').map(function(part) {
      return String(part || '').trim();
    }).filter(Boolean);
    if (!parts.length) {
      throw new Error('Each comparison group needs at least one search term.');
    }
    return {
      label: raw,
      terms: parts.map(function(part) {
        return {
          raw: part,
          quoted: /^".*"$/.test(part),
          value: stripOuterQuotes(part)
        };
      })
    };
  }

  function stripOuterQuotes(value) {
    var trimmed = String(value || '').trim();
    if (/^".*"$/.test(trimmed)) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  function buildAggregationLite(talks, groups, settings) {
    var bucketOrder = {};
    var bucketLabels = {};
    var bucketKeys = [];
    var countsByGroup = {};

    groups.forEach(function(group) {
      countsByGroup[group.label] = {};
    });

    talks.forEach(function(talk) {
      if (!passesFilters(talk, settings)) {
        return;
      }

      var bucketKey = settings.byConference
        ? String(talk.month || '') + ' ' + String(talk.year || '')
        : String(talk.year || '');

      if (!bucketLabels[bucketKey]) {
        bucketLabels[bucketKey] = bucketKey;
        bucketOrder[bucketKey] = settings.byConference
          ? Number(talk.year || 0) * 10 + conferenceMonthOrder(String(talk.month || ''))
          : Number(talk.year || 0);
        bucketKeys.push(bucketKey);
      }

      var preparedText = prepareText(String(talk.text || ''), settings.caseSensitive);
      var wordCount = Math.max(1, preparedText.split(/\s+/).length);

      groups.forEach(function(group) {
        var groupCount = 0;
        group.terms.forEach(function(term) {
          groupCount += countTermInText(preparedText, term, settings.caseSensitive);
        });
        if (!groupCount) {
          return;
        }
        var value = settings.metricMode === 'per1000'
          ? roundToOneDecimal((groupCount / wordCount) * 1000)
          : groupCount;
        countsByGroup[group.label][bucketKey] = (countsByGroup[group.label][bucketKey] || 0) + value;
      });
    });

    bucketKeys.sort(function(a, b) {
      return (bucketOrder[a] || 0) - (bucketOrder[b] || 0);
    });

    return {
      bucketKeys: bucketKeys,
      bucketLabels: bucketLabels,
      series: groups.map(function(group, index) {
        return {
          label: group.label,
          color: SERIES_COLORS[index % SERIES_COLORS.length],
          counts: countsByGroup[group.label] || {}
        };
      })
    };
  }

  function passesFilters(talk, settings) {
    var year = Number(talk.year || 0);
    var month = String(talk.month || '');
    var speaker = String(talk.speaker || '').toLowerCase();

    if (settings.yearFrom && year < settings.yearFrom) { return false; }
    if (settings.yearTo && year > settings.yearTo) { return false; }
    if (settings.month && month !== settings.month) { return false; }
    if (settings.speaker && speaker.indexOf(settings.speaker) === -1) { return false; }
    return true;
  }

  function prepareText(value, caseSensitive) {
    var normalized = String(value || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return caseSensitive ? normalized : normalized.toLowerCase();
  }

  function countTermInText(text, term, caseSensitive) {
    var value = String(term && term.value ? term.value : '').trim();
    if (!value || !text) {
      return 0;
    }
    var query = caseSensitive ? value : value.toLowerCase();
    var escaped = window.GBCommon && window.GBCommon.escapeRegExp ? window.GBCommon.escapeRegExp(query) : escapeRegExp(query);
    var pattern = (term.quoted || query.indexOf(' ') !== -1)
      ? '\\b' + escaped.replace(/\s+/g, '\\s+') + '\\b'
      : '\\b' + escaped + '\\b';
    var regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    var count = 0;
    while (regex.exec(text)) {
      count += 1;
    }
    return count;
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function roundToOneDecimal(value) {
    return Math.round(Number(value || 0) * 10) / 10;
  }

  function conferenceMonthOrder(month) {
    if (month === 'April') { return 4; }
    if (month === 'October') { return 10; }
    return 1;
  }

  function renderLegend(groups) {
    if (!refs.legend) { return; }
    refs.legend.innerHTML = '';
    groups.forEach(function(group, index) {
      var item = document.createElement('div');
      item.className = 'gb-legend__item';
      item.innerHTML = '<span class="gb-legend__swatch" style="background:' + SERIES_COLORS[index % SERIES_COLORS.length] + '"></span><span>' + escapeHtml(group.label) + '</span>';
      refs.legend.appendChild(item);
    });
  }

  function clearLegend() {
    if (refs.legend) {
      refs.legend.innerHTML = '';
    }
  }

  function getCanvasContext() {
    if (!refs.plotCanvas) {
      return null;
    }
    var canvas = refs.plotCanvas;
    var width = canvas.clientWidth || canvas.offsetWidth || 640;
    if (width < 280) { width = 280; }
    canvas.width = width;
    canvas.height = Math.round(width * 0.68);
    canvas.style.display = 'block';
    return canvas.getContext('2d');
  }

  function renderEmptyCanvas() {
    if (!refs.plotCanvas) { return; }
    var ctx = getCanvasContext();
    if (!ctx) { return; }
    var canvas = refs.plotCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#d1d5db';
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run a search to see results.', canvas.width / 2, canvas.height / 2);
  }

  function renderCanvasChart(aggregation, groups, settings) {
    if (!refs.plotCanvas) { return; }
    var ctx = getCanvasContext();
    if (!ctx) { return; }
    var canvas = refs.plotCanvas;
    var margin = { top: 20, right: 14, bottom: 56, left: 42 };
    var plotWidth = canvas.width - margin.left - margin.right;
    var plotHeight = canvas.height - margin.top - margin.bottom;
    var allKeys = aggregation.bucketKeys.slice();
    var maxValue = 0;
    state.currentPoints = [];

    aggregation.series.forEach(function(series) {
      allKeys.forEach(function(key) {
        maxValue = Math.max(maxValue, Number(series.counts[key] || 0));
      });
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#d1d5db';
    ctx.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

    if (!allKeys.length || maxValue <= 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No conferences matched the current search.', canvas.width / 2, canvas.height / 2);
      return;
    }

    var ySteps = chooseYAxisStep(maxValue);
    var xStep = allKeys.length > 1 ? plotWidth / (allKeys.length - 1) : 0;
    var pointRadius = canvas.width < 420 ? 3 : 4;

    ctx.strokeStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var y = 0; y <= maxValue + 0.0001; y += ySteps) {
      var py = margin.top + plotHeight - ((y / maxValue) * plotHeight);
      ctx.fillText(formatAxisValue(y, settings), margin.left - 6, py);
      ctx.strokeStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.moveTo(margin.left, py);
      ctx.lineTo(margin.left + plotWidth, py);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var labelEvery = chooseLabelEvery(allKeys.length);
    allKeys.forEach(function(key, index) {
      if (index % labelEvery !== 0) {
        return;
      }
      var px = margin.left + (xStep * index);
      ctx.save();
      ctx.translate(px, margin.top + plotHeight + 8);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = '#374151';
      ctx.fillText(aggregation.bucketLabels[key], 0, 0);
      ctx.restore();
    });

    aggregation.series.forEach(function(series, seriesIndex) {
      var color = series.color;
      var previous = null;
      if (settings.chartType === 'line') {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
      }
      allKeys.forEach(function(key, index) {
        var value = Number(series.counts[key] || 0);
        var px = margin.left + (xStep * index);
        var py = margin.top + plotHeight - ((value / maxValue) * plotHeight);

        if (settings.chartType === 'bar') {
          var barWidth = Math.max(6, Math.min(18, (plotWidth / Math.max(allKeys.length, 1)) * 0.7 / Math.max(aggregation.series.length, 1)));
          var offset = (seriesIndex - (aggregation.series.length - 1) / 2) * (barWidth + 1);
          var barHeight = (value / maxValue) * plotHeight;
          ctx.fillStyle = color;
          ctx.fillRect(px + offset - (barWidth / 2), margin.top + plotHeight - barHeight, barWidth, barHeight);
          state.currentPoints.push({
            x: px + offset,
            y: margin.top + plotHeight - barHeight,
            width: barWidth,
            height: barHeight,
            bucketKey: key,
            groupIndex: seriesIndex,
            mode: 'bar'
          });
        } else {
          if (settings.chartType === 'line') {
            if (!previous) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
            previous = { x: px, y: py };
          }
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc(px, py, pointRadius, 0, Math.PI * 2);
          ctx.fill();
          state.currentPoints.push({
            x: px,
            y: py,
            radius: pointRadius + 6,
            bucketKey: key,
            groupIndex: seriesIndex,
            mode: 'point'
          });
        }
      });
      if (settings.chartType === 'line') {
        ctx.stroke();
      }
    });
  }

  function handleCanvasClick(event) {
    if (!state.currentPoints.length || !state.currentAggregation || !state.currentSettings || (refs.tableMode && refs.tableMode.checked)) {
      return;
    }
    var rect = refs.plotCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var hit = null;

    state.currentPoints.forEach(function(point) {
      if (hit) { return; }
      if (point.mode === 'bar') {
        var left = point.x - point.width / 2;
        var right = point.x + point.width / 2;
        var bottom = refs.plotCanvas.height - 56;
        if (x >= left && x <= right && y >= point.y && y <= bottom) {
          hit = point;
        }
      } else {
        var dx = point.x - x;
        var dy = point.y - y;
        if (Math.sqrt(dx * dx + dy * dy) <= point.radius) {
          hit = point;
        }
      }
    });

    if (hit) {
      displayTalkMatches(hit.bucketKey, state.currentGroups[hit.groupIndex], state.currentSettings);
    }
  }

  function chooseYAxisStep(maxValue) {
    if (maxValue <= 5) { return 1; }
    if (maxValue <= 10) { return 2; }
    if (maxValue <= 25) { return 5; }
    if (maxValue <= 50) { return 10; }
    if (maxValue <= 100) { return 20; }
    if (maxValue <= 250) { return 50; }
    if (maxValue <= 500) { return 100; }
    return Math.ceil(maxValue / 5 / 100) * 100;
  }

  function chooseLabelEvery(length) {
    if (length <= 8) { return 1; }
    if (length <= 16) { return 2; }
    if (length <= 30) { return 3; }
    if (length <= 50) { return 5; }
    return 8;
  }

  function formatAxisValue(value, settings) {
    return settings.metricMode === 'per1000' ? String(roundToOneDecimal(value)) : String(Math.round(value));
  }

  function renderAggregateTable(aggregation, groups, settings) {
    if (refs.plotCanvas) {
      refs.plotCanvas.style.display = 'none';
    }
    if (!refs.aggregateTable) {
      return;
    }
    var html = '<div class="gb-aggregate-table-wrap"><table class="gb-aggregate-table"><thead><tr><th>' + (settings.byConference ? 'Conference' : 'Year') + '</th>';
    groups.forEach(function(group) {
      html += '<th>' + escapeHtml(group.label) + '</th>';
    });
    html += '</tr></thead><tbody>';

    aggregation.bucketKeys.forEach(function(key) {
      html += '<tr><td>' + escapeHtml(aggregation.bucketLabels[key]) + '</td>';
      groups.forEach(function(group, index) {
        var value = Number(aggregation.series[index].counts[key] || 0);
        var displayValue = settings.metricMode === 'per1000' ? value.toFixed(1) : String(Math.round(value));
        html += '<td class="is-clickable" data-bucket="' + escapeHtml(key) + '" data-group="' + index + '">' + escapeHtml(displayValue) + '</td>';
      });
      html += '</tr>';
    });

    if (!aggregation.bucketKeys.length) {
      html += '<tr><td colspan="' + (groups.length + 1) + '" class="gb-empty-row">No conferences matched the current search.</td></tr>';
    }

    html += '</tbody></table></div>';
    refs.aggregateTable.innerHTML = html;

    Array.prototype.forEach.call(refs.aggregateTable.querySelectorAll('td.is-clickable'), function(cell) {
      cell.addEventListener('click', function() {
        var bucketKey = cell.getAttribute('data-bucket');
        var groupIndex = Number(cell.getAttribute('data-group'));
        displayTalkMatches(bucketKey, state.currentGroups[groupIndex], state.currentSettings);
      });
    });
  }

  function clearAggregateTable() {
    if (refs.aggregateTable) {
      refs.aggregateTable.innerHTML = '';
    }
    if (refs.plotCanvas) {
      refs.plotCanvas.style.display = 'block';
    }
  }

  async function displayTalkMatches(bucketKey, group, settings) {
    refs.status.show('Loading matching talks...', 'info', true);
    try {
      var talks = await fetchTalks(false);
      var rows = buildTalkRowsForBucket(talks, bucketKey, group, settings);
      state.currentTalkRows = rows;
      renderTalkRows(bucketKey, group, settings, rows);
      if (refs.exportTalks) { refs.exportTalks.disabled = rows.length === 0; }
      refs.status.hide();
    } catch (error) {
      clearTalkRows();
      if (refs.exportTalks) { refs.exportTalks.disabled = true; }
      refs.status.show(error && error.message ? error.message : 'Matching talks could not be loaded.', 'error', false);
    }
  }

  function buildTalkRowsForBucket(talks, groupBucketKey, group, settings) {
    var rows = [];
    talks.forEach(function(talk) {
      if (!passesFilters(talk, settings)) {
        return;
      }
      var talkBucketKey = settings.byConference
        ? String(talk.month || '') + ' ' + String(talk.year || '')
        : String(talk.year || '');
      if (talkBucketKey !== groupBucketKey) {
        return;
      }
      var preparedText = prepareText(String(talk.text || ''), settings.caseSensitive);
      var wordCount = Math.max(1, preparedText.split(/\s+/).length);
      var count = 0;
      group.terms.forEach(function(term) {
        count += countTermInText(preparedText, term, settings.caseSensitive);
      });
      if (!count) {
        return;
      }
      var metricValue = settings.metricMode === 'per1000'
        ? roundToOneDecimal((count / wordCount) * 1000)
        : count;
      rows.push({
        title: String(talk.title || 'Untitled talk'),
        href: String(talk.hyperlink || ''),
        speaker: String(talk.speaker || 'Unknown speaker'),
        year: Number(talk.year || 0),
        month: String(talk.month || ''),
        metricValue: metricValue,
        rawMatches: count,
        sortNewest: Number(talk.year || 0) * 100000 + conferenceMonthOrder(String(talk.month || '')) * 1000 + Number(talk['talk-id'] || talk.talk_id || 0)
      });
    });

    rows.sort(function(a, b) {
      if (b.metricValue !== a.metricValue) {
        return b.metricValue - a.metricValue;
      }
      return b.sortNewest - a.sortNewest;
    });

    return rows;
  }

  function renderTalkRows(bucketKey, group, settings, rows) {
    if (!refs.talks) {
      return;
    }
    var maxMetric = 1;
    rows.forEach(function(row) {
      if (row.metricValue > maxMetric) {
        maxMetric = row.metricValue;
      }
    });

    var html = '';
    html += '<div class="gb-talk-results">';
    html += '<div class="gb-talk-results__header">';
    html += '<h3>' + escapeHtml(group.label + ' — ' + bucketKey) + '</h3>';
    html += '<p>' + rows.length + ' matching talks</p>';
    html += '</div>';
    html += '<div class="gb-talk-results__table-wrap">';
    html += '<table class="gb-aggregate-table"><thead><tr><th>' + (settings.metricMode === 'per1000' ? 'Per 1000' : 'Matches') + '</th><th>Year</th><th>Month</th><th>Speaker</th><th>Talk</th></tr></thead><tbody>';

    rows.forEach(function(row) {
      var pct = Math.max(4, Math.round((row.metricValue / maxMetric) * 100));
      var metricDisplay = settings.metricMode === 'per1000' ? Number(row.metricValue).toFixed(1) : String(row.rawMatches);
      html += '<tr>';
      html += '<td><div style="position:relative;min-width:70px;padding:4px 6px;text-align:center;background:linear-gradient(90deg,#F39C12 ' + pct + '%,transparent ' + pct + '%);">' + escapeHtml(metricDisplay) + '</div></td>';
      html += '<td>' + escapeHtml(String(row.year)) + '</td>';
      html += '<td>' + escapeHtml(row.month) + '</td>';
      html += '<td>' + escapeHtml(row.speaker) + '</td>';
      html += '<td>' + (row.href ? '<a href="' + escapeAttribute(row.href) + '" target="_blank" rel="noopener">' + escapeHtml(row.title) + '</a>' : escapeHtml(row.title)) + '</td>';
      html += '</tr>';
    });

    if (!rows.length) {
      html += '<tr><td colspan="5" class="gb-empty-row">No talks matched that point on the chart.</td></tr>';
    }

    html += '</tbody></table></div></div>';
    refs.talks.innerHTML = html;
  }

  function clearTalkRows() {
    state.currentTalkRows = [];
    if (refs.talks) {
      refs.talks.innerHTML = '';
    }
  }

  function exportAggregateData() {
    if (!state.currentAggregation || !state.currentAggregation.bucketKeys || !state.currentAggregation.bucketKeys.length || !window.GBCommon || typeof window.GBCommon.downloadCsv !== 'function') {
      return;
    }
    var headers = [(state.currentSettings && state.currentSettings.byConference) ? 'Conference' : 'Year'];
    state.currentGroups.forEach(function(group) { headers.push(group.label); });
    var rows = state.currentAggregation.bucketKeys.map(function(key) {
      var row = {};
      row[headers[0]] = state.currentAggregation.bucketLabels[key];
      state.currentGroups.forEach(function(group, index) {
        var value = Number(state.currentAggregation.series[index].counts[key] || 0);
        row[group.label] = state.currentSettings.metricMode === 'per1000' ? value.toFixed(1) : String(Math.round(value));
      });
      return row;
    });
    window.GBCommon.downloadCsv('conference-text-search-data.csv', headers, rows);
  }

  function exportTalkRows() {
    if (!state.currentTalkRows.length || !window.GBCommon || typeof window.GBCommon.downloadCsv !== 'function') {
      return;
    }
    var headers = ['Metric', 'RawMatches', 'Year', 'Month', 'Speaker', 'Title', 'Link'];
    var rows = state.currentTalkRows.map(function(row) {
      return {
        Metric: state.currentSettings.metricMode === 'per1000' ? Number(row.metricValue).toFixed(1) : String(row.rawMatches),
        RawMatches: String(row.rawMatches),
        Year: String(row.year),
        Month: row.month,
        Speaker: row.speaker,
        Title: row.title,
        Link: row.href
      };
    });
    window.GBCommon.downloadCsv('conference-text-search-talks.csv', headers, rows);
  }

  function escapeHtml(value) {
    if (window.GBCommon && typeof window.GBCommon.escapeHtml === 'function') {
      return window.GBCommon.escapeHtml(value);
    }
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})(window, document);
