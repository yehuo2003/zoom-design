// Explicit, request-local example selection; no DOM access or shared mutable theme.
export function selectExample(location: string) {
  const url = new URL(location, 'http://localhost');
  return {
    example: url.pathname === '/combobox' || url.searchParams.get('example') === 'combobox' ? 'combobox' as const : url.pathname === '/select' || url.searchParams.get('example') === 'select' ? 'select' as const : url.pathname === '/button' || url.searchParams.get('example') === 'button' ? 'button' as const : url.pathname === '/theme' || url.searchParams.get('example') === 'theme' ? 'theme' as const : 'probe' as const,
    brand: url.searchParams.get('brand') === 'teal' ? 'teal' as const : 'purple' as const,
    initialOpen: url.searchParams.get('open') === 'true',
    initialQuery: url.searchParams.get('query') ?? undefined,
    initialValue: url.searchParams.get('value') === 'blue' ? 'blue' as const : 0,
    largeList: url.searchParams.get('largeList') === 'true',
  };
}
