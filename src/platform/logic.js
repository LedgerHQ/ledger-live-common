// @flow

export function translateContent(content, locale = "en") {
  if (!content || typeof content !== "object") return content;

  return content[locale] || content.en;
}
