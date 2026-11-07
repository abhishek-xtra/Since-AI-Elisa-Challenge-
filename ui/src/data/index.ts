import { createApiSource } from './apiSource';
import { createMockSource } from './mockSource';
import type { DataSource } from './types';

export * from './types';
export { EVENTS, SYMPTOMS } from './vocabulary';

// The one switch: VITE_DATA_SOURCE=mock|api. Nothing else knows which is active.
export const source: DataSource = import.meta.env.VITE_DATA_SOURCE === 'api'
  ? createApiSource(import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
  : createMockSource();
