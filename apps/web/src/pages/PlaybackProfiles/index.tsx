import { useLoaderData } from "react-router-dom";
import { getPlaybackProfiles } from "../../services/api";
import {
  PlaybackProfilesContent,
  type PlaybackProfilesLoaderData
} from "./PlaybackProfilesContent";
import "./playbackProfiles.css";

export async function loadPlaybackProfilesRoute(): Promise<PlaybackProfilesLoaderData> {
  try {
    return { loadError: "", profiles: await getPlaybackProfiles() };
  } catch (error) {
    return {
      loadError: error instanceof Error ? error.message : String(error),
      profiles: []
    };
  }
}

export function PlaybackProfiles() {
  const loaderData = useLoaderData() as PlaybackProfilesLoaderData;
  return <PlaybackProfilesContent loaderData={loaderData} />;
}
