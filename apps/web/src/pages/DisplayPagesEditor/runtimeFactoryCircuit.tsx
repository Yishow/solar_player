import { FactoryCircuit } from "../FactoryCircuit";
import {
  createFactoryCircuitDisplayPageSeedConfig,
  type FactoryCircuitDisplayPageConfig
} from "../FactoryCircuit/displayPageConfig";
import type { DisplayEditorPageDefinition, DisplayEditorRegion } from "./index";
import { numberField, textField, toContentTop, type UpdatePath } from "./runtimeFieldBuilders";

function buildFactoryCircuitRegions(
  config: Record<string, unknown>,
  updatePath: UpdatePath
): DisplayEditorRegion[] {
  const typedConfig = config as FactoryCircuitDisplayPageConfig;

  return [
    {
      id: "factory-circuit-hero",
      label: "Factory Circuit Hero",
      description: "調整 title、subtitle 與主文案。",
      rect: {
        left: 78,
        top: toContentTop(166),
        width: 590
      },
      fields: [
        textField("factory-eyebrow", "Eyebrow", typedConfig.hero.eyebrow, ["hero", "eyebrow"], updatePath),
        textField("factory-title", "Title", typedConfig.hero.title, ["hero", "title"], updatePath),
        textField("factory-subtitle", "Subtitle", typedConfig.hero.subtitle, ["hero", "subtitle"], updatePath),
        textField("factory-copy-zh-1", "Copy Zh 1", typedConfig.hero.copyZhLines[0], ["hero", "copyZhLines", 0], updatePath),
        textField("factory-copy-zh-2", "Copy Zh 2", typedConfig.hero.copyZhLines[1], ["hero", "copyZhLines", 1], updatePath),
        textField("factory-copy-zh-3", "Copy Zh 3", typedConfig.hero.copyZhLines[2], ["hero", "copyZhLines", 2], updatePath)
      ]
    },
    {
      id: "factory-circuit-copy-layout",
      label: "Factory Circuit Copy Layout",
      description: "調整 copy block 與 status block 幾何。",
      rect: {
        ...typedConfig.textBlocks.copy,
        top: toContentTop(typedConfig.textBlocks.copy.top)
      },
      fields: [
        numberField("factory-copy-left", "Copy Left", typedConfig.textBlocks.copy.left, ["textBlocks", "copy", "left"], updatePath),
        numberField("factory-copy-top", "Copy Top", typedConfig.textBlocks.copy.top, ["textBlocks", "copy", "top"], updatePath),
        numberField("factory-copy-width", "Copy Width", typedConfig.textBlocks.copy.width, ["textBlocks", "copy", "width"], updatePath),
        numberField("factory-status-left", "Status Left", typedConfig.statusBlock.left, ["statusBlock", "left"], updatePath),
        numberField("factory-status-top", "Status Top", typedConfig.statusBlock.top, ["statusBlock", "top"], updatePath),
        numberField("factory-status-width", "Status Width", typedConfig.statusBlock.width, ["statusBlock", "width"], updatePath)
      ]
    },
    ...Object.entries(typedConfig.nodes).map(([key, rect]) => ({
      id: `factory-node-${key}`,
      label: `Factory Node ${key}`,
      description: "調整 node 幾何位置。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        numberField(`${key}-left`, "Left", rect.left, ["nodes", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["nodes", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["nodes", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["nodes", key, "height"], updatePath)
      ]
    })),
    ...Object.entries(typedConfig.connectors).map(([key, rect]) => ({
      id: `factory-connector-${key}`,
      label: `Factory Connector ${key}`,
      description: "調整 connector 幾何位置。",
      rect: {
        ...rect,
        height: 16,
        top: toContentTop(rect.top)
      },
      fields: [
        numberField(`${key}-left`, "Left", rect.left, ["connectors", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["connectors", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["connectors", key, "width"], updatePath)
      ]
    })),
    {
      id: "factory-load-panel",
      label: "Factory Load Panel",
      description: "調整負載面板容器幾何。",
      rect: {
        ...typedConfig.loadPanel,
        top: toContentTop(typedConfig.loadPanel.top)
      },
      fields: [
        numberField("load-panel-left", "Left", typedConfig.loadPanel.left, ["loadPanel", "left"], updatePath),
        numberField("load-panel-top", "Top", typedConfig.loadPanel.top, ["loadPanel", "top"], updatePath),
        numberField("load-panel-width", "Width", typedConfig.loadPanel.width, ["loadPanel", "width"], updatePath),
        numberField("load-panel-height", "Height", typedConfig.loadPanel.height, ["loadPanel", "height"], updatePath)
      ]
    },
    ...Object.entries(typedConfig.loadRows).map(([key, rect]) => ({
      id: `factory-load-row-${key}`,
      label: `Factory Load Row ${key}`,
      description: "調整 load row 幾何位置。",
      rect: {
        ...rect,
        top: toContentTop(rect.top)
      },
      fields: [
        numberField(`${key}-left`, "Left", rect.left, ["loadRows", key, "left"], updatePath),
        numberField(`${key}-top`, "Top", rect.top, ["loadRows", key, "top"], updatePath),
        numberField(`${key}-width`, "Width", rect.width, ["loadRows", key, "width"], updatePath),
        numberField(`${key}-height`, "Height", rect.height, ["loadRows", key, "height"], updatePath)
      ]
    }))
  ];
}

export const factoryCircuitRuntimePageDefinition: DisplayEditorPageDefinition = {
  id: "factory-circuit",
  label: "Factory Circuit",
  buildEditableRegions: (config, helpers) => buildFactoryCircuitRegions(config, helpers.updatePath),
  createSeedConfig: () => createFactoryCircuitDisplayPageSeedConfig() as Record<string, unknown>,
  renderPreview: (config) => <FactoryCircuit config={config as FactoryCircuitDisplayPageConfig} />
};
