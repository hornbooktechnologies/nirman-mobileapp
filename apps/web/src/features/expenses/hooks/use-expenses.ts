"use client";
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expenseKey } from "../expense-rules";
import {
  expensesService,
  type ExpenseWrite,
} from "../services/expenses.service";
import type { ExpensesQuery } from "../types/expenses.types";
export function useExpenses(
  o: string,
  p: string,
  query: ExpensesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: [...expenseKey(o, p), "list", query],
    queryFn: ({ signal }) => expensesService.list(o, p, query, signal),
    enabled,
  });
}
export function useExpenseSummary(
  o: string,
  p: string,
  query: ExpensesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: [...expenseKey(o, p), "summary", query],
    queryFn: ({ signal }) => expensesService.summary(o, p, query, signal),
    enabled,
  });
}
export function useExpenseSettings(o: string, p: string) {
  return useQuery({
    queryKey: [...expenseKey(o, p), "settings"],
    queryFn: ({ signal }) => expensesService.settings(o, p, signal),
  });
}
export function useExpenseDetail(o: string, p: string, id: string) {
  return useQuery({
    queryKey: [...expenseKey(o, p), "detail", id],
    queryFn: ({ signal }) => expensesService.detail(o, p, id, signal),
  });
}
export function useExpenseWrite(o: string, p: string) {
  const cache = useQueryClient();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return useMutation({
    mutationFn: (command: ExpenseWrite) => expensesService.write(o, p, command),
    retry: false,
    onSuccess: (record) => {
      if (!mountedRef.current) return;
      cache.setQueryData([...expenseKey(o, p), "detail", record.id], record);
      void cache.invalidateQueries({ queryKey: expenseKey(o, p) });
    },
  });
}
