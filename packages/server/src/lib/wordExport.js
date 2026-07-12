import { Document, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun, Packer, PageBreak, WidthType } from 'docx';
import { getFieldRows, blockTypeLabel } from './wordFieldMap.js';

const HEADER_CELLS = ['Block Type', 'Field', 'Content', 'Notes'];

function headerRow() {
  return new TableRow({
    tableHeader: true,
    children: HEADER_CELLS.map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        })
    ),
  });
}

function dataRow(blockTypeText, field, content, notes) {
  return new TableRow({
    children: [blockTypeText, field, content, notes].map(
      (text) => new TableCell({ children: [new Paragraph(text || '')] })
    ),
  });
}

function pageTable(page, assets) {
  const rows = [headerRow()];
  for (const block of page.blocks) {
    const fieldRows = getFieldRows(block, assets);
    for (const row of fieldRows) {
      rows.push(dataRow(blockTypeLabel(block.type), row.label, row.value, `${block.block_id}:${row.field}`));
    }
  }
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

export async function buildTemplateWordDoc(template) {
  const courseJson = template.course_json;
  const pages = courseJson.pages || [];
  const dateStr = new Date().toISOString().slice(0, 10);

  const children = [
    new Paragraph({ text: template.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Pages: ${pages.length}` }),
    new Paragraph({ text: `Generated: ${dateStr}` }),
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Import instructions: fill in the Content column for any row you want to change. Do not edit the Notes column -- it is what makes re-importing this document into Mnemonify unambiguous. Leave a row unchanged to keep the placeholder text.',
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  pages.forEach((page, index) => {
    children.push(new Paragraph({ text: page.title, heading: HeadingLevel.HEADING_1 }));
    children.push(pageTable(page, courseJson.assets));
    if (index < pages.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
