import type {DataSource,Thread,Beat,Assertion,Topology,IncidentResponse} from './types';
const files=import.meta.glob('./mock/*.json',{eager:true,import:'default'}) as Record<string,unknown>;
const fillers=import.meta.glob('./mock/fillers/*.json',{eager:true,import:'default'}) as Record<string,{date:string;messages:{seq:number;time:string;author:string;role:string;text:string}[]}>;
const copy=<T,>(key:string)=>structuredClone(files[`./mock/${key}.json`]) as T;
const answers=new Map<string,number>();
export const mockSource:DataSource={
 async getThread(id){const t=copy<Thread>(`thread_${id}`);if(!t)throw Error('Thread not found');return t},
 async getBeat(n){return copy<Beat>(`beat_${n}`)},
 async getAssertions(){return copy<Assertion[]>('assertions')},
 async getTopology(){return copy<Topology>('topology')},
 async listFillerThreads(){return Object.entries(fillers).map(([path,t])=>{const id=path.split('/').pop()!.replace('.json','');return {thread_id:id,channel:'teams',questions:[],notifications:[],captured:[],messages:t.messages.map(m=>({id:`${id}:${m.seq}`,author:m.author,role:m.role.toLowerCase().includes('expert')?'expert':'field_engineer',timestamp:`${t.date}T${m.time}:00+02:00`,channel:'teams',thread_id:id,text:m.text,incident:null}))}})},
 async answer(id,index){answers.set(id,index)},
 async reportIncident(body){
  const topology=copy<Topology>('topology');const node=topology.nodes.find(n=>n.id===body.entity_id);
  if(body.event==='dispatch_created'&&body.entity_id==='OULU-03'){const b=copy<Beat>('beat_6');return {results:b.data.results!,agent_text:b.data.results![0].assertion.action_text}}
  if(body.event!=='sfp_replaced'||!body.symptoms.includes('link_up')||!body.symptoms.includes('counters_zero')||!node)return {results:[],agent_text:copy<Beat>('beat_1').data.agent_text!};
  if(node.install_year<=2019){const b=copy<Beat>('beat_7');return {results:b.data.results!,agent_text:b.data.agent_text!}}
  const b=copy<Beat>('beat_4');return {results:b.data.results!.map(r=>({...r,reason:r.reason.replace('2023',String(node.install_year))})),agent_text:''} satisfies IncidentResponse;
 }
};
