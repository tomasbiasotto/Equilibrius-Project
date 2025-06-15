// Tipagens para Deno no ambiente Supabase Edge Functions
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  }
  
  export const env: Env;
}
