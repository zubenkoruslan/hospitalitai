export const normalizeCategory = (category?: string): string => {
  if (!category || category.trim() === "") return "Uncategorized";
  return category
    .trim()
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
