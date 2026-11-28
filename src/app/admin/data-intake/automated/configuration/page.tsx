import { ConfigurationPage } from "../automated-pages";

export default async function ConfigurationRoute({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <ConfigurationPage configId={id} />;
}
