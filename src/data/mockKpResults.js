export const RESULT_HEADERS = [
  '目标单位/项目',
  '运行状态',
  '匹配KP姓名',
  '对应职务/职责',
  '联系方式 (手机/微信)',
  '数据置信度',
  '破冰/背景线索',
]

const fixtures = [
  { target: '内蒙古华伊卓资热电有限公司', aliases: ['华伊卓资热电','卓资电厂磨煤系统升级项目'], status: '在产', name: '王建国', role: '生产技术部部长', mobile: '138 0474 6628', wechat: '微信同号', tier: 1, confidence: 96, source: '180万人工核实工程库', verified: '人工核实', background: '负责磨辊选型与年度大修采购；曾主导 2×200MW 机组磨煤系统技改。', icebreaker: '从磨辊寿命和停机窗口压缩切入。' },
  { target: '内蒙古华伊卓资热电有限公司', aliases: ['华伊卓资热电','卓资电厂磨煤系统升级项目'], status: '在产', name: '李志强', role: '物资采购中心主任', mobile: '186 4740 1953', wechat: '微信同号', tier: 1, confidence: 93, source: '180万人工核实工程库', verified: '人工核实', background: '统筹备件供应商准入与询比价，关注交付周期、账期及本地服务。', icebreaker: '先提供同规模电厂备件交付案例。' },
  { target: '卓资电厂节能降碳改造项目', aliases: ['华伊卓资热电','卓资电厂'], status: '改扩建', name: '赵海峰', role: '技改项目经理', mobile: '159 0471 8842', wechat: '待确认', tier: 2, confidence: 84, source: '垂直渠道采集库', verified: '双渠道交叉验证', background: '负责改造包进度与技术澄清，近期评估辅机节能和智能运维方案。', icebreaker: '以不停产技改实施路径进入首轮沟通。' },
  { target: '卓资电厂磨煤系统升级项目', aliases: ['华伊卓资热电','卓资电厂'], status: '拟建', name: '陈峰', role: '机务专业负责人', mobile: '待进一步核验', wechat: '未核验', tier: 3, confidence: 68, source: '4.8亿全网库', verified: '组织关系推演', background: '依据招采参与记录与技术评审名单，可能负责磨煤机专业技术把关。', icebreaker: '建议经项目经理转介后确认实际决策权重。' },
  { target: '华北矿业智能化改造项目', aliases: ['华北矿业集团','华北矿业'], status: '在建', name: '刘海军', role: '机电副矿长', mobile: '137 0315 7821', wechat: '微信同号', tier: 2, confidence: 87, source: '垂直渠道采集库', verified: '项目履历核验', background: '负责井下机电系统与智能化设备验收，参与年度设备采购技术评分。', icebreaker: '从设备兼容性与井下维保响应切入。' },
]

const roleKeywords = {
  采购: ['采购','物资'], 生产: ['生产','机电'], 技术: ['技术','机务','总工'], 项目: ['项目'],
  矿长: ['矿长'], 厂长: ['部长','主任','经理'], 总经理: ['主任','经理'], 设备: ['机电','设备'],
}

const contextAliases = {
  '磨辊': ['磨辊','磨煤','大修'], '磨锟': ['磨辊','磨煤','大修'], '品牌': ['供应商','品牌','采购'],
  '采购': ['采购','物资','供应商'], '机电': ['机电','设备','维保'], '智能化': ['智能化','智能运维'],
  '改造': ['改造','技改','改扩建'], '节能': ['节能','降碳'],
}

export const DEMO_COVERAGE = {
  recordCount: fixtures.length,
  targets: ['内蒙古华伊卓资热电有限公司 / 卓资电厂', '华北矿业集团 / 智能化改造项目'],
}

const uniqueRolePlans = (roles) => [...new Set(roles)]

function roleMatches(record, requestedRole) {
  const key = Object.keys(roleKeywords).find((item) => requestedRole.includes(item))
  const keywords = key ? roleKeywords[key] : [requestedRole.replace(/负责人|部长|主任/g, '')]
  return keywords.some((keyword) => keyword && record.role.includes(keyword))
}

