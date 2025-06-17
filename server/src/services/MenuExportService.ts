import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from "docx";

interface ExportOptions {
  format: "csv" | "excel" | "json" | "word";
  includeImages?: boolean;
  includeMetadata?: boolean;
  includePricing?: boolean;
  includeDescriptions?: boolean;
  includeFoodItems?: boolean;
  includeBeverageItems?: boolean;
  includeWineItems?: boolean;
}

export class MenuExportService {
  async exportMenu(
    menu: any,
    options: ExportOptions
  ): Promise<Buffer | string> {
    switch (options.format) {
      case "csv":
        return this.exportToCsv(menu, options);
      case "excel":
        return this.exportToExcel(menu, options);
      case "json":
        return this.exportToJson(menu, options);
      case "word":
        return this.exportToWord(menu, options);
      default:
        throw new Error("Unsupported export format");
    }
  }

  private exportToCsv(menu: any, options: ExportOptions): string {
    // Define headers based on item types
    const foodHeaders = [
      "Item Name",
      "Description",
      "Category",
      "Price",
      "Key Ingredients",
      "Cooking Methods",
      "Allergens",
    ];

    const beverageHeaders = [
      "Item Name",
      "Description",
      "Category",
      "Price",
      "Key Ingredients",
      "Spirit Type",
      "Serving Style",
      "Cocktail Ingredients",
      "Non-Alcoholic",
    ];

    const wineHeaders = [
      "Item Name",
      "Description",
      "Category",
      "Serving Size",
      "Serving Price",
      "Wine Style",
      "Variety Type",
      "Grape Variety",
      "Vintage",
      "Producer",
      "Food Pairings",
    ];

    // Separate items by type
    const foodItems = menu.items.filter(
      (item: any) => item.itemType === "food"
    );
    const beverageItems = menu.items.filter(
      (item: any) => item.itemType === "beverage"
    );
    const wineItems = menu.items.filter(
      (item: any) => item.itemType === "wine"
    );

    let csvContent = "";

    // Food Items Section
    if (foodItems.length > 0 && options.includeFoodItems !== false) {
      csvContent += "FOOD ITEMS\n";
      csvContent += foodHeaders.map((h) => `"${h}"`).join(",") + "\n";

      foodItems.forEach((item: any) => {
        const row = [
          item.name || "",
          item.description || "",
          item.category || "",
          item.price ? `$${item.price}` : "",
          Array.isArray(item.ingredients) ? item.ingredients.join(", ") : "",
          Array.isArray(item.cookingMethods)
            ? item.cookingMethods.join(", ")
            : "",
          Array.isArray(item.allergens) ? item.allergens.join(", ") : "",
        ];
        csvContent +=
          row
            .map((cell) => `"${cell.toString().replace(/"/g, '""')}"`)
            .join(",") + "\n";
      });
      csvContent += "\n";
    }

    // Beverage Items Section
    if (beverageItems.length > 0 && options.includeBeverageItems !== false) {
      csvContent += "BEVERAGE ITEMS\n";
      csvContent += beverageHeaders.map((h) => `"${h}"`).join(",") + "\n";

      beverageItems.forEach((item: any) => {
        const row = [
          item.name || "",
          item.description || "",
          item.category || "",
          item.price ? `$${item.price}` : "",
          Array.isArray(item.cocktailIngredients)
            ? item.cocktailIngredients.join(", ")
            : "",
          item.spiritType || "",
          item.servingStyle || "",
          Array.isArray(item.cocktailIngredients)
            ? item.cocktailIngredients.join(", ")
            : "",
          item.isNonAlcoholic ? "TRUE" : "FALSE",
        ];
        csvContent +=
          row
            .map((cell) => `"${cell.toString().replace(/"/g, '""')}"`)
            .join(",") + "\n";
      });
      csvContent += "\n";
    }

    // Wine Items Section
    if (wineItems.length > 0 && options.includeWineItems !== false) {
      csvContent += "WINE ITEMS\n";
      csvContent += wineHeaders.map((h) => `"${h}"`).join(",") + "\n";

      wineItems.forEach((item: any) => {
        if (item.servingOptions && item.servingOptions.length > 0) {
          item.servingOptions.forEach((serving: any) => {
            const row = [
              item.name || "",
              item.description || "",
              item.category || "",
              serving.size || "",
              serving.price ? `$${serving.price}` : "",
              item.wineColor || "",
              item.wineColor || "",
              Array.isArray(item.grapeVariety)
                ? item.grapeVariety.join(", ")
                : "",
              item.vintage || "",
              item.producer || "",
              "", // Food pairings - not in current schema
            ];
            csvContent +=
              row
                .map((cell) => `"${cell.toString().replace(/"/g, '""')}"`)
                .join(",") + "\n";
          });
        } else {
          const row = [
            item.name || "",
            item.description || "",
            item.category || "",
            "",
            "",
            item.wineColor || "",
            item.wineColor || "",
            Array.isArray(item.grapeVariety)
              ? item.grapeVariety.join(", ")
              : "",
            item.vintage || "",
            item.producer || "",
            "",
          ];
          csvContent +=
            row
              .map((cell) => `"${cell.toString().replace(/"/g, '""')}"`)
              .join(",") + "\n";
        }
      });
    }

    return csvContent;
  }

