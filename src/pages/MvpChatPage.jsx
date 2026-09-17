import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowUp, Check, CheckCircle2, ChevronRight, History, Info, LoaderCircle, RotateCcw, UserCheck, Zap } from 'lucide-react'
import { parseAgentPrompt } from '../lib/parseAgentPrompt'
import { retrieveMockResults } from '../data/mockKpResults'
import { formatSessionTime, loadKpSessions, upsertKpSession, saveKpSessions } from '../lib/kpSessionHistory'

let seq = 0
const mid = () => `m${++seq}`
const bumpSeq = msgs => msgs.forEach(m=>{const n=Number(String(m.id).slice(1));if(Number.isFinite(n)&&n>seq)seq=n})
const MAX_ROUNDS = 5
const EXAMPLES = [
  '河北天昕建设集团有限公司，项目负责人',
  '沈阳屹昌科技有限公司，白海军',
  '内蒙古华伊卓资热电有限公司，采购负责人',
  '融捷股份有限公司，采购负责人优先，没有的话找采购经理',
  '模拟异常：融捷股份有限公司，采购负责人',
  '青云水务集团有限公司，安全负责人',
]
const INTENT_TEXT = '请提供具体的企业名称和您想要寻找的联系人类型（例如："XX公司采购负责人"）。'
const NO_RESULT_TEXT = '很抱歉，本次未能查询到符合条件的联系人。您可以调整描述后重新发起，或转人工由调研专员为您核实补齐。'
const ESCALATE_TEXT = '您的人工诉求已收到，调研人员将快马加鞭进行核实反馈。'
const LIMIT_TEXT = '当前为体验版，本轮会话次数已达上限，可重新发起新会话继续使用。'
const FAIL_RE = /异常|报错/
const OUTCOME_META = {
  results:{ label:s=>`返回 ${s.count} 条联系人`, dot:'#2f7955' },
  no_result:{ label:()=>'未查询到结果', dot:'#c99434' },
  error:{ label:()=>'查询异常', dot:'#c0563e' },
  intent:{ label:()=>'待补充信息', dot:'#8a92a1' },
}

const isOne = v => v === 1 || v === '1'
const hasPhone = v => Boolean(v.contactsPeopleMobile || v.contactsPeopleTel)
const tagsOf = v => [isOne(v.kpIndex)&&'关键人', isOne(v.legalPersonIndex)&&'法人', isOne(v.executiveIndex)&&'高管', isOne(v.recommendIndex)&&'推荐', isOne(v.hotIndex)&&'近期多人查询'].filter(Boolean)
const phoneOf = v => v.contactsPeopleMobile ? `手机 ${v.contactsPeopleMobile}` : v.contactsPeopleTel ? `座机 ${v.contactsPeopleTel}` : ''

