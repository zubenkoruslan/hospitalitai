import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import {
  uploadCleanMenu,
  importCleanMenu,
  getMenusByRestaurant,
  CleanMenuItem as APICleanMenuItem,
  CleanMenuParseResult,
} from "../services/api";
import { IMenuClient } from "../types/menuTypes";

interface ItemCardProps {
  item: CleanMenuItem;
  index: number;
  editMode: boolean;
  isSelected: boolean;
  onEdit: (index: number, updatedItem: CleanMenuItem) => void;
  onDelete: (index: number) => void;
  onToggleSelect: (index: number) => void;
}

interface CategorySectionProps {
  category: string;
  items: Array<{ item: CleanMenuItem; originalIndex: number }>;
  editMode: boolean;
  selectedItems: Set<number>;
  isExpanded: boolean;
  allCategories: string[];
  onToggle: () => void;
  onEdit: (index: number, updatedItem: CleanMenuItem) => void;
  onDelete: (index: number) => void;
  onToggleSelect: (index: number) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onMergeCategory: (sourceCategory: string, targetCategory: string) => void;
  onDeleteCategory: (categoryName: string) => void;
}

interface ServingOption {
  size: string;
  price: number;
}

interface CleanMenuItem {
  name: string;
  description?: string;
  price?: number;
  category: string;
  itemType: "food" | "beverage" | "wine";
  // Wine-specific fields
  vintage?: number;
  producer?: string;
  region?: string;
  grapeVariety?: string[];
  wineColor?: string;
  servingOptions?: ServingOption[];
  // Food-specific fields
  ingredients?: string[];
  cookingMethods?: string[];
  allergens?: string[];
  isDairyFree?: boolean;
  isSpicy?: boolean;
  // Beverage-specific fields
  spiritType?: string;
  beerStyle?: string;
  cocktailIngredients?: string[];
  alcoholContent?: string;
  servingStyle?: string;
  isNonAlcoholic?: boolean;
  temperature?: string;
  // Dietary fields
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  confidence: number;
  originalText: string;
}

interface ParseResult {
  menuName: string;
  items: CleanMenuItem[];
  totalItemsFound: number;
  processingNotes: string[];
}

