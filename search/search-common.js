
(function(window) {
  'use strict';

  const memoryCache = new Map();

  function fetchJsonCached(url, options) {
    const opts = options || {};
    const cacheKey = opts.cacheKey || url;
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    const promise = fetch(url, { cache: 'force-cache', credentials: 'omit' }).then(function(response) {
      if (!response.ok) {
        throw new Error('Request failed (' + response.status + ') for ' + url);
      }
      return response.json();
    });

    memoryCache.set(cacheKey, promise);
    return promise;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function slugify(value) {
    return String(value || 'export')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'export';
  }

  function normalizeWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function updateUrl(params, replaceState) {
    if (!window.history || !window.history.replaceState) {
      return;
    }

    const url = new URL(window.location.href);
    Object.keys(params || {}).forEach(function(key) {
      const value = params[key];
      if (value === undefined || value === null || value === '' || value === false) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(value));
      }
    });

    if (replaceState === false) {
      window.history.pushState({}, '', url.toString());
      return;
    }

    window.history.replaceState({}, '', url.toString());
  }

  function readUrlParams() {
    const result = {};
    const params = new URLSearchParams(window.location.search);
    params.forEach(function(value, key) {
      result[key] = value;
    });
    return result;
  }

  function formatCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '0';
    }
    if (Math.abs(number) >= 1000) {
      return number.toLocaleString();
    }
    if (Number.isInteger(number)) {
      return String(number);
    }
    return number.toFixed(1);
  }

  function createStatusController(element) {
    const statusEl = typeof element === 'string' ? document.getElementById(element) : element;
    return {
      show: function(message, tone, loading) {
        if (!statusEl) {
          return;
        }
        const statusTone = tone || 'info';
        statusEl.className = 'gb-status is-visible gb-status--' + statusTone;
        statusEl.innerHTML = (loading ? '<span class="gb-status__spinner" aria-hidden="true"></span>' : '') + escapeHtml(message);
      },
      hide: function() {
        if (!statusEl) {
          return;
        }
        statusEl.className = 'gb-status';
        statusEl.textContent = '';
      }
    };
  }

  function buildCsv(headers, rows) {
    const csvRows = [headers.map(csvCell).join(',')];
    rows.forEach(function(row) {
      csvRows.push(headers.map(function(header) {
        return csvCell(row[header]);
      }).join(','));
    });
    return csvRows.join('\n');
  }

  function csvCell(value) {
    const stringValue = String(value == null ? '' : value);
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }

  function downloadCsv(filename, headers, rows) {
    const blob = new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }

  function initTooltips() {
    if (window.jQuery && window.jQuery.fn && typeof window.jQuery.fn.tooltip === 'function') {
      window.jQuery('[data-toggle="tooltip"]').tooltip();
    }
  }

  function renderTalkResults(root, options) {
    if (!root) {
      return { update: function() {}, clear: function() {} };
    }

    const config = options || {};
    const allRows = Array.isArray(config.rows) ? config.rows.slice() : [];
    let pageSize = Number(config.pageSize || 25);
    if (!Number.isFinite(pageSize) || pageSize <= 0) {
      pageSize = 25;
    }

    let currentPage = 1;
    let currentSort = config.defaultSort || (config.sortOptions && config.sortOptions[0] && config.sortOptions[0].value) || '';
    const sorters = config.sorters || {};

    function sortRows(rows) {
      const sorted = rows.slice();
      const sorter = sorters[currentSort];
      if (typeof sorter === 'function') {
        sorted.sort(sorter);
      }
      return sorted;
    }

    function createResultRowHtml(row) {
      const barPercent = Math.max(0, Math.min(100, Number(row.metricPercent || 0)));
      const metricDisplay = row.metricDisplay != null ? row.metricDisplay : '';
      const href = row.href ? ' data-href="' + escapeHtml(row.href) + '"' : '';
      return ''
        + '<tr' + href + '>'
        +   '<td class="gb-metric-cell">'
        +     '<div class="gb-meter">'
        +       '<div class="gb-meter__fill" style="width:' + barPercent + '%"></div>'
        +       '<span class="gb-meter__label">' + escapeHtml(metricDisplay) + '</span>'
        +     '</div>'
        +   '</td>'
        +   '<td>' + escapeHtml(row.year) + '</td>'
        +   '<td>' + escapeHtml(row.month) + '</td>'
        +   '<td>' + escapeHtml(row.speaker) + '</td>'
        +   '<td>'
        +     (row.href ? '<a class="gb-talk-link" href="' + escapeHtml(row.href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(row.title) + '</a>' : '<span class="gb-talk-link">' + escapeHtml(row.title) + '</span>')
        +     (row.meta ? '<div class="gb-talk-meta">' + escapeHtml(row.meta) + '</div>' : '')
        +   '</td>'
        + '</tr>';
    }

    function render() {
      const sortedRows = sortRows(allRows);
      const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
      const startIndex = (currentPage - 1) * pageSize;
      const pageRows = sortedRows.slice(startIndex, startIndex + pageSize);

      let chipsHtml = '';
      (config.summaries || []).forEach(function(summary) {
        chipsHtml += '<div class="gb-chip' + (summary.active ? ' gb-chip--active' : '') + '"><span class="gb-chip__label">' + escapeHtml(summary.label) + '</span><strong class="gb-chip__value">' + escapeHtml(summary.value) + '</strong></div>';
      });

      let sortOptionsHtml = '';
      (config.sortOptions || []).forEach(function(option) {
        const selected = option.value === currentSort ? ' selected' : '';
        sortOptionsHtml += '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
      });

      let rowsHtml = '';
      if (!pageRows.length) {
        rowsHtml = '<tr class="gb-empty-row"><td colspan="5">' + escapeHtml(config.emptyMessage || 'No matching talks were found.') + '</td></tr>';
      } else {
        pageRows.forEach(function(row) {
          rowsHtml += createResultRowHtml(row);
        });
      }

      root.innerHTML = ''
        + '<section class="gb-results">'
        +   '<div class="gb-results__header">'
        +     (config.title ? '<div class="gb-search-card__heading"><div><h3 class="gb-search-card__title">' + escapeHtml(config.title) + '</h3>' + (config.note ? '<p class="gb-search-card__subtitle">' + escapeHtml(config.note) + '</p>' : '') + '</div></div>' : '')
        +     '<div class="gb-toolbar">'
        +       '<div class="gb-chip-group">' + chipsHtml + '</div>'
        +       '<div class="gb-search-card__actions">'
        +         '<label class="gb-sort-wrap" for="' + escapeHtml(config.idPrefix || 'gb') + '-sort">'
        +           '<span>Sort by</span>'
        +           '<select class="gb-select gb-select--sort" id="' + escapeHtml(config.idPrefix || 'gb') + '-sort">' + sortOptionsHtml + '</select>'
        +         '</label>'
        +         (config.exportHeaders ? '<button type="button" class="gb-btn gb-btn--secondary gb-btn--small" id="' + escapeHtml(config.idPrefix || 'gb') + '-export">Export CSV</button>' : '')
        +       '</div>'
        +     '</div>'
        +   '</div>'
        +   '<div class="gb-results__body">'
        +     '<div class="gb-table-wrap">'
        +       '<table class="gb-table">'
        +         '<thead><tr>'
        +           '<th scope="col">' + escapeHtml(config.metricHeader || 'Metric') + '</th>'
        +           '<th scope="col">Year</th>'
        +           '<th scope="col">Month</th>'
        +           '<th scope="col">Speaker</th>'
        +           '<th scope="col">Talk title</th>'
        +         '</tr></thead>'
        +         '<tbody>' + rowsHtml + '</tbody>'
        +       '</table>'
        +     '</div>'
        +   '</div>'
        +   '<div class="gb-results__footer">'
        +     '<div class="gb-pagination">'
        +       '<button type="button" class="gb-btn gb-btn--secondary gb-btn--small" id="' + escapeHtml(config.idPrefix || 'gb') + '-prev"' + (currentPage <= 1 ? ' disabled' : '') + '>Previous</button>'
        +       '<span class="gb-pagination__label">Page ' + currentPage + ' of ' + totalPages + '</span>'
        +       '<button type="button" class="gb-btn gb-btn--secondary gb-btn--small" id="' + escapeHtml(config.idPrefix || 'gb') + '-next"' + (currentPage >= totalPages ? ' disabled' : '') + '>Next</button>'
        +     '</div>'
        +     '<div class="gb-muted">Showing ' + (pageRows.length ? (startIndex + 1) : 0) + '–' + (startIndex + pageRows.length) + ' of ' + sortedRows.length + '</div>'
        +   '</div>'
        + '</section>';

      const sortEl = root.querySelector('.gb-select--sort');
      if (sortEl) {
        sortEl.addEventListener('change', function() {
          currentSort = sortEl.value;
          currentPage = 1;
          render();
        });
      }

      const prevButton = root.querySelector('#' + (config.idPrefix || 'gb') + '-prev');
      const nextButton = root.querySelector('#' + (config.idPrefix || 'gb') + '-next');
      if (prevButton) {
        prevButton.addEventListener('click', function() {
          if (currentPage > 1) {
            currentPage -= 1;
            render();
          }
        });
      }
      if (nextButton) {
        nextButton.addEventListener('click', function() {
          if (currentPage < totalPages) {
            currentPage += 1;
            render();
          }
        });
      }

      const exportButton = root.querySelector('#' + (config.idPrefix || 'gb') + '-export');
      if (exportButton) {
        exportButton.addEventListener('click', function() {
          const headers = config.exportHeaders;
          const exportRows = sortedRows.map(function(row) {
            const exportRow = {};
            headers.forEach(function(header) {
              exportRow[header] = row.export && row.export[header] !== undefined ? row.export[header] : '';
            });
            return exportRow;
          });
          downloadCsv((config.exportFileName || 'gospel-buddy-results.csv'), headers, exportRows);
        });
      }

      root.querySelectorAll('tr[data-href]').forEach(function(rowEl) {
        rowEl.addEventListener('click', function(event) {
          if (event.target && event.target.closest && event.target.closest('a, button, select, input')) {
            return;
          }
          const href = rowEl.getAttribute('data-href');
          if (href) {
            window.open(href, '_blank', 'noopener');
          }
        });
      });
    }

    render();

    return {
      update: function(nextOptions) {
        Object.assign(config, nextOptions || {});
        currentSort = config.defaultSort || currentSort;
        currentPage = 1;
        render();
      },
      clear: function() {
        root.innerHTML = '';
      }
    };
  }

  window.GBCommon = {
    fetchJsonCached: fetchJsonCached,
    escapeHtml: escapeHtml,
    escapeRegExp: escapeRegExp,
    slugify: slugify,
    normalizeWhitespace: normalizeWhitespace,
    updateUrl: updateUrl,
    readUrlParams: readUrlParams,
    formatCount: formatCount,
    createStatusController: createStatusController,
    downloadCsv: downloadCsv,
    initTooltips: initTooltips,
    renderTalkResults: renderTalkResults
  };
})(window);