function toVo(r){
  return { enterpriseLibraryCompany:r.target, contactsPeopleName:r.name, contactsPeopleMobile:r.mobile.includes('待')?null:r.mobile, contactsPeopleTel:null, contactsPeopleDuty:(r.background||'').split(/[；;。]/)[0]||'', contactsPeoplePosition:r.role, contactsPeopleDepartment:'', recommendIndex:r.tier===1?'1':'0', hotIndex:0, telephoneTagIndex:null, kpIndex:r.tier===1?1:0, recIndex:0, legalPersonIndex:0, executiveIndex:r.tier===2?1:0 }
}
// 演示用固定联系人记录：未接入真实 MCP 数据源，命中以下目标时返回固定结果
const CANNED_BY_TARGET = [
  { match:/河北天昕/, vos:[
    { name:'黄先生', mobile:'151 3857 5373', position:'项目负责人', duty:'统筹工程进度与分包管理', kp:false },
    { name:'牛工', mobile:null, position:'项目负责人', duty:'现场技术协调', kp:false },
    { name:'郭建军', mobile:'135 2241 9876', position:'工程管理部经理', duty:'负责分包准入与结算', kp:true },
  ]},
  { match:/沈阳屹昌/, vos:[
    { name:'白海军', mobile:'139 9840 3271', position:'技术部经理', duty:'主持设备选型与技术方案评审', kp:true },
    { name:'马晓东', mobile:null, position:'采购部专员', duty:'执行询比价与供应商对接', kp:false },
  ]},
  { match:/融捷/, vos:[
    { name:'林芳', mobile:'137 2689 4315', position:'采购部部长', duty:'统筹供应商准入与年度框架采购', kp:true },
    { name:'高伟', mobile:null, position:'设备工程师', duty:'负责产线设备维保与改造', kp:false },
    { name:'郑立群', mobile:'150 7786 9234', position:'总经理', duty:'重大采购最终审批', kp:false },
  ]},
]
// 命中演示库的目标追加的补充记录（保证超过 5 条，便于演示分页）
const EXTRA_POOL = [
  { name:'张伟', mobile:'139 3211 4826', position:'物资管理部主管', duty:'物资计划与库存管理', kp:false },
  { name:'刘杰', mobile:null, position:'设备工程师', duty:'设备巡检与台账维护', kp:false },
  { name:'孙丽', mobile:'133 8756 9034', position:'综合管理部经理', duty:'行政与对外联络', kp:false },
  { name:'赵敏', mobile:null, position:'技术质量部工程师', duty:'质量体系与工艺监督', kp:false },
  { name:'周涛', mobile:'135 6609 7741', position:'安全环保部主管', duty:'安环验收与合规管理', kp:false },
]
const toCannedVo = company => v => ({ enterpriseLibraryCompany:company, contactsPeopleName:v.name, contactsPeopleMobile:v.mobile, contactsPeopleTel:null, contactsPeopleDuty:v.duty, contactsPeoplePosition:v.position, contactsPeopleDepartment:'', recommendIndex:'0', hotIndex:0, telephoneTagIndex:null, kpIndex:v.kp?1:null, recIndex:null, legalPersonIndex:0, executiveIndex:0 })

function mcpQuery(brief){
  const base = retrieveMockResults(brief,{allowFallback:true})
  const target = brief.target_company || brief.target_project || ''
  let vos = base.results.map(toVo)
  const canned = CANNED_BY_TARGET.find(c=>c.match.test(target))
  if(canned) vos = vos.concat(canned.vos.map(toCannedVo(target)))
  else if(vos.length) vos = vos.concat(EXTRA_POOL.map(toCannedVo(target)))
  vos.sort((a,b)=>(hasPhone(b)?1:0)-(hasPhone(a)?1:0))
  return { vos }
}

function StepStrip({message,onToggle}){
  return <div className="chat-steps">{message.steps.map((step,index)=><div key={step.key} className={`chat-step ${step.state}`}><button onClick={()=>onToggle(index)} aria-expanded={step.open}><span className="chat-step-icon">{step.state==='done'?<Check size={14}/>:step.state==='error'?<AlertTriangle size={14}/>:step.state==='active'?<LoaderCircle className="spin" size={15}/>:<span className="chat-step-no">{index+1}</span>}</span><strong>{step.title}</strong><ChevronRight size={13} className={step.open?'flip':''}/></button>{step.open&&step.detail&&<p>{step.detail}</p>}</div>)}</div>
}

