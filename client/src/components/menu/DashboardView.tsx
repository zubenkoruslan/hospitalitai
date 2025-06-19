import React, { useMemo, useState } from "react";
import { MenuItem } from "../../types/menuItemTypes";
import { MenuView } from "../../hooks/useMenuViews";
import DashboardStats from "./DashboardStats";
import QuickActions from "./QuickActions";
import RecentActivityFeed from "./RecentActivityFeed";
import MenuHealthDashboard from "./MenuHealthDashboard";
import ExportMenuModal from "./ExportMenuModal";

interface DashboardViewProps {
  items: MenuItem[];
  onViewChange: (view: MenuView) => void;
  onAddItem: () => void;
  onImportMenu: () => void;
  onExportMenu: () => void;
  // Add these new props
  menuId?: string;
  menuName?: string;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  onViewChange,
  onAddItem,
  onImportMenu,
  onExportMenu,
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
    const itemsWithPrices = items.filter((item) => {
      // Regular price
      if (item.price && item.price > 0) {
        return true;
      }
      // Wine serving options
      if (
        item.itemType === "wine" &&
        item.servingOptions &&
        item.servingOptions.length > 0
      ) {
        return item.servingOptions.some(
          (option) => option.price && option.price > 0
        );
      }
      return false;
    });

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

  // Generate mock activity data based on real items
  const recentActivities = useMemo(() => {
    const activities = [];

    // Add recent items as "created" activities
    const recentItems = items
      .filter((item) => item.createdAt)
      .sort(
        (a, b) =>
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      )
      .slice(0, 5);

    recentItems.forEach((item, index) => {
      activities.push({
        id: `activity-${item._id}-${index}`,
        type: "created" as const,
        itemName: item.name,
        itemType: item.itemType,
        timestamp: new Date(item.createdAt!),
        user: "Current User",
      });
    });

    // Add some mock update activities
    if (items.length > 0) {
      const randomItem = items[Math.floor(Math.random() * items.length)];
      activities.push({
        id: `activity-update-${Date.now()}`,
        type: "updated" as const,
        itemName: randomItem.name,
        itemType: randomItem.itemType,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        user: "Current User",
        changes: ["price", "description"],
      });
    }

    return activities;
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
