import { query, queryOne } from './neon';
import { getSql } from './neon';

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

/**
 * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
 */
export async function executeNonQuery(text: string, params?: any[]): Promise<void> {
  const result = await query<any>(text, params);
  // Query executed successfully, no return needed
}
