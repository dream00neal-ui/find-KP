const splitList = (value = '') => String(value)
  .split(/[、,，;；/\n]|以及|和|或/)
  .map((item) => item.trim().replace(/^(找|查|联系)/, ''))
  .filter(Boolean)

const takeLabel = (text, labels) => {
  const pattern = new RegExp(`(?:${labels.join('|')})[：:]\\s*([^。；;\\n]+)`, 'i')
  return text.match(pattern)?.[1]?.trim() || ''
}
const unique = (items) => [...new Set(items.map((item) => item.trim()).filter(Boolean))]

const exactRoles = ['法人','采购部长','采购负责人','厂长','总经理','矿长','技术负责人','生产负责人','项目经理','项目负责人','总工程师','机电副矿长','设备负责人','机电负责人','电气工程师','电气负责人']
const domains = [
  { pattern: /技术|工艺|研发/, role: '技术负责人' },
  { pattern: /生产|制造|运营/, role: '生产负责人' },
  { pattern: /机动|机电|设备|动力|装备|机修/, role: '机电负责人' },
  { pattern: /电气|自动化/, role: '电气负责人' },
  { pattern: /采购|物资|供应链|招标/, role: '采购负责人' },
  { pattern: /工程|项目|建设|基建/, role: '项目负责人' },
  { pattern: /安全|安环|环保|EHS/i, role: '安全环保负责人' },
]

function normalizeRoles(source, warnings) {
  const cleaned = String(source || '')
    .replace(/他们公司的?|该公司的?|对方公司的?|公司里的?|项目里的?/g, '')
    .replace(/负责/g, '')
    .replace(/相关|条线|方面|部门|人员/g, '')
    .replace(/的?(?:都要|都找|都需要|全部|均要|均可|都可以).*$/g, '')
    .replace(/(?:负责人|领导)们?$/g, '')
  const exact = exactRoles.filter((role) => cleaned.includes(role))
  const normalized = domains
    .filter(({ pattern, role }) => pattern.test(cleaned) && !exact.some((exactRole) =>
      (role === '采购负责人' && /采购|物资/.test(exactRole)) ||
      (role === '项目负责人' && /项目|工程/.test(exactRole)) ||
      (role === '技术负责人' && /技术|总工/.test(exactRole)) ||
      (role === '生产负责人' && /生产/.test(exactRole)) ||
      (role === '机电负责人' && /机电|设备/.test(exactRole)) ||
      (role === '电气负责人' && /电气/.test(exactRole))))
    .map(({ role }) => role)
  if (/机动/.test(cleaned)) warnings.push('“机动”已按工业岗位语境归一为“机电负责人”，请确认岗位口径')
  return unique([...exact, ...normalized])
}

export const emptyBrief = {
  target_company: '', target_project: '', primary_kp: [], secondary_kp: [], exclude_names: [], business_context: '', primary_intent: 'any_primary',
}

