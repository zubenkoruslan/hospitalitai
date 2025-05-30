import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, {
  finalizeMenuImportClient,
  getMenuImportJobStatus,
  processMenuItemsForConflicts,
  getMenusByRestaurant,
} from "../services/api";
import EditableMenuTable from "../components/menu/EditableMenuTable";
import Spinner from "../components/common/Spinner";
import Navbar from "../components/Navbar";
import {
  MenuUploadPreview,
  ParsedMenuItem,
  FinalImportRequestBody,
  ImportResult,
  ProcessConflictResolutionRequest,
  ImportResultItemDetail,
} from "../types/menuUploadTypes";
import { IMenuClient } from "../types/menuTypes";
import { useAuth } from "../context/AuthContext"; // Assuming this is your auth context
import { normalizeCategory } from "../utils/stringUtils"; // Import the shared utility

// Helper to normalize category names for grouping (e.g., to title case)
// const normalizeCategory = (category?: string): string => { // Remove local definition
//   if (!category || category.trim() === "") return "Uncategorized";
//   return category
//     .trim()
//     .toLowerCase()
//     .split(" ")
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(" ");
// };

// Define a more specific type for items being edited in the table to ensure non-optional fields
interface EditableItem
  extends Omit<ParsedMenuItem, "userAction" | "importAction"> {
  userAction: "keep" | "ignore";
  importAction: "create" | "update" | "skip";
  // include other fields from ParsedMenuItem as needed, ensuring they are not optional if always present in table state
}

const MenuUploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<MenuUploadPreview | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingConflicts, setIsCheckingConflicts] =
    useState<boolean>(false);
  const [isFinalizingImport, setIsFinalizingImport] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [isLoadingJobStatus, setIsLoadingJobStatus] = useState<boolean>(false);
  const [jobStatusError, setJobStatusError] = useState<string | null>(null);

  // New state for category expansion
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  // New state for all unique categories (user-added + detected)
  const [allUniqueCategories, setAllUniqueCategories] = useState<string[]>([]);

  // New state for menu selection
  const [availableMenus, setAvailableMenus] = useState<IMenuClient[]>([]);
  const [selectedTargetMenuId, setSelectedTargetMenuId] = useState<
    string | undefined
  >(undefined);
  const [isLoadingMenus, setIsLoadingMenus] = useState<boolean>(false);
  const [replaceAllItems, setReplaceAllItems] = useState<boolean>(false);

  const { user, isLoading: isAuthLoading } = useAuth(); // Get user from AuthContext, alias isLoading to isAuthLoading
  const restaurantId =
    user?.role === "restaurant" ? user?.restaurantId : undefined;

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fileFromState = location.state?.fileToUpload as File | undefined;
    if (fileFromState) {
      setSelectedFile(fileFromState);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const resetStateForNewUpload = () => {
    setSelectedFile(null);
    setUploadPreview(null);
    setError(null);
    setConflictError(null);
    setImportResult(null);
    setImportJobId(null);
    setJobStatusError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      resetStateForNewUpload();
      setSelectedFile(event.target.files[0]);
    } else {
      resetStateForNewUpload();
    }
  };

  const handleUploadPreview = useCallback(
    async (file?: File) => {
      const fileToUpload = file || selectedFile;
      if (!fileToUpload) {
        setError("Please select a PDF file to upload.");
        return;
      }
      setIsLoading(true);
      setError(null);
      setConflictError(null);
      setUploadPreview(null);
      setImportResult(null);
      setImportJobId(null);
      setJobStatusError(null);
      const formData = new FormData();
      formData.append("menuPdf", fileToUpload);
      try {
        const response = await api.post<MenuUploadPreview>(
          "/menus/upload/preview",
          formData
        );
        const itemsWithUserAction = response.data.parsedItems.map(
          (item: ParsedMenuItem) =>
            ({
              ...item,
              userAction: item.userAction || "keep",
              importAction: item.importAction || undefined,
            } as ParsedMenuItem)
        );
        setUploadPreview({
          ...response.data,
          parsedItems: itemsWithUserAction,
        });
        // Initialize allUniqueCategories from detectedCategories and item categories
        // Categories are now pre-normalized from the server to prevent duplicates
        const initialCategories = new Set(
          response.data.detectedCategories || []
        );
        itemsWithUserAction.forEach((item) => {
          if (item.fields.category.value) {
            // Categories are already normalized from server, so just add them directly
            initialCategories.add(item.fields.category.value as string);
          }
        });
        setAllUniqueCategories(Array.from(initialCategories).sort());
      } catch (err: any) {
        console.error("Error uploading for preview:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to upload and parse menu for preview."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedFile]
  );

  useEffect(() => {
    if (selectedFile && !uploadPreview && !isLoading && !error) {
      handleUploadPreview(selectedFile);
    }
    // Reset expanded categories when a new preview is loaded or cleared
    if (!uploadPreview) {
      setExpandedCategories({});
    }
  }, [selectedFile, uploadPreview, isLoading, error, handleUploadPreview]);

  // Fetch available menus for the restaurant
  useEffect(() => {
    const fetchMenus = async () => {
      if (isAuthLoading || !restaurantId) {
        return;
      }
      setIsLoadingMenus(true);
      try {
        const menus = await getMenusByRestaurant(restaurantId, "all");
        setAvailableMenus(menus || []); // Ensure it's an array even if API returns null/undefined
      } catch (err) {
        console.error("Error fetching menus:", err);
        setError("Failed to fetch existing menus for selection.");
        setAvailableMenus([]); // Set to empty array on error
      }
      setIsLoadingMenus(false);
    };

    fetchMenus();
  }, [restaurantId, isAuthLoading]);

  const groupedAndSortedItems = useMemo(() => {
    if (!uploadPreview?.parsedItems) {
      return { categories: {}, order: [] };
    }
    const grouped: Record<string, ParsedMenuItem[]> = {};
    // Use allUniqueCategories to ensure even empty user-added categories can be listed if desired
    // However, for grouping, we only group items that actually exist.
    uploadPreview.parsedItems.forEach((item) => {
      // Categories are already normalized from server, so use directly
      const categoryKey =
        (item.fields.category.value as string) || "Uncategorized";
      if (!grouped[categoryKey]) {
        grouped[categoryKey] = [];
      }
      grouped[categoryKey].push(item);
    });

    // Create order: existing categories with items first, then any new empty ones from allUniqueCategories
    const categoryOrder = Object.keys(grouped).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });

    allUniqueCategories.forEach((uniqueCat) => {
      if (!categoryOrder.includes(uniqueCat)) {
        categoryOrder.push(uniqueCat); // Add new, potentially empty, categories to the order
      }
    });

    return {
      categories: grouped,
      order: categoryOrder.filter(
        (cat, index, self) => self.indexOf(cat) === index
      ),
    }; // Ensure unique order
  }, [uploadPreview?.parsedItems, allUniqueCategories]);

  const toggleCategoryExpansion = (categoryKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const handleAddNewCategory = () => {
    const newCategoryName = window.prompt("Enter new category name:");
    if (newCategoryName && newCategoryName.trim() !== "") {
      const normalized = normalizeCategory(newCategoryName.trim());
      if (!allUniqueCategories.includes(normalized)) {
        setAllUniqueCategories((prev) => [...prev, normalized].sort());
        setExpandedCategories((prev) => ({ ...prev, [normalized]: true })); // Expand new category by default
        // No items to add to it yet, groupedAndSortedItems will include it in 'order' due to allUniqueCategories dependency
      } else {
        alert(`Category "${normalized}" already exists.`);
      }
    }
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    if (oldName === newName) return;

    setAllUniqueCategories((prev) =>
      [...prev.filter((cat) => cat !== oldName), newName].sort()
    );
    setExpandedCategories((prev) => {
      const newExpanded = { ...prev };
      if (prev[oldName] !== undefined) {
        newExpanded[newName] = prev[oldName];
        delete newExpanded[oldName];
      }
      return newExpanded;
    });

    if (uploadPreview && uploadPreview.parsedItems) {
      const updatedParsedItems = uploadPreview.parsedItems.map((item) => {
        // Categories are already normalized, so compare directly
        if ((item.fields.category.value as string) === oldName) {
          return {
            ...item,
            fields: {
              ...item.fields,
              category: {
                ...item.fields.category,
                value: newName, // Assign the new, already normalized name
              },
            },
          };
        }
        return item;
      });
      setUploadPreview((prev) =>
        prev ? { ...prev, parsedItems: updatedParsedItems } : null
      );
    }
  };

  const handleDeleteCategory = (categoryName: string) => {
    if (categoryName === "Uncategorized") {
      alert("Cannot delete the 'Uncategorized' category.");
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete the category "${categoryName}"? Items in this category will be moved to "Uncategorized".`
      )
    ) {
      return;
    }

    setAllUniqueCategories((prev) =>
      prev.filter((cat) => cat !== categoryName).sort()
    );
    setExpandedCategories((prev) => {
      const newExpanded = { ...prev };
      delete newExpanded[categoryName];
      return newExpanded;
    });

    if (uploadPreview && uploadPreview.parsedItems) {
      let uncategorizedExists =
        allUniqueCategories.includes("Uncategorized") ||
        categoryName === "Uncategorized";
      const updatedParsedItems = uploadPreview.parsedItems.map((item) => {
        // Categories are already normalized, so compare directly
        if ((item.fields.category.value as string) === categoryName) {
          if (!uncategorizedExists) {
            // If 'Uncategorized' isn't in allUniqueCategories yet (it will be added by this action)
            // and items are being moved to it ensure it's added there.
            // This state will be updated by setAllUniqueCategories above IF categoryName wasn't Uncategorized.
            // If 'Uncategorized' is the target, it should be handled by the grouping logic naturally.
          }
          return {
            ...item,
            fields: {
              ...item.fields,
              category: {
                ...item.fields.category,
                value: "Uncategorized",
              },
            },
          };
        }
        return item;
      });

      // Ensure "Uncategorized" is in allUniqueCategories if items were moved to it
      const itemsWereMoved = updatedParsedItems.some(
        (item) => (item.fields.category.value as string) === "Uncategorized"
      );
      if (itemsWereMoved && !allUniqueCategories.includes("Uncategorized")) {
        // This case should be rare if allUniqueCategories is managed correctly with setAllUniqueCategories before this block,
        // but as a safeguard:
        setAllUniqueCategories((prev) =>
          [...new Set([...prev, "Uncategorized"])].sort()
        );
      }

      setUploadPreview((prev) =>
        prev ? { ...prev, parsedItems: updatedParsedItems } : null
      );
    }
  };

  const handleItemMove = (
    itemId: string,
    newCategoryKey: string,
    oldCategoryKey: string
  ) => {
    if (!uploadPreview || !uploadPreview.parsedItems) return;

    const updatedParsedItems = uploadPreview.parsedItems.map((item) => {
      if (item.id === itemId) {
        // Ensure the newCategoryKey is valid (exists in allUniqueCategories)
        // This check might be redundant if newCategoryKey comes from a rendered category header
        // but good for safety.
        if (!allUniqueCategories.includes(newCategoryKey)) {
          console.warn(
            `Attempted to move item to non-existent category: ${newCategoryKey}`
          );
          return item; // Don't change if target category isn't recognized
        }
        return {
          ...item,
          fields: {
            ...item.fields,
            category: {
              ...item.fields.category,
              value: newCategoryKey, // Assign the new category name
            },
          },
        };
      }
      return item;
    });

    setUploadPreview((prev) =>
      prev ? { ...prev, parsedItems: updatedParsedItems } : null
    );
    // Optionally, expand the new category if it was collapsed
    setExpandedCategories((prev) => ({
      ...prev,
      [newCategoryKey]: true,
      [oldCategoryKey]: prev[oldCategoryKey] || false,
    }));
  };

  const handleConflictCheck = useCallback(async () => {
    if (!uploadPreview || !uploadPreview.parsedItems) {
      setConflictError("No items to check for conflicts.");
      return;
    }
    if (isAuthLoading || !restaurantId) {
      setConflictError(
        "Restaurant ID is not available. Cannot check conflicts."
      );
      return;
    }
    setIsCheckingConflicts(true);
    setConflictError(null);
    setImportResult(null);
    setImportJobId(null);
    setJobStatusError(null);
    const itemsToProcess = uploadPreview.parsedItems.filter(
      (item: ParsedMenuItem) => item.userAction !== "ignore"
    );
    if (itemsToProcess.length === 0) {
      setConflictError("All items are marked as 'ignore'. Nothing to check.");
      setIsCheckingConflicts(false);
      return;
    }
    try {
      const conflictRequestData: ProcessConflictResolutionRequest = {
        itemsToProcess,
        restaurantId, // Actual restaurantId
        targetMenuId: selectedTargetMenuId, // Pass selected target menu ID
      };
      const response = await processMenuItemsForConflicts(conflictRequestData);
      setUploadPreview((prevPreview: MenuUploadPreview | null) => {
        if (!prevPreview) return null;
        const updatedItems = prevPreview.parsedItems.map(
          (currentItem: ParsedMenuItem) => {
            const conflictInfo = response.processedItems.find(
              (pItem) => pItem.id === currentItem.id
            );
            if (conflictInfo && conflictInfo.conflictResolution) {
              let determinedImportAction = currentItem.importAction;
              if (!determinedImportAction) {
                switch (conflictInfo.conflictResolution.status) {
                  case "no_conflict":
                    determinedImportAction = "create";
                    break;
                  case "update_candidate":
                    determinedImportAction = "update";
                    break;
                  default:
                    determinedImportAction = undefined;
                }
              }
              return {
                ...currentItem,
                conflictResolution: conflictInfo.conflictResolution,
                importAction: determinedImportAction,
                existingItemId:
                  conflictInfo.conflictResolution.status === "update_candidate"
                    ? conflictInfo.conflictResolution.existingItemId
                    : currentItem.existingItemId,
              };
            }
            return currentItem;
          }
        );
        return { ...prevPreview, parsedItems: updatedItems };
      });
    } catch (err: any) {
      console.error("Error checking for conflicts:", err);
      setConflictError(
        err.response?.data?.message ||
          err.message ||
          "Failed to process items for conflicts."
      );
    } finally {
      setIsCheckingConflicts(false);
    }
  }, [uploadPreview, selectedTargetMenuId, restaurantId, isAuthLoading]);

  const handleFinalizeImport = useCallback(async () => {
    if (!uploadPreview || !uploadPreview.parsedItems || !selectedFile) {
      setError("No preview data or file available to finalize import.");
      return;
    }
    if (isAuthLoading || !restaurantId) {
      setError("Restaurant ID is not available. Cannot finalize import.");
      return;
    }
    setIsFinalizingImport(true);
    setError(null);
    setConflictError(null);
    setImportResult(null);
    setImportJobId(null);
    setJobStatusError(null);
    const itemsToImport = uploadPreview.parsedItems.filter(
      (item: ParsedMenuItem) =>
        item.userAction !== "ignore" &&
        item.importAction &&
        item.importAction !== "skip"
    );
    if (itemsToImport.length === 0) {
      setError(
        "No items are marked for import. Please review actions or ensure items are not ignored/skipped."
      );
      setIsFinalizingImport(false);
      return;
    }
    const requestBody: FinalImportRequestBody = {
      previewId: uploadPreview.previewId,
      filePath: uploadPreview.filePath,
      parsedMenuName: selectedTargetMenuId
        ? undefined
        : uploadPreview.parsedMenuName,
      targetMenuId: selectedTargetMenuId,
      replaceAllItems: selectedTargetMenuId ? replaceAllItems : false,
      itemsToImport: itemsToImport,
    };
    try {
      const response = await finalizeMenuImportClient(requestBody);
      if ("jobId" in response && response.jobId) {
        setImportJobId(response.jobId);
        setImportResult(null);
      } else {
        setImportResult(response as ImportResult);
        setImportJobId(null);
      }
    } catch (err: any) {
      console.error("Error finalizing import:", err);

      // Enhanced error logging for debugging validation issues
      if (err.response?.data) {
        console.error(
          "Full error response data:",
          JSON.stringify(err.response.data, null, 2)
        );
        if (err.response.data.errors) {
          console.error("Validation errors array:", err.response.data.errors);
          err.response.data.errors.forEach((err: any, index: number) => {
            console.error(`Validation error ${index}:`, err);
          });
        }
      }

      setImportResult({
        overallStatus: "failed",
        message: err.response?.data?.message || err.message,
        totalItemsInRequest: 0,
        itemsProcessed: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        itemsErrored: 0,
        errorDetails: err.response?.data?.errors || [],
      });
      setImportJobId(null);
    } finally {
      setIsFinalizingImport(false);
    }
  }, [
    uploadPreview,
    selectedFile,
    selectedTargetMenuId,
    replaceAllItems,
    restaurantId,
    isAuthLoading,
  ]);

  const handleCheckJobStatus = useCallback(async () => {
    if (!importJobId) {
      setJobStatusError("No Job ID available to check status.");
      return;
    }
    setIsLoadingJobStatus(true);
    setJobStatusError(null);
    try {
      const result = await getMenuImportJobStatus(importJobId);
      setImportResult(result);
    } catch (err: any) {
      console.error("Error checking job status:", err);
      setJobStatusError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch job status."
      );
    } finally {
      setIsLoadingJobStatus(false);
    }
  }, [importJobId]);

  const buttonDisabled =
    isLoading ||
    isCheckingConflicts ||
    isFinalizingImport ||
    isLoadingJobStatus;

  const renderButtonContent = (
    isLoadingState: boolean,
    defaultText: string,
    loadingText: string
  ) => {
    if (isLoadingState) {
      return (
        <div className="flex items-center justify-center">
          <Spinner size="sm" className="mr-2" />
          {loadingText}
        </div>
      );
    }
    return defaultText;
  };

  const handleDownloadErrorReport = () => {
    if (importResult && importResult.errorReport && selectedFile) {
      const blob = new Blob([importResult.errorReport], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const originalFileName = selectedFile.name
        .replace(/\.pdf$/i, "")
        .replace(/[^a-z0-9_\-]/gi, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.setAttribute(
        "download",
        `menu_import_errors_${originalFileName}_${timestamp}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <Navbar />
      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Upload and Preview Menu PDF
        </h1>
      </header>

      <section className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          1. Select PDF File
        </h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={buttonDisabled}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none"
          />
          <button
            onClick={() => handleUploadPreview(selectedFile || undefined)}
            disabled={!selectedFile || buttonDisabled}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[180px] text-center"
          >
            {renderButtonContent(
              isLoading,
              "Upload & Preview",
              "Processing..."
            )}
          </button>
        </div>
        {error && (
          <div
            role="alert"
            className="mt-3 p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md"
          >
            <strong className="font-semibold">Error: </strong>
            {error}
          </div>
        )}
      </section>

      {uploadPreview && (
        <>
          <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                2. Review Preview: {uploadPreview.parsedMenuName || "N/A"}
                <span className="text-xs text-gray-500 ml-2">
                  (Preview ID: ...{uploadPreview.previewId.slice(-6)})
                </span>
              </h2>
            </div>

            {/* Menu Selection and ReplaceAllItems UI */}
            <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                Import Options:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label
                    htmlFor="targetMenuSelect"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Target Menu:
                  </label>
                  {isLoadingMenus ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <Spinner size="sm" className="mr-2" /> Loading existing
                      menus...
                    </div>
                  ) : (
                    <select
                      id="targetMenuSelect"
                      value={selectedTargetMenuId || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedTargetMenuId(
                          value === "" ? undefined : value
                        );
                        if (value === "") {
                          // Creating new menu, disable replaceAllItems
                          setReplaceAllItems(false);
                        }
                      }}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
                      disabled={buttonDisabled || isLoadingMenus}
                    >
                      <option value="">
                        Create New Menu (using PDF name: "
                        {uploadPreview.parsedMenuName || "Menu from PDF"}")
                      </option>
                      {availableMenus &&
                        availableMenus.map((menu) => (
                          <option key={menu._id} value={menu._id}>
                            Update Existing Menu: {menu.name} (ID: ...
                            {menu._id.slice(-6)})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                {selectedTargetMenuId && (
                  <div className="mt-2 md:mt-7">
                    {" "}
                    {/* Align with select when it appears */}
                    <div className="flex items-center">
                      <input
                        id="replaceAllItemsCheckbox"
                        type="checkbox"
                        checked={replaceAllItems}
                        onChange={(e) => setReplaceAllItems(e.target.checked)}
                        disabled={!selectedTargetMenuId || buttonDisabled}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <label
                        htmlFor="replaceAllItemsCheckbox"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Replace all existing items in "
                        {availableMenus.find(
                          (m) => m._id === selectedTargetMenuId
                        )?.name || "selected menu"}
                        "
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
              <p>
                <strong className="font-medium text-gray-700">
                  File Path (temp):
                </strong>{" "}
                {uploadPreview.filePath}
              </p>
              <p>
                <strong className="font-medium text-gray-700">
                  Total Items Parsed:
                </strong>{" "}
                {uploadPreview.summary?.totalItemsParsed || 0}
              </p>
              <p>
                <strong className="font-medium text-gray-700">
                  Detected Categories:
                </strong>{" "}
                {uploadPreview.detectedCategories.join(", ") || "None"}
              </p>
              <p>
                <strong className="font-medium text-gray-700">
                  Items with Potential Errors:
                </strong>{" "}
                {uploadPreview.summary?.itemsWithPotentialErrors || 0}
              </p>
            </div>

            {uploadPreview.globalErrors &&
              uploadPreview.globalErrors.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                  <h3 className="text-md font-semibold text-yellow-800">
                    Global Processing Issues:
                  </h3>
                  <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                    {uploadPreview.globalErrors.map(
                      (gError: string, index: number) => (
                        <li key={index}>{gError}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

            <div className="flex flex-wrap items-center gap-4 py-4 border-t border-b border-gray-200">
              <button
                onClick={handleConflictCheck}
                disabled={
                  buttonDisabled ||
                  !uploadPreview.parsedItems.some(
                    (item: ParsedMenuItem) => item.userAction !== "ignore"
                  )
                }
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[200px] text-center"
              >
                {renderButtonContent(
                  isCheckingConflicts,
                  "Check Item Conflicts",
                  "Checking..."
                )}
              </button>
              <button
                onClick={handleFinalizeImport}
                disabled={
                  buttonDisabled ||
                  !uploadPreview.parsedItems.some(
                    (item: ParsedMenuItem) =>
                      item.importAction &&
                      item.importAction !== "skip" &&
                      item.userAction !== "ignore"
                  )
                }
                className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed min-w-[170px] text-center"
              >
                {renderButtonContent(
                  isFinalizingImport,
                  "Finalize Import",
                  "Importing..."
                )}
              </button>
              {conflictError && (
                <div
                  role="alert"
                  className="mt-2 md:mt-0 md:ml-4 p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md flex-grow"
                >
                  <strong className="font-semibold">
                    Conflict Check Error:{" "}
                  </strong>
                  {conflictError}
                </div>
              )}
            </div>
          </section>

          {(importJobId || importResult) && (
            <section className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                3. Import Status
              </h2>
              {importJobId && (
                <div className="p-4 mb-4 text-sm text-blue-700 bg-blue-100 border border-blue-300 rounded-lg">
                  <p className="font-medium">
                    Menu import is processing in the background.
                  </p>
                  <p>Job ID: {importJobId}</p>
                  <div className="mt-2">
                    <button
                      onClick={handleCheckJobStatus}
                      disabled={isLoadingJobStatus}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:bg-gray-300 min-w-[140px] text-center"
                    >
                      {renderButtonContent(
                        isLoadingJobStatus,
                        "Check Job Status",
                        "Checking..."
                      )}
                    </button>
                  </div>
                  {jobStatusError && (
                    <div
                      role="alert"
                      className="mt-2 p-2 text-xs text-red-700 bg-red-100 border border-red-300 rounded-md"
                    >
                      <strong className="font-semibold">Status Error: </strong>
                      {jobStatusError}
                    </div>
                  )}
                </div>
              )}
              {importResult && (
                <div
                  className={`p-4 text-sm rounded-lg ${
                    importResult.overallStatus === "failed" ||
                    importResult.itemsErrored > 0
                      ? "bg-red-50 text-red-700 border border-red-300"
                      : "bg-green-50 text-green-700 border border-green-300"
                  }`}
                >
                  <p className="font-medium">
                    Import {importResult.overallStatus}: {importResult.message}
                  </p>
                  {importResult.menuName && (
                    <p>
                      Menu: {importResult.menuName} (ID: ...
                      {importResult.menuId?.slice(-6)})
                    </p>
                  )}
                  <p className="mt-1">
                    Processed: {importResult.itemsProcessed}, Created:{" "}
                    {importResult.itemsCreated}, Updated:{" "}
                    {importResult.itemsUpdated}, Skipped:{" "}
                    {importResult.itemsSkipped}, Errored:{" "}
                    {importResult.itemsErrored}
                  </p>
                  {importResult.overallStatus === "completed" ||
                  importResult.overallStatus === "partial" ? (
                    <div className="mt-4">
                      <button
                        onClick={() =>
                          navigate("/menus", {
                            state: { newMenuImported: true },
                          })
                        }
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Back to Menus
                      </button>
                    </div>
                  ) : null}
                  {importResult.itemsErrored > 0 &&
                    importResult.errorDetails && (
                      <div className="mt-2">
                        <p className="font-semibold">Error Details:</p>
                        <ul className="list-disc list-inside text-xs max-h-40 overflow-y-auto mt-1">
                          {importResult.errorDetails.map(
                            (d: ImportResultItemDetail) => (
                              <li key={d.id}>
                                Item "{d.name}" (ID: {d.id.slice(0, 8)}) -{" "}
                                {d.status}: {d.errorReason}
                              </li>
                            )
                          )}
                        </ul>
                        {importResult.errorReport && (
                          <div className="mt-3">
                            <button
                              onClick={handleDownloadErrorReport}
                              className="px-4 py-1.5 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                            >
                              Download Error Report (.csv)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              )}
            </section>
          )}

          {uploadPreview.parsedItems.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                4. Edit & Confirm Items
              </h2>
              <div className="mb-4">
                <button
                  onClick={handleAddNewCategory}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:bg-gray-300"
                  disabled={!uploadPreview} // Only enable if there's a preview
                >
                  Add New Category
                </button>
              </div>
              <EditableMenuTable
                groupedItems={groupedAndSortedItems.categories}
                categoryOrder={groupedAndSortedItems.order}
                expandedCategories={expandedCategories}
                toggleCategoryExpansion={toggleCategoryExpansion}
                availableCategories={allUniqueCategories}
                onItemsChange={(updatedItems: ParsedMenuItem[]) =>
                  setUploadPreview((currentPreview: MenuUploadPreview | null) =>
                    currentPreview
                      ? { ...currentPreview, parsedItems: updatedItems }
                      : null
                  )
                }
                onRenameCategory={handleRenameCategory}
                onDeleteCategory={handleDeleteCategory}
                onItemMove={handleItemMove}
              />
            </section>
          ) : (
            <p className="mt-6 text-gray-600">
              No items were parsed from the menu, or preview is not available.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default MenuUploadPage;
