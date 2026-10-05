import { TotalExpensesPage } from '@/features/total-expenses/total-expenses-page';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|undefined>>}){const {id}=await params;return <TotalExpensesPage projectId={id} initialQuery={await searchParams}/>;}
