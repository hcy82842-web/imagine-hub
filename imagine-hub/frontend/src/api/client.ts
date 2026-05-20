import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

export async function healthCheck() {
  const res = await api.get("/health");
  return res.data;
}

export interface ProviderData {
  id: number;
  name: string;
  provider_type: string;
  base_url: string;
  api_key: string;
  models: string;
  config: string;
  created_at: string;
}

export async function listProviders(): Promise<ProviderData[]> {
  const res = await api.get("/providers");
  return res.data;
}

export async function createProvider(data: {
  name: string;
  provider_type: string;
  base_url: string;
  api_key?: string;
  config?: string;
}): Promise<ProviderData> {
  const res = await api.post("/providers", data);
  return res.data;
}

export async function updateProvider(
  id: number,
  data: Partial<{
    name: string;
    provider_type: string;
    base_url: string;
    api_key: string;
    config: string;
  }>
): Promise<ProviderData> {
  const res = await api.put(`/providers/${id}`, data);
  return res.data;
}

export async function deleteProvider(id: number): Promise<void> {
  await api.delete(`/providers/${id}`);
}

export async function fetchModels(providerId: number): Promise<string[]> {
  const res = await api.get(`/providers/${providerId}/models`);
  return res.data.models;
}

export interface GenerateResult {
  image_base64: string;
  media_type: string;
}

export async function generateImage(data: {
  provider_id: number;
  model: string;
  prompt: string;
  params?: Record<string, unknown>;
}): Promise<GenerateResult> {
  const res = await api.post("/generate", data);
  return res.data;
}

export interface HistoryItem {
  id: number;
  prompt: string;
  provider_id: number;
  provider_name: string;
  model_name: string;
  params: string;
  image_base64: string;
  created_at: string;
}

export async function listHistory(): Promise<HistoryItem[]> {
  const res = await api.get("/history");
  return res.data;
}

export async function deleteHistory(id: number): Promise<void> {
  await api.delete(`/history/${id}`);
}

export default api;
