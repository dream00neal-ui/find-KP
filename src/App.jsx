import { useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, ChevronRight, History, Network, ShieldCheck, X } from 'lucide-react'
import { loadTaskHistory, prependTaskHistory } from './lib/taskHistory'
import { formatCompletedAt } from './lib/historyEntry'
import { DEMO_COVERAGE } from './data/mockKpResults'
import { HistoryDetail } from './components/HistoryDetail'
import FlowPage from './pages/FlowPage'
import BatchPage from './pages/BatchPage'
import ChatPage from './pages/ChatPage'
import MvpChatPage from './pages/MvpChatPage'

const MODES=[
  {id:'mvp4',name:'智能找KP 4',label:'MVP对话版'},
  {id:'flow',name:'智能找KP 1',label:'流程模式'},
  {id:'batch',name:'智能找KP 2',label:'批量任务'},
  {id:'chat',name:'智能找KP 3',label:'对话模式'},
]

function Logo(){return <div className="agent-brand"><span className="agent-logo"><Network size={20}/></span><div><strong>中项网 · 智能找人 <i>Agent</i></strong><small>工程企业与项目 KP 智能识别</small></div></div>}

function App(){
  const [mode,setMode]=useState('mvp4'),[toast,setToast]=useState(''),[showHistory,setShowHistory]=useState(false),[showSources,setShowSources]=useState(false),[taskHistory,setTaskHistory]=useState(loadTaskHistory),[selectedHistory,setSelectedHistory]=useState(null)
  const sourceWrapRef=useRef(null),sourceButtonRef=useRef(null),historyButtonRef=useRef(null)
  useEffect(()=>{if(!toast)return;const id=window.setTimeout(()=>setToast(''),2600);return()=>window.clearTimeout(id)},[toast])
  useEffect(()=>{const outside=e=>{if(showSources&&!sourceWrapRef.current?.contains(e.target))setShowSources(false)};const key=e=>{if(e.key==='Escape'&&selectedHistory){setSelectedHistory(null);historyButtonRef.current?.focus()}else if(e.key==='Escape'&&showSources){setShowSources(false);sourceButtonRef.current?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}},[showSources,selectedHistory])
  const onTaskComplete=entry=>setTaskHistory(current=>prependTaskHistory(current,entry))
  return <div className="app-shell"><header className="topbar"><div className="topbar-inner"><Logo/><nav><div className="source-status-wrap" ref={sourceWrapRef}><button ref={sourceButtonRef} className="live-source" onClick={()=>{setShowSources(v=>!v);setShowHistory(false)}} aria-expanded={showSources}><i/>演示数据说明<ChevronRight size={11}/></button>{showSources&&<div className="source-popover"><header><div><strong>演示数据说明</strong><small>LOCAL FIXTURE STATUS</small></div><button onClick={()=>setShowSources(false)} aria-label="关闭数据源状态"><X size={13}/></button></header>{[{n:'第 1 步',t:'确认目标与查找条件',c:'green',s:'根据您提交的需求'},{n:'第 2 步',t:'优先匹配已核实联系人',c:'amber',s:'来源：已核实工程信息'},{n:'第 3 步',t:'扩大范围继续查找',c:'blue',s:'来源：公开信息与合作渠道'},{n:'第 4 步',t:'专人核验并给出结论',c:'green',s:'方式：人工核实'}].map(x=><div className="source-row" key={x.n}><i className={x.c}/><span><b>{x.n}</b>{x.t}<small>{x.s}</small></span><CheckCircle2 size={13}/></div>)}<p>本地仅有 {DEMO_COVERAGE.recordCount} 条演示记录，覆盖：{DEMO_COVERAGE.targets.join('、')}。未连接实时数据库或全网检索服务。</p></div>}</div><button ref={historyButtonRef} onClick={()=>{setShowHistory(v=>!v);setShowSources(false)}}><History size={16}/>历史任务</button><span className="user-avatar">周</span></nav></div>{showHistory&&<div className="history-box"><header><div><strong>最近任务</strong><small>实际调研记录 · 最近 {taskHistory.length} 条</small></div><button onClick={()=>setShowHistory(false)} aria-label="关闭历史任务"><X size={14}/></button></header>{taskHistory.length?<div className="history-list">{taskHistory.map(entry=><button key={entry.id} className="history-item" onClick={()=>{setSelectedHistory(entry);setShowHistory(false)}}><span><strong>{entry.brief.target_company||entry.brief.target_project}</strong><small>{entry.brief.primary_kp.join('、')||'未填写目标 KP'}</small></span><span><em className={`history-outcome ${entry.outcome.code}`}>{entry.outcome.label}</em><b>{entry.outcome.effectiveCount} 位有效联系人</b><time dateTime={entry.completedAt}>{formatCompletedAt(entry.completedAt)}</time></span></button>)}</div>:<div className="history-empty"><History size={20}/><strong>暂无历史任务</strong><p>完成一次查找后，实际调研结果和完成时间会保存在这里。</p></div>}</div>}</header><div className="mode-bar"><nav className="mode-nav" aria-label="查找模式">{MODES.map(item=><button key={item.id} className="mode-tab" aria-current={mode===item.id?'page':undefined} onClick={()=>{setMode(item.id);setShowHistory(false);setShowSources(false);window.scrollTo({top:0})}}><strong>{item.name}</strong><small>{item.label}</small></button>)}</nav></div><main className={mode==='chat'?'main main-chat':mode==='mvp4'?'main main-chat main-mvp':'main'}>{mode==='mvp4'&&<MvpChatPage onToast={setToast}/>}{mode==='flow'&&<FlowPage onToast={setToast} onTaskComplete={onTaskComplete}/>}{mode==='batch'&&<BatchPage onToast={setToast} onTaskComplete={onTaskComplete}/>}{mode==='chat'&&<ChatPage onToast={setToast} onTaskComplete={onTaskComplete}/>}</main>{selectedHistory&&<HistoryDetail entry={selectedHistory} onClose={()=>{setSelectedHistory(null);historyButtonRef.current?.focus()}}/>}{toast&&<div className="toast" role="status"><Check size={15}/>{toast}</div>}</div>
}
export default App
