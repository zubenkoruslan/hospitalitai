import React, { useMemo, useState } from "react";
import { MenuItem } from "../../types/menuItemTypes";
import { MenuView } from "../../hooks/useMenuViews";
import DashboardStats from "./DashboardStats";
import QuickActions from "./QuickActions";
import RecentActivityFeed from "./RecentActivityFeed";
import MenuHealthDashboard from "./MenuHealthDashboard";
import ExportMenuModal from "./ExportMenuModal";

// Import the ActivityItem interface
interface ActivityItem {
  id: string;
  type: "created" | "updated" | "deleted" | "bulk_import";
  itemName: string;
  itemType: "food" | "beverage" | "wine" | "multiple";
  timestamp: Date;
  user?: string;
  changes?: string[];
  itemCount?: number;
}

interface DashboardViewProps {
  items: MenuItem[];
  onViewChange: (view: MenuView) => void;
  onAddItem: () => void;
  onImportMenu: () => void;
  // Add these new props
  menuId?: string;
  menuName?: string;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  onViewChange,
  onAddItem,
  onImportMenu,
  menuId,
  menuName,
}) => {
  // Add state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  // Calculate comprehensive stats with memoization for performance
  const dashboardStats = useMemo(() => {
    const foodItems = items.filter((item) => item.itemType === "food");
    const beverageItems = items.filter((item) => item.itemType === "beverage");
    const wineItems = items.filter((item) => item.itemType === "wine");

    // Category distribution
    const categoryCounts = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Price analytics - Handle both regular prices and wine serving options

    // For average price calculation, collect all prices (including serving options)
    const allPrices: number[] = [];
    items.forEach((item) => {
      if (item.price && item.price > 0) {
        allPrices.push(item.price);
      }
      if (
        item.itemType === "wine" &&
        item.servingOptions &&
        item.servingOptions.length > 0
      ) {
        item.servingOptions.forEach((option) => {
          if (option.price && option.price > 0) {
            allPrices.push(option.price);
          }
        });
      }
    });

    const averagePrice =
      allPrices.length > 0
        ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length
        : 0;
    const priceRange: [number, number] =
      allPrices.length > 0
        ? [Math.min(...allPrices), Math.max(...allPrices)]
        : [Infinity, -Infinity];

    // Completeness metrics - Fixed to handle wine serving options
    const itemsWithoutPrices = items.filter((item) => {
      // Check if item has regular price
      if (item.price && item.price > 0) {
        return false;
      }
      // Check if wine has serving options with prices
      if (
        item.itemType === "wine" &&
        item.servingOptions &&
        item.servingOptions.length > 0
      ) {
        const hasValidServingPrice = item.servingOptions.some(
          (option) => option.price && option.price > 0
        );
        return !hasValidServingPrice;
      }
      // Item has no price information
      return true;
    }).length;
    const itemsWithoutDescriptions = items.filter(
      (item) => !item.description || item.description.trim() === ""
    ).length;

    // Recent activity simulation (last 7 days)
    const recentlyAdded = items.filter((item) => {
      if (!item.createdAt) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(item.createdAt) > weekAgo;
    }).length;

    return {
      totalItems: items.length,
      foodCount: foodItems.length,
      beverageCount: beverageItems.length,
      wineCount: wineItems.length,
      categoryCounts,
      averagePrice,
      priceRange,
      itemsWithoutPrices,
      itemsWithoutDescriptions,
      recentlyAdded,
    };
  }, [items]);

  // Generate real activity data based on menu item timestamps
  const recentActivities = useMemo(() => {
    const activities: ActivityItem[] = [];

    // Add recent items as "created" activities (items created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentItems = items
      .filter((item) => {
        if (!item.createdAt) return false;
        const createdDate = new Date(item.createdAt);
        return createdDate > thirtyDaysAgo;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      )
      .slice(0, 8); // Show up to 8 recent items

    recentItems.forEach((item, index) => {
      activities.push({
        id: `activity-created-${item._id}-${index}`,
        type: "created" as const,
        itemName: item.name,
        itemType: item.itemType,
        timestamp: new Date(item.createdAt!),
        user: "Restaurant User", // Could be enhanced with actual user data
      });
    });

    // Add recently updated items (items updated in last 30 days, but not just created)
    const recentlyUpdated = items
      .filter((item) => {
        if (!item.updatedAt || !item.createdAt) return false;
        const updatedDate = new Date(item.updatedAt);
        const createdDate = new Date(item.createdAt);

        // Only include if updated after creation and within last 30 days
        return (
          updatedDate > createdDate &&
          updatedDate > thirtyDaysAgo &&
          updatedDate.getTime() - createdDate.getTime() > 60000 // At least 1 minute after creation
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
      )
      .slice(0, 5); // Show up to 5 recently updated items

    recentlyUpdated.forEach((item, index) => {
      activities.push({
        id: `activity-updated-${item._id}-${index}`,
        type: "updated" as const,
        itemName: item.name,
        itemType: item.itemType,
        timestamp: new Date(item.updatedAt!),
        user: "Restaurant User",
        changes: ["Item details"], // Could be enhanced with actual change tracking
      });
    });

    // Sort all activities by timestamp (newest first) and limit to show most recent
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  }, [items]);

  // Calculate menu health metrics
  const menuHealthMetrics = useMemo(() => {
    const totalItems = items.length;
    if (totalItems === 0) {
      return {
        overallScore: 100,
        completeness: {
          descriptions: 100,
          prices: 100,
          categories: 100,
          images: 0,
        },
        recommendations: ["Start by adding some menu items"],
        warnings: [],
      };
    }

    const descriptionCompleteness = Math.round(
      ((totalItems - dashboardStats.itemsWithoutDescriptions) / totalItems) *
        100
    );
    const priceCompleteness = Math.round(
      ((totalItems - dashboardStats.itemsWithoutPrices) / totalItems) * 100
    );
    const categoryCompleteness = 100; // Assuming all items have categories

    const overallScore = Math.round(
      (descriptionCompleteness + priceCompleteness + categoryCompleteness) / 3
    );

    const recommendations = [];
    const warnings = [];

    if (descriptionCompleteness < 90) {
      recommendations.push(
        `Add descriptions to ${dashboardStats.itemsWithoutDescriptions} items`
      );
    }
    if (priceCompleteness < 90) {
      recommendations.push(
        `Add prices to ${dashboardStats.itemsWithoutPrices} items`
      );
    }
    if (descriptionCompleteness < 50) {
      warnings.push("Many items are missing descriptions");
    }
    if (priceCompleteness < 50) {
      warnings.push("Many items are missing prices");
    }

    return {
      overallScore,
      completeness: {
        descriptions: descriptionCompleteness,
        prices: priceCompleteness,
        categories: categoryCompleteness,
        images: 0, // Not implemented yet
      },
      recommendations,
      warnings,
    };
  }, [items, dashboardStats]);

  const handleNavigateToType = (type: "food" | "beverage" | "wine") => {
    // Map the item types to the correct MenuView names
    const viewMap: Record<"food" | "beverage" | "wine", MenuView> = {
      food: "food",
      beverage: "beverages",
      wine: "wines",
    };
    onViewChange(viewMap[type]);
  };

  const handleAddItemWithType = (itemType: "food" | "beverage" | "wine") => {
    // Store the item type for the modal
    sessionStorage.setItem("pendingItemType", itemType);
    onAddItem();
  };

  const handleExportMenuClick = () => {
    setIsExportModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Stats - Always visible, 2x2 on mobile, 1 row on desktop */}
      <DashboardStats
        stats={dashboardStats}
        onNavigateToType={handleNavigateToType}
      />

      {/* Desktop Layout - Two columns */}
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-6">
        {/* Left Column - Main Content (3/4 width) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Menu Health and Recent Activity - Side by Side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Menu Health */}
            <MenuHealthDashboard health={menuHealthMetrics} />

            {/* Recent Activity */}
            <RecentActivityFeed activities={recentActivities} />
          </div>
        </div>

        {/* Right Column - Quick Actions Sidebar (1/4 width) */}
        <div className="lg:col-span-1">
          <QuickActions
            onAddFood={() => handleAddItemWithType("food")}
            onAddBeverage={() => handleAddItemWithType("beverage")}
            onAddWine={() => handleAddItemWithType("wine")}
            onBulkImport={onImportMenu}
            onExportMenu={handleExportMenuClick}
          />
        </div>
      </div>

      {/* Mobile Layout - Stacked */}
      <div className="lg:hidden space-y-6">
        {/* Quick Actions - First on mobile */}
        <QuickActions
          onAddFood={() => handleAddItemWithType("food")}
          onAddBeverage={() => handleAddItemWithType("beverage")}
          onAddWine={() => handleAddItemWithType("wine")}
          onBulkImport={onImportMenu}
          onExportMenu={handleExportMenuClick}
        />

        {/* Menu Health - Second on mobile */}
        <MenuHealthDashboard health={menuHealthMetrics} />

        {/* Recent Activity - Third on mobile */}
        <RecentActivityFeed activities={recentActivities} />
      </div>

      {/* Export Modal */}
      {isExportModalOpen && menuId && (
        <ExportMenuModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          menuId={menuId}
          menuName={menuName || "Menu"}
        />
      )}
    </div>
  );
};

export default DashboardView;
