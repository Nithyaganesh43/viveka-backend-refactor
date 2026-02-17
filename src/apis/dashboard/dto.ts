/**
 * DTO contracts for Dashboard API.
 * Pure type definitions - no runtime logic.
 */

// =============================================================================
// REQUEST TYPES
// =============================================================================

/** Query parameters for sales trends endpoint */
export interface SalesTrendsQuery {
  months?: number;
}

/** Query parameters for top items endpoint */
export interface TopItemsQuery {
  limit?: number;
}

/** Query parameters for full dashboard endpoint */
export interface DashboardQuery {
  months?: number;
  limit?: number;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Dashboard summary response */
export interface DashboardSummary {
  totalSales: number;
  pendingAmount: number;
  pendingInvoices: number;
}

/** Sales trend data point */
export interface SalesTrend {
  month: string;
  amount: number;
}

/** Top selling item */
export interface TopItem {
  itemName: string;
  quantity: number;
  amount: number;
}

/** Full dashboard response */
export interface DashboardResponse {
  summary: DashboardSummary;
  salesTrends: SalesTrend[];
  topItems: TopItem[];
}
