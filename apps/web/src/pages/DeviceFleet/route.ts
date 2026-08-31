import {
  getDeviceGroups,
  getDeviceStatus,
  getFleetDevices,
  getPlaybackProfiles
} from "../../services/api";
import {
  loadDeviceFleetModel,
  type DeviceFleetLoaders,
  type DeviceFleetModel
} from "./loadModel";

const defaultLoaders: DeviceFleetLoaders = {
  getDevices: getFleetDevices,
  getGroups: getDeviceGroups,
  getLiveness: async () => (await getDeviceStatus()).displayClients,
  getProfiles: getPlaybackProfiles
};

let routeLoaders = defaultLoaders;
let routeModel: DeviceFleetModel | null = null;

export function readDeviceFleetLoaders() {
  return routeLoaders;
}

export function readDeviceFleetRouteModel() {
  return routeModel;
}

export function setDeviceFleetLoadersForTests(loaders: DeviceFleetLoaders) {
  routeLoaders = loaders;
}

export function resetDeviceFleetRouteModelForTests() {
  routeLoaders = defaultLoaders;
  routeModel = null;
}

export async function loadDeviceFleetRoute() {
  routeModel = await loadDeviceFleetModel(routeLoaders);
  return null;
}
