const deriveContactTypes = raw => {
  if (/手机|手机号|电话/.test(raw)) return ['mobile']
  if (/微信/.test(raw)) return ['wechat']
  return ['contact']
}

const deriveSurnames = raw => [...new Set((raw.match(/姓([一-龥])/g) || []).map(item => item[1]))].filter(char => char !== '名')

function buildStrategy(request) {
  const target = request.target_type === 'company' ? request.company_name : request.project_name
  if (!target) return '尚未识别到目标主体，需要补充企业或项目信息。'
  const scopeText = request.company_scope === 'group' ? '（含母公司集团范围）' : '（仅该主体）'
  const primary = request.priority_kp.join('、') || '未指定岗位'
  const backup = request.backup_kp.length ? `，未命中时依次回退：${request.backup_kp.join('、')}` : '，未设置备选回退'
  const surname = request.specified_surnames.length ? `，只要姓${request.specified_surnames.join('、姓')}的` : ''
  const excluded = [...request.excluded_names, ...request.excluded_surnames.map(item => `姓${item}以外`)]
  const exclText = excluded.length ? `；已排除 ${excluded.join('、')}` : ''
  const contactText = request.contact_types[0] === 'mobile' ? '手机号' : request.contact_types[0] === 'wechat' ? '微信' : '联系方式'
  return `将在「${target}」${scopeText}内检索「${primary}」${backup}${surname}${exclText}，返回不超过 ${request.requested_count} 位${contactText}。`
}

export function buildMcpRequest({ brief, raw = '', scope = 'self', contactTypes, requestedCount = 3 }) {
  const missingFields = []
  if (!brief.target_company && !brief.target_project) missingFields.push('target')
  if (!brief.primary_kp.length) missingFields.push('role')
  const request = {
    raw_request: raw,
    target_type: brief.target_company ? 'company' : 'project',
    company_name: brief.target_company,
    project_name: brief.target_project,
    company_scope: scope,
    roles_requested: [...brief.primary_kp, ...brief.secondary_kp],
    priority_kp: [...brief.primary_kp],
    backup_kp: [...brief.secondary_kp],
    primary_intent: brief.primary_intent,
    specified_names: [],
    specified_surnames: deriveSurnames(raw),
    excluded_names: [...brief.exclude_names],
    excluded_surnames: [],
    excluded_phones: [],
    contact_types: contactTypes || deriveContactTypes(raw),
    requested_count: requestedCount,
    business_context: brief.business_context ? [brief.business_context] : [],
    clarification_required: missingFields.length > 0,
    clarification_reason: missingFields.length ? `缺少${missingFields.includes('target') && missingFields.includes('role') ? '目标主体与目标岗位' : missingFields.includes('target') ? '目标企业或项目' : '目标岗位'}` : '',
    missing_fields: missingFields,
    search_strategy: '',
  }
  request.search_strategy = buildStrategy(request)
  return request
}
