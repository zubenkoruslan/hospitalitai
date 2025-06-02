import puppeteer from "puppeteer";
import { Types } from "mongoose";
import {
  KnowledgeAnalyticsService,
  RestaurantKnowledgeAnalytics,
  CategoryAnalyticsInsights,
} from "./knowledgeAnalyticsService";
import { KnowledgeCategory } from "../models/QuestionModel";

export interface ReportOptions {
  restaurantId: Types.ObjectId;
  reportType: "comprehensive" | "category" | "staff" | "comparative";
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  category?: KnowledgeCategory;
  timeframe?: "week" | "month" | "quarter" | "year";
  includeCharts?: boolean;
  format?: "pdf" | "html";
}

export class ReportGenerationService {
  /**
   * Generate a comprehensive analytics report
   */
  static async generateReport(
    options: ReportOptions
  ): Promise<Buffer | string> {
    const { restaurantId, reportType, format = "pdf" } = options;

    let htmlContent = "";

    switch (reportType) {
      case "comprehensive":
        htmlContent = await this.generateComprehensiveReport(restaurantId);
        break;
      case "category":
        if (!options.category) {
          throw new Error("Category is required for category reports");
        }
        htmlContent = await this.generateCategoryReport(
          restaurantId,
          options.category
        );
        break;
      case "comparative":
        htmlContent = await this.generateComparativeReport(
          restaurantId,
          options.timeframe || "month"
        );
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    if (format === "html") {
      return htmlContent;
    }

    // Generate PDF using Puppeteer
    return await this.generatePDF(htmlContent);
  }

  /**
   * Generate comprehensive restaurant analytics report
   */
  private static async generateComprehensiveReport(
    restaurantId: Types.ObjectId
  ): Promise<string> {
    const analytics = await KnowledgeAnalyticsService.getRestaurantAnalytics(
      restaurantId
    );
    const predictiveInsights =
      await KnowledgeAnalyticsService.getPredictiveInsights(restaurantId);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Knowledge Analytics Report</title>
        <style>
          ${this.getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
          <header class="report-header">
            <h1>Knowledge Analytics Report</h1>
            <p class="report-date">Generated on ${new Date().toLocaleDateString()}</p>
          </header>

          <section class="executive-summary">
            <h2>Executive Summary</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <h3>Total Staff</h3>
                <div class="metric-value">${analytics.totalStaff}</div>
              </div>
              <div class="metric-card">
                <h3>Questions Answered</h3>
                <div class="metric-value">${
                  analytics.totalQuestionsAnswered
                }</div>
              </div>
              <div class="metric-card">
                <h3>Overall Accuracy</h3>
                <div class="metric-value">${Math.round(
                  analytics.overallAccuracy
                )}%</div>
              </div>
              <div class="metric-card">
                <h3>Staff Needing Support</h3>
                <div class="metric-value">${
                  analytics.staffNeedingSupport.length
                }</div>
              </div>
            </div>
          </section>

          <section class="category-performance">
            <h2>Category Performance</h2>
            <table class="performance-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Average Accuracy</th>
                  <th>Staff Participation</th>
                  <th>Total Questions</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(analytics.categoryPerformance)
                  .map(
                    ([category, performance]) => `
                    <tr>
                      <td>${this.formatCategoryName(
                        category as KnowledgeCategory
                      )}</td>
                      <td>${Math.round(performance.averageAccuracy)}%</td>
                      <td>${Math.round(performance.staffParticipation)}%</td>
                      <td>${performance.totalQuestions}</td>
                      <td class="${
                        performance.improvementTrend >= 0
                          ? "positive"
                          : "negative"
                      }">
                        ${
                          performance.improvementTrend >= 0 ? "+" : ""
                        }${Math.round(performance.improvementTrend)}%
                      </td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <section class="top-performers">
            <h2>Top Performers</h2>
            <div class="performers-list">
              ${analytics.topPerformers
                .map(
                  (performer, index) => `
                <div class="performer-card">
                  <div class="rank">#${index + 1}</div>
                  <div class="performer-info">
                    <h4>${performer.userName}</h4>
                    <p>Accuracy: ${Math.round(performer.overallAccuracy)}%</p>
                    <p>Strongest: ${this.formatCategoryName(
                      performer.strongestCategory
                    )}</p>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </section>

          <section class="predictive-insights">
            <h2>Predictive Insights & Recommendations</h2>
            
            <div class="insights-section">
              <h3>Staff at Risk (${predictiveInsights.staffAtRisk.length})</h3>
              ${predictiveInsights.staffAtRisk
                .map(
                  (staff) => `
                <div class="risk-card risk-${staff.riskLevel}">
                  <h4>${staff.userName}</h4>
                  <p>Risk Level: ${staff.riskLevel.toUpperCase()}</p>
                  <p>Weak Areas: ${staff.categories
                    .map((cat) => this.formatCategoryName(cat))
                    .join(", ")}</p>
                  <ul>
                    ${staff.recommendedActions
                      .map((action) => `<li>${action}</li>`)
                      .join("")}
                  </ul>
                </div>
              `
                )
                .join("")}
            </div>

            <div class="insights-section">
              <h3>Training Priorities</h3>
              <table class="priorities-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Estimated Impact</th>
                  </tr>
                </thead>
                <tbody>
                  ${predictiveInsights.trainingPriorities
                    .map(
                      (priority) => `
                    <tr>
                      <td>${this.formatCategoryName(priority.category)}</td>
                      <td class="priority-${
                        priority.priority
                      }">${priority.priority.toUpperCase()}</td>
                      <td>${priority.estimatedImpact}%</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </section>

          <footer class="report-footer">
            <p>Report generated by HospitalityAI Knowledge Analytics System</p>
            <p>Data as of ${analytics.lastUpdated.toLocaleDateString()}</p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate category-specific analytics report
   */
  private static async generateCategoryReport(
    restaurantId: Types.ObjectId,
    category: KnowledgeCategory
  ): Promise<string> {
    const categoryAnalytics =
      await KnowledgeAnalyticsService.getCategoryAnalytics(
        restaurantId,
        category
      );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${this.formatCategoryName(category)} Analytics Report</title>
        <style>
          ${this.getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
          <header class="report-header">
            <h1>${this.formatCategoryName(category)} Analytics Report</h1>
            <p class="report-date">Generated on ${new Date().toLocaleDateString()}</p>
          </header>

          <section class="category-overview">
            <h2>Category Overview</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <h3>Average Accuracy</h3>
                <div class="metric-value">${Math.round(
                  categoryAnalytics.averageAccuracy
                )}%</div>
              </div>
              <div class="metric-card">
                <h3>Total Questions</h3>
                <div class="metric-value">${
                  categoryAnalytics.totalQuestions
                }</div>
              </div>
              <div class="metric-card">
                <h3>Staff Participating</h3>
                <div class="metric-value">${
                  categoryAnalytics.totalStaffParticipating
                }</div>
              </div>
              <div class="metric-card">
                <h3>Accuracy Trend</h3>
                <div class="metric-value ${
                  categoryAnalytics.accuracyTrend >= 0 ? "positive" : "negative"
                }">
                  ${
                    categoryAnalytics.accuracyTrend >= 0 ? "+" : ""
                  }${Math.round(categoryAnalytics.accuracyTrend)}%
                </div>
              </div>
            </div>
          </section>

          <section class="performance-breakdown">
            <h2>Staff Performance Breakdown</h2>
            <div class="performance-levels">
              <div class="level-card strong">
                <h3>Strong Performers</h3>
                <div class="level-count">${
                  categoryAnalytics.staffPerformanceLevels.strong
                }</div>
                <p>80%+ accuracy</p>
              </div>
              <div class="level-card average">
                <h3>Average Performers</h3>
                <div class="level-count">${
                  categoryAnalytics.staffPerformanceLevels.average
                }</div>
                <p>60-79% accuracy</p>
              </div>
              <div class="level-card needs-work">
                <h3>Needs Improvement</h3>
                <div class="level-count">${
                  categoryAnalytics.staffPerformanceLevels.needsWork
                }</div>
                <p>Below 60% accuracy</p>
              </div>
            </div>
          </section>

          <section class="question-insights">
            <h2>Question Bank Insights</h2>
            <div class="question-stats">
              <p><strong>Total Available Questions:</strong> ${
                categoryAnalytics.questionStats.totalAvailable
              }</p>
              <p><strong>AI Generated:</strong> ${
                categoryAnalytics.questionStats.aiGenerated
              }</p>
              <p><strong>Manually Created:</strong> ${
                categoryAnalytics.questionStats.manuallyCreated
              }</p>
              <p><strong>Average Difficulty:</strong> ${
                categoryAnalytics.questionStats.averageDifficulty
              }</p>
            </div>
          </section>

          <section class="recommendations">
            <h2>Training Recommendations</h2>
            <ul class="recommendations-list">
              ${categoryAnalytics.trainingRecommendations
                .map((rec) => `<li>${rec}</li>`)
                .join("")}
            </ul>
          </section>

          <footer class="report-footer">
            <p>Report generated by HospitalityAI Knowledge Analytics System</p>
            <p>Data as of ${categoryAnalytics.lastUpdated.toLocaleDateString()}</p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate comparative analytics report
   */
  private static async generateComparativeReport(
    restaurantId: Types.ObjectId,
    timeframe: "week" | "month" | "quarter" | "year"
  ): Promise<string> {
    const comparative = await KnowledgeAnalyticsService.getComparativeAnalytics(
      restaurantId,
      timeframe
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comparative Analytics Report - ${timeframe}</title>
        <style>
          ${this.getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
          <header class="report-header">
            <h1>Comparative Analytics Report</h1>
            <h2>${
              timeframe.charAt(0).toUpperCase() + timeframe.slice(1)
            }ly Comparison</h2>
            <p class="report-date">Generated on ${new Date().toLocaleDateString()}</p>
          </header>

          <section class="comparison-overview">
            <h2>Overall Performance Comparison</h2>
            <div class="comparison-grid">
              <div class="period-card current">
                <h3>Current Period</h3>
                <div class="period-stats">
                  <p><strong>Accuracy:</strong> ${Math.round(
                    comparative.currentPeriod.averageAccuracy
                  )}%</p>
                  <p><strong>Questions:</strong> ${
                    comparative.currentPeriod.totalQuestions
                  }</p>
                  <p><strong>Staff Participation:</strong> ${
                    comparative.currentPeriod.staffParticipation
                  }</p>
                </div>
              </div>
              <div class="period-card previous">
                <h3>Previous Period</h3>
                <div class="period-stats">
                  <p><strong>Accuracy:</strong> ${Math.round(
                    comparative.previousPeriod.averageAccuracy
                  )}%</p>
                  <p><strong>Questions:</strong> ${
                    comparative.previousPeriod.totalQuestions
                  }</p>
                  <p><strong>Staff Participation:</strong> ${
                    comparative.previousPeriod.staffParticipation
                  }</p>
                </div>
              </div>
              <div class="improvement-card">
                <h3>Overall Improvement</h3>
                <div class="improvement-value ${
                  comparative.improvement.overall >= 0 ? "positive" : "negative"
                }">
                  ${
                    comparative.improvement.overall >= 0 ? "+" : ""
                  }${Math.round(comparative.improvement.overall)}%
                </div>
              </div>
            </div>
          </section>

          <section class="category-comparison">
            <h2>Category-wise Improvement</h2>
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Current Accuracy</th>
                  <th>Previous Accuracy</th>
                  <th>Improvement</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(comparative.improvement.byCategory)
                  .map(([category, improvement]) => {
                    const currentAcc =
                      comparative.currentPeriod.categoryBreakdown[
                        category as KnowledgeCategory
                      ].averageAccuracy;
                    const previousAcc =
                      comparative.previousPeriod.categoryBreakdown[
                        category as KnowledgeCategory
                      ].averageAccuracy;
                    return `
                      <tr>
                        <td>${this.formatCategoryName(
                          category as KnowledgeCategory
                        )}</td>
                        <td>${Math.round(currentAcc)}%</td>
                        <td>${Math.round(previousAcc)}%</td>
                        <td class="${
                          improvement >= 0 ? "positive" : "negative"
                        }">
                          ${improvement >= 0 ? "+" : ""}${Math.round(
                      improvement
                    )}%
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </section>

          <section class="benchmarks">
            <h2>Performance Benchmarks</h2>
            <div class="benchmark-info">
              <p><strong>Top Performer Threshold:</strong> ${
                comparative.benchmarks.topPerformerThreshold
              }%</p>
              <h3>Improvement Goals by Category:</h3>
              <ul>
                ${Object.entries(comparative.benchmarks.improvementGoals)
                  .map(
                    ([category, goal]) => `
                    <li>${this.formatCategoryName(
                      category as KnowledgeCategory
                    )}: ${goal}%</li>
                  `
                  )
                  .join("")}
              </ul>
            </div>
          </section>

          <footer class="report-footer">
            <p>Report generated by HospitalityAI Knowledge Analytics System</p>
            <p>Comparison period: ${comparative.timeframe}</p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate PDF from HTML content
   */
  private static async generatePDF(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm",
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Format category name for display
   */
  private static formatCategoryName(category: KnowledgeCategory): string {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Get CSS styles for reports
   */
  private static getReportStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f8f9fa;
      }

      .report-container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        padding: 40px;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
      }

      .report-header {
        text-align: center;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 3px solid #007bff;
      }

      .report-header h1 {
        font-size: 2.5em;
        color: #007bff;
        margin-bottom: 10px;
      }

      .report-header h2 {
        font-size: 1.5em;
        color: #6c757d;
        margin-bottom: 10px;
      }

      .report-date {
        color: #6c757d;
        font-style: italic;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin: 20px 0;
      }

      .metric-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        border-left: 4px solid #007bff;
      }

      .metric-card h3 {
        font-size: 0.9em;
        color: #6c757d;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .metric-value {
        font-size: 2em;
        font-weight: bold;
        color: #007bff;
      }

      .metric-value.positive {
        color: #28a745;
      }

      .metric-value.negative {
        color: #dc3545;
      }

      section {
        margin: 40px 0;
      }

      section h2 {
        font-size: 1.8em;
        color: #007bff;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e9ecef;
      }

      .performance-table, .comparison-table, .priorities-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }

      .performance-table th, .comparison-table th, .priorities-table th,
      .performance-table td, .comparison-table td, .priorities-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #dee2e6;
      }

      .performance-table th, .comparison-table th, .priorities-table th {
        background-color: #007bff;
        color: white;
        font-weight: 600;
      }

      .performance-table tr:hover, .comparison-table tr:hover, .priorities-table tr:hover {
        background-color: #f8f9fa;
      }

      .positive {
        color: #28a745;
        font-weight: bold;
      }

      .negative {
        color: #dc3545;
        font-weight: bold;
      }

      .performers-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }

      .performer-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        border-left: 4px solid #28a745;
      }

