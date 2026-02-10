import { hc } from "hono/client";
import type { AppType } from "@testforge/server";
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

export async function getHealingRecords() {
  const res = await api.api.healing.$get();
  return res.json();
}

export async function getHealingStats() {
  const res = await api.api.healing.stats.$get();
  return res.json();
}

export async function getRuns(limit = 50) {
  const res = await api.api.runs.$get({ query: { limit: String(limit) } });
  return res.json();
}
