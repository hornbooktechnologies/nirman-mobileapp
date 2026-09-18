import { ExpensesPage } from "@/features/expenses/components/expenses-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExpensesPage projectId={id} />;
}
