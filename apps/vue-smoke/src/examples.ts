import type { Component } from 'vue';

// Explicit, request-local example selection; no DOM access or shared mutable theme.
export function selectExample(location: string) {
  const url = new URL(location, 'http://localhost');
  const dialogPath = /^\/dialog(?:\/(behavior|appearance|composition))?\/?$/.exec(url.pathname);
  const requestedView = dialogPath?.[1] ?? url.searchParams.get('view');
  return {
    example: dialogPath || url.searchParams.get('example') === 'dialog' ? 'dialog' as const : url.pathname === '/combobox' || url.searchParams.get('example') === 'combobox' ? 'combobox' as const : url.pathname === '/select' || url.searchParams.get('example') === 'select' ? 'select' as const : url.pathname === '/button' || url.searchParams.get('example') === 'button' ? 'button' as const : url.pathname === '/theme' || url.searchParams.get('example') === 'theme' ? 'theme' as const : 'probe' as const,
    dialogView: requestedView === 'behavior' || requestedView === 'appearance' || requestedView === 'composition' ? requestedView : 'overview' as const,
    dialogId: url.searchParams.get('id')?.trim() || undefined,
    idPrefix: url.searchParams.get('idPrefix')?.trim() || undefined,
    dialogPortal: url.searchParams.get('portal') !== 'false',
    brand: url.searchParams.get('brand') === 'teal' ? 'teal' as const : 'purple' as const,
    density: url.searchParams.get('density') === 'compact' ? 'compact' as const : 'regular' as const,
    instance: url.searchParams.get('instance') === 'true',
    long: url.searchParams.get('long') === 'true',
    rtl: url.searchParams.get('rtl') === 'true',
    large: url.searchParams.get('large') === 'true',
    dual: url.searchParams.get('dual') === 'true',
    initialOpen: url.searchParams.get('open') === 'true',
    initialQuery: url.searchParams.get('query') ?? undefined,
    initialValue: url.searchParams.get('value') === 'blue' ? 'blue' as const : 0,
    largeList: url.searchParams.get('largeList') === 'true',
  };
}

export async function loadExampleHost(scenario: ReturnType<typeof selectExample>): Promise<Component> {
  if (scenario.example === 'dialog') {
    if (scenario.dialogView === 'behavior') return (await import('./examples/DialogBehaviorExamples.vue')).default;
    if (scenario.dialogView === 'appearance') return (await import('./examples/DialogAppearanceExamples.vue')).default;
    if (scenario.dialogView === 'composition') return (await import('./examples/DialogCompositionExamples.vue')).default;
    return (await import('./examples/DialogExamples.vue')).default;
  }
  if (scenario.example === 'button') return (await import('./examples/ButtonExamples.vue')).default;
  if (scenario.example === 'combobox') return (await import('./examples/ComboboxExamples.vue')).default;
  if (scenario.example === 'select') return (await import('./examples/SelectExamples.vue')).default;
  if (scenario.example === 'theme') return (await import('./examples/ThemeExamples.vue')).default;
  return (await import('./ProbeHost.vue')).default;
}

export function exampleProps(scenario: ReturnType<typeof selectExample>) {
  if (scenario.example === 'dialog') {
    if (scenario.dialogView === 'overview') return { brand: scenario.brand, initialOpen: scenario.initialOpen, id: scenario.dialogId, portal: scenario.dialogPortal };
    if (scenario.dialogView === 'appearance') return { brand: scenario.brand, density: scenario.density, instance: scenario.instance, long: scenario.long, rtl: scenario.rtl, large: scenario.large, dual: scenario.dual };
    return {};
  }
  if (scenario.example === 'select') return { brand: scenario.brand, initialOpen: scenario.initialOpen, largeList: scenario.largeList };
  if (scenario.example === 'combobox') return { brand: scenario.brand, initialOpen: scenario.initialOpen, initialQuery: scenario.initialQuery, initialValue: scenario.initialValue };
  if (scenario.example === 'button' || scenario.example === 'theme') return { brand: scenario.brand };
  return {};
}
