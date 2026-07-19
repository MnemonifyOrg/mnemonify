// Real file-content validation for course resource uploads (Phase 4
// usability-fix session, Step 2), beyond the client-declared MIME type.
// The existing image/video/audio endpoint (routes/assets.js's detectKind)
// trusts req.file.mimetype alone -- a value the client sets on the
// multipart form field, trivially spoofable by anyone crafting the
// request by hand. That is not rigorous enough for a document-upload path
// where "an .exe renamed to .pdf must still be rejected" is an explicit
// requirement: an attacker can just as easily lie about mimetype as about
// the filename extension. This module checks the file's actual leading
// bytes (its real "magic number") against what its claimed kind requires.
// Hand-rolled rather than pulling in a signature-detection package
// (file-type, etc.), matching this codebase's established precedent for
// small, single-purpose checkers (richText.js's sanitizer,
// htmlTableParser.js) over a new dependency for something this narrow.

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

// docx/xlsx/pptx/zip are all, at the container level, ordinary ZIP
// archives (Office Open XML is ZIP-with-XML-inside) -- they share this
// signature family. Distinguishing docx from xlsx from a plain zip would
// require inspecting the archive's internal [Content_Types].xml, which is
// more than this check needs: confirming the file really IS a ZIP
// container (not an executable wearing a .docx extension) is what matters
// for the "reject a disguised .exe" requirement.
const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06], // empty archive
  [0x50, 0x4b, 0x07, 0x08], // spanned archive
];

// Legacy .doc/.xls/.ppt (OLE Compound File Binary Format) all share this
// same container signature, for the same reason the modern formats share
// the ZIP signature above.
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

// Checked first, against every upload regardless of claimed kind, so a
// disguised executable gets a specific, named rejection reason rather
// than a generic "doesn't match" message. Redundant with the allowlist
// check below for most cases (an EXE's bytes won't match %PDF- either),
// but a named check is better UX and a clearer audit trail than relying
// solely on "not in the allowlist."
const BLOCKED_SIGNATURES = [
  { bytes: [0x4d, 0x5a], label: 'a Windows executable (.exe/.dll)' }, // "MZ"
  { bytes: [0x7f, 0x45, 0x4c, 0x46], label: 'a Linux executable (ELF)' }, // "\x7fELF"
  { bytes: [0x23, 0x21], label: 'a script (shebang)' }, // "#!"
  { bytes: [0xca, 0xfe, 0xba, 0xbe], label: 'a Java class file or Mach-O executable' },
  { bytes: [0xcf, 0xfa, 0xed, 0xfe], label: 'a Mach-O executable' },
];

function matches(buffer, signature) {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

// Plain text has no magic number of its own, so this is a heuristic, not
// a signature match: reject anything containing a null byte in the first
// chunk (binary files routinely contain nulls very early; genuine text
// essentially never does), and reject anything that doesn't decode as
// valid UTF-8 (Node's Buffer#toString silently substitutes the U+FFFD
// replacement character for invalid byte sequences rather than throwing,
// so its presence in the decoded output is the signal to check for).
function looksLikePlainText(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  if (sample.includes(0x00)) return false;
  return !sample.toString('utf-8').includes('�');
}

const KIND_VALIDATORS = {
  pdf: (buf) => matches(buf, PDF_SIGNATURE),
  doc: (buf) => matches(buf, OLE_SIGNATURE),
  xls: (buf) => matches(buf, OLE_SIGNATURE),
  ppt: (buf) => matches(buf, OLE_SIGNATURE),
  docx: (buf) => ZIP_SIGNATURES.some((sig) => matches(buf, sig)),
  xlsx: (buf) => ZIP_SIGNATURES.some((sig) => matches(buf, sig)),
  pptx: (buf) => ZIP_SIGNATURES.some((sig) => matches(buf, sig)),
  zip: (buf) => ZIP_SIGNATURES.some((sig) => matches(buf, sig)),
  txt: looksLikePlainText,
};

// Returns null if `buffer`'s actual content is consistent with `kind`;
// otherwise a human-readable rejection reason.
export function validateFileSignature(buffer, kind) {
  for (const blocked of BLOCKED_SIGNATURES) {
    if (matches(buffer, blocked.bytes)) {
      return `This file's content looks like ${blocked.label}, which is never allowed as a course resource.`;
    }
  }
  const validator = KIND_VALIDATORS[kind];
  if (!validator) return `Unsupported resource type: ${kind}.`;
  if (!validator(buffer)) {
    return `This file's content does not match a valid ${kind.toUpperCase()} file -- it may be corrupted, or its extension doesn't match what it actually is.`;
  }
  return null;
}
