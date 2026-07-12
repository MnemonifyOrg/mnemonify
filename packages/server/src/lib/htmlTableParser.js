// Minimal table extractor for mammoth's convertToHtml() output. Avoids
// pulling in a full DOM parser dependency for what is a narrow, controlled
// case: parsing tables out of HTML that WE generated the source .docx for
// via wordExport.js, not arbitrary third-party HTML.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

function decodeEntities(text) {
  return text.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, name) => ENTITIES[name]);
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).trim();
}

function extractAll(regex, html) {
  const matches = [];
  let m;
  const re = new RegExp(regex, 'gis');
  while ((m = re.exec(html)) !== null) matches.push(m[1]);
  return matches;
}

export function parseTables(html) {
  const tableBlocks = extractAll('<table[^>]*>(.*?)</table>', html);
  return tableBlocks.map((tableHtml) => {
    const rowBlocks = extractAll('<tr[^>]*>(.*?)</tr>', tableHtml);
    return rowBlocks.map((rowHtml) => extractAll('<t[dh][^>]*>(.*?)</t[dh]>', rowHtml).map(stripTags));
  });
}
