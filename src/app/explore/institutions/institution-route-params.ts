type InstitutionDetailParams = {
  slug: string;
  searchParams: string;
  courseId: string;
  courseName: string;
  fieldId: string;
  stage?: string;
  filters: Record<string, string>;
};

export function institutionDetailHref({
  slug,
  searchParams,
  courseId,
  courseName,
  fieldId,
  stage,
  filters,
}: InstitutionDetailParams) {
  const returnParams = new URLSearchParams(searchParams);
  for (const [key, value] of Object.entries(filters)) {
    if (value) returnParams.set(key, value);
    else returnParams.delete(key);
  }
  const detailParams = new URLSearchParams({
    course: courseId,
    courseName,
    field: fieldId,
    returnTo: `/explore/institutions?${returnParams.toString()}`,
  });
  if (stage) detailParams.set("stage", stage);
  return `/explore/institutions/${slug}?${detailParams.toString()}`;
}
