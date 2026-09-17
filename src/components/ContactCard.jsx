import { Copy, Phone, Sparkles } from 'lucide-react'

const tierMeta={1:{className:'tier-one',label:'人工核实'},2:{className:'tier-two',label:'交叉核验'},3:{className:'tier-three',label:'待进一步核验'}}

export function ContactCard({result,onCopy}){
  const meta=tierMeta[result.tier]
  return <article className="contact-card"><header><span className="contact-avatar">{result.name.slice(0,1)}</span><div><strong>{result.name}</strong><small>{result.role}</small></div><span className={`status status-${result.status}`}>{result.status}</span><button onClick={()=>onCopy([result])} aria-label={`复制 ${result.name} 信息`}><Copy size={13}/></button></header><div className="contact-confidence"><span className={`tier-badge ${meta.className}`}><i/>Tier {result.tier} · {meta.label}</span><span className="contact-bar"><i style={{width:`${result.confidence}%`}}/></span><b>{result.confidence}%</b></div><dl><div><dt>联系方式</dt><dd><a href={result.mobile.includes('待')?undefined:`tel:${result.mobile.replaceAll(' ','')}`}><Phone size={12}/>{result.mobile}</a> · {result.wechat}</dd></div><div><dt>核验来源</dt><dd>{result.verified} · {result.source}</dd></div><div><dt>背景线索</dt><dd>{result.background}</dd></div><div><dt>破冰建议</dt><dd className="contact-ice"><Sparkles size={12}/>{result.icebreaker}</dd></div></dl>{result.tier===3&&<p className="unbilled-note">待进一步核验 · 当前不计有效交付</p>}</article>
}
