const chainRules = [
  { key: 'gatekeeper', label: '商务把关人', test: /采购|物资|商务/, reason: '掌握供应商准入与询比价，是商务通道的关键节点，建议准备资质与同规模案例' },
  { key: 'decision', label: '决策者', test: /矿长|厂长|总经理|总工程师|副院长|董事长/, reason: '对技术与采购具有最终拍板权，建议在其认可技术方案后推进商务条款' },
  { key: 'influencer', label: '技术影响者', test: /技术|机务|机电|设备|生产|项目|技改/, reason: '影响技术选型与方案评审，是早期建立信任、进入备选清单的关键' },
]
const timingRules = [
  { test: /拟建/, text: '立项报批阶段：技术标准与选型窗口期，越早建立技术沟通越有利' },
  { test: /在建/, text: '在建执行期：设备与安装采购已启动，建议 3 日内联系' },
  { test: /改扩建/, text: '改造方案比选期：适合以不停产、渐进式实施方案切入' },
  { test: /在产/, text: '在产运行期：备件按检修周期采购，建议先了解近期检修计划再联系' },
]
const titleRules = [
  [/主任$/, m => `${m}主任`], [/部长$/, m => `${m}部长`], [/经理$/, m => `${m}经理`],
  [/矿长$/, m => `${m}矿长`], [/厂长$/, m => `${m}厂长`], [/总工程师$/, m => `${m}总`],
  [/负责人$/, m => `${m}工`],
]

export function decisionChainRole(result) {
  return chainRules.find(rule => rule.test.test(result.role)) || chainRules[2]
}

export function contactTiming(result) {
  const rule = timingRules.find(item => item.test.test(result.status))
  return rule ? rule.text : '建议工作日 10:00–11:30 或 14:30–17:00 联系，接通率更高'
}

export function addressTitle(result) {
  const surname = result.name.slice(0, 1)
  const rule = titleRules.find(([test]) => test.test(result.role))
  return rule ? rule[1](surname) : result.name
}

export function phoneScript(result) {
  const address = addressTitle(result)
  const background = result.background.split(/[；;。]/)[0]
  return `${address}您好，我是〔您的公司〕的〔您的姓名〕。关注到贵方「${result.target}」（${result.status}）正在推进相关业务，我们服务过的同类企业中，${background}。${result.icebreaker}想和您约 10 分钟做个简要交流，您看本周哪天方便？`
}

export function wechatScript(result) {
  const address = addressTitle(result)
  return `${address}您好，我是〔您的公司〕的〔您的姓名〕，专注工业设备与工程服务。看到贵方「${result.target}」${result.status}，${result.icebreaker}我先把相关案例资料发您，您方便时回复即可，不打扰您安排。`
}
