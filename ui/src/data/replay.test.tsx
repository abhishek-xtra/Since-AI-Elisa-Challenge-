import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {mockSource} from './mockSource';
import {filterThread,agentPosts} from './replay';
import QuestionCard from '../QuestionCard';
afterEach(cleanup);
describe('cumulative replay',()=>{
 it('reveals only questions, notices, and captures that have happened',async()=>{const t=await mockSource.getThread('thread-001');expect(filterThread(t,1).captured).toHaveLength(0);expect(filterThread(t,2).captured).toHaveLength(1);expect(filterThread(t,2).questions).toHaveLength(0);expect(filterThread(t,3).questions.map(q=>q.entity_id)).toEqual(['TRN-087']);expect(filterThread(t,4).questions).toHaveLength(2);expect(filterThread(t,6).notifications.map(n=>n.entity_id)).toEqual(['TRN-087']);expect(filterThread(t,7).notifications.map(n=>n.entity_id)).toEqual(['TRN-087','TRN-105'])});
 it('keeps barrier notices and captures behind their own beat',async()=>{const t=await mockSource.getThread('email-12_barrier');expect(filterThread(t,4).notifications).toHaveLength(0);expect(filterThread(t,4).captured).toHaveLength(0);expect(filterThread(t,5).notifications).toHaveLength(1);expect(filterThread(t,5).captured).toHaveLength(1)});
 it('produces only three agent post kinds, using backend strings',async()=>{const t=await mockSource.getThread('thread-001');const b=await mockSource.getBeat(7);const posts=agentPosts(t,b);expect(new Set(posts.map(p=>p.kind))).toEqual(new Set(['proposal','question','notice']));expect(posts.find(p=>p.kind==='proposal')).toEqual({kind:'proposal',text:b.data.agent_text});expect(agentPosts(filterThread(t,2))).toEqual([])});
});
describe('expert question',()=>{
 it('waits for answer success then collapses options to the selected label',async()=>{const t=await mockSource.getThread('thread-001');const q={...t.questions[0],answered:false};const answer=vi.fn().mockResolvedValue(undefined);render(<QuestionCard question={q} answer={answer}/>);fireEvent.click(screen.getByRole('button',{name:'All older units'}));await waitFor(()=>expect(screen.getByText('Answered: All older units')).toBeTruthy());expect(answer).toHaveBeenCalledWith('CA-0001',0);expect(screen.queryByRole('button',{name:'No'})).toBeNull()});
 it('preserves options after an API error',async()=>{const t=await mockSource.getThread('thread-001');render(<QuestionCard question={{...t.questions[0],answered:false}} answer={vi.fn().mockRejectedValue(Error('Offline'))}/>);fireEvent.click(screen.getByRole('button',{name:'All older units'}));await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Offline'));expect(screen.getByRole('button',{name:'No'})).toBeTruthy()});
});
describe('live mock incident routing',()=>{
 const report=(id:string)=>mockSource.reportIncident({entity_id:id,event:'sfp_replaced',symptoms:['link_up','counters_zero'],at_time:'2026-11-08T14:00:00+02:00'});
 it('proposes the existing backend text on TRN-019 without a question',async()=>{const r=await report('TRN-019');expect(r.results[0].outcome).toBe('proposed');expect(r.results[0].question).toBeNull();expect(r.agent_text).toBe((await mockSource.getBeat(7)).data.agent_text)});
 it('declines TRN-102 with its actual installation year',async()=>{const r=await report('TRN-102');expect(r.results[0].outcome).toBe('declined');expect(r.results[0].reason).toContain('2024');expect(r.agent_text).toBe('')});
 it('has nothing to add for unmatched symptoms',async()=>{const r=await mockSource.reportIncident({entity_id:'TRN-019',event:'sfp_replaced',symptoms:['link_down'],at_time:'2026-11-08T14:00:00+02:00'});expect(r.results).toEqual([]);expect(r.agent_text).toBe((await mockSource.getBeat(1)).data.agent_text)});
});
