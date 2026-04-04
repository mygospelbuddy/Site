
(function(window) {
  'use strict';

  const SIMPLE_VERSE_URL = 'https://kameronyork.com/datasets/simple-scripture-verses.json';
  const MAX_REFERENCE_VERSES = 250;

  const BOOK_DECODER = {
    'gen': 'Genesis',
    'ex': 'Exodus',
    'lev': 'Leviticus',
    'num': 'Numbers',
    'deut': 'Deuteronomy',
    'josh': 'Joshua',
    'judg': 'Judges',
    'ruth': 'Ruth',
    '1-sam': '1 Samuel',
    '2-sam': '2 Samuel',
    '1-kgs': '1 Kings',
    '2-kgs': '2 Kings',
    '1-chr': '1 Chronicles',
    '2-chr': '2 Chronicles',
    'ezra': 'Ezra',
    'neh': 'Nehemiah',
    'esth': 'Esther',
    'job': 'Job',
    'ps': 'Psalm',
    'prov': 'Proverbs',
    'eccl': 'Ecclesiastes',
    'song': 'Song of Solomon',
    'isa': 'Isaiah',
    'jer': 'Jeremiah',
    'lam': 'Lamentations',
    'ezek': 'Ezekiel',
    'dan': 'Daniel',
    'hosea': 'Hosea',
    'joel': 'Joel',
    'amos': 'Amos',
    'obad': 'Obadiah',
    'jonah': 'Jonah',
    'micah': 'Micah',
    'nahum': 'Nahum',
    'hab': 'Habakkuk',
    'zeph': 'Zephaniah',
    'hag': 'Haggai',
    'zech': 'Zechariah',
    'mal': 'Malachi',
    'matt': 'Matthew',
    'mark': 'Mark',
    'luke': 'Luke',
    'john': 'John',
    'acts': 'Acts',
    'rom': 'Romans',
    '1-cor': '1 Corinthians',
    '2-cor': '2 Corinthians',
    'gal': 'Galatians',
    'eph': 'Ephesians',
    'philip': 'Philippians',
    'col': 'Colossians',
    '1-thes': '1 Thessalonians',
    '2-thes': '2 Thessalonians',
    '1-tim': '1 Timothy',
    '2-tim': '2 Timothy',
    'titus': 'Titus',
    'philem': 'Philemon',
    'heb': 'Hebrews',
    'james': 'James',
    '1-pet': '1 Peter',
    '2-pet': '2 Peter',
    '1-jn': '1 John',
    '2-jn': '2 John',
    '3-jn': '3 John',
    'jude': 'Jude',
    'rev': 'Revelation',
    '1-ne': '1 Nephi',
    '2-ne': '2 Nephi',
    'jacob': 'Jacob',
    'enos': 'Enos',
    'jarom': 'Jarom',
    'omni': 'Omni',
    'w-of-m': 'Words of Mormon',
    'mosiah': 'Mosiah',
    'alma': 'Alma',
    'hel': 'Helaman',
    '3-ne': '3 Nephi',
    '4-ne': '4 Nephi',
    'morm': 'Mormon',
    'ether': 'Ether',
    'moro': 'Moroni',
    'dc': 'D&C',
    'moses': 'Moses',
    'abr': 'Abraham',
    'js-m': 'Joseph Smith Matthew',
    'js-h': 'Joseph Smith History',
    'a-of-f': 'Articles of Faith'
  };

  const state = {
    metadataPromise: null,
    metadata: null,
    aliasMap: new Map()
  };

  function normalizeBookToken(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[—–-]/g, ' ')
      .replace(/&/g, ' and ')
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeReferenceText(value) {
    return String(value || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–]/g, '-')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getMetadata() {
    if (!state.metadataPromise) {
      state.metadataPromise = window.GBCommon.fetchJsonCached(SIMPLE_VERSE_URL, { cacheKey: 'simple-scripture-verses' }).then(function(records) {
        state.metadata = buildMetadataIndex(Array.isArray(records) ? records : []);
        buildAliasMap(state.metadata.books);
        return state.metadata;
      });
    }
    return state.metadataPromise;
  }

  function buildMetadataIndex(records) {
    const books = new Map();
    const booksByGroup = new Map();
    const chaptersByBook = new Map();
    const versesByChapter = new Map();
    const recordsByBook = new Map();

    records.forEach(function(record) {
      const book = String(record.book || '');
      const group = String(record.overall_book || '');
      const chapter = Number(record.chapter);
      const verse = Number(record.verse);

      if (!books.has(book)) {
        books.set(book, {
          book: book,
          overallBook: group,
          bookOrder: Number(record.book_order),
          subOrder: Number(record.book_sub_order)
        });
      }

      if (!booksByGroup.has(group)) {
        booksByGroup.set(group, []);
      }
      if (!booksByGroup.get(group).includes(book)) {
        booksByGroup.get(group).push(book);
      }

      if (!chaptersByBook.has(book)) {
        chaptersByBook.set(book, new Set());
      }
      chaptersByBook.get(book).add(chapter);

      const chapterKey = buildChapterKey(book, chapter);
      if (!versesByChapter.has(chapterKey)) {
        versesByChapter.set(chapterKey, []);
      }
      versesByChapter.get(chapterKey).push(verse);

      if (!recordsByBook.has(book)) {
        recordsByBook.set(book, []);
      }
      recordsByBook.get(book).push(record);
    });

    booksByGroup.forEach(function(bookList, group) {
      bookList.sort(function(left, right) {
        return compareBooks(books.get(left), books.get(right));
      });
    });

    chaptersByBook.forEach(function(chapterSet, book) {
      const sorted = Array.from(chapterSet).sort(function(a, b) {
        return a - b;
      });
      chaptersByBook.set(book, sorted);
    });

    versesByChapter.forEach(function(verses, key) {
      verses.sort(function(a, b) {
        return a - b;
      });
      versesByChapter.set(key, verses);
    });

    recordsByBook.forEach(function(bookRecords, book) {
      bookRecords.sort(function(left, right) {
        return Number(left.verse_id) - Number(right.verse_id);
      });
      recordsByBook.set(book, bookRecords);
    });

    return {
      books: books,
      booksByGroup: booksByGroup,
      chaptersByBook: chaptersByBook,
      versesByChapter: versesByChapter,
      recordsByBook: recordsByBook
    };
  }

  function compareBooks(left, right) {
    const leftOrder = left ? Number(left.bookOrder) : 0;
    const rightOrder = right ? Number(right.bookOrder) : 0;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    const leftSub = left ? Number(left.subOrder) : 0;
    const rightSub = right ? Number(right.subOrder) : 0;
    if (leftSub !== rightSub) {
      return leftSub - rightSub;
    }
    return String(left && left.book || '').localeCompare(String(right && right.book || ''));
  }

  function buildAliasMap(bookMap) {
    state.aliasMap.clear();

    bookMap.forEach(function(bookInfo, book) {
      const normalizedBook = normalizeBookToken(book);
      state.aliasMap.set(normalizedBook, book);
      state.aliasMap.set(normalizedBook.replace(/\s+/g, ''), book);

      const firstWord = normalizedBook.split(' ')[0];
      if (firstWord && !/^\d+$/.test(firstWord) && firstWord.length >= 3) {
        state.aliasMap.set(firstWord.slice(0, 3), book);
      }

      const bookWords = normalizedBook.split(' ');
      if (/^\d/.test(normalizedBook) && bookWords.length >= 2) {
        const numericPrefix = bookWords[0];
        const stem = bookWords.slice(1).join(' ');
        state.aliasMap.set(normalizeBookToken(numericPrefix + ' ' + stem.slice(0, 3)), book);
      }
    });

    Object.keys(BOOK_DECODER).forEach(function(key) {
      const canonical = BOOK_DECODER[key];
      state.aliasMap.set(normalizeBookToken(key), canonical);
      state.aliasMap.set(normalizeBookToken(key.replace(/-/g, ' ')), canonical);
      state.aliasMap.set(normalizeBookToken(key.replace(/-/g, '. ')), canonical);
    });

    const specialAliases = {
      'doctrine and covenants': 'D&C',
      'd and c': 'D&C',
      'd&c': 'D&C',
      'dc': 'D&C',
      'jsh': 'Joseph Smith History',
      'js h': 'Joseph Smith History',
      'joseph smith history': 'Joseph Smith History',
      'jsm': 'Joseph Smith Matthew',
      'js m': 'Joseph Smith Matthew',
      'joseph smith matthew': 'Joseph Smith Matthew',
      'a of f': 'Articles of Faith',
      'articles of faith': 'Articles of Faith',
      'words of mormon': 'Words of Mormon'
    };

    Object.keys(specialAliases).forEach(function(alias) {
      state.aliasMap.set(normalizeBookToken(alias), specialAliases[alias]);
    });
  }

  function buildChapterKey(book, chapter) {
    return book + '|' + String(chapter);
  }

  function resolveBookName(rawBookName) {
    const normalized = normalizeBookToken(rawBookName);
    return state.aliasMap.get(normalized) || state.aliasMap.get(normalized.replace(/\s+/g, '')) || null;
  }

  function parseSegment(segment, currentBook) {
    let working = normalizeReferenceText(segment);
    let book = currentBook;

    const aliases = Array.from(state.aliasMap.keys()).sort(function(left, right) {
      return right.length - left.length;
    });

    for (let index = 0; index < aliases.length; index += 1) {
      const alias = aliases[index];
      const aliasRegex = new RegExp('^' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)', 'i');
      const match = working.match(aliasRegex);
      if (match) {
        book = state.aliasMap.get(alias);
        working = normalizeReferenceText(working.slice(match[0].length));
        break;
      }
    }

    if (!book) {
      throw new Error('Start your reference with a book name. Example: Alma 32 or Genesis 1:1-5.');
    }

    if (!working) {
      throw new Error('Add a chapter or verse after the book name. Example: Alma 32 or Genesis 1:1-5.');
    }

    let match = working.match(/^(\d+)\s*:\s*(\d+)\s*-\s*(\d+)\s*:\s*(\d+)$/);
    if (match) {
      return {
        type: 'crossChapterRange',
        book: book,
        startChapter: Number(match[1]),
        startVerse: Number(match[2]),
        endChapter: Number(match[3]),
        endVerse: Number(match[4])
      };
    }

    match = working.match(/^(\d+)\s*-\s*(\d+)$/);
    if (match) {
      return {
        type: 'chapterRange',
        book: book,
        startChapter: Number(match[1]),
        endChapter: Number(match[2])
      };
    }

    match = working.match(/^(\d+)\s*:\s*(\d+)\s*-\s*(\d+)$/);
    if (match) {
      return {
        type: 'verseRange',
        book: book,
        chapter: Number(match[1]),
        startVerse: Number(match[2]),
        endVerse: Number(match[3])
      };
    }

    match = working.match(/^(\d+)\s*:\s*(\d+)$/);
    if (match) {
      return {
        type: 'singleVerse',
        book: book,
        chapter: Number(match[1]),
        verse: Number(match[2])
      };
    }

    match = working.match(/^(\d+)$/);
    if (match) {
      return {
        type: 'wholeChapter',
        book: book,
        chapter: Number(match[1])
      };
    }

    throw new Error('That reference format is not supported yet. Try Alma 32, Alma 32-33, Alma 32:12-21, or Genesis 1:31-2:3.');
  }

  function ensureBookExists(metadata, book) {
    if (!metadata.books.has(book)) {
      throw new Error('Book not found in the scripture dataset: ' + book + '.');
    }
  }

  function expandWholeChapter(metadata, book, chapter) {
    const key = buildChapterKey(book, chapter);
    const verses = metadata.versesByChapter.get(key);
    if (!verses || !verses.length) {
      throw new Error('Chapter not found: ' + book + ' ' + chapter + '.');
    }
    return verses.map(function(verse) {
      return book + ' ' + chapter + ':' + verse;
    });
  }

  function expandSingleVerse(metadata, book, chapter, verse) {
    const chapterVerses = metadata.versesByChapter.get(buildChapterKey(book, chapter)) || [];
    if (!chapterVerses.includes(verse)) {
      throw new Error('Verse not found: ' + book + ' ' + chapter + ':' + verse + '.');
    }
    return [book + ' ' + chapter + ':' + verse];
  }

  function expandVerseRange(metadata, book, chapter, startVerse, endVerse) {
    if (endVerse < startVerse) {
      throw new Error('The end verse must come after the start verse.');
    }
    const chapterVerses = metadata.versesByChapter.get(buildChapterKey(book, chapter)) || [];
    if (!chapterVerses.length) {
      throw new Error('Chapter not found: ' + book + ' ' + chapter + '.');
    }
    const filtered = chapterVerses.filter(function(verse) {
      return verse >= startVerse && verse <= endVerse;
    });
    if (!filtered.length) {
      throw new Error('That verse range does not exist in ' + book + ' ' + chapter + '.');
    }
    return filtered.map(function(verse) {
      return book + ' ' + chapter + ':' + verse;
    });
  }

  function expandChapterRange(metadata, book, startChapter, endChapter) {
    if (endChapter < startChapter) {
      throw new Error('The ending chapter must come after the starting chapter.');
    }
    const records = metadata.recordsByBook.get(book) || [];
    const filtered = records.filter(function(record) {
      return Number(record.chapter) >= startChapter && Number(record.chapter) <= endChapter;
    });
    if (!filtered.length) {
      throw new Error('That chapter range does not exist in ' + book + '.');
    }
    return filtered.map(function(record) {
      return String(record.scripture);
    });
  }

  function expandCrossChapterRange(metadata, book, startChapter, startVerse, endChapter, endVerse) {
    if (endChapter < startChapter || (endChapter === startChapter && endVerse < startVerse)) {
      throw new Error('The ending reference must come after the starting reference.');
    }
    const records = metadata.recordsByBook.get(book) || [];
    const filtered = records.filter(function(record) {
      const chapter = Number(record.chapter);
      const verse = Number(record.verse);
      if (chapter < startChapter || chapter > endChapter) {
        return false;
      }
      if (chapter === startChapter && verse < startVerse) {
        return false;
      }
      if (chapter === endChapter && verse > endVerse) {
        return false;
      }
      return true;
    });
    if (!filtered.length) {
      throw new Error('That cross-chapter range does not exist in ' + book + '.');
    }
    return filtered.map(function(record) {
      return String(record.scripture);
    });
  }

  function expandParsedSegment(metadata, parsed) {
    ensureBookExists(metadata, parsed.book);
    switch (parsed.type) {
      case 'wholeChapter':
        return expandWholeChapter(metadata, parsed.book, parsed.chapter);
      case 'singleVerse':
        return expandSingleVerse(metadata, parsed.book, parsed.chapter, parsed.verse);
      case 'verseRange':
        return expandVerseRange(metadata, parsed.book, parsed.chapter, parsed.startVerse, parsed.endVerse);
      case 'chapterRange':
        return expandChapterRange(metadata, parsed.book, parsed.startChapter, parsed.endChapter);
      case 'crossChapterRange':
        return expandCrossChapterRange(metadata, parsed.book, parsed.startChapter, parsed.startVerse, parsed.endChapter, parsed.endVerse);
      default:
        throw new Error('Unsupported reference type.');
    }
  }

  async function expandReferenceInput(reference, options) {
    const opts = options || {};
    const maxVerses = Number(opts.maxVerses || MAX_REFERENCE_VERSES);
    const metadata = await getMetadata();
    const normalized = normalizeReferenceText(reference);
    if (!normalized) {
      throw new Error('Enter a scripture reference to search.');
    }

    const segments = normalized.split(';').map(function(segment) {
      return segment.trim();
    }).filter(Boolean);

    if (!segments.length) {
      throw new Error('Enter a scripture reference to search.');
    }

    let currentBook = null;
    let referenceBook = null;
    let scriptures = [];

    segments.forEach(function(segment) {
      const parsed = parseSegment(segment, currentBook);
      currentBook = parsed.book;
      if (!referenceBook) {
        referenceBook = parsed.book;
      } else if (referenceBook !== parsed.book) {
        throw new Error('Only one book can be searched at a time in the text input.');
      }
      scriptures = scriptures.concat(expandParsedSegment(metadata, parsed));
    });

    const uniqueScriptures = Array.from(new Set(scriptures));
    if (uniqueScriptures.length > maxVerses) {
      throw new Error('That reference expands to too many verses. Please narrow the search or use a smaller chapter range.');
    }

    return {
      scriptures: uniqueScriptures,
      reference: normalized,
      book: referenceBook
    };
  }

  async function getGroupedBooks() {
    const metadata = await getMetadata();
    const result = [];
    metadata.booksByGroup.forEach(function(books, group) {
      result.push({
        group: group,
        books: books.slice()
      });
    });
    return result;
  }

  async function getChaptersForBook(book) {
    const metadata = await getMetadata();
    return (metadata.chaptersByBook.get(book) || []).slice();
  }

  async function getVersesForChapter(book, chapter) {
    const metadata = await getMetadata();
    return (metadata.versesByChapter.get(buildChapterKey(book, chapter)) || []).slice();
  }

  async function getScripturesForChapter(book, chapter) {
    const metadata = await getMetadata();
    return expandWholeChapter(metadata, book, chapter);
  }

  async function getScripturesForVerseRange(book, chapter, startVerse, endVerse) {
    const metadata = await getMetadata();
    return expandVerseRange(metadata, book, chapter, startVerse, endVerse);
  }

  async function getScripturesForSingleVerse(book, chapter, verse) {
    const metadata = await getMetadata();
    return expandSingleVerse(metadata, book, chapter, verse);
  }

  window.GBScriptureTools = {
    getMetadata: getMetadata,
    getGroupedBooks: getGroupedBooks,
    getChaptersForBook: getChaptersForBook,
    getVersesForChapter: getVersesForChapter,
    getScripturesForChapter: getScripturesForChapter,
    getScripturesForVerseRange: getScripturesForVerseRange,
    getScripturesForSingleVerse: getScripturesForSingleVerse,
    expandReferenceInput: expandReferenceInput,
    normalizeReferenceText: normalizeReferenceText,
    resolveBookName: resolveBookName,
    buildChapterKey: buildChapterKey,
    MAX_REFERENCE_VERSES: MAX_REFERENCE_VERSES
  };
})(window);
