// Provides the backend-only integration with the ThingSpeak REST API.
import axios from "axios";
import type { ThingSpeakLatestFeedResponse } from "../types/readings.types";

const thingspeakApi = axios.create({
  baseURL: "https://api.thingspeak.com",
  timeout: 10_000,
});

const getRequiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} environment variable is required.`);
  return value;
};

export const getLatestChannelFeed = async (): Promise<ThingSpeakLatestFeedResponse> => {
  const channelId = getRequiredEnvironmentVariable("THINGSPEAK_CHANNEL_ID");
  const readApiKey = getRequiredEnvironmentVariable("THINGSPEAK_READ_API_KEY");

  const response = await thingspeakApi.get<ThingSpeakLatestFeedResponse>(
    `/channels/${encodeURIComponent(channelId)}/feeds.json`,
    { params: { api_key: readApiKey, results: 1 } },
  );

  return response.data;
};