export function parseAgentPrompt(rawInput = '') {
  const text = String(rawInput).replace(/\r/g, '').replace(/[\t ]+/g, ' ').replace(/\n{2,}/g, '\n').trim()
  if (!text) return { brief: { ...emptyBrief, primary_kp: [], secondary_kp: [], exclude_names: [] }, errors: ['请输入指定企业、项目及需要寻找的 KP 职责'], warnings: [], confidence: 0, reviewRequired: false }

  const warnings = []
  let targetCompany = takeLabel(text, ['目标企业','目标公司','企业全称','公司','单位'])
  let targetProject = takeLabel(text, ['目标项目','关联项目','工程项目','项目'])
  const explicitPrimary = takeLabel(text, ['首选KP','首要KP','目标KP','优先找','primary_kp'])
  const explicitSecondary = takeLabel(text, ['备选KP','次选KP','找不到时','其次找','secondary_kp'])
  const explicitExclude = takeLabel(text, ['排除人员','排除','不要找','exclude_names'])
  const explicitContext = takeLabel(text, ['业务背景','业务上下文','探查需求','附加需求','business_context'])

  if (!targetCompany) {
    const companyMatch = text.match(/(?:^|[，,；;。\s])?([一-龥A-Za-z0-9（）()·]{2,40}?(?:有限责任公司|股份有限公司|有限公司|集团公司|集团|研究院|设计院|矿业公司|建设单位|重工|重装|机械|装备|电气|能源|热电|电力|钢铁|水泥|化工|环保|水务|建工|路桥|工程公司|公司|电厂|厂|矿))(?=[，,；;。\s的]|他们|该公司|需要|找|要|$)/)
    targetCompany = companyMatch?.[1]?.trim() || ''
  }
  if (!targetProject) {
    const projectMatch = text.match(/([一-龥A-Za-z0-9（）()·×xX-]{2,50}?(?:改造项目|改扩建项目|建设项目|工程项目|技改项目|项目))(?=[，,；;。\s]|需要|找|要|$)/)
    targetProject = projectMatch?.[1]?.trim() || ''
  }

  let primaryKp = normalizeRoles(explicitPrimary, warnings)
  let secondaryKp = normalizeRoles(explicitSecondary, warnings)
  let primaryIntent = secondaryKp.length ? 'ordered_fallback' : 'any_primary'

  const fallbackMatch = text.match(/(?:找不到|没有|未命中)([^，。；;\n]+?)(?:就|则|再|时)(?:找|查|联系)?([^。；;\n]+)/)
  if (fallbackMatch) {
    if (!primaryKp.length) primaryKp = normalizeRoles(fallbackMatch[1], warnings)
    if (!secondaryKp.length) secondaryKp = normalizeRoles(fallbackMatch[2], warnings)
    primaryIntent = 'ordered_fallback'
  }

  const allMatch = text.match(/(?:找|需要|要|查)?([^。；;\n]{1,80}?)(?:的?都要|的?都找|全部都要|分别找|都需要)/)
  if (allMatch) {
    const roles = normalizeRoles(allMatch[1], warnings)
    if (roles.length) { primaryKp = roles; secondaryKp = []; primaryIntent = 'all_primary' }
  }

  if (!primaryKp.length) {
    const possessiveMatch = text.match(/的([一-龥A-Za-z0-9·]{2,20}?(?:负责人|部长|主任|经理|总工程师|总工|工程师|矿长|厂长|专员))/)
    if (possessiveMatch) primaryKp = normalizeRoles(possessiveMatch[1], warnings)
  }
  if (!primaryKp.length) {
    const roleMatch = text.match(/(?:想找|需要找|帮我找|查找|寻找|要找)([^。；;\n]+)/)
    if (roleMatch) primaryKp = normalizeRoles(roleMatch[1], warnings)
  }
  const secondaryMarker = text.match(/(?:没有|找不到|未命中|没找到)/)
  if (secondaryMarker && !fallbackMatch) {
    const head = text.slice(0, secondaryMarker.index)
    const tail = text.slice(secondaryMarker.index + secondaryMarker[0].length).replace(/^(?:就|则|再|时)?(?:找|查|联系)/, '')
    if (!primaryKp.length) primaryKp = normalizeRoles(head, warnings)
    if (!secondaryKp.length) secondaryKp = normalizeRoles(tail, warnings)
    if (primaryKp.length || secondaryKp.length) primaryIntent = 'ordered_fallback'
  }
  if (!primaryKp.length) {
    const bareFind = text.match(/找([^。；;\n]+)/)
    if (bareFind) { const at = text.indexOf(bareFind[0]); const prev = at > 0 ? text[at - 1] : ''; if (!'就则再'.includes(prev)) primaryKp = normalizeRoles(bareFind[1], warnings) }
  }
  if (!primaryKp.length) primaryKp = normalizeRoles(text, warnings)
  if (primaryKp.length > 1 && primaryIntent !== 'all_primary' && primaryIntent !== 'ordered_fallback') {
    primaryIntent = /(?:或|任一|均可|都可以)/.test(text) ? 'any_primary' : 'any_primary'
  }

  let excludeNames = splitList(explicitExclude)
  const excludeMatch = text.match(/(?:除|除了)([一-龥·、，,]{2,30})(?:以外|之外)/)
  if (excludeMatch) excludeNames = unique([...excludeNames, ...splitList(excludeMatch[1])])

  const contextCandidate = text.split(/[。；;，,\n]/).map((item) => item.trim()).filter(Boolean).find((item) => /品牌|设计|磨[锟辊]|变电|改造|背景|方案|使用|更换|计划/.test(item) && !/(有限责任公司|股份有限公司|有限公司|集团公司|改造项目|建设项目|工程项目|升级项目|技改项目)/.test(item))
  const businessContext = explicitContext || contextCandidate || ''
  const brief = { target_company: targetCompany, target_project: targetProject, primary_kp: unique(primaryKp), secondary_kp: unique(secondaryKp.filter((item) => !primaryKp.includes(item))), exclude_names: unique(excludeNames), business_context: businessContext, primary_intent: primaryIntent }
  const errors = []
  if (!brief.target_company && !brief.target_project) errors.push('未识别到目标企业或项目')
  if (brief.target_company && brief.target_project) errors.push('一次检索只能指定一个目标：请保留目标企业或目标项目')
  if (!brief.primary_kp.length) errors.push('未识别到目标 KP 职责')
  const explicitSignals = Number(Boolean(targetCompany)) + Number(Boolean(explicitPrimary || allMatch || fallbackMatch))
  const confidence = Math.min(96, 66 + explicitSignals * 10 + (brief.business_context ? 5 : 0) - warnings.length * 6)
  return { brief, errors, warnings: unique(warnings), confidence, reviewRequired: warnings.length > 0 || confidence < 78 }
}
