export function getFieldImage(fieldId: string) {
  return `/api/fields/${encodeURIComponent(fieldId)}/image`;
}
