import ClienteDetailClient from "./ClienteDetailClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ClienteDetailClient id={id} />;
}