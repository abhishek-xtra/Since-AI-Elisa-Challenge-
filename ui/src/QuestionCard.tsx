import {useState} from 'react';
import type {Question} from './data';
import Icon from './Icon';
export default function QuestionCard({question,answer,selected,onAnswered}:{question:Question;answer:(id:string,index:number)=>Promise<void>;selected?:number;onAnswered?:()=>void}){
 const [choice,setChoice]=useState<number|undefined>(selected);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function choose(i:number){setBusy(true);setError('');try{await answer(question.assertion_id,i);setChoice(i);onAnswered?.()}catch(e){setError(String(e))}finally{setBusy(false)}}
 return <div className="adaptive"><p>{question.text}</p>{choice!==undefined?<div className="answered"><Icon name="check" size={16}/> Answered: {question.options[choice]?.label}</div>:question.answered?<div className="answered"><Icon name="check" size={16}/> Answered</div>:<div className="options">{question.options.map((o,i)=><button disabled={busy} onClick={()=>choose(i)} key={o.label}>{o.label}</button>)}</div>}{error&&<p role="alert">{error}</p>}</div>
}
