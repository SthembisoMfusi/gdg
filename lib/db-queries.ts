import { query, queryOne } from './neon';

/**
 * Execute a query and return all results
 */
export async function executeQuery<T = any>(text: string, params?: any[]): Promise<T[]> {
  return query<T>(text, params);
}

/**
 * Execute a query and return a single row
 */
export async function executeQueryOne<T = any>(text: string, params?: any[]): Promise<T | undefined> {
  const result = await queryOne<T>(text, params);
  return result || undefined;
}