function ResultBlock({message,onToast,onMore,onEscalate}){
  const shown=message.records.slice(message.offset,message.offset+5)
  const top=message.records.find(hasPhone)
  const page=Math.floor(message.offset/5)+1,pages=Math.max(1,Math.ceil(message.records.length/5))
  const hasMore=message.offset+5<message.records.length
  const copyLine=v=>`${v.contactsPeopleName}｜${v.contactsPeoplePosition||'—'}｜${phoneOf(v)||'联系方式待补充'}`
  const copyAll=async()=>{const text=shown.map(copyLine).join('\n');try{await navigator.clipboard.writeText(text);onToast('本页联系人已复制')}catch{onToast('浏览器未开放剪贴板权限')}}
  return <div className="mvp-results">
    <header className="mvp-results-head"><span>查询联系人结果</span><small>共 {message.records.length} 条 · 第 {page}/{pages} 页</small></header>
    {top&&<div className="mvp-top"><CheckCircle2 size={15}/><div><span>建议优先联系</span><strong>{top.contactsPeopleName} · {top.contactsPeoplePosition||'—'}</strong>{tagsOf(top).length>0&&<em>{tagsOf(top).join(' · ')}</em>}</div><button onClick={copyAll}>复制本页</button></div>}
    <div className="mvp-rows">{shown.map((v,i)=><div key={`${v.contactsPeopleName}-${i}`} className={`mvp-row${hasPhone(v)?'':' lead'}`}><b>{v.contactsPeopleName}</b><span>{v.contactsPeoplePosition||v.contactsPeopleDuty||'—'}</span><i>{phoneOf(v)||'联系方式待补充'}</i>{tagsOf(v).length>0&&<em>{tagsOf(v).join(' · ')}</em>}{v.contactsPeopleDuty&&<small>职责：{v.contactsPeopleDuty}</small>}</div>)}</div>
    {message.records.length>5&&<div className="mvp-actions">{hasMore&&<button className="more" onClick={()=>onMore(message.id)}>继续查看<ChevronRight size={13}/></button>}<button onClick={onEscalate}><UserCheck size={13}/>转人工</button></div>}
  </div>
}

function outcomeOf(messages){
  for(let i=messages.length-1;i>=0;i--){
    const m=messages[i]
    if(m.code==='results')return {code:'results',count:m.records.length}
    if(m.code==='no_result'||m.code==='error'||m.code==='intent')return {code:m.code}
  }
  return null
}

