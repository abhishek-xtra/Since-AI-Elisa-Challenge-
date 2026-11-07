import {mockSource} from './mockSource';
import {apiSource} from './apiSource';
export const source=import.meta.env.VITE_DATA_SOURCE==='api'?apiSource:mockSource;
export * from './types';
export {syntheticReports} from './synthetic';
