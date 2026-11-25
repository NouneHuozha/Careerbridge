const establishedFieldImages: Record<string, string> = {
  business: "/images/fields/business-management.jpg",
  government: "/images/fields/government-public-service.jpg",
  science: "/images/fields/science-research.jpg",
};

export function getFieldImage(fieldId: string) {
  return establishedFieldImages[fieldId] ?? `/images/fields/${fieldId}.jpg`;
}