      .rank {
        font-size: 2em;
        font-weight: bold;
        color: #28a745;
        margin-right: 20px;
      }

      .performer-info h4 {
        color: #007bff;
        margin-bottom: 5px;
      }

      .risk-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin: 15px 0;
      }

      .risk-card.risk-high {
        border-left: 4px solid #dc3545;
      }

      .risk-card.risk-medium {
        border-left: 4px solid #ffc107;
      }

      .risk-card.risk-low {
        border-left: 4px solid #28a745;
      }

      .priority-high {
        color: #dc3545;
        font-weight: bold;
      }

      .priority-medium {
        color: #ffc107;
        font-weight: bold;
      }

      .priority-low {
        color: #28a745;
        font-weight: bold;
      }

      .performance-levels {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
      }

      .level-card {
        padding: 20px;
        border-radius: 8px;
        text-align: center;
      }

      .level-card.strong {
        background: #d4edda;
        border-left: 4px solid #28a745;
      }

      .level-card.average {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
      }

      .level-card.needs-work {
        background: #f8d7da;
        border-left: 4px solid #dc3545;
      }

      .level-count {
        font-size: 2em;
        font-weight: bold;
        margin: 10px 0;
      }

      .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 20px;
        margin: 20px 0;
      }

      .period-card, .improvement-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
      }

      .period-card.current {
        border-left: 4px solid #007bff;
      }

      .period-card.previous {
        border-left: 4px solid #6c757d;
      }

      .improvement-card {
        border-left: 4px solid #28a745;
      }

      .improvement-value {
        font-size: 2em;
        font-weight: bold;
        margin-top: 10px;
      }

      .recommendations-list {
        list-style-type: none;
        padding: 0;
      }

      .recommendations-list li {
        background: #f8f9fa;
        padding: 15px;
        margin: 10px 0;
        border-left: 4px solid #007bff;
        border-radius: 4px;
      }

      .report-footer {
        text-align: center;
        margin-top: 60px;
        padding-top: 20px;
        border-top: 2px solid #e9ecef;
        color: #6c757d;
        font-size: 0.9em;
      }

      @media print {
        .report-container {
          box-shadow: none;
          padding: 20px;
        }
        
        section {
          page-break-inside: avoid;
        }
      }
    `;
  }
}

export default ReportGenerationService;
