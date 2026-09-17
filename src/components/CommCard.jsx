import { Check, CheckCircle2, Copy, Phone } from 'lucide-react'
import { addressTitle, contactTiming, decisionChainRole, phoneScript } from '../lib/commInsights'

const tierMeta = {1:{className:'tier-one',label:'人工核实'},2:{className:'tier-two',label:'交叉核验'},3:{className:'tier-three',label:'待进一步核验'}}
const INVALID_LABELS = { dead:'空号/错号', moved:'已调岗', wrong:'不是我要找的人' }

export function CommCard({result,onCopyText,touch,onTouch,badge}){
  const meta=tierMeta[result.tier]
  const chain=decisionChainRole(result)
  const script=phoneScript(result)
  const tel=result.mobile.includes('待')?undefined:`tel:${result.mobile.replaceAll(' ','')}`
  return <article className="comm-card">{badge&&<em className="comm-badge">{badge}</em>}<header><span className="contact-avatar">{result.name.slice(0,1)}</span><div><strong>{result.name}</strong><small>{result.role} · 称呼建议：{addressTitle(result)}</small></div><span className={`role-badge ${chain.key}`}>{chain.label}</span></header><div className="contact-confidence"><span className={`tier-badge ${meta.className}`}><i/>Tier {result.tier} · {meta.label}</span><span className="contact-bar"><i style={{width:`${result.confidence}%`}}/></span><b>{result.confidence}%</b></div><dl><div><dt>联系方式</dt><dd><a href={tel}><Phone size={12}/>{result.mobile}</a> · {result.wechat}</dd></div><div><dt>决策链定位</dt><dd>{chain.reason}</dd></div><div><dt>联系时机</dt><dd>{contactTiming(result)}</dd></div><div><dt>推荐话术</dt><dd className="comm-script">{script}</dd></div></dl><footer><a className="comm-call" href={tel} aria-disabled={!tel}><Phone size={13}/>立即拨打</a><button className="comm-copy" onClick={()=>onCopyText(script)}><Copy size={13}/>复制话术</button></footer>{touch&&onTouch&&<div className={`comm-feedback ${touch.state}`}>{touch.state==='pending'&&<><span>触达后请确认有效性（未确认不计费）</span><div className="comm-feedback-actions"><button onClick={()=>onTouch('called')}><Phone size={12}/>已拨打</button><button onClick={()=>onTouch('wechat')}>已加微信</button></div></>}{touch.state==='reached'&&<><span>这次触达结果如何？</span><div className="comm-feedback-actions"><button className="good" onClick={()=>onTouch('valid')}><Check size={12}/>有效 · 确认计费</button><button onClick={()=>onTouch('dead')}>空号/错号</button><button onClick={()=>onTouch('moved')}>已调岗</button><button onClick={()=>onTouch('wrong')}>不是我要找的人</button></div></>}{touch.state==='confirmed'&&<><CheckCircle2 size={13}/><b>已确认有效 · 已计入有效交付额度</b></>}{touch.state==='invalid'&&<b>已标记无效（{touch.feedback}）· 未计费，等待补发或转人工</b>}</div>}{result.tier===3&&<p className="unbilled-note">待进一步核验 · 当前不计有效交付</p>}</article>
}
