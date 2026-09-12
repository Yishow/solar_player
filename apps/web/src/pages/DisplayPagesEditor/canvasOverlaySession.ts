import type {
  DisplayEditorOverlayPreset,
  DisplayEditorOverlayState,
  ResolveDisplayEditorOverlayStateParams,
  StaticOverlayInputs,
  StaticOverlayPreparation
} from "./canvasOverlayState";
import {
  areOverlayPresetsEqual,
  areRectsEqual,
  areStringArraysEqual,
  composeOverlayFeedback,
  prepareStaticOverlayData
} from "./canvasOverlayState";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

export type { StaticOverlayInputs };

type StaticInputsSnapshot = {
  canvasHeight: number;
  canvasWidth: number;
  contentOffsetTop: number;
  lockedRegionIds: string[];
  overlayPreset: DisplayEditorOverlayPreset;
  regionsLength: number;
  regionsRef: ResolvedDisplayEditorRegion[];
  selectedRegionId: string | null;
  selectedRegionIds: string[];
  shellHeight: number;
  viewportOffsetX: number;
  viewportOffsetY: number;
  viewportZoom: number;
};

export class CanvasOverlaySession {
  private generation = 0;
  private preparationCount = 0;
  private currentPreparation: StaticOverlayPreparation | null = null;
  private lastInputsSnapshot: StaticInputsSnapshot | null = null;

  getGeneration(): number {
    return this.generation;
  }

  getPreparationCount(): number {
    return this.preparationCount;
  }

  invalidate(): void {
    this.currentPreparation = null;
    this.lastInputsSnapshot = null;
    this.generation += 1;
  }

  private isInputsEqual(inputs: StaticOverlayInputs): boolean {
    if (!this.lastInputsSnapshot || !this.currentPreparation) {
      return false;
    }

    const prev = this.lastInputsSnapshot;
    if (
      prev.canvasHeight !== inputs.canvasHeight ||
      prev.canvasWidth !== inputs.canvasWidth ||
      prev.contentOffsetTop !== (inputs.contentOffsetTop ?? 0) ||
      prev.shellHeight !== (inputs.shellHeight ?? inputs.canvasHeight)
    ) {
      return false;
    }

    const currentZoom = inputs.viewport?.zoom ?? 1;
    const currentOffsetX = inputs.viewport?.offsetX ?? 0;
    const currentOffsetY = inputs.viewport?.offsetY ?? 0;
    if (
      prev.viewportZoom !== currentZoom ||
      prev.viewportOffsetX !== currentOffsetX ||
      prev.viewportOffsetY !== currentOffsetY
    ) {
      return false;
    }

    const currentSelectedId = inputs.selectedRegion?.id ?? null;
    if (prev.selectedRegionId !== currentSelectedId) {
      return false;
    }

    if (!areStringArraysEqual(prev.selectedRegionIds, inputs.selectedRegionIds ?? [])) {
      return false;
    }

    if (!areStringArraysEqual(prev.lockedRegionIds, inputs.lockedRegionIds)) {
      return false;
    }

    if (!areOverlayPresetsEqual(prev.overlayPreset, inputs.overlayPreset)) {
      return false;
    }

    if (prev.regionsRef !== inputs.regions) {
      if (prev.regionsLength !== inputs.regions.length) {
        return false;
      }
      for (let i = 0; i < inputs.regions.length; i++) {
        const a = prev.regionsRef[i];
        const b = inputs.regions[i];
        if (
          a !== b &&
          (a?.id !== b?.id ||
            a?.label !== b?.label ||
            a?.parentId !== b?.parentId ||
            !areRectsEqual(a?.geometry, b?.geometry))
        ) {
          return false;
        }
      }
    }

    return true;
  }

  prepare(inputs: StaticOverlayInputs): StaticOverlayPreparation {
    if (this.isInputsEqual(inputs) && this.currentPreparation) {
      return this.currentPreparation;
    }

    this.generation += 1;
    this.preparationCount += 1;

    this.lastInputsSnapshot = {
      canvasHeight: inputs.canvasHeight,
      canvasWidth: inputs.canvasWidth,
      contentOffsetTop: inputs.contentOffsetTop ?? 0,
      lockedRegionIds: [...inputs.lockedRegionIds],
      overlayPreset: { ...inputs.overlayPreset },
      regionsLength: inputs.regions.length,
      regionsRef: inputs.regions,
      selectedRegionId: inputs.selectedRegion?.id ?? null,
      selectedRegionIds: [...(inputs.selectedRegionIds ?? [])],
      shellHeight: inputs.shellHeight ?? inputs.canvasHeight,
      viewportOffsetX: inputs.viewport?.offsetX ?? 0,
      viewportOffsetY: inputs.viewport?.offsetY ?? 0,
      viewportZoom: inputs.viewport?.zoom ?? 1
    };

    this.currentPreparation = prepareStaticOverlayData(inputs, this.generation);
    return this.currentPreparation;
  }

  resolve(params: ResolveDisplayEditorOverlayStateParams): DisplayEditorOverlayState {
    const preparation = this.prepare(params);
    return composeOverlayFeedback(preparation, params);
  }
}

export function createCanvasOverlaySession(): CanvasOverlaySession {
  return new CanvasOverlaySession();
}