  private async exportToExcel(
    menu: any,
    options: ExportOptions
  ): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Separate items by type
    const foodItems = menu.items.filter(
      (item: any) => item.itemType === "food"
    );
    const beverageItems = menu.items.filter(
      (item: any) => item.itemType === "beverage"
    );
    const wineItems = menu.items.filter(
      (item: any) => item.itemType === "wine"
    );

    // Create Food Items sheet
    if (foodItems.length > 0 && options.includeFoodItems !== false) {
      const foodHeaders = [
        "Item Name",
        "Description",
        "Category",
        "Price",
        "Key Ingredients",
        "Cooking Methods",
        "Allergens",
      ];
      const foodData = [foodHeaders];

      foodItems.forEach((item: any) => {
        foodData.push([
          item.name || "",
          item.description || "",
          item.category || "",
          item.price ? `$${item.price}` : "",
          Array.isArray(item.ingredients) ? item.ingredients.join(", ") : "",
          Array.isArray(item.cookingMethods)
            ? item.cookingMethods.join(", ")
            : "",
          Array.isArray(item.allergens) ? item.allergens.join(", ") : "",
        ]);
      });

      const foodSheet = XLSX.utils.aoa_to_sheet(foodData);
      XLSX.utils.book_append_sheet(workbook, foodSheet, "Food Items");
    }

    // Create Beverage Items sheet
    if (beverageItems.length > 0 && options.includeBeverageItems !== false) {
      const beverageHeaders = [
        "Item Name",
        "Description",
        "Category",
        "Price",
        "Key Ingredients",
        "Spirit Type",
        "Serving Style",
        "Cocktail Ingredients",
        "Non-Alcoholic",
      ];
      const beverageData = [beverageHeaders];

      beverageItems.forEach((item: any) => {
        beverageData.push([
          item.name || "",
          item.description || "",
          item.category || "",
          item.price ? `$${item.price}` : "",
          Array.isArray(item.cocktailIngredients)
            ? item.cocktailIngredients.join(", ")
            : "",
          item.spiritType || "",
          item.servingStyle || "",
          Array.isArray(item.cocktailIngredients)
            ? item.cocktailIngredients.join(", ")
            : "",
          item.isNonAlcoholic ? "TRUE" : "FALSE",
        ]);
      });

      const beverageSheet = XLSX.utils.aoa_to_sheet(beverageData);
      XLSX.utils.book_append_sheet(workbook, beverageSheet, "Beverage Items");
    }

    // Create Wine Items sheet
    if (wineItems.length > 0 && options.includeWineItems !== false) {
      const wineHeaders = [
        "Item Name",
        "Description",
        "Category",
        "Serving Size",
        "Serving Price",
        "Wine Style",
        "Variety Type",
        "Grape Variety",
        "Vintage",
        "Producer",
        "Food Pairings",
      ];
      const wineData = [wineHeaders];

      wineItems.forEach((item: any) => {
        if (item.servingOptions && item.servingOptions.length > 0) {
          item.servingOptions.forEach((serving: any) => {
            wineData.push([
              item.name || "",
              item.description || "",
              item.category || "",
              serving.size || "",
              serving.price ? `$${serving.price}` : "",
              item.wineColor || "",
              item.wineColor || "",
              Array.isArray(item.grapeVariety)
                ? item.grapeVariety.join(", ")
                : "",
              item.vintage || "",
              item.producer || "",
              "",
            ]);
          });
        } else {
          wineData.push([
            item.name || "",
            item.description || "",
            item.category || "",
            "",
            "",
            item.wineColor || "",
            item.wineColor || "",
            Array.isArray(item.grapeVariety)
              ? item.grapeVariety.join(", ")
              : "",
            item.vintage || "",
            item.producer || "",
            "",
          ]);
        }
      });

      const wineSheet = XLSX.utils.aoa_to_sheet(wineData);
      XLSX.utils.book_append_sheet(workbook, wineSheet, "Wine Items");
    }

