import TankDetailsClient from "@/components/dashboard/TankDetailsClient";

export default async function TankDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TankDetailsClient tankId={id} />;
}
