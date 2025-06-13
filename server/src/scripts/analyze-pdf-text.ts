import pdfParse from "pdf-parse";
import fs from "fs";
import path from "path";

async function analyzePdfText() {
  console.log("📄 Analyzing PDF Text");
  console.log("=====================");

  const pdfPath = path.join(
    __dirname,
    "../../../uploads/menuFile-1749732565587-256049673.pdf"
  );

  try {
    console.log(`📂 Reading: ${pdfPath}`);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);

    console.log(`📝 Extracted ${pdfData.text.length} characters`);
    console.log(`📄 Pages: ${pdfData.numpages}`);

    // Count potential wine items by looking for common wine patterns
    const lines = pdfData.text
      .split("\n")
      .filter((line) => line.trim().length > 0);
    console.log(`📋 Total lines: ${lines.length}`);

    // Look for wine-like patterns
    const winePatterns = [
      /\b(red|white|rosé|rosé|sparkling|champagne|prosecco)\b/i,
      /\b(cabernet|merlot|chardonnay|sauvignon|pinot|shiraz|syrah|riesling)\b/i,
      /\b(bordeaux|burgundy|tuscany|chianti|barolo|rioja|champagne)\b/i,
      /\b\d{4}\b.*\$|£|€/, // Vintage + price
      /\b(bottle|glass|carafe|75cl|750ml)\b/i,
      /\b(estate|vineyard|winery|château|domaine)\b/i,
    ];

    let potentialWineLines = new Set<string>();

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 5) {
        // Check if line contains wine indicators
        for (const pattern of winePatterns) {
          if (pattern.test(trimmedLine)) {
            potentialWineLines.add(trimmedLine);
            break;
          }
        }

        // Also include lines with price patterns that might be wines
        if (/£\s*\d+/.test(trimmedLine) || /\$\s*\d+/.test(trimmedLine)) {
          if (
            trimmedLine.length > 10 &&
            !trimmedLine.toLowerCase().includes("food")
          ) {
            potentialWineLines.add(trimmedLine);
          }
        }
      }
    });

    console.log(`🍷 Potential wine lines found: ${potentialWineLines.size}`);

    if (potentialWineLines.size > 0) {
      console.log("\n📝 Sample potential wine entries:");
      Array.from(potentialWineLines)
        .slice(0, 15)
        .forEach((line, index) => {
          console.log(`   ${index + 1}. ${line}`);
        });

      if (potentialWineLines.size > 15) {
        console.log(`   ... and ${potentialWineLines.size - 15} more`);
      }
    }

    // Look for sections that might contain wines
    const wineSection = pdfData.text.toLowerCase();
    const wineSectionWords = [
      "wine list",
      "wine menu",
      "wines",
      "red wines",
      "white wines",
      "sparkling wines",
    ];

    console.log("\n🔍 Wine section indicators:");
    wineSectionWords.forEach((word) => {
      if (wineSection.includes(word)) {
        console.log(`   ✓ Found: "${word}"`);
      }
    });

    // Save full text for manual review if needed
    const outputPath = path.join(__dirname, "../debug/extracted-pdf-text.txt");
    fs.writeFileSync(outputPath, pdfData.text);
    console.log(`\n💾 Full text saved to: ${outputPath}`);

    console.log(`\n📊 Summary:`);
    console.log(`   - Total characters: ${pdfData.text.length}`);
    console.log(`   - Total lines: ${lines.length}`);
    console.log(`   - Potential wine entries: ${potentialWineLines.size}`);
    console.log(`   - Expected minimum wines: 28+ (user specified)`);

    if (potentialWineLines.size >= 28) {
      console.log(`   ✅ Looks like we should find 28+ wines`);
    } else {
      console.log(`   ⚠️ May not find expected 28+ wines in text analysis`);
    }
  } catch (error: any) {
    console.error("❌ Error analyzing PDF:", error.message);
  }
}

analyzePdfText().catch(console.error);
