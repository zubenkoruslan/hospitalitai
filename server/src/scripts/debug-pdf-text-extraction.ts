import path from "path";
import fs from "fs";
import pdf from "pdf-parse";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Debug script to examine PDF text extraction from wine menu
 */
async function debugPdfTextExtraction() {
  console.log("📄 Debugging PDF Text Extraction");
  console.log("=================================\n");

  const wineMenuPath = path.join(
    __dirname,
    "../../uploads/sop_documents/Wine-menu.pdf"
  );

  try {
    // Check if file exists
    if (!fs.existsSync(wineMenuPath)) {
      throw new Error(`Wine menu file not found at: ${wineMenuPath}`);
    }

    console.log("✅ Wine menu file found");
    const fileStats = fs.statSync(wineMenuPath);
    console.log(`📊 File size: ${(fileStats.size / 1024).toFixed(1)} KB\n`);

    // Extract text from PDF
    console.log("🔍 Extracting text from PDF...");
    const dataBuffer = fs.readFileSync(wineMenuPath);
    const pdfData = await pdf(dataBuffer);

    console.log(`📝 Text extracted successfully`);
    console.log(`📊 Total characters: ${pdfData.text.length}`);
    console.log(`📊 Number of pages: ${pdfData.numpages}\n`);

    // Show raw extracted text
    console.log("📄 RAW EXTRACTED TEXT:");
    console.log("=".repeat(80));
    console.log(pdfData.text);
    console.log("=".repeat(80));
    console.log();

    // Analyze text structure
    const lines = pdfData.text
      .split("\n")
      .filter((line) => line.trim().length > 0);
    console.log(`📊 Non-empty lines: ${lines.length}`);

    console.log("\n📋 FIRST 20 LINES:");
    lines.slice(0, 20).forEach((line, index) => {
      console.log(`${(index + 1).toString().padStart(2, "0")}: "${line}"`);
    });

    // Look for wine-specific content
    const wineKeywords = [
      "wine",
      "vintage",
      "bottle",
      "glass",
      "ml",
      "chardonnay",
      "cabernet",
      "merlot",
      "pinot",
    ];
    const foundKeywords = wineKeywords.filter((keyword) =>
      pdfData.text.toLowerCase().includes(keyword)
    );

    console.log(`\n🍷 Wine keywords found: ${foundKeywords.join(", ")}`);

    // Look for pricing patterns
    const priceMatches = pdfData.text.match(/\$[\d,]+\.?\d*/g) || [];
    console.log(`💰 Price patterns found: ${priceMatches.length}`);
    if (priceMatches.length > 0) {
      console.log(`   Examples: ${priceMatches.slice(0, 5).join(", ")}`);
    }

    // Apply wine preprocessing
    console.log("\n🍷 APPLYING WINE PREPROCESSING:");
    console.log("=".repeat(50));

    let processedText = pdfData.text
      // Normalize vintage years
      .replace(/(\d{4})\s*v(?:intage)?/gi, "$1")
      // Standardize serving sizes
      .replace(/(\d+)\s*mls?\b/gi, "$1ml")
      .replace(/(\d+)\s*ozs?\b/gi, "$1oz")
      // Normalize wine regions
      .replace(/\bA\.O\.C\.?\b/gi, "AOC")
      .replace(/\bD\.O\.C\.?\b/gi, "DOC")
      .replace(/\bD\.O\.C\.G\.?\b/gi, "DOCG")
      // Clean up common OCR artifacts
      .replace(/[""'']/g, '"')
      .replace(/–|—/g, "-")
      // Normalize price formatting
      .replace(/\$\s*(\d+)/g, "$$$1")
      .replace(/(\d+)\s*\$/g, "$$$1")
      // Fix spacing issues
      .replace(/(\d{4})\s+([A-Z])/g, "$1 $2")
      .replace(/,(?!\s)/g, ", ")
      .replace(/\s+,/g, ",")
      // General cleanup
      .replace(/\s+/g, " ")
      .trim();

    console.log("📝 PROCESSED TEXT:");
    console.log("=".repeat(80));
    console.log(processedText);
    console.log("=".repeat(80));

    console.log(`\n📊 Original length: ${pdfData.text.length}`);
    console.log(`📊 Processed length: ${processedText.length}`);

    // Save to files for manual inspection
    const rawTextFile = path.join(__dirname, "../debug/wine-menu-raw-text.txt");
    const processedTextFile = path.join(
      __dirname,
      "../debug/wine-menu-processed-text.txt"
    );

    // Create debug directory if it doesn't exist
    const debugDir = path.dirname(rawTextFile);
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    fs.writeFileSync(rawTextFile, pdfData.text);
    fs.writeFileSync(processedTextFile, processedText);

    console.log(`\n📁 Text files saved:`);
    console.log(`   Raw text: ${rawTextFile}`);
    console.log(`   Processed text: ${processedTextFile}`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

// Run the debug script
if (require.main === module) {
  debugPdfTextExtraction().catch(console.error);
}
