import type { ReactNode } from "react";

import type { ChatMessage } from "@/features/chat/chat.types";

import styles from "./MessageBubble.module.css";

const boldPattern = /\*\*(.+?)\*\*/g;

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(boldPattern)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    nodes.push(<strong key={`${keyPrefix}-bold-${index}`}>{match[1]}</strong>);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderMessageContent(content: string) {
  const nodes: ReactNode[] = [];
  let blockIndex = 0;
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) {
      return;
    }

    const listKey = `list-${blockIndex}`;
    const items = listItems;
    blockIndex += 1;
    listItems = [];

    nodes.push(
      <ul className={styles.markdownList} key={listKey}>
        {items.map((item, itemIndex) => (
          <li className={styles.markdownListItem} key={`${listKey}-${itemIndex}`}>
            {renderInlineMarkdown(item, `${listKey}-${itemIndex}`)}
          </li>
        ))}
      </ul>
    );
  }

  content.split(/\r?\n/).forEach((line, lineIndex) => {
    const bulletMatch = line.match(/^\s*[*-]\s+(.+)$/);

    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList();

    if (line.trim().length === 0) {
      return;
    }

    nodes.push(
      <p className={styles.paragraph} key={`paragraph-${blockIndex}`}>
        {renderInlineMarkdown(line, `paragraph-${lineIndex}`)}
      </p>
    );
    blockIndex += 1;
  });

  flushList();

  return nodes;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const rowClassName = message.role === "user" ? `${styles.row} ${styles.user}` : styles.row;

  return (
    <div className={rowClassName}>
      <div className={styles.bubble}>{renderMessageContent(message.content)}</div>
    </div>
  );
}
