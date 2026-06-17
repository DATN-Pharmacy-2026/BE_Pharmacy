const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.resolve(ROOT_DIR, '..', 'fordel', 'knowledge-base');
const OUTPUT_PATH = path.resolve(
  ROOT_DIR,
  'apps',
  'chatbot-service',
  'knowledge-base',
  'chunks.json',
);
const CATEGORY_DIRS = ['policies', 'faq', 'safety', 'medicines', 'symptoms'];
const MIN_CHUNK_LENGTH = 500;
const MAX_CHUNK_LENGTH = 1000;

function stripDiacritics(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function slugify(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeText(value) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function collectMarkdownFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function parseMarkdownSections(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let title = '';
  let currentSection = 'Tổng quan';
  let buffer = [];
  const sections = [];
  let tags = [];

  const flushSection = () => {
    const content = normalizeText(buffer.join('\n'));
    if (content) {
      sections.push({
        section: currentSection,
        content,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const normalizedHeading = stripDiacritics(headingText).toLowerCase();

      if (level === 1) {
        title = headingText;
        continue;
      }

      if (level === 2 || level === 3) {
        flushSection();

        if (normalizedHeading === 'tu khoa truy xuat rag') {
          currentSection = '__tags__';
        } else {
          currentSection = headingText;
        }
        continue;
      }
    }

    if (currentSection === '__tags__') {
      const lineTags = line
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      tags.push(...lineTags);
      continue;
    }

    buffer.push(line);
  }

  flushSection();

  return {
    title: title || 'Không có tiêu đề',
    sections,
    tags: Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))),
  };
}

function sentenceAwareSplit(text, maxLength) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const segments = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxLength) {
      segments.push(paragraph);
      continue;
    }

    const sentenceMatches = paragraph.match(/[^.!?;\n]+(?:[.!?;]+|$)/g);
    const sentenceParts = sentenceMatches
      ? sentenceMatches.map((item) => item.trim()).filter(Boolean)
      : [paragraph];

    for (const sentence of sentenceParts) {
      if (sentence.length <= maxLength) {
        segments.push(sentence);
        continue;
      }

      let remaining = sentence;
      while (remaining.length > maxLength) {
        let splitIndex = remaining.lastIndexOf(' ', maxLength);
        if (splitIndex < Math.floor(maxLength * 0.6)) {
          splitIndex = maxLength;
        }
        segments.push(remaining.slice(0, splitIndex).trim());
        remaining = remaining.slice(splitIndex).trim();
      }
      if (remaining) {
        segments.push(remaining);
      }
    }
  }

  return segments;
}

function buildChunksForSection(sectionText) {
  const segments = sentenceAwareSplit(sectionText, MAX_CHUNK_LENGTH);
  const chunks = [];
  let current = '';

  for (const segment of segments) {
    if (!current) {
      current = segment;
      continue;
    }

    const candidate = `${current}\n\n${segment}`;
    if (candidate.length <= MAX_CHUNK_LENGTH) {
      current = candidate;
      continue;
    }

    chunks.push(current.trim());
    current = segment;
  }

  if (current) {
    chunks.push(current.trim());
  }

  const merged = [];
  for (const chunk of chunks) {
    if (!merged.length) {
      merged.push(chunk);
      continue;
    }

    const previous = merged[merged.length - 1];
    if (previous.length < MIN_CHUNK_LENGTH && `${previous}\n\n${chunk}`.length <= MAX_CHUNK_LENGTH) {
      merged[merged.length - 1] = `${previous}\n\n${chunk}`.trim();
      continue;
    }

    merged.push(chunk);
  }

  return merged;
}

function createSectionBlocks(sections) {
  const blocks = [];

  for (const entry of sections) {
    const headingPrefix = entry.section && entry.section !== 'Tổng quan'
      ? `${entry.section}\n\n`
      : '';
    const blockChunks = buildChunksForSection(`${headingPrefix}${entry.content}`.trim());

    for (const content of blockChunks) {
      blocks.push({
        sections: [entry.section],
        content,
      });
    }
  }

  return blocks;
}

function mergeBlocks(blocks) {
  const merged = [];

  for (const block of blocks) {
    if (!merged.length) {
      merged.push(block);
      continue;
    }

    const previous = merged[merged.length - 1];
    const candidateContent = `${previous.content}\n\n${block.content}`.trim();

    if (candidateContent.length <= MAX_CHUNK_LENGTH) {
      merged[merged.length - 1] = {
        sections: [...previous.sections, ...block.sections],
        content: candidateContent,
      };
      continue;
    }

    merged.push(block);
  }

  return merged;
}

function inferTags(category, fileName) {
  const baseName = path.basename(fileName, '.md');
  const fromFileName = baseName
    .split('-')
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  const categoryHints = {
    policies: ['chính sách', 'hỗ trợ'],
    faq: ['faq', 'câu hỏi thường gặp'],
    safety: ['an toàn', 'dược sĩ'],
    medicines: ['thuốc', 'sản phẩm'],
    symptoms: ['triệu chứng', 'tư vấn an toàn'],
  };

  return Array.from(
    new Set([...(categoryHints[category] || []), ...fromFileName]),
  );
}

function buildChunkId(category, fileSlug, index) {
  const categorySlugMap = {
    policies: 'policy',
    faq: 'faq',
    safety: 'safety',
    medicines: 'medicine',
    symptoms: 'symptom',
  };

  return `knowledge-${categorySlugMap[category] || category}-${fileSlug}-${String(index).padStart(3, '0')}`;
}

function buildChunks() {
  const markdownFiles = CATEGORY_DIRS.flatMap((category) =>
    collectMarkdownFiles(path.join(SOURCE_ROOT, category)),
  );
  const chunks = [];

  for (const filePath of markdownFiles) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const relativePath = path
      .relative(path.resolve(ROOT_DIR, '..'), filePath)
      .replace(/\\/g, '/');
    const category = path.basename(path.dirname(filePath));
    const fileSlug = slugify(path.basename(filePath, '.md'));
    const { title, sections, tags } = parseMarkdownSections(raw);
    const finalTags = tags.length ? tags : inferTags(category, filePath);
    let chunkIndex = 1;

    const mergedBlocks = mergeBlocks(createSectionBlocks(sections));

    for (const block of mergedBlocks) {
      const sectionLabel = Array.from(new Set(block.sections.filter(Boolean))).join(' | ');
      chunks.push({
        id: buildChunkId(category, fileSlug, chunkIndex),
        type: 'knowledge',
        category,
        title,
        section: sectionLabel || 'Tổng quan',
        content: block.content,
        tags: finalTags,
        sourcePath: relativePath,
      });
      chunkIndex += 1;
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(chunks, null, 2)}\n`, 'utf8');

  return {
    markdownFiles,
    chunks,
  };
}

function main() {
  const { markdownFiles, chunks } = buildChunks();
  console.log(`Markdown files read: ${markdownFiles.length}`);
  console.log(`Chunks created: ${chunks.length}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log('Sample chunks:');
  console.log(JSON.stringify(chunks.slice(0, 3), null, 2));
}

main();
