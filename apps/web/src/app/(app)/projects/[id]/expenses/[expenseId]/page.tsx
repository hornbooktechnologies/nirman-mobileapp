import { ExpenseDetailPage } from "@/features/expenses/components/expense-detail-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id, expenseId } = await params;
  return <ExpenseDetailPage projectId={id} id={expenseId} />;
}
