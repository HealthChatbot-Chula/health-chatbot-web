export type MessageSections = {
  body: string;
  textbookReferences: string | null;
};

function trimBlankLines(lines: string[]) {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start].trim().length === 0) {
    start += 1;
  }

  while (end > start && lines[end - 1].trim().length === 0) {
    end -= 1;
  }

  return lines.slice(start, end).join("\n");
}

function isTextbookReferenceHeading(line: string) {
  let heading = line.trim().replace(/^#{1,4}\s+/, "");

  if (heading.startsWith("**") && heading.endsWith("**")) {
    heading = heading.slice(2, -2).trim();
  }

  return /^อ้างอิงจากตำรา\s*:?$/u.test(heading);
}

/**
 * Separates the application-owned RAG citation footer from the visible reply.
 * The backend currently emits a plain heading, while the Markdown variants
 * keep historical messages and future formatting changes compatible.
 */
export function splitTextbookReferences(content: string): MessageSections {
  const lines = content.split(/\r?\n/);
  const headingIndex = lines.findIndex(isTextbookReferenceHeading);

  if (headingIndex < 0) {
    return { body: content, textbookReferences: null };
  }

  const textbookReferences = trimBlankLines(lines.slice(headingIndex + 1));

  if (!textbookReferences) {
    return { body: content, textbookReferences: null };
  }

  return {
    body: trimBlankLines(lines.slice(0, headingIndex)),
    textbookReferences
  };
}
