interface AdfNode {
  type?: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
}

/**
 * Converts a Jira issue or comment body (plain text or Atlassian Document Format) to plain text.
 *
 * @param body - Raw body from the Jira REST API.
 * @return Plain text suitable for preview display, or null when empty.
 */
export function jiraBodyToPlainText(body: unknown): string | null {
  if (body == null) {
    return null;
  }

  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof body === "object" && body !== null && "type" in body) {
    const text = walkAdfNode(body as AdfNode).trim();
    return text.length > 0 ? text : null;
  }

  return null;
}

function walkListItem(
  node: AdfNode,
  kind: "bullet" | "ordered",
  index = 1
): string {
  const inner = (node.content ?? [])
    .map((child) => walkAdfNode(child))
    .join("");
  return kind === "ordered" ? `${index}. ${inner}` : `• ${inner}`;
}

function walkAdfNode(node: AdfNode): string {
  if (node.text) {
    return node.text;
  }

  const children = node.content ?? [];

  switch (node.type) {
    case "doc":
      return joinBlocks(children.map((child) => walkAdfNode(child)));

    case "paragraph":
      return children.map((child) => walkAdfNode(child)).join("");

    case "text":
      return node.text ?? "";

    case "hardBreak":
      return "\n";

    case "heading": {
      const level =
        typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const prefix = "#".repeat(Math.min(Math.max(level, 1), 6));
      return `${prefix} ${children.map((child) => walkAdfNode(child)).join("")}`;
    }

    case "bulletList":
      return children
        .map((child) => walkListItem(child, "bullet"))
        .filter(Boolean)
        .join("\n");

    case "orderedList":
      return children
        .map((child, index) => walkListItem(child, "ordered", index + 1))
        .filter(Boolean)
        .join("\n");

    case "listItem":
      return walkListItem(node, "bullet");

    case "codeBlock": {
      const code = children.map((child) => walkAdfNode(child)).join("");
      return `\n${code}\n`;
    }

    case "blockquote":
      return children
        .map((child) => walkAdfNode(child))
        .join("\n")
        .replace(/^/gm, "> ");

    case "rule":
      return "---";

    case "mention": {
      const label =
        (typeof node.attrs?.text === "string" && node.attrs.text) ||
        (typeof node.attrs?.id === "string" && `@${node.attrs.id}`) ||
        "@mention";
      return label;
    }

    case "emoji": {
      const shortName =
        typeof node.attrs?.shortName === "string"
          ? node.attrs.shortName
          : undefined;
      const text =
        typeof node.attrs?.text === "string" ? node.attrs.text : undefined;
      return text ?? shortName ?? "";
    }

    case "table":
      return children
        .map((child) => walkAdfNode(child))
        .filter(Boolean)
        .join("\n");

    case "tableRow":
      return children
        .map((child) => walkAdfNode(child))
        .filter(Boolean)
        .join("\t");

    case "tableCell":
    case "tableHeader":
      return children.map((child) => walkAdfNode(child)).join("");

    case "mediaSingle":
    case "media":
      return "[attachment]";

    case "panel":
    case "expand":
      return joinBlocks(children.map((child) => walkAdfNode(child)));

    default:
      return children.map((child) => walkAdfNode(child)).join("");
  }
}

function joinBlocks(blocks: string[]): string {
  return blocks.filter((block) => block.trim().length > 0).join("\n\n");
}