    // Create summary sheet
    const summaryData = [
      ["Menu Summary"],
      ["Menu Name", menu.name],
      ["Total Items", menu.items.length],
      ["Food Items", foodItems.length],
      ["Beverage Items", beverageItems.length],
      ["Wine Items", wineItems.length],
      ["Export Date", new Date().toLocaleDateString()],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  private exportToJson(menu: any, options: ExportOptions): string {
    const exportData: any = {
      menuName: menu.name,
      exportDate: new Date().toISOString(),
      totalItems: menu.items.length,
    };

    if (options.includeFoodItems !== false) {
      exportData.foodItems = menu.items
        .filter((item: any) => item.itemType === "food")
        .map((item: any) => ({
          itemName: item.name,
          description: item.description,
          category: item.category,
          price: item.price,
          keyIngredients: item.ingredients,
          cookingMethods: item.cookingMethods,
          allergens: item.allergens,
        }));
    }

    if (options.includeBeverageItems !== false) {
      exportData.beverageItems = menu.items
        .filter((item: any) => item.itemType === "beverage")
        .map((item: any) => ({
          itemName: item.name,
          description: item.description,
          category: item.category,
          price: item.price,
          keyIngredients: item.cocktailIngredients,
          spiritType: item.spiritType,
          servingStyle: item.servingStyle,
          cocktailIngredients: item.cocktailIngredients,
          nonAlcoholic: item.isNonAlcoholic,
        }));
    }

    if (options.includeWineItems !== false) {
      exportData.wineItems = menu.items
        .filter((item: any) => item.itemType === "wine")
        .map((item: any) => ({
          itemName: item.name,
          description: item.description,
          category: item.category,
          servingOptions: item.servingOptions,
          wineStyle: item.wineColor,
          varietyType: item.wineColor,
          grapeVariety: item.grapeVariety,
          vintage: item.vintage,
          producer: item.producer,
          foodPairings: null, // Not in current schema
        }));
    }

    return JSON.stringify(exportData, null, 2);
  }

  private async exportToWord(
    menu: any,
    options: ExportOptions
  ): Promise<Buffer> {
    const foodItems = menu.items.filter(
      (item: any) => item.itemType === "food"
    );
    const beverageItems = menu.items.filter(
      (item: any) => item.itemType === "beverage"
    );
    const wineItems = menu.items.filter(
      (item: any) => item.itemType === "wine"
    );

    const children: any[] = [
      new Paragraph({
        text: menu.name,
        heading: "Heading1",
      }),
      new Paragraph({
        text: `Exported on ${new Date().toLocaleDateString()}`,
      }),
      new Paragraph({ text: "" }), // Spacer
    ];

    // Food Items Section
    if (foodItems.length > 0 && options.includeFoodItems !== false) {
      children.push(
        new Paragraph({
          text: "FOOD ITEMS",
          heading: "Heading2",
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Item Name")] }),
                new TableCell({ children: [new Paragraph("Description")] }),
                new TableCell({ children: [new Paragraph("Category")] }),
                new TableCell({ children: [new Paragraph("Price")] }),
                new TableCell({ children: [new Paragraph("Key Ingredients")] }),
                new TableCell({ children: [new Paragraph("Cooking Methods")] }),
                new TableCell({ children: [new Paragraph("Allergens")] }),
              ],
            }),
            ...foodItems.map(
              (item: any) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph(item.name || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.description || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.category || "")],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph(item.price ? `$${item.price}` : ""),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph(
                          Array.isArray(item.ingredients)
                            ? item.ingredients.join(", ")
                            : ""
                        ),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph(
                          Array.isArray(item.cookingMethods)
                            ? item.cookingMethods.join(", ")
                            : ""
                        ),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph(
                          Array.isArray(item.allergens)
                            ? item.allergens.join(", ")
                            : ""
                        ),
                      ],
                    }),
                  ],
                })
            ),
          ],
        }),
        new Paragraph({ text: "" })
      );
    }

    // Beverage Items Section
    if (beverageItems.length > 0 && options.includeBeverageItems !== false) {
      children.push(
        new Paragraph({
          text: "BEVERAGE ITEMS",
          heading: "Heading2",
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Item Name")] }),
                new TableCell({ children: [new Paragraph("Description")] }),
                new TableCell({ children: [new Paragraph("Category")] }),
                new TableCell({ children: [new Paragraph("Price")] }),
                new TableCell({ children: [new Paragraph("Spirit Type")] }),
                new TableCell({ children: [new Paragraph("Serving Style")] }),
                new TableCell({ children: [new Paragraph("Non-Alcoholic")] }),
              ],
            }),
            ...beverageItems.map(
              (item: any) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph(item.name || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.description || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.category || "")],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph(item.price ? `$${item.price}` : ""),
                      ],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.spiritType || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.servingStyle || "")],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph(item.isNonAlcoholic ? "TRUE" : "FALSE"),
                      ],
                    }),
                  ],
                })
            ),
          ],
        }),
        new Paragraph({ text: "" })
      );
    }

    // Wine Items Section
    if (wineItems.length > 0 && options.includeWineItems !== false) {
      children.push(
        new Paragraph({
          text: "WINE ITEMS",
          heading: "Heading2",
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Item Name")] }),
                new TableCell({ children: [new Paragraph("Description")] }),
                new TableCell({ children: [new Paragraph("Category")] }),
                new TableCell({ children: [new Paragraph("Wine Style")] }),
                new TableCell({ children: [new Paragraph("Grape Variety")] }),
                new TableCell({ children: [new Paragraph("Vintage")] }),
                new TableCell({ children: [new Paragraph("Producer")] }),
              ],
            }),
            ...wineItems.map(
              (item: any) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph(item.name || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.description || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.category || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.wineColor || "")],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph(
                          Array.isArray(item.grapeVariety)
                            ? item.grapeVariety.join(", ")
                            : ""
                        ),
                      ],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.vintage || "")],
                    }),
                    new TableCell({
                      children: [new Paragraph(item.producer || "")],
                    }),
                  ],
                })
            ),
          ],
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          children: children,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }
}
