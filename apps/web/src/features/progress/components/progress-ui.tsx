import { Button, Card } from "@/components/ui";
export const dateLabel = (date: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
export function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return <Card><p role="alert">{error.message}</p><Button variant="outline" onClick={retry}>Retry</Button></Card>;
}