const CleanMenuUploadPage: React.FC = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<CleanMenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "food" | "beverage" | "wine"
  >("all");

  // Import functionality state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [existingMenus, setExistingMenus] = useState<IMenuClient[]>([]);
  const [importOption, setImportOption] = useState<"new" | "existing">("new");
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [newMenuName, setNewMenuName] = useState("");

  // Load existing menus on component mount
  useEffect(() => {
    const loadExistingMenus = async () => {
      if (user?.restaurantId) {
        try {
          const menus = await getMenusByRestaurant(user.restaurantId);
          setExistingMenus(menus);
        } catch (error) {
          console.error("Failed to load existing menus:", error);
        }
      }
    };

    loadExistingMenus();
  }, [user?.restaurantId]);

  // Keyboard shortcuts for filtering
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.altKey) {
        switch (event.key) {
          case "1":
            setActiveFilter("all");
            event.preventDefault();
            break;
          case "2":
            setActiveFilter("food");
            event.preventDefault();
            break;
          case "3":
            setActiveFilter("beverage");
            event.preventDefault();
            break;
          case "4":
            setActiveFilter("wine");
            event.preventDefault();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Supported file types
  const supportedTypes = {
    "application/pdf": ["pdf"],
    "text/csv": ["csv"],
    "application/vnd.ms-excel": ["xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      "xlsx",
    ],
    "application/msword": ["doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      "docx",
    ],
    "application/json": ["json"],
    "text/plain": ["txt"],
  };

  const getAllowedExtensions = () => {
    return Object.values(supportedTypes)
      .flat()
      .map((ext) => `.${ext}`)
      .join(",");
  };

  const isFileTypeSupported = (file: File) => {
    const fileType = file.type;
    const fileExtension = file.name.toLowerCase().split(".").pop();

    // Check by MIME type first
    if (supportedTypes[fileType as keyof typeof supportedTypes]) {
      return true;
    }

    // Check by file extension as fallback
    for (const [mimeType, extensions] of Object.entries(supportedTypes)) {
      if (extensions.includes(fileExtension || "")) {
        return true;
      }
    }

    return false;
  };

  const getFileTypeDisplay = (file: File) => {
    const extension = file.name.toLowerCase().split(".").pop();
    switch (extension) {
      case "pdf":
        return { icon: "PDF", color: "bg-red-500" };
      case "csv":
        return { icon: "CSV", color: "bg-green-500" };
      case "xls":
      case "xlsx":
        return { icon: "XLS", color: "bg-blue-500" };
      case "doc":
      case "docx":
        return { icon: "DOC", color: "bg-indigo-500" };
      case "json":
        return { icon: "JSON", color: "bg-yellow-500" };
      case "txt":
        return { icon: "TXT", color: "bg-gray-500" };
      default:
        return { icon: "FILE", color: "bg-slate-500" };
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    if (!isFileTypeSupported(selectedFile)) {
      setError(
        `Unsupported file type. Please upload: PDF, CSV, Excel (XLS/XLSX), Word (DOC/DOCX), JSON, or TXT files.`
      );
      return;
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      setError(`File too large. Please upload files smaller than 50MB.`);
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      setError("Please upload only one file at a time.");
      return;
    }

    const droppedFile = files[0];
    if (droppedFile) {
      handleFileSelection(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const data = await uploadCleanMenu(file);

      setResult(data);
      setEditedItems(data.items);
      setEditMode(false);
      setSelectedItems(new Set());
      setActiveFilter("all"); // Reset filter when new results are loaded
      setNewMenuName(data.menuName); // Set default name for new menu

      // Auto-expand all categories when first loading
      const categories = [
        ...new Set(
          data.items.map(
            (item: CleanMenuItem) => item.category || "Uncategorized"
          )
        ),
      ];
      setExpandedCategories(new Set(categories as string[]));
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleEditMode = () => {
    if (!editMode && result) {
      setEditedItems([...result.items]);
    }
    setEditMode(!editMode);
    setSelectedItems(new Set());
  };

  const handleItemEdit = (index: number, updatedItem: CleanMenuItem) => {
    setEditedItems((prev) => {
      const newItems = [...prev];
      newItems[index] = updatedItem;
      return newItems;
    });
  };

  const handleItemDelete = (index: number) => {
    setEditedItems((prev) => prev.filter((_, i) => i !== index));
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Adjust indices for remaining items
      const adjustedSet = new Set<number>();
      newSet.forEach((i) => {
        if (i > index) adjustedSet.add(i - 1);
        else adjustedSet.add(i);
      });
      return adjustedSet;
    });
  };

  const handleBulkDelete = () => {
    const indicesToDelete = Array.from(selectedItems).sort((a, b) => b - a);
    let newItems = [...editedItems];

    indicesToDelete.forEach((index) => {
      newItems.splice(index, 1);
    });

    setEditedItems(newItems);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(editedItems.map((_, index) => index)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const saveChanges = () => {
    if (result) {
      setResult({
        ...result,
        items: editedItems,
        totalItemsFound: editedItems.length,
      });
    }
    setEditMode(false);
    setSelectedItems(new Set());
  };

  const cancelEdit = () => {
    if (result) {
      setEditedItems([...result.items]);
    }
    setEditMode(false);
    setSelectedItems(new Set());
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const expandAllCategories = (categories: string[]) => {
    setExpandedCategories(new Set(categories));
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  // Category management functions for parsed categories
  const renameCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;

    setEditedItems((prev) =>
      prev.map((item) =>
        item.category === oldName ? { ...item, category: newName.trim() } : item
      )
    );

    // Update expanded categories
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(oldName)) {
        newSet.delete(oldName);
        newSet.add(newName.trim());
      }
      return newSet;
    });
  };

  const mergeCategories = (sourceCategory: string, targetCategory: string) => {
    if (sourceCategory === targetCategory) return;

    setEditedItems((prev) =>
      prev.map((item) =>
        item.category === sourceCategory
          ? { ...item, category: targetCategory }
          : item
      )
    );

    // Update expanded categories
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sourceCategory)) {
        newSet.delete(sourceCategory);
        newSet.add(targetCategory);
      }
      return newSet;
    });
  };

  const deleteCategory = (categoryName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete all items in "${categoryName}" category?`
      )
    ) {
      return;
    }

    setEditedItems((prev) =>
      prev.filter((item) => item.category !== categoryName)
    );

    // Remove from expanded categories
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      newSet.delete(categoryName);
      return newSet;
    });
  };

  const createCategory = (
    categoryName: string,
    moveSelectedItems: boolean = false
  ) => {
    if (!categoryName.trim()) return;

    const trimmedName = categoryName.trim();

    // Check if category already exists
    const existingCategories = [
      ...new Set(editedItems.map((item) => item.category)),
    ];
    if (existingCategories.includes(trimmedName)) {
      alert(`Category "${trimmedName}" already exists!`);
      return;
    }

    if (moveSelectedItems && selectedItems.size > 0) {
      // Move selected items to new category
      setEditedItems((prev) =>
        prev.map((item, index) =>
          selectedItems.has(index) ? { ...item, category: trimmedName } : item
        )
      );

      // Clear selection
      setSelectedItems(new Set());
    } else if (!moveSelectedItems) {
      // Create empty category by adding a placeholder item
      const firstSelectedItem = editedItems[Array.from(selectedItems)[0]];
      const itemType = firstSelectedItem?.itemType || "food";

      const placeholderItem: CleanMenuItem = {
        name: `New ${trimmedName} Item`,
        category: trimmedName,
        itemType: itemType,
        confidence: 100,
        originalText: `Placeholder item for ${trimmedName} category`,
        description:
          "Edit this item or delete it after adding real items to this category",
      };

      setEditedItems((prev) => [...prev, placeholderItem]);
    }

    // Auto-expand the new category
    setExpandedCategories((prev) => new Set([...prev, trimmedName]));

    // Reset form
    setNewCategoryName("");
    setShowCreateCategory(false);
  };

  const handleFinalizeImport = () => {
    if (!result || !user?.restaurantId) return;
    setShowImportModal(true);
  };

  const handleImport = async () => {
    if (!result || !user?.restaurantId) return;

    setImporting(true);
    setError(null);

    try {
      const importRequest = {
        cleanResult: {
          ...result,
          items: editedItems, // Use edited items instead of original
        },
        restaurantId: user.restaurantId,
        targetMenuId: importOption === "existing" ? selectedMenuId : undefined,
        menuName: importOption === "new" ? newMenuName : undefined,
      };

      const response = await importCleanMenu(importRequest);

      if (response.success) {
        // Show success message and reset state
        alert(
          `Successfully imported ${response.data.importedItems} items to menu "${response.data.menuName}"`
        );

        // Reset the form
        setResult(null);
        setEditedItems([]);
        setFile(null);
        setShowImportModal(false);
        setImportOption("new");
        setSelectedMenuId("");
        setNewMenuName("");

        // Reload existing menus
        if (user.restaurantId) {
          const menus = await getMenusByRestaurant(user.restaurantId);
          setExistingMenus(menus);
        }
      } else {
        setError("Import failed: " + response.message);
      }
    } catch (err: any) {
      setError("Import failed: " + (err.message || "Unknown error"));
    } finally {
      setImporting(false);
    }
  };

  const ItemCard: React.FC<ItemCardProps> = ({
    item,
    index,
    editMode,
    isSelected,
    onEdit,
    onDelete,
    onToggleSelect,
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editItem, setEditItem] = useState<CleanMenuItem>(item);
    const [customCategory, setCustomCategory] = useState("");

    const handleSave = () => {
      onEdit(index, editItem);
      setIsEditing(false);
      setCustomCategory("");
    };

    const handleCancel = () => {
      setEditItem(item);
      setIsEditing(false);
      setCustomCategory("");
    };

    const handleFieldChange = (field: keyof CleanMenuItem, value: any) => {
      setEditItem((prev) => ({ ...prev, [field]: value }));
    };

    return (
      <div
        className={`border rounded-2xl p-6 shadow-lg transition-all duration-200 transform ${
          isSelected
            ? "border-primary-400 bg-gradient-to-r from-primary-50 to-primary-100 shadow-xl scale-[1.02]"
            : "border-slate-200 bg-white hover:shadow-xl"
        } ${editMode ? "hover:border-slate-300" : ""}`}
      >
        {editMode && (
          <div className="flex items-center justify-between mb-4 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(index)}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-slate-700">
                {isSelected ? "Selected" : "Select item"}
              </span>
            </label>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(index)}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-6 bg-gradient-to-r from-slate-50 to-white rounded-2xl p-6 border border-slate-200">
            <div>
              <label className="block text-sm font-medium text-dark-slate mb-3">
                Item Name
              </label>
              <input
                type="text"
                value={editItem.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm font-medium"
                placeholder="Enter item name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-slate mb-3">
                  Category
                </label>
                <select
                  value={
                    editItem.category === customCategory
                      ? "custom"
                      : editItem.category
                  }
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setCustomCategory(editItem.category);
                    } else {
                      handleFieldChange("category", e.target.value);
                      setCustomCategory("");
                    }
                  }}
                  className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm"
                >
                  <option value="">Select category</option>
                  {/* Get unique categories from current items */}
                  {[
                    ...new Set(
                      (editMode ? editedItems : result?.items || []).map(
                        (item) => item.category
                      )
                    ),
                  ]
                    .filter((cat) => cat && cat.trim())
                    .sort()
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  <option value="custom">Create New Category</option>
                </select>

                {(editItem.category === customCategory ||
                  ![
                    ...new Set(
                      (editMode ? editedItems : result?.items || []).map(
                        (item) => item.category
                      )
                    ),
                  ].includes(editItem.category)) && (
                  <input
                    type="text"
                    value={editItem.category}
                    onChange={(e) =>
                      handleFieldChange("category", e.target.value)
                    }
                    placeholder="Enter new category name"
                    className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm mt-2"
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-slate mb-3">
                  Price (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editItem.price || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "price",
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-slate mb-3">
                Description
              </label>
              <textarea
                value={editItem.description || ""}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
                className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm resize-none"
                rows={3}
                placeholder="Enter item description"
              />
            </div>

            {editItem.itemType === "wine" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Vintage
                    </label>
                    <input
                      type="number"
                      value={editItem.vintage || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "vintage",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Variety Type
                    </label>
                    <select
                      value={editItem.wineColor || ""}
                      onChange={(e) =>
                        handleFieldChange("wineColor", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select type...</option>
                      <option value="red">Red Wine</option>
                      <option value="white">White Wine</option>
                      <option value="rosé">Rosé Wine</option>
                      <option value="sparkling">Sparkling Wine</option>
                      <option value="champagne">Champagne</option>
                      <option value="cava">Cava</option>
                      <option value="crémant">Crémant</option>
                      <option value="orange">Orange Wine</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Producer
                    </label>
                    <input
                      type="text"
                      value={editItem.producer || ""}
                      onChange={(e) =>
                        handleFieldChange("producer", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Region
                    </label>
                    <input
                      type="text"
                      value={editItem.region || ""}
                      onChange={(e) =>
                        handleFieldChange("region", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Serving Options */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Serving Options
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = [...(editItem.servingOptions || [])];
                        newOptions.push({ size: "", price: 0 });
                        handleFieldChange("servingOptions", newOptions);
                      }}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      + Add Serving
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editItem.servingOptions || []).map(
                      (serving, servingIndex) => (
                        <div
                          key={servingIndex}
                          className="flex gap-2 items-center"
                        >
                          <input
                            type="text"
                            placeholder="Size (e.g., Glass, Bottle)"
                            value={serving.size}
                            onChange={(e) => {
                              const newOptions = [
                                ...(editItem.servingOptions || []),
                              ];
                              newOptions[servingIndex].size = e.target.value;
                              handleFieldChange("servingOptions", newOptions);
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={serving.price}
                            onChange={(e) => {
                              const newOptions = [
                                ...(editItem.servingOptions || []),
                              ];
                              const parsedValue = parseFloat(e.target.value);
                              newOptions[servingIndex].price = isNaN(
                                parsedValue
                              )
                                ? 0
                                : parsedValue;
                              handleFieldChange("servingOptions", newOptions);
                            }}
                            className="w-20 p-2 border border-gray-300 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = [
                                ...(editItem.servingOptions || []),
                              ];
                              newOptions.splice(servingIndex, 1);
                              handleFieldChange("servingOptions", newOptions);
                            }}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                    {(!editItem.servingOptions ||
                      editItem.servingOptions.length === 0) && (
                      <p className="text-xs text-gray-500 italic">
                        No serving options added yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {editItem.itemType === "food" && (
              <div className="space-y-3">
                {/* Ingredients */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Ingredients
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newIngredients = [
                          ...(editItem.ingredients || []),
                        ];
                        newIngredients.push("");
                        handleFieldChange("ingredients", newIngredients);
                      }}
                      className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      + Add Ingredient
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editItem.ingredients || []).map(
                      (ingredient, ingredientIndex) => (
                        <div
                          key={ingredientIndex}
                          className="flex gap-2 items-center"
                        >
                          <input
                            type="text"
                            placeholder="Ingredient name"
                            value={ingredient}
                            onChange={(e) => {
                              const newIngredients = [
                                ...(editItem.ingredients || []),
                              ];
                              newIngredients[ingredientIndex] = e.target.value;
                              handleFieldChange("ingredients", newIngredients);
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newIngredients = [
                                ...(editItem.ingredients || []),
                              ];
                              newIngredients.splice(ingredientIndex, 1);
                              handleFieldChange("ingredients", newIngredients);
                            }}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                    {(!editItem.ingredients ||
                      editItem.ingredients.length === 0) && (
                      <p className="text-xs text-gray-500 italic">
                        No ingredients added yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Cooking Methods */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Cooking Methods
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newMethods = [...(editItem.cookingMethods || [])];
                        newMethods.push("");
                        handleFieldChange("cookingMethods", newMethods);
                      }}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      + Add Method
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editItem.cookingMethods || []).map(
                      (method, methodIndex) => (
                        <div
                          key={methodIndex}
                          className="flex gap-2 items-center"
                        >
                          <input
                            type="text"
                            placeholder="Cooking method (e.g., grilled, baked)"
                            value={method}
                            onChange={(e) => {
                              const newMethods = [
                                ...(editItem.cookingMethods || []),
                              ];
                              newMethods[methodIndex] = e.target.value;
                              handleFieldChange("cookingMethods", newMethods);
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newMethods = [
                                ...(editItem.cookingMethods || []),
                              ];
                              newMethods.splice(methodIndex, 1);
                              handleFieldChange("cookingMethods", newMethods);
                            }}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                    {(!editItem.cookingMethods ||
                      editItem.cookingMethods.length === 0) && (
                      <p className="text-xs text-gray-500 italic">
                        No cooking methods added yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Dietary Options */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Dietary Information
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editItem.isVegetarian || false}
                        onChange={(e) =>
                          handleFieldChange("isVegetarian", e.target.checked)
                        }
                        className="rounded"
                      />
                      Vegetarian
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editItem.isVegan || false}
                        onChange={(e) =>
                          handleFieldChange("isVegan", e.target.checked)
                        }
                        className="rounded"
                      />
                      Vegan
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editItem.isGlutenFree || false}
                        onChange={(e) =>
                          handleFieldChange("isGlutenFree", e.target.checked)
                        }
                        className="rounded"
                      />
                      Gluten-Free
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editItem.isDairyFree || false}
                        onChange={(e) =>
                          handleFieldChange("isDairyFree", e.target.checked)
                        }
                        className="rounded"
                      />
                      Dairy-Free
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editItem.isSpicy || false}
                        onChange={(e) =>
                          handleFieldChange("isSpicy", e.target.checked)
                        }
                        className="rounded"
                      />
                      Spicy
                    </label>
                  </div>
                </div>
              </div>
            )}

            {editItem.itemType === "beverage" && (
              <div className="space-y-3">
                {/* Spirit Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Spirit Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., vodka, gin, rum, whiskey"
                    value={editItem.spiritType || ""}
                    onChange={(e) =>
                      handleFieldChange("spiritType", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Beer Style */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Beer Style
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., IPA, lager, stout, pilsner"
                    value={editItem.beerStyle || ""}
                    onChange={(e) =>
                      handleFieldChange("beerStyle", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Cocktail Ingredients */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Cocktail Ingredients
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newIngredients = [
                          ...(editItem.cocktailIngredients || []),
                        ];
                        newIngredients.push("");
                        handleFieldChange(
                          "cocktailIngredients",
                          newIngredients
                        );
                      }}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      + Add Ingredient
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editItem.cocktailIngredients || []).map(
                      (ingredient, ingredientIndex) => (
                        <div
                          key={ingredientIndex}
                          className="flex gap-2 items-center"
                        >
                          <input
                            type="text"
                            placeholder="Ingredient (e.g., vodka, lime juice, mint)"
                            value={ingredient}
                            onChange={(e) => {
                              const newIngredients = [
                                ...(editItem.cocktailIngredients || []),
                              ];
                              newIngredients[ingredientIndex] = e.target.value;
                              handleFieldChange(
                                "cocktailIngredients",
                                newIngredients
                              );
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newIngredients = [
                                ...(editItem.cocktailIngredients || []),
                              ];
                              newIngredients.splice(ingredientIndex, 1);
                              handleFieldChange(
                                "cocktailIngredients",
                                newIngredients
                              );
                            }}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                    {(!editItem.cocktailIngredients ||
                      editItem.cocktailIngredients.length === 0) && (
                      <p className="text-xs text-gray-500 italic">
                        No cocktail ingredients added yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Alcohol Content */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Alcohol Content
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 5.2% ABV, 40% vol"
                    value={editItem.alcoholContent || ""}
                    onChange={(e) =>
                      handleFieldChange("alcoholContent", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Serving Style */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Serving Style
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., neat, on the rocks, shaken, draft"
                    value={editItem.servingStyle || ""}
                    onChange={(e) =>
                      handleFieldChange("servingStyle", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Temperature
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., hot, cold, iced, frozen"
                    value={editItem.temperature || ""}
                    onChange={(e) =>
                      handleFieldChange("temperature", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Non-Alcoholic Checkbox */}
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editItem.isNonAlcoholic || false}
                      onChange={(e) =>
                        handleFieldChange("isNonAlcoholic", e.target.checked)
                      }
                      className="rounded"
                    />
                    Non-Alcoholic
                  </label>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h4 className="font-semibold text-xl text-dark-slate mb-3">
                  {item.name}
                </h4>
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      item.itemType === "wine"
                        ? "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800"
                        : item.itemType === "beverage"
                        ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800"
                        : "bg-gradient-to-r from-green-100 to-green-200 text-green-800"
                    }`}
                  >
                    {item.itemType === "wine"
                      ? "Wine"
                      : item.itemType === "beverage"
                      ? "Beverage"
                      : "Food"}
                  </span>
                  <span className="px-3 py-1.5 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-full text-xs font-medium">
                    {item.category}
                  </span>
                  {item.price && (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-accent-100 to-accent-200 text-accent-800 rounded-full text-sm font-semibold">
                      £
                      {(() => {
                        const price =
                          typeof item.price === "number"
                            ? item.price
                            : parseFloat(String(item.price));
                        return !isNaN(price) ? price.toFixed(2) : "0.00";
                      })()}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                    item.confidence >= 90
                      ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300"
                      : item.confidence >= 70
                      ? "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300"
                      : "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300"
                  }`}
                >
                  {item.confidence}% confidence
                </div>
              </div>
            </div>

            {item.description && (
              <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 mb-4 border border-slate-200">
                <p className="text-slate-700 leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {item.itemType === "wine" && (
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200 shadow-sm">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {item.vintage && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-900">
                        Vintage:
                      </span>
                      <span className="px-2 py-1 bg-white/70 rounded-lg text-purple-800 font-medium">
                        {item.vintage}
                      </span>
                    </div>
                  )}
                  {item.producer && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-900">
                        Producer:
                      </span>
                      <span className="px-2 py-1 bg-white/70 rounded-lg text-purple-800 font-medium">
                        {item.producer}
                      </span>
                    </div>
                  )}
                  {item.region && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-900">
                        Region:
                      </span>
                      <span className="px-2 py-1 bg-white/70 rounded-lg text-purple-800 font-medium">
                        {item.region}
                      </span>
                    </div>
                  )}
                </div>

                {item.grapeVariety && item.grapeVariety.length > 0 && (
                  <div className="mt-4">
                    <span className="font-semibold text-purple-900 block mb-3">
                      Grape Varieties:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.grapeVariety.map((grape, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs rounded-full font-semibold shadow-md"
                        >
                          {grape}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.servingOptions && item.servingOptions.length > 0 && (
                  <div className="mt-4">
                    <span className="font-semibold text-purple-900 block mb-3">
                      Serving Options:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.servingOptions.map((serving, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs rounded-full font-semibold shadow-md"
                        >
                          {serving.size}: £
                          {typeof serving.price === "number" &&
                          !isNaN(serving.price)
                            ? serving.price.toFixed(2)
                            : "0.00"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {item.itemType === "food" && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-5 border border-green-200 shadow-sm">
                {item.ingredients && item.ingredients.length > 0 && (
                  <div className="mb-4">
                    <span className="font-semibold text-green-900 block mb-3">
                      Key Ingredients:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.ingredients.map((ingredient, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs rounded-full font-semibold shadow-md"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.cookingMethods && item.cookingMethods.length > 0 && (
                  <div className="mb-4">
                    <span className="font-semibold text-green-900 block mb-3">
                      Cooking Methods:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.cookingMethods.map((method, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-full font-semibold shadow-md"
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.allergens && item.allergens.length > 0 && (
                  <div className="mb-4">
                    <span className="font-semibold text-green-900 block mb-3">
                      Allergens:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.allergens.map((allergen, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full font-semibold shadow-md"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(item.isDairyFree || item.isSpicy) && (
                  <div>
                    <span className="font-semibold text-green-900 block mb-3">
                      Special Notes:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.isDairyFree && (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs rounded-full font-semibold shadow-md">
                          Dairy-Free
                        </span>
                      )}
                      {item.isSpicy && (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs rounded-full font-semibold shadow-md">
                          Spicy
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {item.itemType === "beverage" && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  {item.spiritType && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-900">
                        Spirit Type:
                      </span>
                      <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs rounded-full font-semibold shadow-md">
                        {item.spiritType}
                      </span>
                    </div>
                  )}

                  {item.beerStyle && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-900">
                        Beer Style:
                      </span>
                      <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs rounded-full font-semibold shadow-md">
                        {item.beerStyle}
                      </span>
                    </div>
                  )}

                  {item.alcoholContent && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-900">
                        Alcohol:
                      </span>
                      <span className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full font-semibold shadow-md">
                        {item.alcoholContent}
                      </span>
                    </div>
                  )}

                  {item.servingStyle && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-900">
                        Serving:
                      </span>
                      <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs rounded-full font-semibold shadow-md">
                        {item.servingStyle}
                      </span>
                    </div>
                  )}

                  {item.temperature && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-900">
                        Temperature:
                      </span>
                      <span className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs rounded-full font-semibold shadow-md">
                        {item.temperature}
                      </span>
                    </div>
                  )}

                  {item.isNonAlcoholic && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-900">Type:</span>
                      <span className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs rounded-full font-semibold shadow-md">
                        Non-Alcoholic
                      </span>
                    </div>
                  )}
                </div>

                {item.cocktailIngredients &&
                  item.cocktailIngredients.length > 0 && (
                    <div className="mt-4">
                      <span className="font-semibold text-blue-900 block mb-3">
                        Cocktail Ingredients:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {item.cocktailIngredients.map((ingredient, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-full font-semibold shadow-md"
                          >
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            <details className="mt-4 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-4 border border-slate-200">
              <summary className="text-sm text-slate-600 cursor-pointer font-medium hover:text-slate-800 transition-colors">
                View Original Text
              </summary>
              <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 font-mono leading-relaxed">
                  {item.originalText}
                </p>
              </div>
            </details>
          </>
        )}
      </div>
    );
  };

  const CategorySection: React.FC<CategorySectionProps> = ({
    category,
    items,
    editMode,
    selectedItems,
    isExpanded,
    allCategories,
    onToggle,
    onEdit,
    onDelete,
    onToggleSelect,
    onRenameCategory,
    onMergeCategory,
    onDeleteCategory,
  }) => {
    const [showCategoryActions, setShowCategoryActions] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [mergeTarget, setMergeTarget] = useState("");

    // Get item type for styling
    const itemType = items[0]?.item.itemType || "food";

    const getCategoryStyle = (type: string) => {
      switch (type) {
        case "wine":
          return {
            bg: "bg-gradient-to-r from-purple-100 to-purple-200",
            border: "border-purple-300",
            text: "text-purple-900",
            icon: <span className="text-2xl">🍷</span>,
            headerBg: "bg-gradient-to-r from-purple-600 to-purple-700",
            shadow: "shadow-purple-200",
          };
        case "beverage":
          return {
            bg: "bg-gradient-to-r from-blue-100 to-blue-200",
            border: "border-blue-300",
            text: "text-blue-900",
            icon: <span className="text-2xl">🍸</span>,
            headerBg: "bg-gradient-to-r from-blue-600 to-blue-700",
            shadow: "shadow-blue-200",
          };
        case "food":
          return {
            bg: "bg-gradient-to-r from-green-100 to-green-200",
            border: "border-green-300",
            text: "text-green-900",
            icon: <span className="text-2xl">🍽️</span>,
            headerBg: "bg-gradient-to-r from-green-600 to-green-700",
            shadow: "shadow-green-200",
          };
        default:
          return {
            bg: "bg-gradient-to-r from-slate-100 to-slate-200",
            border: "border-slate-300",
            text: "text-slate-900",
            icon: <span className="text-2xl">📋</span>,
            headerBg: "bg-gradient-to-r from-slate-600 to-slate-700",
            shadow: "shadow-slate-200",
          };
      }
    };

    const style = getCategoryStyle(itemType);

    return (
      <div
        className={`border-2 rounded-2xl ${style.border} ${style.bg} shadow-lg ${style.shadow} overflow-hidden transition-all duration-200 hover:shadow-xl`}
      >
        <button
          onClick={onToggle}
          className={`w-full p-6 text-left flex items-center justify-between hover:scale-[1.01] transition-all duration-200 ${style.text}`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 ${style.headerBg} rounded-2xl flex items-center justify-center shadow-lg`}
            >
              {style.icon}
            </div>
            <div>
              <h4 className="font-bold text-xl tracking-tight">{category}</h4>
              <p className="text-sm opacity-80 font-medium">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-full text-sm font-semibold bg-white/70 ${style.text}`}
            >
              {itemType === "wine"
                ? "Wine"
                : itemType === "beverage"
                ? "Beverage"
                : "Food"}
            </span>
            {editMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategoryActions(!showCategoryActions);
                }}
                className="p-2 rounded-xl bg-white/70 hover:bg-white/90 transition-all duration-200 shadow-md hover:shadow-lg"
                title="Category actions"
              >
                <svg
                  className="w-5 h-5 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            )}
            <div className={`p-2 rounded-xl bg-white/70`}>
              <svg
                className={`w-6 h-6 ${
                  style.text
                } transition-transform duration-300 ${
                  isExpanded ? "transform rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </button>

        {/* Category Actions Panel */}
        {showCategoryActions && editMode && (
          <div className="px-6 py-4 border-t-2 border-white/50 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm">
            <div className="space-y-4">
              {/* Rename Category */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold w-24 text-slate-700">
                  Rename:
                </span>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={category}
                  className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
                <button
                  onClick={() => {
                    if (newCategoryName.trim()) {
                      onRenameCategory(category, newCategoryName.trim());
                      setNewCategoryName("");
                      setShowCategoryActions(false);
                    }
                  }}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Rename
                </button>
              </div>

              {/* Merge Category */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold w-24 text-slate-700">
                  Merge into:
                </span>
                <select
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="">Select target category</option>
                  {allCategories
                    .filter((cat) => cat !== category)
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    if (mergeTarget) {
                      onMergeCategory(category, mergeTarget);
                      setMergeTarget("");
                      setShowCategoryActions(false);
                    }
                  }}
                  disabled={!mergeTarget}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                  Merge
                </button>
              </div>

              {/* Delete Category */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium w-20">Delete:</span>
                <span className="flex-1 text-sm text-gray-600">
                  This will delete all {items.length} items in this category
                </span>
                <button
                  onClick={() => {
                    onDeleteCategory(category);
                    setShowCategoryActions(false);
                  }}
                  className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete All
                </button>
              </div>

              {/* Close */}
              <div className="text-right">
                <button
                  onClick={() => setShowCategoryActions(false)}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {items.map(({ item, originalIndex }) => (
              <ItemCard
                key={originalIndex}
                item={item}
                index={originalIndex}
                editMode={editMode}
                isSelected={selectedItems.has(originalIndex)}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStatistics = () => {
    if (!result) return null;

    const itemsToShow = editMode ? editedItems : result.items;
    const foodItems = itemsToShow.filter((item) => item.itemType === "food");
    const beverageItems = itemsToShow.filter(
      (item) => item.itemType === "beverage"
    );
    const wineItems = itemsToShow.filter((item) => item.itemType === "wine");

    return (
      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* All Items */}
        <button
          onClick={() => setActiveFilter("all")}
          title="Show all items (Alt+1)"
          className={`p-6 rounded-2xl text-center transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
            activeFilter === "all"
              ? "bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-400 shadow-xl"
              : "bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 hover:from-slate-100 hover:to-slate-50"
          }`}
        >
          <div className="text-3xl font-light text-slate-700 mb-2">
            {itemsToShow.length}
          </div>
          <div className="text-sm font-medium text-slate-800">All Items</div>
        </button>

        {/* Food Items */}
        <button
          onClick={() => setActiveFilter("food")}
          title="Show only food items (Alt+2)"
          className={`p-6 rounded-2xl text-center transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
            activeFilter === "food"
              ? "bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-400 shadow-xl"
              : "bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:from-blue-100 hover:to-blue-150"
          }`}
        >
          <div className="text-3xl font-light text-blue-700 mb-2">
            {foodItems.length}
          </div>
          <div className="text-sm font-medium text-blue-800">Food</div>
        </button>

        {/* Beverages */}
        <button
          onClick={() => setActiveFilter("beverage")}
          title="Show only beverages (Alt+3)"
          className={`p-6 rounded-2xl text-center transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
            activeFilter === "beverage"
              ? "bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-400 shadow-xl"
              : "bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:from-green-100 hover:to-green-150"
          }`}
        >
          <div className="text-3xl font-light text-green-700 mb-2">
            {beverageItems.length}
          </div>
          <div className="text-sm font-medium text-green-800">Beverages</div>
        </button>

        {/* Wines */}
        <button
          onClick={() => setActiveFilter("wine")}
          title="Show only wines (Alt+4)"
          className={`p-6 rounded-2xl text-center transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
            activeFilter === "wine"
              ? "bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-400 shadow-xl"
              : "bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:from-purple-100 hover:to-purple-150"
          }`}
        >
          <div className="text-3xl font-light text-purple-700 mb-2">
            {wineItems.length}
          </div>
          <div className="text-sm font-medium text-purple-800">Wines</div>
        </button>
      </div>
    );
  };

  const renderItems = () => {
    if (!result) return null;

    const itemsToShow = editMode ? editedItems : result.items;

    // Apply item type filter
    const filteredItems =
      activeFilter === "all"
        ? itemsToShow
        : itemsToShow.filter((item) => item.itemType === activeFilter);

    // Group filtered items by category
    const groupedItems = filteredItems.reduce((groups, item, originalIndex) => {
      const category = item.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      // Find the original index in the unfiltered array
      const actualIndex = itemsToShow.findIndex(
        (originalItem) => originalItem === item
      );
      groups[category].push({ item, originalIndex: actualIndex });
      return groups;
    }, {} as Record<string, Array<{ item: CleanMenuItem; originalIndex: number }>>);

    // Sort categories by item type priority and name
    const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
      const aItems = groupedItems[a];
      const bItems = groupedItems[b];
      const aType = aItems[0]?.item.itemType || "z";
      const bType = bItems[0]?.item.itemType || "z";

      // Priority: wine > beverage > food
      const typePriority = { wine: 0, beverage: 1, food: 2 };
      const aPriority = typePriority[aType as keyof typeof typePriority] ?? 3;
      const bPriority = typePriority[bType as keyof typeof typePriority] ?? 3;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.localeCompare(b);
    });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              {editMode ? "Edit Items" : "Parsed Items"} ({filteredItems.length}
              )
            </h3>
            {activeFilter !== "all" && (
              <p className="text-sm text-gray-600 mt-1">
                Showing only {activeFilter} items
                {filteredItems.length !== itemsToShow.length && (
                  <span className="ml-1">
                    ({filteredItems.length} of {itemsToShow.length} total)
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {editMode ? (
              <>
                <button
                  onClick={saveChanges}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save Changes
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleEditMode}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Items
                </button>
                <button
                  onClick={handleFinalizeImport}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Finalize Import
                </button>
              </>
            )}
          </div>
        </div>

        {filteredItems.length > 0 && (
          <div className="mb-6 p-6 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {/* View Controls */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 mr-2">
                  View:
                </span>
                <button
                  onClick={() => expandAllCategories(sortedCategories)}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2"
                  style={{
                    color: "#ffffff !important",
                    backgroundColor: "#2563eb",
                    border: "none",
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="#ffffff"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <span style={{ color: "#ffffff !important" }}>
                    Expand All
                  </span>
                </button>
                <button
                  onClick={collapseAllCategories}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2"
                  style={{
                    color: "#ffffff !important",
                    backgroundColor: "#2563eb",
                    border: "none",
                  }}
                >
                  <svg
                    className="w-4 h-4 rotate-180"
                    fill="none"
                    stroke="#ffffff"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <span style={{ color: "#ffffff !important" }}>
                    Collapse All
                  </span>
                </button>
              </div>

              {/* Filter Controls */}
              {activeFilter !== "all" && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-px bg-slate-300 mx-2"></div>
                  <span className="text-sm font-medium text-slate-700 mr-2">
                    Filter:
                  </span>
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                    Show All Items
                  </button>
                </div>
              )}

              {/* Edit Mode Controls */}
              {editMode && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-6 w-px bg-slate-300 mx-2"></div>
                  <span className="text-sm font-medium text-slate-700 mr-2">
                    Actions:
                  </span>

                  <button
                    onClick={() => setShowCreateCategory(true)}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Create Category
                  </button>

                  <button
                    onClick={selectAllItems}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Select All
                  </button>

                  <button
                    onClick={deselectAllItems}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Deselect All
                  </button>

                  {selectedItems.size > 0 && (
                    <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-300">
                      <span className="text-sm font-medium text-slate-700">
                        Selected ({selectedItems.size}):
                      </span>
                      <button
                        onClick={() => setShowCreateCategory(true)}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4"
                          />
                        </svg>
                        Move to Category
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-1"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Category Modal */}
        {showCreateCategory && editMode && (
          <div className="mb-4 bg-white border border-green-200 rounded-lg p-4 shadow-md">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-green-800">
                Create New Category
              </h3>
              <button
                onClick={() => {
                  setShowCreateCategory(false);
                  setNewCategoryName("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name (e.g., Starters, Red Wine, Cocktails)"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newCategoryName.trim()) {
                      createCategory(newCategoryName, selectedItems.size > 0);
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => createCategory(newCategoryName, false)}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                >
                  Create Empty Category
                </button>

                {selectedItems.size > 0 && (
                  <button
                    onClick={() => createCategory(newCategoryName, true)}
                    disabled={!newCategoryName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                  >
                    Create & Move Selected ({selectedItems.size})
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowCreateCategory(false);
                    setNewCategoryName("");
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  Cancel
                </button>
              </div>

              <div className="text-xs text-gray-600">
                {selectedItems.size > 0 ? (
                  <p>
                    You have {selectedItems.size} items selected. You can create
                    an empty category or move the selected items to the new
                    category.
                  </p>
                ) : (
                  <p>
                    This will create an empty category with a placeholder item
                    that you can edit or delete.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {sortedCategories.length > 0 ? (
            sortedCategories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                items={groupedItems[category]}
                editMode={editMode}
                selectedItems={selectedItems}
                isExpanded={expandedCategories.has(category)}
                allCategories={sortedCategories}
                onToggle={() => toggleCategory(category)}
                onEdit={handleItemEdit}
                onDelete={handleItemDelete}
                onToggleSelect={toggleItemSelection}
                onRenameCategory={renameCategory}
                onMergeCategory={mergeCategories}
                onDeleteCategory={deleteCategory}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-gray-500 text-lg mb-2">
                No {activeFilter === "all" ? "" : activeFilter + " "}items found
              </div>
              {activeFilter !== "all" && (
                <button
                  onClick={() => setActiveFilter("all")}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Show all items
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-primary-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-light text-dark-slate mb-6 tracking-tight">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                  Menu Upload
                </span>{" "}
                <span className="font-medium">& Editor</span>
              </h1>
              <p className="text-xl text-muted-gray max-w-2xl mx-auto font-light leading-relaxed">
                Upload PDF menus and edit the extracted items with AI-powered
                analysis before importing
              </p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 mb-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-medium text-dark-slate mb-2">
                  Upload Menu File
                </h2>
                <p className="text-muted-gray">
                  AI will analyze and extract menu items automatically
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                {/* Supported file types info */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Supported File Types
                  </h3>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-1 text-red-700">
                      <span className="w-2 h-2 bg-red-500 rounded"></span>
                      PDF
                    </div>
                    <div className="flex items-center gap-1 text-green-700">
                      <span className="w-2 h-2 bg-green-500 rounded"></span>
                      CSV
                    </div>
                    <div className="flex items-center gap-1 text-blue-700">
                      <span className="w-2 h-2 bg-blue-500 rounded"></span>
                      Excel (XLS/XLSX)
                    </div>
                    <div className="flex items-center gap-1 text-indigo-700">
                      <span className="w-2 h-2 bg-indigo-500 rounded"></span>
                      Word (DOC/DOCX)
                    </div>
                    <div className="flex items-center gap-1 text-yellow-700">
                      <span className="w-2 h-2 bg-yellow-500 rounded"></span>
                      JSON
                    </div>
                    <div className="flex items-center gap-1 text-gray-700">
                      <span className="w-2 h-2 bg-gray-500 rounded"></span>
                      Text (TXT)
                    </div>
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  className={`mb-6 border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                    isDragOver
                      ? "border-primary-400 bg-gradient-to-br from-primary-50 to-primary-100 scale-[1.02] shadow-lg"
                      : "border-slate-300 bg-gradient-to-br from-slate-50 to-white hover:border-primary-300 hover:from-primary-50 hover:to-white"
                  } cursor-pointer`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <div
                    className={`mx-auto mb-4 ${
                      isDragOver ? "scale-110" : ""
                    } transition-transform duration-300`}
                  >
                    {isDragOver ? (
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center mx-auto">
                        <svg
                          className="w-8 h-8 text-slate-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div
                    className={`transition-colors duration-300 ${
                      isDragOver ? "text-primary-700" : "text-slate-600"
                    }`}
                  >
                    <p className="text-lg font-medium mb-2">
                      {isDragOver
                        ? "Drop your file here"
                        : "Drag and drop your menu file"}
                    </p>
                    <p className="text-sm mb-4">
                      {isDragOver
                        ? "Release to upload"
                        : "or click to browse files"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Maximum file size: 50MB
                    </p>
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  id="fileInput"
                  type="file"
                  accept={getAllowedExtensions()}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Selected file display */}
                {file && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 flex items-center gap-4">
                    <div
                      className={`w-12 h-12 ${
                        getFileTypeDisplay(file).color
                      } rounded-lg flex items-center justify-center shadow-md`}
                    >
                      <span className="text-white text-xs font-bold">
                        {getFileTypeDisplay(file).icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-green-800">
                        {file.name}
                      </div>
                      <div className="text-sm text-green-600 flex items-center gap-4">
                        <span>{(file.size / 1024 / 1024).toFixed(2)}MB</span>
                        <span>•</span>
                        <span>{file.type || "Unknown type"}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setError(null);
                      }}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing Menu...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span>Upload & Parse Menu</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 mb-8 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-red-800 mb-1">
                      Upload Error
                    </h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Display */}
            {result && (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-green-800 mb-1">
                        Menu Parsed Successfully!
                      </h3>
                      <p className="text-green-700">
                        Successfully analyzed "{result.menuName}" with AI
                        assistance
                      </p>
                    </div>
                  </div>
                </div>

                {renderStatistics()}

                {result.processingNotes.length > 0 && (
                  <details className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm [&>summary]:list-none [&>summary::-webkit-details-marker]:hidden">
                    <summary className="cursor-pointer p-4 hover:bg-blue-100/50 transition-colors rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                          </div>
                          <span className="text-base font-medium text-blue-900">
                            AI Processing Insights
                          </span>
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                            {result.processingNotes.length} items
                          </span>
                        </div>
                        <svg
                          className="w-5 h-5 text-blue-600 transition-transform duration-200 transform [details[open]>&]:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-4 pb-4 space-y-2">
                      {result.processingNotes.map((note, index) => {
                        // Add icons for different types of notes
                        let icon = "•";
                        let bgColor = "bg-blue-50";
                        let textColor = "text-blue-700";
                        let borderColor = "border-blue-200";

                        if (note.includes("Grape variety identification")) {
                          icon = "G";
                          bgColor = "bg-purple-50";
                          textColor = "text-purple-700";
                          borderColor = "border-purple-200";
                        }
                        if (
                          note.includes("AI parsing") ||
                          note.includes("Parsed successfully")
                        ) {
                          icon = "A";
                          bgColor = "bg-indigo-50";
                          textColor = "text-indigo-700";
                          borderColor = "border-indigo-200";
                        }
                        if (note.includes("Rate limit")) {
                          icon = "R";
                          bgColor = "bg-amber-50";
                          textColor = "text-amber-700";
                          borderColor = "border-amber-200";
                        }
                        if (note.includes("Pattern matching")) {
                          icon = "P";
                          bgColor = "bg-cyan-50";
                          textColor = "text-cyan-700";
                          borderColor = "border-cyan-200";
                        }
                        if (note.includes("Validation")) {
                          icon = "V";
                          bgColor = "bg-green-50";
                          textColor = "text-green-700";
                          borderColor = "border-green-200";
                        }
                        if (note.includes("Food enhancement")) {
                          icon = "F";
                          bgColor = "bg-emerald-50";
                          textColor = "text-emerald-700";
                          borderColor = "border-emerald-200";
                        }
                        if (
                          note.includes("Beverage enhancement") ||
                          (note.includes("Enhanced") &&
                            note.includes("beverage"))
                        ) {
                          icon = "B";
                          bgColor = "bg-teal-50";
                          textColor = "text-teal-700";
                          borderColor = "border-teal-200";
                        }

                        return (
                          <div
                            key={index}
                            className={`${bgColor} rounded-lg p-2 border ${borderColor}`}
                          >
                            <span
                              className={`text-xs font-medium ${textColor} leading-relaxed`}
                            >
                              {note}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}

                {renderItems()}
              </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-lg w-full mx-4 transform">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-medium text-dark-slate mb-2">
                      Finalize Menu Import
                    </h3>
                    <p className="text-muted-gray">
                      Choose how to import your parsed menu items
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-dark-slate mb-4">
                        Import Option
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200 cursor-pointer hover:from-primary-100 hover:to-primary-150 transition-all duration-200">
                          <input
                            type="radio"
                            name="importOption"
                            value="new"
                            checked={importOption === "new"}
                            onChange={(e) =>
                              setImportOption(
                                e.target.value as "new" | "existing"
                              )
                            }
                            className="mr-3 text-primary-600"
                          />
                          <div>
                            <div className="font-medium text-primary-800">
                              Create new menu
                            </div>
                            <div className="text-sm text-primary-600">
                              Start fresh with these items
                            </div>
                          </div>
                        </label>
                        <label className="flex items-center p-4 bg-gradient-to-r from-accent-50 to-accent-100 rounded-xl border border-accent-200 cursor-pointer hover:from-accent-100 hover:to-accent-150 transition-all duration-200">
                          <input
                            type="radio"
                            name="importOption"
                            value="existing"
                            checked={importOption === "existing"}
                            onChange={(e) =>
                              setImportOption(
                                e.target.value as "new" | "existing"
                              )
                            }
                            className="mr-3 text-accent-600"
                          />
                          <div>
                            <div className="font-medium text-accent-800">
                              Add to existing menu
                            </div>
                            <div className="text-sm text-accent-600">
                              Append to an existing menu
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {importOption === "new" ? (
                      <div>
                        <label className="block text-sm font-medium text-dark-slate mb-3">
                          New Menu Name
                        </label>
                        <input
                          type="text"
                          value={newMenuName}
                          onChange={(e) => setNewMenuName(e.target.value)}
                          className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                          placeholder="Enter menu name"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-dark-slate mb-3">
                          Select Existing Menu
                        </label>
                        <select
                          value={selectedMenuId}
                          onChange={(e) => setSelectedMenuId(e.target.value)}
                          className="w-full p-4 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                        >
                          <option value="">Choose a menu...</option>
                          {existingMenus.map((menu) => (
                            <option key={menu._id} value={menu._id}>
                              {menu.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 p-6 rounded-2xl">
                      <h4 className="font-medium text-dark-slate mb-4">
                        Import Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-light text-slate-700">
                            {editedItems.length}
                          </div>
                          <div className="text-xs font-medium text-slate-600">
                            Total Items
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-light text-blue-600">
                            {
                              editedItems.filter(
                                (item) => item.itemType === "food"
                              ).length
                            }
                          </div>
                          <div className="text-xs font-medium text-blue-700">
                            Food
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-light text-green-600">
                            {
                              editedItems.filter(
                                (item) => item.itemType === "beverage"
                              ).length
                            }
                          </div>
                          <div className="text-xs font-medium text-green-700">
                            Beverages
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-light text-purple-600">
                            {
                              editedItems.filter(
                                (item) => item.itemType === "wine"
                              ).length
                            }
                          </div>
                          <div className="text-xs font-medium text-purple-700">
                            Wines
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={handleImport}
                      disabled={
                        importing ||
                        (importOption === "new" && !newMenuName.trim()) ||
                        (importOption === "existing" && !selectedMenuId)
                      }
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md flex items-center justify-center gap-3"
                    >
                      {importing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          <span>Import Menu</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowImportModal(false)}
                      disabled={importing}
                      className="px-6 py-4 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CleanMenuUploadPage;
