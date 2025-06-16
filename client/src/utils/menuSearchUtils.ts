import { MenuItem } from "../types/menuItemTypes";
import { SortOption } from "../components/menu/SortDropdown";

// Search utilities
export const createSearchableText = (item: MenuItem): string => {
  const searchFields = [
    item.name,
    item.description,
    item.category,
    ...(item.ingredients || []),
    item.producer,
    item.region,
    ...(item.grapeVariety || []),
    ...(item.cookingMethods || []),
    ...(item.allergens || []),
    item.spiritType,
    item.beerStyle,
    ...(item.cocktailIngredients || []),
  ];

  return searchFields.filter(Boolean).join(" ").toLowerCase().trim();
};

export const searchItems = (
  items: MenuItem[],
  searchTerm: string
): MenuItem[] => {
  if (!searchTerm.trim()) return items;

  const normalizedSearchTerm = searchTerm.toLowerCase().trim();

  return items.filter((item) => {
    const searchableText = createSearchableText(item);

    // Split search term into words for better matching
    const searchWords = normalizedSearchTerm.split(/\s+/);

    // Item matches if all search words are found
    return searchWords.every((word) => searchableText.includes(word));
  });
};

// Filtering utilities
export interface FilterOptions {
  categories: string[];
  priceRange: [number, number] | null;
  dietary: ("vegan" | "vegetarian" | "gluten-free" | "dairy-free")[];
  wineStyles: string[];
  hasDescription: boolean | null;
  hasIngredients: boolean | null;
  itemTypes: ("food" | "beverage" | "wine")[];
}

export const getDefaultFilters = (): FilterOptions => ({
  categories: [],
  priceRange: null,
  dietary: [],
  wineStyles: [],
  hasDescription: null,
  hasIngredients: null,
  itemTypes: [],
});

export const filterItems = (
  items: MenuItem[],
  filters: FilterOptions
): MenuItem[] => {
  return items.filter((item) => {
    // Category filter
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(item.category)
    ) {
      return false;
    }

    // Price range filter
    if (filters.priceRange && item.price) {
      const [minPrice, maxPrice] = filters.priceRange;
      if (item.price < minPrice || item.price > maxPrice) {
        return false;
      }
    }

    // Dietary restrictions filter
    if (filters.dietary.length > 0) {
      const dietaryChecks = {
        vegan: item.isVegan,
        vegetarian: item.isVegetarian,
        "gluten-free": item.isGlutenFree,
        "dairy-free": item.isDairyFree,
      };

      const matchesDietary = filters.dietary.some(
        (diet) => dietaryChecks[diet] === true
      );

      if (!matchesDietary) return false;
    }

    // Wine styles filter
    if (filters.wineStyles.length > 0 && item.itemType === "wine") {
      if (!item.wineStyle || !filters.wineStyles.includes(item.wineStyle)) {
        return false;
      }
    }

    // Has description filter
    if (filters.hasDescription !== null) {
      const hasDesc = Boolean(item.description && item.description.trim());
      if (hasDesc !== filters.hasDescription) return false;
    }

    // Has ingredients filter
    if (filters.hasIngredients !== null) {
      const hasIngr = Boolean(item.ingredients && item.ingredients.length > 0);
      if (hasIngr !== filters.hasIngredients) return false;
    }

    // Item types filter
    if (
      filters.itemTypes.length > 0 &&
      !filters.itemTypes.includes(item.itemType)
    ) {
      return false;
    }

    return true;
  });
};

// Sorting utilities
export const sortItems = (
  items: MenuItem[],
  sortOption: SortOption
): MenuItem[] => {
  const sortedItems = [...items];

  switch (sortOption) {
    case "name-asc":
      return sortedItems.sort((a, b) => a.name.localeCompare(b.name));

    case "name-desc":
      return sortedItems.sort((a, b) => b.name.localeCompare(a.name));

    case "price-asc":
      return sortedItems.sort((a, b) => {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        return priceA - priceB;
      });

    case "price-desc":
      return sortedItems.sort((a, b) => {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        return priceB - priceA;
      });

    case "category-asc":
      return sortedItems.sort((a, b) => {
        const categoryA = a.category || "";
        const categoryB = b.category || "";
        if (categoryA === categoryB) {
          return a.name.localeCompare(b.name);
        }
        return categoryA.localeCompare(categoryB);
      });

    case "category-desc":
      return sortedItems.sort((a, b) => {
        const categoryA = a.category || "";
        const categoryB = b.category || "";
        if (categoryA === categoryB) {
          return b.name.localeCompare(a.name);
        }
        return categoryB.localeCompare(categoryA);
      });

    case "recent":
      return sortedItems.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Most recent first
      });

    case "popular":
      // For now, sort by name as fallback
      // In the future, this could be based on quiz question frequency
      return sortedItems.sort((a, b) => a.name.localeCompare(b.name));

    default:
      return sortedItems;
  }
};

// Statistics utilities
export const getFilterStats = (items: MenuItem[]) => {
  const categories = [...new Set(items.map((item) => item.category))].filter(
    Boolean
  );
  const priceRange = items.reduce(
    (range, item) => {
      if (item.price) {
        return [Math.min(range[0], item.price), Math.max(range[1], item.price)];
      }
      return range;
    },
    [Infinity, -Infinity]
  );

  const wineStyles = [
    ...new Set(
      items
        .filter((item) => item.itemType === "wine" && item.wineStyle)
        .map((item) => item.wineStyle!)
    ),
  ];

  const dietaryCounts = {
    vegan: items.filter((item) => item.isVegan).length,
    vegetarian: items.filter((item) => item.isVegetarian).length,
    glutenFree: items.filter((item) => item.isGlutenFree).length,
    dairyFree: items.filter((item) => item.isDairyFree).length,
  };

  return {
    categories: categories.sort(),
    priceRange:
      priceRange[0] === Infinity ? null : (priceRange as [number, number]),
    wineStyles: wineStyles.sort(),
    dietaryCounts,
    totalItems: items.length,
    itemsWithDescription: items.filter((item) => item.description?.trim())
      .length,
    itemsWithIngredients: items.filter((item) => item.ingredients?.length)
      .length,
  };
};

// Text highlighting utility
export const highlightSearchText = (
  text: string,
  searchTerm: string
): string => {
  if (!searchTerm.trim()) return text;

  const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);
  let highlightedText = text;

  searchWords.forEach((word) => {
    const regex = new RegExp(`(${word})`, "gi");
    highlightedText = highlightedText.replace(
      regex,
      '<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">$1</mark>'
    );
  });

  return highlightedText;
};
