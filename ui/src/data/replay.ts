import type {Thread,Question,Notification,Beat} from './types';
export const questionBeat=(q:Question)=>q.entity_id==='TRN-101'?4:3;
export const notificationBeat=(n:Notification)=>n.at.startsWith('2026-11-08T14:00')?7:n.at.startsWith('2026-11-08T08:00')?5:3;
export function filterThread(t:Thread,beat:number):Thread {const capture=t.thread_id==='thread-001'?2:t.thread_id==='email-12_barrier'?5:6;return {...t,questions:t.questions.filter(q=>questionBeat(q)<=beat),notifications:t.notifications.filter(n=>notificationBeat(n)<=beat),captured:beat>=capture?t.captured:[]}}
export type AgentPost={kind:'proposal';text:string}|{kind:'question';question:Question}|{kind:'notice';text:string};
export function agentPosts(t:Thread,b?:Beat):AgentPost[]{return [...(b?.data.agent_text?[{kind:'proposal' as const,text:b.data.agent_text}]:[]),...t.questions.map(question=>({kind:'question' as const,question})),...t.notifications.map(n=>({kind:'notice' as const,text:n.text}))]}
