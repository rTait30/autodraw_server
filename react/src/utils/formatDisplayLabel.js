export function formatDisplayLabel(label) {
  if (typeof label !== "string") {
    return label;
  }

  return label
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
