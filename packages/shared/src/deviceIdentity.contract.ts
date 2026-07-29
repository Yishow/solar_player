import type {
  Device,
  DeviceGroup,
  PlaybackProfileSummary,
  SiteScope
} from "./index.js";

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends
  (<T>() => T extends TRight ? 1 : 2)
    ? true
    : false;
type Expect<T extends true> = T;

type _DeviceSiteScopeContract = Expect<Equal<SiteScope, "cl" | "kn">>;

const playbackProfile = {
  id: 1,
  isDefault: true,
  name: "Default",
  profileKey: "default"
} satisfies PlaybackProfileSummary;

const group = {
  enabled: true,
  id: 2,
  name: "Lobby CL",
  playbackProfile,
  playbackProfileId: playbackProfile.id,
  siteScope: "cl"
} satisfies DeviceGroup;

const device = {
  clientId: "lobby-cl-01",
  displayName: "Lobby display",
  enabled: true,
  group,
  groupId: group.id,
  id: 3
} satisfies Device;

const disabledDevice = {
  ...device,
  enabled: false,
  group: null,
  groupId: null
} satisfies Device;

void disabledDevice;
