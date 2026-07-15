import * as dashboardModel from "../models/dashboard.model";
import type { DashboardSummary } from "../types/dashboard.types";

export const getSummary = async (): Promise<DashboardSummary> => dashboardModel.getDashboardSummary();
