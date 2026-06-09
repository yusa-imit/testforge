import { hc } from "hono/client";
import type { AppType } from "@testforge/server";
import type { CreateScenario, ElementLocator } from "@testforge/core";
import axios from "axios";

// Hono RPC Client (type-safe)
export const api = hc<AppType>("/");

// Axios instance for additional flexibility
export const axiosClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for error handling
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data);
    return Promise.reject(error);
  }
);

// Type-safe API helpers
export async function getServices() {
  const res = await api.api.services.$get();
  return res.json();
}

export async function getService(id: string) {
  const res = await api.api.services[":id"].$get({ param: { id } });
  return res.json();
}

export async function getFeatures(serviceId: string) {
  const res = await api.api.services[":serviceId"].features.$get({
    param: { serviceId },
  });
  return res.json();
}

export async function getFeature(id: string) {
  const res = await api.api.features[":id"].$get({ param: { id } });
  return res.json();
}

export async function getScenarios(featureId: string) {
  const res = await api.api.features[":featureId"].scenarios.$get({
    param: { featureId },
  });
  return res.json();
}

export async function getScenario(id: string) {
  const res = await api.api.scenarios[":id"].$get({ param: { id } });
  return res.json();
}

export async function getComponents() {
  const res = await api.api.components.$get();
  return res.json();
}

export async function getHealingRecords(params?: { status?: string }) {
  const res = await api.api.healing.$get({
    query: params?.status ? { status: params.status } : undefined
  });
  return res.json();
}

export async function getHealingStats() {
  const res = await api.api.healing.stats.$get();
  return res.json();
}

export async function getRuns(limit = 50, filters?: { status?: string; scenarioId?: string; from?: string; to?: string; offset?: number }) {
  const query: Record<string, string> = { limit: String(limit) };
  if (filters?.status) query.status = filters.status;
  if (filters?.scenarioId) query.scenarioId = filters.scenarioId;
  if (filters?.from) query.from = filters.from;
  if (filters?.to) query.to = filters.to;
  if (filters?.offset) query.offset = String(filters.offset);
  const res = await api.api.runs.$get({ query });
  return res.json();
}

export async function getComponent(id: string) {
  const res = await api.api.components[":id"].$get({ param: { id } });
  return res.json();
}

export async function createComponent(data: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await api.api.components.$post({ json: data });
  return res.json();
}

export async function updateComponent(id: string, data: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await api.api.components[":id"].$put({ param: { id }, json: data });
  return res.json();
}

export async function deleteComponent(id: string) {
  const res = await api.api.components[":id"].$delete({ param: { id } });
  return res.json();
}

export async function getComponentUsages(id: string) {
  const res = await api.api.components[":id"].usages.$get({ param: { id } });
  return res.json();
}

export async function updateScenario(id: string, data: Partial<CreateScenario>) {
  const res = await api.api.scenarios[":id"].$put({ param: { id }, json: data });
  return res.json();
}

export async function deleteScenario(id: string) {
  const res = await api.api.scenarios[":id"].$delete({ param: { id } });
  return res.json();
}

export async function runScenario(id: string, variables?: Record<string, unknown>) {
  const res = await api.api.scenarios[":id"].run.$post({
    param: { id },
    json: variables ? { variables } : {},
  });
  return res.json();
}

export async function approveHealing(id: string, reviewedBy?: string, reviewNote?: string) {
  const res = await api.api.healing[":id"].approve.$post({
    param: { id },
    json: { reviewedBy, reviewNote }
  });
  return res.json();
}

export async function rejectHealing(id: string, reviewedBy?: string, reviewNote?: string) {
  const res = await api.api.healing[":id"].reject.$post({
    param: { id },
    json: { reviewedBy, reviewNote }
  });
  return res.json();
}

export async function propagateHealing(id: string) {
  const res = await api.api.healing[":id"].propagate.$post({ param: { id } });
  return res.json();
}

export async function getDashboardData() {
  const res = await api.api.runs.dashboard.$get();
  return res.json();
}

export async function duplicateScenario(id: string) {
  const res = await api.api.scenarios[":id"].duplicate.$post({ param: { id } });
  return res.json();
}

export async function cancelRun(id: string) {
  const res = await api.api.runs[":id"].$delete({ param: { id } });
  return res.json();
}

export async function runFeature(id: string) {
  const res = await api.api.features[":id"].run.$post({ param: { id } });
  return res.json();
}

export async function runService(id: string) {
  const res = await api.api.services[":id"].run.$post({ param: { id } });
  return res.json();
}

export async function getRun(id: string) {
  const res = await api.api.runs[":id"].$get({ param: { id } });
  return res.json();
}

export async function getRunSteps(id: string) {
  const res = await api.api.runs[":id"].steps.$get({ param: { id } });
  return res.json();
}

