import { neon } from '@neondatabase/serverless';
import ws from 'ws';

// WebSocket support for Vercel edge runtime
declare global {
  var WebSocket: any;
}

if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws as any;
}

let sqlClient: ReturnType<typeof neon> | undefined;

/**
 * Get or create the Neon SQL client instance
 * Uses singleton pattern for connection reuse
 */
export function getSql() {
  if (!sqlClient) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is not set. Please add your Neon connection string to environment variables.'
      );
    }
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

/**
 * Execute a query using the Neon client with parameters
 * This is a helper for the migration script
 */
export async function execute(sqlText: string, params?: any[]): Promise<any[]> {
  const sql = getSql();
  // Use template literal syntax for Neon
  // Convert params to a format the API understands
  if (params && params.length > 0) {
    return sql`${sqlText}` as any;
  } else {
    return sql(sqlText);
  }
}

/**
 * Execute a query and return results
 * Handles queries with parameters - properly escapes values to prevent SQL injection
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const sql = getSql();
  
  if (!params || params.length === 0) {
    // Execute query without parameters
    const result = await sql(text);
    return result as T[];
  }
  
  // Build query safely by replacing parameter placeholders with properly escaped values
  let finalQuery = text;
  params.forEach((param, index) => {
    const paramIndex = index + 1;
    const placeholder = new RegExp(`\\$${paramIndex}\\b`, 'g');
    
    if (param === null || param === undefined) {
      finalQuery = finalQuery.replace(placeholder, 'NULL');
    } else if (typeof param === 'string') {
      // Escape single quotes for SQL
      const escaped = param.replace(/'/g, "''");
      finalQuery = finalQuery.replace(placeholder, `'${escaped}'`);
    } else if (typeof param === 'number' || typeof param === 'boolean') {
      finalQuery = finalQuery.replace(placeholder, String(param));
    } else if (Array.isArray(param)) {
      // Handle array parameters (for tags, etc.)
      const arrayStr = param.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
      finalQuery = finalQuery.replace(placeholder, `ARRAY[${arrayStr}]`);
    } else {
      finalQuery = finalQuery.replace(placeholder, `'${String(param).replace(/'/g, "''")}'`);
    }
  });
  
  const result = await sql(finalQuery);
  return result as T[];
}

/**
 * Execute a query and return single row
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const results = await query<T>(text, params);
  return results[0] || null;
}

/**
 * Clean empty strings to null for optional database fields
 */
export function cleanEmptyStrings<T>(value: T): T | null {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return value;
}

/**
 * Clean all empty strings in an object
 */
export function cleanObject<T extends Record<string, any>>(obj: T): T {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    cleaned[key] = cleanEmptyStrings(value);
  }
  return cleaned as T;
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await query<{ count: number }>('SELECT 1 as count');
    return result.length > 0;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