function targetMatches(record, brief) {
  const terms = [brief.target_company, brief.target_project].filter(Boolean)
  const recordTerms = [record.target, ...record.aliases]
  return terms.some((term) => recordTerms.some((candidate) => {
    const compactTerm = term.replace(/有限责任公司|股份有限公司|有限公司|集团公司/g, '')
    const compactCandidate = candidate.replace(/有限责任公司|股份有限公司|有限公司|集团公司/g, '')
    return compactTerm.includes(compactCandidate.slice(0, 4)) || compactCandidate.includes(compactTerm.slice(0, 4))
  }))
}

function semanticScore(record, context) {
  if (!context.trim()) return { score: 0, terms: [] }
  const haystack = `${record.role}${record.background}${record.icebreaker}`
  const matched = Object.entries(contextAliases)
    .filter(([term]) => context.includes(term))
    .filter(([, aliases]) => aliases.some((alias) => haystack.includes(alias)))
    .map(([term]) => term)
  return { score: matched.length, terms: matched }
}

export function retrieveMockResults(brief, options = {}) {
  const { allowFallback = true, useSemanticContext = false } = options
  const afterExclusions = fixtures.filter((record) => !brief.exclude_names.includes(record.name))
  const targetPool = afterExclusions.filter((record) => targetMatches(record, brief))
  const trace = {
    targetMatched: targetPool.length > 0,
    excludedCount: fixtures.length - afterExclusions.length,
    fallbackEnabled: allowFallback,
    fallbackUsed: false,
    matchedRequestedRole: '',
    rolePriority: -1,
    semanticUsed: useSemanticContext && Boolean(brief.business_context.trim()),
    semanticTerms: [],
    reason: '',
    reasonCode: '',
  }

  if (!targetPool.length) {
    trace.reasonCode = 'unsupported_target'
    trace.reason = '当前本地演示数据未覆盖该企业或项目；未执行真实数据源检索，也未生成联系人。'
    return { results: [], trace }
  }

  const hasEffectiveContact = (record) => record.tier < 3 && !record.mobile.includes('待') && record.mobile.trim().length > 0
  const primaryPlan = brief.primary_kp.map((role, index) => ({ role, path: 'primary', priority: index }))
  const fallbackPlan = allowFallback ? brief.secondary_kp.map((role, index) => ({ role, path: 'fallback', priority: index })) : []
  const primaryCandidates = primaryPlan.flatMap((plan) => targetPool.filter((record) => roleMatches(record, plan.role)).map((record) => ({ record, plan })))
  const primaryEffective = primaryCandidates.find(({ record }) => hasEffectiveContact(record))
  const primaryIntent = brief.primary_intent || 'any_primary'
  trace.primaryIntent = primaryIntent
  trace.matchedPrimaryRoles = uniqueRolePlans(primaryCandidates.map(({ plan }) => plan.role))
  trace.missingPrimaryRoles = brief.primary_kp.filter((role) => !trace.matchedPrimaryRoles.includes(role))

  let selected = []
  let matchedPlan = null
  if (primaryEffective && primaryIntent !== 'ordered_fallback') {
    const uniqueRecords = new Map()
    primaryCandidates.forEach(({ record, plan }) => {
      const key = `${record.target}-${record.name}`
      if (!uniqueRecords.has(key)) uniqueRecords.set(key, { record, plan })
    })
    const union = [...uniqueRecords.values()]
    selected = union.map(({ record }) => record)
    matchedPlan = union[0]?.plan || primaryEffective.plan
    trace.primaryContactState = 'effective'
  } else if (primaryEffective) {
    matchedPlan = primaryEffective.plan
    selected = targetPool.filter((record) => roleMatches(record, matchedPlan.role))
    trace.primaryContactState = 'effective'
  } else {
    trace.primaryContactState = primaryCandidates.length ? 'unverified_only' : 'not_found'
    for (const plan of fallbackPlan) {
      const matches = targetPool.filter((record) => roleMatches(record, plan.role))
      const effective = matches.filter(hasEffectiveContact)
      if (effective.length) { selected = effective; matchedPlan = plan; break }
    }
  }

  if (!selected.length) {
    if (primaryCandidates.length) {
      selected = primaryCandidates.map(({ record }) => record)
      matchedPlan = primaryCandidates[0].plan
      trace.informationalOnly = true
      trace.reasonCode = 'unverified_only'
      trace.reason = allowFallback ? '首选岗位仅发现待核验线索，备选岗位也没有有效联系人。' : '首选岗位仅发现待核验线索，且已关闭岗位职责回退。'
    } else {
      trace.reasonCode = 'no_results'
      trace.reason = allowFallback ? '目标已覆盖，但首选及备选岗位均未命中有效联系人。' : '目标已覆盖，但首选岗位未命中，且已关闭岗位职责回退。'
      return { results: [], trace }
    }
  }

  trace.fallbackUsed = matchedPlan.path === 'fallback'
  trace.matchedRequestedRole = matchedPlan.role
  trace.rolePriority = matchedPlan.priority

  const scored = selected.map((record, index) => {
    const semantic = useSemanticContext ? semanticScore(record, brief.business_context) : { score: 0, terms: [] }
    return { ...record, fixtureIndex: index, rolePath: matchedPlan.path, matchedRequestedRole: matchedPlan.role, rolePriority: matchedPlan.priority, semanticScore: semantic.score, semanticTerms: semantic.terms }
  })
  scored.sort((a, b) => b.semanticScore - a.semanticScore || a.tier - b.tier || b.confidence - a.confidence || a.fixtureIndex - b.fixtureIndex)
  trace.semanticTerms = [...new Set(scored.flatMap((record) => record.semanticTerms))]
  if (primaryIntent === 'all_primary' && trace.missingPrimaryRoles.length) {
    trace.reasonCode = 'partial_primary_coverage'
    trace.reason = `已命中部分职责；未覆盖：${trace.missingPrimaryRoles.join('、')}`
  } else if (!trace.reasonCode) {
    trace.reasonCode = 'success'
    trace.reason = '已完成本地演示数据匹配。'
  }
  return { results: scored.slice(0, 4), trace }
}

