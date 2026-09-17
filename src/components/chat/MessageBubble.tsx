import type { ReactNode } from "react";
import Image from "next/image";
import { BookOpenText, ChevronDown } from "lucide-react";

import type { ChatMessage } from "@/features/chat/chat.types";

import { splitTextbookReferences } from "./message-content";
import styles from "./MessageBubble.module.css";

const boldPattern = /\*\*(.+?)\*\*/g;

type MarkdownListItem = {
  text: string;
  children: MarkdownListItem[];
};

type PendingListItem = {
  indent: number;
  text: string;
};

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

function buildListTree(items: PendingListItem[]) {
  const root: MarkdownListItem[] = [];
  const stack: Array<{ indent: number; children: MarkdownListItem[] }> = [
    { indent: -1, children: root }
  ];

  for (const item of items) {
    while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const node: MarkdownListItem = { text: item.text, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push({ indent: item.indent, children: node.children });
  }

  return root;
}

function renderMarkdownList(items: MarkdownListItem[], keyPrefix: string, isNested = false) {
  const className = isNested
    ? `${styles.markdownList} ${styles.nestedMarkdownList}`
    : styles.markdownList;

  return (
    <ul className={className} key={keyPrefix}>
      {items.map((item, itemIndex) => {
        const itemKey = `${keyPrefix}-${itemIndex}`;

        return (
          <li className={styles.markdownListItem} key={itemKey}>
            {renderInlineMarkdown(item.text, itemKey)}
            {item.children.length > 0
              ? renderMarkdownList(item.children, `${itemKey}-nested`, true)
              : null}
          </li>
        );
      })}
    </ul>
  );
}

function renderMessageContent(content: string) {
  const nodes: ReactNode[] = [];
  let blockIndex = 0;
  let listItems: PendingListItem[] = [];

  function flushList() {
    if (listItems.length === 0) {
      return;
    }

    const listKey = `list-${blockIndex}`;
    const items = buildListTree(listItems);
    blockIndex += 1;
    listItems = [];

    nodes.push(renderMarkdownList(items, listKey));
  }

  content.split(/\r?\n/).forEach((line, lineIndex) => {
    const bulletMatch = line.match(/^(\s*)[*-]\s+(.+)$/);

    if (bulletMatch) {
      listItems.push({
        indent: bulletMatch[1].replace(/\t/g, "    ").length,
        text: bulletMatch[2]
      });
      return;
    }

    flushList();

    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      return;
    }

    const headingMatch = trimmedLine.match(/^#{1,4}\s+(.+)$/);
    const boldHeadingMatch = trimmedLine.match(/^\*\*(.+?)\*\*\s*$/);

    if (headingMatch || boldHeadingMatch) {
      const heading = headingMatch?.[1] ?? boldHeadingMatch?.[1] ?? trimmedLine;
      nodes.push(
        <h3 className={styles.messageHeading} key={`heading-${blockIndex}`}>
          {renderInlineMarkdown(heading, `heading-${lineIndex}`)}
        </h3>
      );
      blockIndex += 1;
      return;
    }

    nodes.push(
      <p className={styles.paragraph} key={`paragraph-${blockIndex}`}>
        {renderInlineMarkdown(trimmedLine, `paragraph-${lineIndex}`)}
      </p>
    );
    blockIndex += 1;
  });

  flushList();

  return nodes;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const sections = isUser
    ? { body: message.content, textbookReferences: null }
    : splitTextbookReferences(message.content);
  const rowClassName = isUser
    ? `${styles.row} ${styles.user}`
    : `${styles.row} ${styles.assistant}`;

  return (
    <div className={rowClassName}>
      {!isUser ? (
        <Image
          className={styles.botAvatar}
          src="/images/health-chatbot-profile.png"
          alt="Health Chatbot"
          width={40}
          height={40}
        />
      ) : null}
      <div className={styles.bubble}>
        {renderMessageContent(sections.body)}
        {sections.textbookReferences ? (
          <details className={styles.references}>
            <summary className={styles.referencesSummary}>
              <span className={styles.referencesLabel}>
                <BookOpenText size={17} strokeWidth={1.9} aria-hidden="true" />
                อ้างอิงจากตำรา
              </span>
              <ChevronDown
                className={styles.referencesChevron}
                size={17}
                strokeWidth={2}
                aria-hidden="true"
              />
            </summary>
            <div className={styles.referencesContent}>
              {renderMessageContent(sections.textbookReferences)}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
