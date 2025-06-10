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
import Button from "../components/common/Button";
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
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CloudArrowUpIcon,
  CogIcon,
  PlusIcon,
  DocumentCheckIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

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
        setError(
          "Please select a menu file to upload. Supported formats: PDF, Excel (.xlsx/.xls), CSV, JSON, Word (.docx)"
        );
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
      formData.append("menuFile", fileToUpload);
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
        const result = response as ImportResult;
        setImportResult(result);
        setImportJobId(null);

        // Auto-navigate to MenuItemsPage after successful import
        if (
          (result.overallStatus === "completed" ||
            result.overallStatus === "partial") &&
          result.menuId
        ) {
          // Add a small delay to show the success message briefly before navigating
          setTimeout(() => {
            navigate(`/menu/${result.menuId}/items`, {
              state: { fromImport: true },
            });
          }, 2000); // 2 second delay
        }
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

      // Auto-navigate to MenuItemsPage after successful async import
      if (
        (result.overallStatus === "completed" ||
          result.overallStatus === "partial") &&
        result.menuId
      ) {
        // Add a small delay to show the success message briefly before navigating
        setTimeout(() => {
          navigate(`/menu/${result.menuId}/items`, {
            state: { fromImport: true },
          });
        }, 2000); // 2 second delay
      }
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
  }, [importJobId, navigate]);

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
    <div className="min-h-screen bg-gradient-to-br from-white via-primary-50 to-accent-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-6 sm:space-y-8">
              {/* Header Section */}
              <div className="bg-gradient-to-br from-white via-slate-50 to-primary-50 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-primary to-primary-600 rounded-3xl shadow-lg">
                    <ArrowUpTrayIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-5xl font-light text-slate-900 tracking-tight">
                      <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Upload Menu
                      </span>
                    </h1>
                    <p className="text-lg text-muted-gray font-light mt-2">
                      Upload your menu PDF and let AI extract and organize your
                      items automatically
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="bg-gradient-to-br from-white via-slate-50 to-primary-50 rounded-3xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-8">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-3xl shadow-lg ${
                          selectedFile
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : "bg-gradient-to-r from-primary to-primary-600"
                        }`}
                      >
                        <DocumentArrowUpIcon className="h-6 w-6 text-white" />
                      </div>
                      <span
                        className={`font-light text-lg ${
                          selectedFile ? "text-green-700" : "text-primary-700"
                        }`}
                      >
                        1. Upload File
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-3xl shadow-lg ${
                          uploadPreview
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : "bg-gradient-to-r from-slate-300 to-slate-400"
                        }`}
                      >
                        <CogIcon className="h-6 w-6 text-white" />
                      </div>
                      <span
                        className={`font-light text-lg ${
                          uploadPreview ? "text-green-700" : "text-slate-500"
                        }`}
                      >
                        2. AI Processing
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-3xl shadow-lg ${
                          importResult
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : "bg-gradient-to-r from-slate-300 to-slate-400"
                        }`}
                      >
                        <CheckCircleIcon className="h-6 w-6 text-white" />
                      </div>
                      <span
                        className={`font-light text-lg ${
                          importResult ? "text-green-700" : "text-slate-500"
                        }`}
                      >
                        3. Complete
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="bg-gradient-to-br from-white via-slate-50 to-primary-50 rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-primary-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="text-2xl font-light text-slate-900 tracking-tight">
                    Upload New Menu
                  </h2>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    {/* File Input */}
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv,.json,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        id="menu-file-input"
                      />
                      <label
                        htmlFor="menu-file-input"
                        className="block w-full p-8 border-2 border-dashed border-primary-300 rounded-3xl hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 ease-out cursor-pointer group transform hover:scale-[1.01]"
                      >
                        <div className="text-center">
                          <div className="p-3 bg-gradient-to-r from-primary to-primary-600 rounded-3xl mx-auto w-fit mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                            <DocumentArrowUpIcon className="h-8 w-8 text-white" />
                          </div>
                          <div>
                            <p className="text-xl font-light text-slate-700 group-hover:text-primary-700 transition-colors">
                              {selectedFile
                                ? selectedFile.name
                                : "Click to upload your menu file"}
                            </p>
                            <p className="text-sm text-muted-gray mt-2">
                              Supports PDF, Excel (.xlsx/.xls), CSV, JSON, Word
                              (.docx) • Up to 10MB
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Menu Selection */}
                    {availableMenus.length > 0 && (
                      <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-6 border border-slate-200 shadow-md">
                        <h3 className="text-xl font-light text-slate-900 mb-4 tracking-tight">
                          Target Menu
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Select existing menu to update (optional)
                            </label>
                            <select
                              value={selectedTargetMenuId || ""}
                              onChange={(e) =>
                                setSelectedTargetMenuId(
                                  e.target.value || undefined
                                )
                              }
                              className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
                              disabled={isLoadingMenus}
                            >
                              <option value="">Create new menu</option>
                              {availableMenus.map((menu) => (
                                <option key={menu._id} value={menu._id}>
                                  {menu.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedTargetMenuId && (
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="replace-all-items"
                                checked={replaceAllItems}
                                onChange={(e) =>
                                  setReplaceAllItems(e.target.checked)
                                }
                                className="h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                              />
                              <label
                                htmlFor="replace-all-items"
                                className="text-sm text-slate-700"
                              >
                                Replace all existing items (instead of
                                updating/adding)
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Upload Button */}
                    {selectedFile && !uploadPreview && !isLoading && (
                      <button
                        onClick={() => handleUploadPreview()}
                        className="w-full px-6 py-4 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-3xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ease-out"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <DocumentCheckIcon className="h-6 w-6" />
                          <span className="text-lg">Process Menu with AI</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="bg-gradient-to-br from-white via-slate-50 to-primary-50 rounded-3xl shadow-lg border border-slate-200 p-8">
                  <div className="flex items-center justify-center space-x-4">
                    <Spinner size="lg" />
                    <div className="text-center">
                      <p className="text-xl font-light text-slate-700 tracking-tight">
                        AI is processing your menu...
                      </p>
                      <p className="text-sm text-muted-gray mt-1">
                        This may take a few moments
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-3xl p-6 shadow-lg">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-red-100 rounded-2xl">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
                    </div>
                    <div>
                      <h3 className="text-xl font-light text-red-800 tracking-tight">
                        Upload Error
                      </h3>
                      <p className="text-red-700 mt-1">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className="mt-3 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Processing Results */}
              {uploadPreview && (
                <>
                  {/* Processing Summary */}
                  <div className="bg-gradient-to-br from-white via-slate-50 to-emerald-50 rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 border-b border-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg">
                          <CheckCircleIcon className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-light text-slate-900 tracking-tight">
                          2. AI Processing Complete
                        </h2>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-4 border border-blue-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                          <div className="text-3xl font-light text-blue-700 tracking-tight">
                            {uploadPreview.parsedItems.length}
                          </div>
                          <div className="text-sm text-blue-600 font-medium">
                            Items Found
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-4 border border-green-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                          <div className="text-3xl font-light text-green-700 tracking-tight">
                            {
                              uploadPreview.parsedItems.filter(
                                (item) => item.userAction === "keep"
                              ).length
                            }
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            To Import
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl p-4 border border-amber-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                          <div className="text-3xl font-light text-amber-700 tracking-tight">
                            {uploadPreview.detectedCategories?.length || 0}
                          </div>
                          <div className="text-sm text-amber-600 font-medium">
                            Categories
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-4 border border-purple-200 shadow-md hover:shadow-lg transition-shadow duration-300">
                          <div className="text-3xl font-light text-purple-700 tracking-tight">
                            {
                              uploadPreview.parsedItems.filter(
                                (item) => item.fields.itemType?.value === "wine"
                              ).length
                            }
                          </div>
                          <div className="text-sm text-purple-600 font-medium">
                            Wine Items
                          </div>
                        </div>
                      </div>

                      {/* Global Errors */}
                      {uploadPreview.globalErrors &&
                        uploadPreview.globalErrors.length > 0 && (
                          <div className="mt-6 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-3xl p-4 shadow-md">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-amber-100 rounded-2xl">
                                <InformationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                              </div>
                              <div>
                                <h4 className="font-medium text-amber-800">
                                  Processing Notes:
                                </h4>
                                <ul className="list-disc list-inside text-sm text-amber-700 mt-2 space-y-1">
                                  {uploadPreview.globalErrors.map(
                                    (gError: string, index: number) => (
                                      <li key={index}>{gError}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-200">
                        <button
                          onClick={handleConflictCheck}
                          disabled={
                            buttonDisabled ||
                            !uploadPreview.parsedItems.some(
                              (item: ParsedMenuItem) =>
                                item.userAction !== "ignore"
                            )
                          }
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-3xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-out border border-blue-800"
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
                          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-3xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-out"
                        >
                          {renderButtonContent(
                            isFinalizingImport,
                            "Finalize Import",
                            "Importing..."
                          )}
                        </button>
                      </div>

                      {/* Conflict Error */}
                      {conflictError && (
                        <div className="mt-4 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-3xl p-4 shadow-md">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-red-100 rounded-2xl">
                              <XMarkIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                            </div>
                            <div>
                              <h4 className="font-medium text-red-800">
                                Conflict Check Error:
                              </h4>
                              <p className="text-red-700 text-sm mt-1">
                                {conflictError}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Import Status */}
                  {(importJobId || importResult) && (
                    <div className="bg-gradient-to-br from-white via-slate-50 to-emerald-50 rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg">
                            <InformationCircleIcon className="h-6 w-6 text-white" />
                          </div>
                          <h2 className="text-2xl font-light text-slate-900 tracking-tight">
                            3. Import Status
                          </h2>
                        </div>
                      </div>

                      <div className="p-6">
                        {importJobId && (
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-3xl p-4 mb-4 shadow-md">
                            <div className="flex items-center space-x-3">
                              <CogIcon className="h-5 w-5 text-blue-600 animate-spin" />
                              <div>
                                <p className="font-medium text-blue-800">
                                  Menu import is processing in the background
                                </p>
                                <p className="text-sm text-blue-600 mt-1">
                                  Job ID: {importJobId}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleCheckJobStatus}
                              disabled={isLoadingJobStatus}
                              className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
                            >
                              {isLoadingJobStatus ? (
                                <div className="flex items-center space-x-2">
                                  <Spinner size="sm" />
                                  <span>Checking...</span>
                                </div>
                              ) : (
                                "Check Status"
                              )}
                            </button>

                            {jobStatusError && (
                              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-2xl">
                                <p className="text-sm text-red-700">
                                  <strong>Status Error:</strong>{" "}
                                  {jobStatusError}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {importResult && (
                          <div
                            className={`rounded-3xl p-6 border shadow-lg ${
                              importResult.overallStatus === "failed" ||
                              importResult.itemsErrored > 0
                                ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200"
                                : "bg-gradient-to-br from-green-50 to-green-100 border-green-200"
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={`p-2 rounded-2xl ${
                                  importResult.overallStatus === "failed" ||
                                  importResult.itemsErrored > 0
                                    ? "bg-red-100"
                                    : "bg-green-100"
                                }`}
                              >
                                {importResult.overallStatus === "failed" ||
                                importResult.itemsErrored > 0 ? (
                                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
                                ) : (
                                  <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h3
                                  className={`text-xl font-light tracking-tight ${
                                    importResult.overallStatus === "failed" ||
                                    importResult.itemsErrored > 0
                                      ? "text-red-800"
                                      : "text-green-800"
                                  }`}
                                >
                                  Import {importResult.overallStatus}:{" "}
                                  {importResult.message}
                                </h3>

                                {importResult.menuName && (
                                  <p
                                    className={`mt-1 ${
                                      importResult.overallStatus === "failed" ||
                                      importResult.itemsErrored > 0
                                        ? "text-red-700"
                                        : "text-green-700"
                                    }`}
                                  >
                                    Menu: {importResult.menuName} (ID: ...
                                    {importResult.menuId?.slice(-6)})
                                  </p>
                                )}

                                <div
                                  className={`mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 ${
                                    importResult.overallStatus === "failed" ||
                                    importResult.itemsErrored > 0
                                      ? "text-red-700"
                                      : "text-green-700"
                                  }`}
                                >
                                  <div className="text-center">
                                    <div className="text-2xl font-light tracking-tight">
                                      {importResult.itemsProcessed}
                                    </div>
                                    <div className="text-xs font-medium">
                                      Processed
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-light tracking-tight">
                                      {importResult.itemsCreated}
                                    </div>
                                    <div className="text-xs font-medium">
                                      Created
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-light tracking-tight">
                                      {importResult.itemsUpdated}
                                    </div>
                                    <div className="text-xs font-medium">
                                      Updated
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-light tracking-tight">
                                      {importResult.itemsSkipped}
                                    </div>
                                    <div className="text-xs font-medium">
                                      Skipped
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-light tracking-tight">
                                      {importResult.itemsErrored}
                                    </div>
                                    <div className="text-xs font-medium">
                                      Errored
                                    </div>
                                  </div>
                                </div>

                                {(importResult.overallStatus === "completed" ||
                                  importResult.overallStatus === "partial") && (
                                  <div className="mt-4 flex space-x-3">
                                    {importResult.menuId && (
                                      <button
                                        onClick={() =>
                                          navigate(
                                            `/menu/${importResult.menuId}/items`,
                                            {
                                              state: { fromImport: true },
                                            }
                                          )
                                        }
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-3xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ease-out"
                                      >
                                        View Menu Items
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        navigate("/menu", {
                                          state: { newMenuImported: true },
                                        })
                                      }
                                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-3xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ease-out"
                                    >
                                      Back to Menus
                                    </button>
                                  </div>
                                )}

                                {/* Error Details */}
                                {importResult.itemsErrored > 0 &&
                                  importResult.errorDetails && (
                                    <div className="mt-4 bg-white rounded-2xl p-4 border border-red-300 shadow-md">
                                      <h4 className="font-medium text-red-800 mb-2">
                                        Error Details:
                                      </h4>
                                      <div className="max-h-40 overflow-y-auto">
                                        <ul className="space-y-1">
                                          {importResult.errorDetails.map(
                                            (d: ImportResultItemDetail) => (
                                              <li
                                                key={d.id}
                                                className="text-sm text-red-700 bg-red-50 rounded-2xl p-2"
                                              >
                                                <strong>"{d.name}"</strong> (ID:{" "}
                                                {d.id.slice(0, 8)}) - {d.status}
                                                : {d.errorReason}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </div>

                                      {importResult.errorReport && (
                                        <button
                                          onClick={handleDownloadErrorReport}
                                          className="mt-3 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-2xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
                                        >
                                          Download Error Report (.csv)
                                        </button>
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Items Table */}
                  {uploadPreview.parsedItems.length > 0 && (
                    <div className="bg-gradient-to-br from-white via-slate-50 to-primary-50 rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-50 to-primary-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-lg">
                              <DocumentCheckIcon className="h-6 w-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-light text-slate-900 tracking-tight">
                              4. Edit & Confirm Items
                            </h2>
                          </div>
                          <button
                            onClick={handleAddNewCategory}
                            disabled={!uploadPreview}
                            className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-accent to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white rounded-2xl font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>Add Category</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-6">
                        <EditableMenuTable
                          groupedItems={groupedAndSortedItems.categories}
                          categoryOrder={groupedAndSortedItems.order}
                          expandedCategories={expandedCategories}
                          toggleCategoryExpansion={toggleCategoryExpansion}
                          availableCategories={allUniqueCategories}
                          onItemsChange={(updatedItems: ParsedMenuItem[]) =>
                            setUploadPreview(
                              (currentPreview: MenuUploadPreview | null) =>
                                currentPreview
                                  ? {
                                      ...currentPreview,
                                      parsedItems: updatedItems,
                                    }
                                  : null
                            )
                          }
                          onRenameCategory={handleRenameCategory}
                          onDeleteCategory={handleDeleteCategory}
                          onItemMove={handleItemMove}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* No Items Message */}
              {uploadPreview && uploadPreview.parsedItems.length === 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-3xl p-8 text-center shadow-lg">
                  <div className="p-3 bg-amber-100 rounded-3xl mx-auto w-fit mb-4">
                    <InformationCircleIcon className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-light text-amber-800 mb-2 tracking-tight">
                    No Items Found
                  </h3>
                  <p className="text-amber-700">
                    No items were parsed from the menu, or preview is not
                    available.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MenuUploadPage;
