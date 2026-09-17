import { ArrowRight, Check, Clipboard, LoaderCircle, Search, ShieldCheck, UserRoundSearch, UsersRound } from 'lucide-react'

export const PIPELINE = [
  { key:'confirm',label:'第 1 步',title:'确认目标与查找条件',source:'根据您提交的找人需求',icon:Clipboard,tone:'green' },
  { key:'verified',label:'第 2 步',title:'优先匹配已核实联系人',source:'来源：已核实工程信息',icon:UserRoundSearch,tone:'amber' },
  { key:'expand',label:'第 3 步',title:'扩大范围继续查找',source:'来源：公开信息与合作渠道',icon:Search,tone:'blue' },
  { key:'human',label:'第 4 步',title:'专人核验并给出结论',source:'方式：人工核实',icon:UsersRound,tone:'slate' },
]
export const PIPELINE_KEYS = PIPELINE.map(stage => stage.key)

export function Pipeline({activeIndex,stageResults=[],taskState='ready'}){return <section className="pipeline-section"><div className="section-heading"><div><span>查找进度</span><h2>如何为您找到有效联系人</h2></div><p><ShieldCheck size={14}/>按顺序查找，命中有效联系人后即交付</p></div><div className="quota-rule"><span className="quota-badge green">有效交付条数额度</span><strong>仅在交付有效联系人后扣 1 条</strong><i/>查找中、待核验或未找到均不扣额度<span className="quota-badge blue">按有效交付计入</span></div><div className="pipeline" aria-live="polite">{PIPELINE.map((stage,index)=>{const Icon=stage.icon;const item=stageResults[index]||{};const state=item.state||'pending';const result=state==='active'?'正在核验…':state==='done'?item.result:'';return <div className="pipeline-unit" key={stage.key}><div className={`pipeline-stage ${stage.tone} ${state}`}><span className="stage-icon">{state==='done'?<Check size={17}/>:state==='active'?<LoaderCircle className="spin" size={18}/>:<Icon size={18}/>}</span><div><small>{stage.label}</small><strong>{stage.title}</strong><span className="stage-source">{stage.source}</span>{result&&<em>{result}</em>}</div></div>{index<PIPELINE.length-1&&<span className={`pipeline-arrow ${state==='done'?'passed':''}`}><ArrowRight size={15}/></span>}</div>})}</div></section>}