// Element Registry API functions
export async function getRegistryElements(serviceId?: string, search?: string) {
  const queryParams = new URLSearchParams();
  if (serviceId) queryParams.append("serviceId", serviceId);
  if (search) queryParams.append("search", search);
  
  const res = await axiosClient.get(`/registry?${queryParams.toString()}`);
  return res.data;
}

export async function getRegistryElement(id: string) {
  const res = await axiosClient.get(`/registry/${id}`);
  return res.data;
}

export async function createRegistryElement(data: {
  serviceId: string;
  displayName: string;
  pagePattern?: string;
  currentLocator: ElementLocator;
}) {
  const res = await axiosClient.post("/registry", data);
  return res.data;
}

export async function updateRegistryElement(id: string, data: {
  displayName?: string;
  pagePattern?: string;
  currentLocator?: ElementLocator;
  reason?: string;
}) {
  const res = await axiosClient.put(`/registry/${id}`, data);
  return res.data;
}

export async function deleteRegistryElement(id: string) {
  const res = await axiosClient.delete(`/registry/${id}`);
  return res.data;
}

export async function addRegistryUsage(id: string, data: {
  scenarioId: string;
  stepId: string;
}) {
  const res = await axiosClient.post(`/registry/${id}/usage`, data);
  return res.data;
}

export async function findRegistryByName(displayName: string, serviceId?: string) {
  const queryParams = new URLSearchParams();
  if (serviceId) queryParams.append("serviceId", serviceId);

  const res = await axiosClient.get(`/registry/by-name/${encodeURIComponent(displayName)}?${queryParams.toString()}`);
  return res.data;
}

export async function getScenarioStats(id: string, days = 7) {
  const res = await axiosClient.get<{
    success: boolean;
    data: {
      totalRuns: number;
      passedRuns: number;
      failedRuns: number;
      healedRuns: number;
      cancelledRuns: number;
      passRate: number;
      avgDuration: number | null;
      minDuration: number | null;
      maxDuration: number | null;
      trend: { date: string; passed: number; failed: number; healed: number }[];
    };
  }>(`/scenarios/${id}/stats?days=${days}`);
  return res.data;
}

export async function getFeatureStats(id: string, days = 7) {
  const res = await axiosClient.get<{
    success: boolean;
    data: {
      totalRuns: number;
      passedRuns: number;
      failedRuns: number;
      healedRuns: number;
      cancelledRuns: number;
      passRate: number;
      avgDuration: number | null;
      scenarioCount: number;
      trend: { date: string; passed: number; failed: number; healed: number }[];
    };
  }>(`/features/${id}/stats?days=${days}`);
  return res.data;
}

export async function getServiceStats(id: string, days = 7) {
  const res = await axiosClient.get<{
    success: boolean;
    data: {
      totalRuns: number;
      passedRuns: number;
      failedRuns: number;
      healedRuns: number;
      cancelledRuns: number;
      passRate: number;
      avgDuration: number | null;
      featureCount: number;
      scenarioCount: number;
      trend: { date: string; passed: number; failed: number; healed: number }[];
    };
  }>(`/services/${id}/stats?days=${days}`);
  return res.data;
}


export interface ScenarioStepStat {
  stepIndex: number;
  count: number;
  passCount: number;
  failCount: number;
  avgDuration: number | null;
  minDuration: number | null;
  maxDuration: number | null;
  failureRate: number;
}

export async function getScenarioStepStats(id: string): Promise<ScenarioStepStat[]> {
  const res = await axiosClient.get<{ success: boolean; data: ScenarioStepStat[] }>(`/scenarios/${id}/step-stats`);
  return res.data.data;
}

export interface SearchResultItem {
  type: "service" | "feature" | "scenario";
  id: string;
  name: string;
  description?: string;
  serviceId?: string;
  serviceName?: string;
  featureId?: string;
  featureName?: string;
}

export async function search(q: string, limit = 20): Promise<SearchResultItem[]> {
  if (!q.trim()) return [];
  const res = await axiosClient.get<{ data: SearchResultItem[] }>(
    `/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  return res.data.data;
}

// ── Webhooks ────────────────────────────────────────────────────────────────

export type WebhookEvent = "run.completed" | "run.passed" | "run.failed" | "run.healed";

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookPayload {
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
}

export async function getWebhooks(): Promise<Webhook[]> {
  const res = await axiosClient.get<{ data: Webhook[] }>("/webhooks");
  return res.data.data;
}

export async function createWebhook(payload: CreateWebhookPayload): Promise<Webhook> {
  const res = await axiosClient.post<{ data: Webhook }>("/webhooks", payload);
  return res.data.data;
}

export async function updateWebhook(
  id: string,
  payload: Partial<CreateWebhookPayload & { enabled: boolean }>
): Promise<Webhook> {
  const res = await axiosClient.put<{ data: Webhook }>(`/webhooks/${id}`, payload);
  return res.data.data;
}

export async function deleteWebhook(id: string): Promise<void> {
  await axiosClient.delete(`/webhooks/${id}`);
}
