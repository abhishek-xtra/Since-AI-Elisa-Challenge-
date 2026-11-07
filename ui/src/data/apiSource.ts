import type {DataSource,Topology} from './types';
import {mockSource} from './mockSource';
const base=(import.meta.env.VITE_API_URL||'http://localhost:8000').replace(/\/$/,'');
async function request<T>(path:string,body?:unknown):Promise<T>{const r=await fetch(base+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);if(!r.ok)throw Error(`Request failed (${r.status}): ${await r.text()}`);return r.json()}
export const apiSource:DataSource={getThread:id=>request(`/threads/${encodeURIComponent(id)}`),getBeat:n=>request(`/beats/${n}`),getAssertions:()=>request('/assertions'),getTopology:():Promise<Topology>=>mockSource.getTopology(),listFillerThreads:()=>mockSource.listFillerThreads(),reportIncident:body=>request('/incident',body),answer:async(assertion_id,option_index)=>{await request('/answer',{assertion_id,option_index})}};