export function buildPipelineVerification(results, trace) {
  const effectiveCount = results.filter((result) => result.tier < 3 && !result.mobile.includes('待')).length
  const targetResult = trace.targetMatched
    ? `目标已对齐${trace.excludedCount ? ` · 已排除 ${trace.excludedCount} 人` : ''}`
    : '当前演示数据未覆盖该目标'
  const verifiedResult = trace.primaryContactState === 'effective'
    ? `首选职责命中 · ${effectiveCount} 位有效联系人`
    : trace.primaryContactState === 'unverified_only'
      ? '仅发现待进一步核验线索'
      : '首选职责未命中有效联系人'
  const expandResult = trace.fallbackUsed
    ? `已按优先级 ${trace.rolePriority + 1} 回退至「${trace.matchedRequestedRole}」`
    : trace.matchedRequestedRole
      ? '首选职责已命中，未扩大岗位范围'
      : '未执行岗位职责扩展'
  const humanResult = trace.reasonCode === 'success' || trace.reasonCode === 'partial_primary_coverage'
    ? `核验完成 · ${trace.reason}`
    : trace.reason || '核验完成，暂未找到有效联系人'
  return [targetResult, verifiedResult, expandResult, humanResult]
}

export function resultToCells(result) {
  return [result.target,result.status,result.name,result.role,`${result.mobile}${result.wechat ? ` / ${result.wechat}` : ''}`,`Tier ${result.tier} · ${result.confidence}% · ${result.source} · ${result.verified}`,`${result.background} 破冰建议：${result.icebreaker}`]
}