export default function MvpChatPage({onToast}){
  const [messages,setMessages]=useState(()=>[{id:'m0',role:'agent',kind:'welcome'}]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false)
  const [sessionId,setSessionId]=useState(()=>'s'+Date.now()),[history,setHistory]=useState(loadKpSessions)
  const timersRef=useRef([]),runRef=useRef(0),roundRef=useRef(0),inputRef=useRef(null),scrollRef=useRef(null)
  useEffect(()=>()=>{timersRef.current.forEach(id=>window.clearTimeout(id))},[])
  useEffect(()=>{const node=scrollRef.current;if(node)node.scrollTo({top:node.scrollHeight,behavior:'smooth'})},[messages])
  useEffect(()=>{
    if(busy)return
    const users=messages.filter(m=>m.role==='user')
    if(!users.length)return
    const clean=messages.filter(m=>m.kind!=='thinking'&&m.kind!=='welcome')
    const summary=outcomeOf(clean)
    const entry={id:sessionId,title:users[0].text.slice(0,60),savedAt:new Date().toISOString(),rounds:users.length,summary,messages:clean}
    setHistory(current=>upsertKpSession(current,entry))
  },[messages,busy,sessionId])
  const push=msg=>setMessages(current=>[...current,msg])
  const patch=(id,updater)=>setMessages(current=>current.map(m=>m.id===id?updater(m):m))
  const send=()=>{const text=draft.trim();if(!text||busy||locked)return;setDraft('');sendText(text)}
  const completeTurn=()=>{
    if(roundRef.current>=MAX_ROUNDS){
      push({id:mid(),role:'agent',kind:'limit'})
      setLocked(true)
      onToast('本轮会话次数已达上限')
    }
  }
  const sendText=text=>{
    if(!text||busy||locked)return
    roundRef.current+=1
    const thinkId=mid()
    setMessages(current=>[...current.filter(m=>m.kind!=='thinking'),{id:mid(),role:'user',kind:'text',text},{id:thinkId,role:'agent',kind:'thinking'}])
    setBusy(true)
    const run=++runRef.current
    timersRef.current.push(window.setTimeout(()=>{
      if(run!==runRef.current)return
      const parsed=parseAgentPrompt(text)
      if(parsed.errors.length){
        patch(thinkId,m=>({...m,kind:'text',text:INTENT_TEXT,code:'intent'}))
        setBusy(false)
        completeTurn()
        return
      }
      const b=parsed.brief
      const target=b.target_company||b.target_project
      patch(thinkId,m=>({...m,kind:'text',text:`已解析：目标「${target}」· 优先找「${b.primary_kp.join('、')}」，正在调用联系人查询…`}))
      runLookup(b,400,FAIL_RE.test(text))
    },500))
  }
  const runLookup=(brief,delay,fail)=>{
    setBusy(true)
    const run=++runRef.current
    const {vos}=mcpQuery(brief)
    const stepsMsg={id:mid(),role:'agent',kind:'steps',steps:[
      {key:'parse',title:'解析意图',state:'pending',detail:`目标 ${brief.target_company||brief.target_project} · 首选 ${brief.primary_kp.join('、')||'—'}`,open:false},
      {key:'mcp',title:'联系人查询',state:'pending',detail:`正在查询「${brief.target_company||brief.target_project}」的联系人`,open:false},
    ]}
    push(stepsMsg)
    const schedule=[
      {at:delay,fn:()=>patch(stepsMsg.id,m=>({...m,steps:m.steps.map((s,i)=>i===0?{...s,state:'done',open:false}:i===1?{...s,state:'active',open:true}:s)}))},
      {at:delay+700,fn:()=>{
        if(fail){
          patch(stepsMsg.id,m=>({...m,steps:m.steps.map(s=>s.key==='mcp'?{...s,state:'error',detail:'调用异常：服务暂不可用',open:true}:{...s,state:'done',open:false})}))
          push({id:mid(),role:'agent',kind:'notice',code:'error',text:NO_RESULT_TEXT,escalate:true})
          onToast('查询异常，已返回通用提示')
        }else if(vos.length){
          patch(stepsMsg.id,m=>({...m,steps:m.steps.map(s=>s.key==='mcp'?{...s,state:'done',detail:`查询完成 · 返回 ${vos.length} 条记录`,open:false}:{...s,state:'done',open:false})}))
          push({id:mid(),role:'agent',kind:'results',code:'results',records:vos,offset:0})
          onToast(`已返回 ${vos.length} 条查询结果`)
        }else{
          patch(stepsMsg.id,m=>({...m,steps:m.steps.map(s=>s.key==='mcp'?{...s,state:'done',detail:'查询完成 · 未命中联系人记录',open:false}:{...s,state:'done',open:false})}))
          push({id:mid(),role:'agent',kind:'notice',code:'no_result',text:NO_RESULT_TEXT,escalate:true})
          onToast('未查询到结果')
        }
        completeTurn()
      }},
      {at:delay+720,fn:()=>setBusy(false)},
    ]
    schedule.forEach(({at,fn})=>timersRef.current.push(window.setTimeout(()=>{if(run!==runRef.current)return;fn()},at)))
  }
  const showMore=msgId=>patch(msgId,m=>({...m,offset:Math.min(m.offset+5,Math.max(0,(Math.ceil(m.records.length/5)-1)*5))}))
  const escalate=()=>{push({id:mid(),role:'agent',kind:'text',text:ESCALATE_TEXT});onToast('人工诉求已提交')}
  const newSession=()=>{runRef.current++;setBusy(false);setLocked(false);roundRef.current=0;setDraft('');setSessionId('s'+Date.now());setMessages([{id:mid(),role:'agent',kind:'welcome'}]);onToast('已发起新会话')}
  const restoreSession=entry=>{
    runRef.current++
    bumpSeq(entry.messages)
    const rounds=entry.rounds||entry.messages.filter(m=>m.role==='user').length
    setBusy(false);setDraft('');setSessionId(entry.id);roundRef.current=rounds;setLocked(rounds>=MAX_ROUNDS)
    setMessages([{id:mid(),role:'agent',kind:'welcome'},...entry.messages])
    onToast('已恢复历史会话')
  }
  const clearHistory=()=>{setHistory(saveKpSessions([]));onToast('历史会话已清空')}
  const toggleStep=(msgId,index)=>patch(msgId,m=>({...m,steps:m.steps.map((s,i)=>i===index?{...s,open:!s.open}:s)}))
  return <div className="mvp-layout">
    <aside className="mvp-history">
      <header><strong>历史会话</strong><button onClick={clearHistory} disabled={!history.length}>清空</button></header>
      {history.length?<div className="mvp-history-list">{history.map(entry=>{
        const outcome=entry.summary?OUTCOME_META[entry.summary.code]:null
        return <button key={entry.id} className={`mvp-history-item${entry.id===sessionId?' active':''}`} onClick={()=>restoreSession(entry)}>
          <span className="mvp-history-title"><i style={outcome?{background:outcome.dot}:undefined}/>{entry.title}</span>
          <small>{entry.rounds} 轮对话{outcome?` · ${outcome.label(entry.summary)}`:''}{entry.rounds>=MAX_ROUNDS?' · 已达上限':''}</small>
          <time>{formatSessionTime(entry.savedAt)}</time>
        </button>})}</div>
      :<div className="mvp-history-empty"><History size={20}/><strong>暂无历史会话</strong><p>完成一次查找后，会话会自动保存在这里，可随时点击回看。</p></div>}
    </aside>
    <div className="chat-shell"><header className="chat-head"><h1>中项网智能找KP</h1><p>找到项目，更要找到关键决策人——用自然语言描述需求，智能体快速锁定采购、技术、项目负责人等核心KP，直联触达；未命中由调研专员补齐。</p></header><div className={messages.length===1?'chat-scroll empty':'chat-scroll'} ref={scrollRef}>{messages.map(message=>{
      if(message.role==='user')return <div key={message.id} className="chat-bubble user">{message.text}</div>
      if(message.kind==='welcome')return <div key={message.id} className="chat-welcome"><header><Zap size={15}/>一句话，找到能拍板的人</header><p>用一句话描述您的需求（目标企业/项目 + 岗位），也可以直接点击下方示例开始体验。</p><div className="chat-welcome-examples">{EXAMPLES.map(example=><button key={example} onClick={()=>sendText(example)}>{example}</button>)}</div></div>
      if(message.kind==='text')return <div key={message.id} className="chat-bubble agent">{message.text}</div>
      if(message.kind==='thinking')return <div key={message.id} className="chat-bubble agent thinking" role="status" aria-label="Agent 正在思考"><i/><i/><i/></div>
      if(message.kind==='steps')return <div key={message.id} className="chat-agent-block"><StepStrip message={message} onToggle={index=>toggleStep(message.id,index)}/></div>
      if(message.kind==='results')return <div key={message.id} className="chat-agent-block"><ResultBlock message={message} onToast={onToast} onMore={showMore} onEscalate={escalate}/></div>
      if(message.kind==='notice')return <div key={message.id} className="chat-agent-block"><div className="chat-notice"><Info size={16}/><p>{message.text}</p>{message.escalate&&<button onClick={escalate}><UserCheck size={13}/>转人工</button>}</div></div>
      if(message.kind==='limit')return <div key={message.id} className="chat-agent-block"><div className="chat-limit"><Info size={16}/><p>{LIMIT_TEXT}</p><button onClick={newSession}><RotateCcw size={13}/>发起新会话</button></div></div>
      return null
    })}</div><div className="chat-composer"><div className="composer-box">
      <textarea ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}} disabled={locked} placeholder={locked?'本轮会话次数已达上限，请点击「发起新会话」':'输入目标企业或项目 + 岗位，如：河北天昕建设集团有限公司，项目负责人'}/>
      <div className="composer-bar">
        <span className="composer-hint">{locked?'会话已达上限':busy?'查询中…':'Enter 发送 · Shift+Enter 换行'}</span>
        <div className="composer-actions">
          <button className="composer-reset" onClick={newSession} title="清空当前会话并重新开始"><RotateCcw size={13}/><span>发起新会话</span></button>
          <button className="composer-send" onClick={send} disabled={busy||locked||!draft.trim()} aria-label="发送">{busy?<LoaderCircle className="spin" size={17}/>:<ArrowUp size={17}/>}</button>
        </div>
      </div>
    </div></div></div>
  </div>
}
