// Witness/除錯用：?autoplay=0 可凍結 playback 輪播，讓單頁靜止以擷取乾淨 witness。
// 這個控制與輪播正交，不改任何 shell 視覺或佈局。
export function isPlaybackRotationFrozen(search: string | undefined): boolean {
  if (!search) {
    return false;
  }

  const value = new URLSearchParams(search).get("autoplay");
  return value === "0" || value === "false";
}

export function resolvePlaybackRotationEnabled(input: {
  isPlaybackGroup: boolean;
  search?: string;
}): boolean {
  return input.isPlaybackGroup && !isPlaybackRotationFrozen(input.search);
}
