import type { DisplayPageInstance, DisplayPageTemplateKey } from "@solar-display/shared";

export type RegistryPageDefinitionTemplate<TDefinition extends { id: string; label: string; templateKey: DisplayPageTemplateKey }> =
  Omit<TDefinition, "id" | "label"> & {
    label: string;
    templateKey: DisplayPageTemplateKey;
  };

export function buildRegistryPageDefinitions<TDefinition extends { id: string; label: string; templateKey: DisplayPageTemplateKey }>(
  pages: DisplayPageInstance[],
  templates: Map<DisplayPageTemplateKey, RegistryPageDefinitionTemplate<TDefinition>>
): TDefinition[] {
  return pages
    .slice()
    .filter((page) => page.enabled && page.archivedAt === null)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id)
    .flatMap((page) => {
      const template = templates.get(page.templateKey);
      if (!template) {
        return [];
      }

      return [
        {
          ...template,
          id: page.pageKey,
          label: page.displayNameEn || template.label,
          templateKey: page.templateKey
        } as TDefinition
      ];
    });
}
