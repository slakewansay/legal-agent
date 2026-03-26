
// ==================== 案件管理（localStorage 持久化） ====================
const STORAGE_KEY = 'legal_agent_cases';
const CURRENT_KEY = 'legal_agent_current';

let allCases = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let currentCaseId = localStorage.getItem(CURRENT_KEY) || null;

function genId() { return 'case_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }

function getCurrent() { return allCases.find(c => c.id === currentCaseId) || null; }

function saveAll() { localStorage.setItem(STORAGE_KEY, JSON.stringify(allCases)); }

function newCase() {
  const c = {
    id: genId(),
    name: '新案件 ' + new Date().toLocaleDateString('zh-CN'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    complaint: {},
    defendants: [{}],
    identity: { p: {files:[]}, d: [{files:[]}] },
    evidence: [],
    analysis: {}
  };
  allCases.unshift(c);
  currentCaseId = c.id;
  localStorage.setItem(CURRENT_KEY, currentCaseId);
  saveAll();
  renderCaseList();
  loadCaseToForm(c);
  return c;
}

function loadCaseToForm(c) {
  if (!c) return;
  const f = c.complaint || {};
  setVal('p_name', f.p_name); setVal('p_id', f.p_id);
  setVal('p_phone', f.p_phone); setVal('p_address', f.p_address);
  setVal('p_agent', f.p_agent); setVal('p_agent_phone', f.p_agent_phone);
  setVal('p_legal', f.p_legal);
  if (f.p_type) document.getElementById('p_type').value = f.p_type;
  setVal('court', f.court); setVal('amount', f.amount);
  setVal('claims', f.claims); setVal('facts', f.facts);
  setVal('dispute_date', f.dispute_date);
  if (f.cause) { document.getElementById('cause').value = f.cause; }
  if (f.cause_custom) setVal('cause_custom', f.cause_custom);

  // 多被告
  defendants = c.defendants && c.defendants.length ? JSON.parse(JSON.stringify(c.defendants)) : [{}];
  renderDefendants();
  toggleFields('p');
}

function saveFormToCase() {
  const c = getCurrent();
  if (!c) return;
  c.complaint = {
    p_name: getVal('p_name'), p_id: getVal('p_id'),
    p_phone: getVal('p_phone'), p_address: getVal('p_address'),
    p_agent: getVal('p_agent'), p_agent_phone: getVal('p_agent_phone'),
    p_legal: getVal('p_legal'),
    p_type: document.getElementById('p_type').value,
    court: getVal('court'), amount: getVal('amount'),
    claims: getVal('claims'), facts: getVal('facts'),
    dispute_date: getVal('dispute_date'),
    cause: document.getElementById('cause').value,
    cause_custom: getVal('cause_custom')
  };
  c.defendants = JSON.parse(JSON.stringify(defendants));
  c.updatedAt = Date.now();
  c.name = (getVal('p_name') || '原告') + ' 诉 ' + (defendants[0] && defendants[0].name ? defendants[0].name : '被告');
  saveAll();
  renderCaseList();
}

function deleteCase(id) {
  if (!confirm('确定删除此案件？')) return;
  allCases = allCases.filter(c => c.id !== id);
  if (currentCaseId === id) {
    currentCaseId = allCases.length ? allCases[0].id : null;
    localStorage.setItem(CURRENT_KEY, currentCaseId || '');
  }
  saveAll();
  renderCaseList();
  if (currentCaseId) loadCaseToForm(getCurrent());
}

function switchCase(id) {
  saveFormToCase();
  currentCaseId = id;
  localStorage.setItem(CURRENT_KEY, id);
  loadCaseToForm(getCurrent());
  renderCaseList();
  closeCaseDrawer();
}

function renderCaseList() {
  const el = document.getElementById('case-list-items');
  if (!el) return;
  if (allCases.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:#aaa;padding:24px 0;font-size:13px">暂无案件<br>点击上方"新建案件"开始</div>';
    return;
  }
  el.innerHTML = allCases.map(c => `
    <div class="case-item ${c.id === currentCaseId ? 'active' : ''}" onclick="switchCase('${c.id}')">
      <div class="case-item-name">${escHtml(c.name || '未命名案件')}</div>
      <div class="case-item-meta">${new Date(c.updatedAt).toLocaleDateString('zh-CN')}</div>
      <button class="case-item-del" onclick="event.stopPropagation();deleteCase('${c.id}')" title="删除">✕</button>
    </div>`).join('');
}

function openCaseDrawer() { document.getElementById('case-drawer').classList.add('open'); }
function closeCaseDrawer() { document.getElementById('case-drawer').classList.remove('open'); }

// 自动保存（输入时防抖保存）
let saveTimer = null;
function autoSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveFormToCase, 800);
}

// ==================== 多被告 ====================
let defendants = [{}];

function renderDefendants() {
  const container = document.getElementById('defendants-container');
  container.innerHTML = defendants.map((d, idx) => `
    <div class="defendant-card" id="def-card-${idx}">
      <div class="defendant-header">
        <span class="defendant-label">被告 ${idx + 1}</span>
        ${defendants.length > 1 ? `<button class="btn btn-sm btn-danger-soft" onclick="removeDefendant(${idx})">✕ 删除</button>` : ''}
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>姓名 / 单位名称 <span class="required">*</span></label>
          <input type="text" value="${escAttr(d.name||'')}" placeholder="例：李四 / 某某公司"
            oninput="defendants[${idx}].name=this.value;autoSave()">
        </div>
        <div class="form-group">
          <label>被告类型</label>
          <select onchange="defendants[${idx}].type=this.value;toggleDefFields(${idx});autoSave()">
            <option value="natural" ${(!d.type||d.type==='natural')?'selected':''}>自然人</option>
            <option value="company" ${d.type==='company'?'selected':''}>法人 / 单位</option>
          </select>
        </div>
        <div class="form-group" id="def-id-group-${idx}" ${d.type==='company'?'style="display:none"':''}>
          <label>身份证号码</label>
          <input type="text" value="${escAttr(d.idNum||'')}" placeholder="如知道请填写"
            oninput="defendants[${idx}].idNum=this.value;autoSave()">
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input type="text" value="${escAttr(d.phone||'')}" placeholder=""
            oninput="defendants[${idx}].phone=this.value;autoSave()">
        </div>
        <div class="form-group span-2">
          <label>住所地 / 注册地址 <span class="required">*</span></label>
          <input type="text" value="${escAttr(d.address||'')}" placeholder="详细地址"
            oninput="defendants[${idx}].address=this.value;autoSave()">
        </div>
        <div class="form-group" id="def-legal-group-${idx}" ${d.type!=='company'?'style="display:none"':''}>
          <label>法定代表人</label>
          <input type="text" value="${escAttr(d.legal||'')}" placeholder=""
            oninput="defendants[${idx}].legal=this.value;autoSave()">
        </div>
      </div>
    </div>`).join('');
}

function addDefendant() {
  defendants.push({});
  renderDefendants();
}

function removeDefendant(idx) {
  defendants.splice(idx, 1);
  renderDefendants();
  autoSave();
}

function toggleDefFields(idx) {
  const d = defendants[idx];
  const isCompany = d.type === 'company';
  const idGrp = document.getElementById('def-id-group-' + idx);
  const legalGrp = document.getElementById('def-legal-group-' + idx);
  if (idGrp) idGrp.style.display = isCompany ? 'none' : '';
  if (legalGrp) legalGrp.style.display = isCompany ? '' : 'none';
}

// ==================== 导航 ====================
const PANELS = ['panel-complaint','panel-identity','panel-evidence','panel-analysis'];
const stepDone = [false, false, false, false];

function switchPanel(id) {
  PANELS.forEach((p, i) => {
    document.getElementById(p).classList.toggle('active', p === id);
    const nav = document.getElementById('nav-' + (i+1));
    if (nav) nav.classList.toggle('active', p === id);
    const top = document.getElementById('ttab-' + (i+1));
    if (top) {
      top.classList.toggle('ttab-active', p === id);
    }
  });
  updateProgressBar();
}

function updateProgressBar() {
  for (let i = 1; i <= 4; i++) {
    const step = document.getElementById('progress-step-' + i);
    if (!step) continue;
    const active = document.getElementById(PANELS[i-1]).classList.contains('active');
    step.classList.toggle('ps-active', active);
    step.classList.toggle('ps-done', stepDone[i-1] && !active);
  }
}

function nextStep(n) {
  stepDone[n-2] = true;
  switchPanel(PANELS[n-1]);
}

// ==================== 表单工具 ====================
function getVal(id) { const el=document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el=document.getElementById(id); if(el && v!==undefined) el.value = v||''; }

function toggleFields(role) {
  const type = document.getElementById(role+'_type').value;
  const isCompany = type === 'company';
  const idGroup = document.getElementById(role+'_id_group');
  const legalGroup = document.getElementById(role+'_legal_group');
  if (idGroup) idGroup.style.display = isCompany ? 'none' : '';
  if (legalGroup) legalGroup.style.display = isCompany ? '' : 'none';
}

function clearForm() {
  if (!confirm('确定要清空所有已填写的信息吗？')) return;
  document.querySelectorAll('#panel-complaint input[type="text"], #panel-complaint input[type="date"], #panel-complaint textarea').forEach(el => el.value = '');
  defendants = [{}];
  renderDefendants();
  document.getElementById('complaint-preview-card').style.display = 'none';
  autoSave();
}

// ==================== AI 辅助填写 ====================
function showAiModal() {
  document.getElementById('ai-modal').classList.add('open');
  document.getElementById('ai-input').focus();
}
function closeAiModal() { document.getElementById('ai-modal').classList.remove('open'); }

function aiAssist() {
  const desc = document.getElementById('ai-input').value.trim();
  if (!desc) { alert('请先输入案情描述'); return; }

  const btn = document.getElementById('ai-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 分析中...';

  setTimeout(() => {
    const result = generateAiContent(desc);
    document.getElementById('ai-result-claims').value = result.claims;
    document.getElementById('ai-result-facts').value = result.facts;
    document.getElementById('ai-result-cause').value = result.cause;
    document.getElementById('ai-result-area').style.display = 'block';
    document.getElementById('apply-ai-btn').style.display = 'inline-flex';
    btn.disabled = false;
    btn.innerHTML = '✨ AI 智能分析';
  }, 1200);
}

function applyAiResult() {
  const claims = document.getElementById('ai-result-claims').value;
  const facts = document.getElementById('ai-result-facts').value;
  const cause = document.getElementById('ai-result-cause').value;
  if (claims) setVal('claims', claims);
  if (facts) setVal('facts', facts);
  if (cause) {
    const sel = document.getElementById('cause');
    let found = false;
    for (let opt of sel.options) { if (opt.value === cause) { sel.value = cause; found = true; break; } }
    if (!found) { sel.value = '自定义'; setVal('cause_custom', cause); document.getElementById('cause_custom_group').style.display = ''; }
  }
  closeAiModal();
  document.getElementById('ai-result-area').style.display = 'none';
  document.getElementById('apply-ai-btn').style.display = 'none';
  document.getElementById('ai-input').value = '';
  autoSave();
  showToast('AI 内容已应用到表单', 'success');
}

function generateAiContent(desc) {
  const d = desc.toLowerCase();
  let cause = '民间借贷纠纷', claims = '', facts = '';

  if (d.includes('借款') || d.includes('借钱') || d.includes('欠款') || d.includes('还款')) {
    cause = '民间借贷纠纷';
    const amtMatch = desc.match(/(\d+[\d,，]*)\s*(?:万|元)/);
    const amt = amtMatch ? amtMatch[0].replace(/[,，]/g,'') : 'XXXXX元';
    claims = `一、请求判令被告偿还借款本金${amt}整；\n二、请求判令被告支付自${new Date().getFullYear()-1}年起至实际还清之日止的利息（按全国银行间同业拆借中心公布的贷款市场报价利率计算）；\n三、本案诉讼费用由被告承担。`;
    facts = `原被告系朋友/同事关系。${new Date().getFullYear()-1}年，被告以资金周转困难为由，向原告借款${amt}，双方签订了借款协议/出具借条（或通过微信/银行转账方式确认），明确约定了还款日期。\n\n原告按约定将款项转账至被告指定账户，被告亦予以确认收款。\n\n借款到期后，原告多次催告被告还款，被告以各种理由拒绝偿还，至今仍欠原告借款${amt}未还。\n\n原告为维护自身合法权益，特依法提起诉讼，请求人民法院依法判决。`;
  } else if (d.includes('合同') || d.includes('买卖') || d.includes('货款') || d.includes('违约')) {
    cause = '买卖合同纠纷';
    claims = `一、请求判令被告支付货款/服务费人民币XXXXX元整；\n二、请求判令被告支付违约金（按合同约定计算）；\n三、本案诉讼费由被告承担。`;
    facts = `原被告于${new Date().getFullYear()-1}年签订买卖合同/服务合同，合同约定原告向被告提供货物/服务，被告按期支付款项。\n\n原告依约全面履行了合同义务，被告亦签收了货物/确认了服务完成。\n\n然而，合同约定的付款期限届满后，被告拒不按约支付款项，经原告多次催告，被告仍未履行付款义务，严重损害了原告的合法权益。`;
  } else if (d.includes('劳动') || d.includes('工资') || d.includes('裁员') || d.includes('辞退')) {
    cause = '劳动合同纠纷';
    claims = `一、请求裁决被告支付拖欠工资人民币XXXXX元整；\n二、请求裁决被告支付经济补偿金人民币XXXXX元整；\n三、请求裁决被告支付违法解除劳动合同赔偿金。`;
    facts = `原告自${new Date().getFullYear()-2}年起在被告处工作，双方签订了劳动合同，约定原告担任XXX职位，月薪XXXX元。\n\n${new Date().getFullYear()-1}年，被告在未提前通知、未依法支付经济补偿金的情况下，违法解除与原告的劳动合同，且至今拖欠原告工资XXXXX元。\n\n原告依法申请劳动仲裁，仲裁委员会作出裁决，但被告对裁决不服/不履行，原告特提起本次诉讼。`;
  } else if (d.includes('离婚') || d.includes('婚姻') || d.includes('夫妻')) {
    cause = '离婚纠纷';
    claims = `一、请求判令准予原被告离婚；\n二、请求判令婚生子女由原告抚养，被告每月支付抚养费人民币XXXX元；\n三、请求依法分割夫妻共同财产；\n四、本案诉讼费用由被告承担。`;
    facts = `原被告于XXXX年XX月登记结婚，婚后育有子女X名。\n\n婚后双方因性格不合/感情破裂，经常发生矛盾纠纷，夫妻感情已彻底破裂，已分居生活达XXX月之久。\n\n原告曾向被告提出离婚请求，被告不同意。双方确无和好可能，夫妻感情已彻底破裂，故原告特提起本次诉讼。`;
  } else {
    cause = '侵权责任纠纷';
    claims = `一、请求判令被告赔偿原告损失人民币XXXXX元整；\n二、请求判令被告承担本案诉讼费用。`;
    facts = `${desc}\n\n上述行为给原告造成了严重损失，为维护原告合法权益，特提起本次诉讼，请求人民法院依法判决。`;
  }

  return { cause, claims, facts };
}

// ==================== 起诉状生成 ====================
function generateComplaint() {
  const pName = getVal('p_name').trim();
  const court = getVal('court').trim();
  const claims = getVal('claims').trim();
  const facts = getVal('facts').trim();
  if (!pName) { showToast('请填写原告姓名/单位名称', 'warn'); return; }
  if (!defendants[0] || !defendants[0].name) { showToast('请填写被告姓名/单位名称', 'warn'); return; }
  if (!court) { showToast('请填写管辖法院', 'warn'); return; }
  if (!claims) { showToast('请填写诉讼请求', 'warn'); return; }
  if (!facts) { showToast('请填写事实与理由', 'warn'); return; }

  const causeSelect = document.getElementById('cause');
  let cause = causeSelect.value === '自定义' ? getVal('cause_custom').trim() : causeSelect.value;
  if (!cause) { showToast('请选择或填写案由', 'warn'); return; }

  const pType = document.getElementById('p_type').value;
  const pId = getVal('p_id'), pPhone = getVal('p_phone'), pAddress = getVal('p_address');
  const pAgent = getVal('p_agent'), pAgentPhone = getVal('p_agent_phone'), pLegal = getVal('p_legal');
  const amount = getVal('amount');
  const today = new Date().toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric'});

  const claimLines = claims.split('\n').filter(l=>l.trim()).map((l,i)=>{
    if (/^\d+[.、]/.test(l.trim())) return '        ' + l.trim();
    return '        ' + (i+1) + '. ' + l.trim();
  }).join('\n');

  const factsFormatted = facts.split('\n').map(l => '        ' + l).join('\n');

  let pInfo = pType === 'natural'
    ? `原告：${pName}${pId?`，身份证号：${pId}`:''}${pAddress?`\n住所：${pAddress}`:''}${pPhone?`\n联系电话：${pPhone}`:''}`
    : `原告：${pName}（${pLegal?`法定代表人：${pLegal}，`:''}住所：${pAddress||'—'}）${pPhone?`\n联系电话：${pPhone}`:''}`;
  if (pAgent) pInfo += `\n委托代理人：${pAgent}${pAgentPhone?`，联系方式：${pAgentPhone}`:''}`;

  const defInfos = defendants.map((d, i) => {
    if (!d.name) return '';
    const prefix = defendants.length > 1 ? `被告${i+1}` : '被告';
    if (!d.type || d.type === 'natural') {
      return `${prefix}：${d.name}${d.idNum?`，身份证号：${d.idNum}`:''}${d.address?`\n住所：${d.address}`:''}${d.phone?`\n联系电话：${d.phone}`:''}`;
    } else {
      return `${prefix}：${d.name}（${d.legal?`法定代表人：${d.legal}，`:''}住所：${d.address||'—'}）${d.phone?`\n联系电话：${d.phone}`:''}`;
    }
  }).filter(Boolean).join('\n\n');

  const amountLine = amount ? `\n        诉讼标的额：人民币 ${Number(amount).toLocaleString()} 元整\n` : '';
  const dNameAll = defendants.filter(d=>d.name).map(d=>d.name).join('、');

  const text = `起  诉  状\n\n${court}\n\n${pInfo}\n\n${defInfos}\n\n        案由：${cause}${amountLine}\n\n        诉讼请求：\n${claimLines}\n\n        事实与理由：\n${factsFormatted}\n\n        综上所述，为维护原告合法权益，特依据《中华人民共和国民事诉讼法》及相关法律法规，向贵院提起诉讼，恳请贵院依法公正裁判，支持原告的全部诉讼请求。\n\n        此致\n${court}\n\n附：\n        1. 本起诉状副本 _____ 份\n        2. 证据材料清单（见附件）\n        3. 原告身份证明文件\n\n原告：${pName}（签名/盖章）\n\n                                                          ${today}`;

  const previewEl = document.getElementById('complaint-preview');
  previewEl.innerHTML = '<div class="watermark">起诉状草稿</div>' + escHtml(text).replace(/\n/g,'<br>');
  document.getElementById('complaint-preview-card').style.display = 'block';
  previewEl.scrollIntoView({ behavior:'smooth', block:'start' });

  stepDone[0] = true;
  updateProgressBar();
  saveFormToCase();
  showToast('起诉状生成成功', 'success');
}

function printComplaint() {
  const text = document.getElementById('complaint-preview').innerText.replace('起诉状草稿','');
  const win = window.open('','_blank');
  win.document.write(`<html><head><title>起诉状</title><style>body{font-family:SimSun,serif;font-size:14pt;line-height:2.2;padding:60px 80px;color:#000}@media print{body{padding:20mm 25mm}}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit">${text}</pre><script>window.onload=()=>window.print()<\/script></body></html>`);
}

function copyComplaint() {
  const text = document.getElementById('complaint-preview').innerText.replace('起诉状草稿','');
  navigator.clipboard.writeText(text).then(()=>showToast('已复制到剪贴板', 'success'));
}

// ==================== 身份信息 ====================
const idFiles = { p: [], d: [] };

function handleFileSelect(event, role) { Array.from(event.target.files).forEach(f=>addIdFile(role,f)); }
function handleDrop(event, role) {
  event.preventDefault(); dragLeave('upload-'+role);
  Array.from(event.dataTransfer.files).forEach(f=>addIdFile(role,f));
}
function addIdFile(role, file) {
  idFiles[role].push(file);
  renderIdFiles(role);
  document.getElementById('badge-'+role).textContent = idFiles[role].length;
  setTimeout(()=>syncFromStep1(role), 600);
}
function renderIdFiles(role) {
  const c = document.getElementById('file-list-'+role);
  c.innerHTML = idFiles[role].map((f,i)=>`<div class="file-item"><span class="file-icon">${getFileIcon(f.name)}</span><span class="file-name">${escHtml(f.name)}</span><span class="file-meta">${formatSize(f.size)}</span><button class="remove-btn" onclick="removeIdFile('${role}',${i})">✕</button></div>`).join('');
}
function removeIdFile(role, idx) {
  idFiles[role].splice(idx,1); renderIdFiles(role);
  document.getElementById('badge-'+role).textContent = idFiles[role].length;
}
function syncFromStep1(role) {
  const pre = role==='p' ? 'p_' : '';
  if (role==='p') {
    const n=getVal('p_name'), a=getVal('p_address'), id=getVal('p_id');
    if(n) setVal('id_p_name',n); if(a) setVal('id_p_addr',a); if(id) setVal('id_p_number',id);
  } else {
    const d=defendants[0]||{};
    if(d.name) setVal('id_d_name',d.name); if(d.address) setVal('id_d_addr',d.address); if(d.idNum) setVal('id_d_number',d.idNum);
  }
}
function generateIdDoc() {
  const pName=getVal('id_p_name')||getVal('p_name')||'（未填写）';
  const pType=document.getElementById('id_p_type').value, pNum=getVal('id_p_number')||'（未填写）';
  const pBirth=getVal('id_p_birth')||'（未填写）', pAddr=getVal('id_p_addr')||getVal('p_address')||'（未填写）';
  const pNation=getVal('id_p_nation'), pTel=getVal('id_p_tel');
  const dName=getVal('id_d_name')||(defendants[0]&&defendants[0].name)||'（未填写）';
  const dType=document.getElementById('id_d_type').value, dNum=getVal('id_d_number')||'（未填写）';
  const dBirth=getVal('id_d_birth')||'（未填写）', dAddr=getVal('id_d_addr')||(defendants[0]&&defendants[0].address)||'（未填写）';
  const dNation=getVal('id_d_nation'), dTel=getVal('id_d_tel');
  const court=getVal('court')||'（法院名称）', today=new Date().toLocaleDateString('zh-CN');
  const cause=document.getElementById('cause').value||'';

  const doc=`当 事 人 信 息 确 认 书\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n案件：${cause}   受理法院：${court}\n制作日期：${today}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n【原告信息】\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n姓名 / 名称：${pName}\n证件类型：${pType}\n证件号码：${pNum}\n出生日期：${pBirth}\n住所地址：${pAddr}${pNation?'\n民族：'+pNation:''}${pTel?'\n联系方式：'+pTel:''}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n【被告信息】\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n姓名 / 名称：${dName}\n证件类型：${dType}\n证件号码：${dNum}\n出生日期：${dBirth}\n住所地址：${dAddr}${dNation?'\n民族：'+dNation:''}${dTel?'\n联系方式：'+dTel:''}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n特别提示：\n1. 请核对以上信息是否与证件原件一致；\n2. 如信息有误，请返回上一步修改后重新生成；\n3. 本文件需随起诉材料一并提交法院。\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n原告确认签名：________________    日期：__________\n被告确认签名：________________    日期：__________`;

  document.getElementById('id-doc-preview').innerHTML = escHtml(doc).replace(/\n/g,'<br>');
  stepDone[1]=true; updateProgressBar();
  showToast('身份信息文件生成成功','success');
}
function printIdDoc() {
  const text=document.getElementById('id-doc-preview').innerText;
  const win=window.open('','_blank');
  win.document.write(`<html><head><title>当事人信息确认书</title><style>body{font-family:SimSun,serif;font-size:13pt;line-height:2;padding:50px 70px}@media print{body{padding:20mm 25mm}}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit">${text}</pre><script>window.onload=()=>window.print()<\/script></body></html>`);
}

// ==================== 证据清单 ====================
let evidenceRows = [];

function handleEvSelect(event) { processEvFiles(Array.from(event.target.files)); event.target.value=''; }
function handleEvDrop(event) {
  event.preventDefault(); dragLeave('upload-ev');
  processEvFiles(Array.from(event.dataTransfer.files));
}

async function processEvFiles(files) {
  if (!files.length) return;
  const uploadList = document.getElementById('ev-upload-list');
  for (const file of files) {
    const itemId = 'ev-item-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const itemEl = document.createElement('div');
    itemEl.id = itemId; itemEl.className = 'file-item';
    itemEl.innerHTML = `<span class="file-icon">${getFileIcon(file.name)}</span><span class="file-name">${escHtml(file.name)}</span><span class="file-meta">${formatSize(file.size)}</span><span class="file-pages ev-identifying" id="${itemId}-pages">识别中…</span>`;
    uploadList.appendChild(itemEl);
    try {
      const pages = await detectPages(file);
      document.getElementById(itemId+'-pages').textContent = pages+' 页';
      document.getElementById(itemId+'-pages').className = 'file-pages';
      evidenceRows.push({ name:file.name.replace(/\.[^.]+$/,''), category:guessCategory(file.name), pages, copies:1, copyType:'复印件', purpose:'', remark:'' });
      recalcPageRanges(); renderEvidenceTable();
    } catch(e) { document.getElementById(itemId+'-pages').textContent='?页'; }
  }
  stepDone[2]=true; updateProgressBar();
}

function detectPages(file) {
  return new Promise(resolve => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext==='pdf') {
      const reader=new FileReader();
      reader.onload=function(e){
        try {
          const text=new Uint8Array(e.target.result);
          let str=''; const sample=text.slice(0,Math.min(text.length,200000));
          for(let i=0;i<sample.length;i++) str+=String.fromCharCode(sample[i]);
          const matches=str.match(/\/Type\s*\/Page[^s]/g);
          if(matches&&matches.length>0){resolve(matches.length);return;}
          const countMatch=str.match(/\/Count\s+(\d+)/);
          if(countMatch){resolve(parseInt(countMatch[1]));return;}
          resolve(estimatePagesBySize(file));
        } catch{resolve(estimatePagesBySize(file));}
      };
      reader.onerror=()=>resolve(estimatePagesBySize(file));
      reader.readAsArrayBuffer(file);
    } else {
      setTimeout(()=>resolve(estimatePagesBySize(file)), 200+Math.random()*300);
    }
  });
}

function estimatePagesBySize(file) {
  const sz=file.size/1024/1024, ext=file.name.split('.').pop().toLowerCase();
  if(['jpg','jpeg','png','gif','bmp','webp'].includes(ext)) return 1;
  if(['docx','doc'].includes(ext)) return Math.max(1,Math.round(sz*18+Math.random()*4));
  if(['xlsx','xls'].includes(ext)) return Math.max(1,Math.round(sz*6+1));
  return Math.max(1,Math.round(sz*8+Math.random()*4+1));
}

function guessCategory(name) {
  const n=name.toLowerCase();
  if(n.includes('合同')||n.includes('协议')) return '书证';
  if(n.includes('转账')||n.includes('银行')||n.includes('收据')||n.includes('发票')) return '书证';
  if(/\.(jpg|jpeg|png|gif)$/i.test(n)||n.includes('照片')||n.includes('图片')) return '视听资料';
  if(n.includes('录音')||n.includes('录像')||/\.(mp4|mp3|avi)$/i.test(n)) return '视听资料';
  if(n.includes('证明')||n.includes('鉴定')) return '鉴定意见';
  if(n.includes('证人')||n.includes('证词')) return '证人证言';
  return '书证';
}

function recalcPageRanges() {
  let cursor=1;
  evidenceRows.forEach(row=>{ const p=parseInt(row.pages)||1; row.pageStart=cursor; row.pageEnd=cursor+p-1; cursor+=p; });
  const total=cursor-1;
  const el=document.getElementById('ev-page-total');
  if(el) el.textContent=evidenceRows.length>0?`共 ${evidenceRows.length} 份 · 合计 ${total} 页`:'';
}

const EV_CATEGORIES=['书证','物证','视听资料','证人证言','当事人陈述','鉴定意见','勘验笔录'];
const EV_COPY_TYPES=['复印件','原件','原件+复印件'];

function renderEvidenceTable() {
  recalcPageRanges();
  const tbody=document.getElementById('evidence-tbody');
  if(evidenceRows.length===0){
    tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;color:#aaa;padding:28px 0">暂无证据 — 请上传文件或手动添加</td></tr>`;
    document.getElementById('ev-page-total').textContent=''; return;
  }
  tbody.innerHTML=evidenceRows.map((row,idx)=>{
    const catOpts=EV_CATEGORIES.map(c=>`<option value="${c}" ${row.category===c?'selected':''}>${c}</option>`).join('');
    const copyOpts=EV_COPY_TYPES.map(c=>`<option value="${c}" ${row.copyType===c?'selected':''}>${c}</option>`).join('');
    const pageRange=row.pages>0?`<span class="page-range-badge">${row.pageStart}—${row.pageEnd}</span>`:'—';
    return `<tr id="ev-row-${idx}" draggable="true" ondragstart="evDragStart(event,${idx})" ondragover="evDragOver(event,${idx})" ondrop="evDrop(event,${idx})" ondragleave="evDragLeave(event,${idx})">
      <td style="text-align:center;font-weight:700;color:var(--primary)">${idx+1}</td>
      <td><input type="text" value="${escAttr(row.name)}" placeholder="请填写证据名称" style="width:100%;min-width:130px" oninput="evidenceRows[${idx}].name=this.value"></td>
      <td><select onchange="evidenceRows[${idx}].category=this.value">${catOpts}</select></td>
      <td style="text-align:center"><input type="number" min="1" value="${row.pages}" style="width:52px;text-align:center" onchange="evidenceRows[${idx}].pages=Math.max(1,parseInt(this.value)||1);renderEvidenceTable()"></td>
      <td style="text-align:center">${pageRange}</td>
      <td style="text-align:center"><input type="number" min="1" value="${row.copies}" style="width:44px;text-align:center" onchange="evidenceRows[${idx}].copies=Math.max(1,parseInt(this.value)||1)"></td>
      <td><select onchange="evidenceRows[${idx}].copyType=this.value">${copyOpts}</select></td>
      <td><input type="text" value="${escAttr(row.purpose)}" placeholder="简要说明" oninput="evidenceRows[${idx}].purpose=this.value"></td>
      <td><input type="text" value="${escAttr(row.remark)}" placeholder="" oninput="evidenceRows[${idx}].remark=this.value"></td>
      <td style="text-align:center;white-space:nowrap">
        <button title="上移" onclick="evMoveRow(${idx},-1)" class="ev-act-btn" ${idx===0?'disabled':''}>▲</button>
        <button title="下移" onclick="evMoveRow(${idx},1)" class="ev-act-btn" ${idx===evidenceRows.length-1?'disabled':''}>▼</button>
        <button title="删除" onclick="removeEvidenceRow(${idx})" class="ev-act-btn ev-del-btn">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function addEvidenceRowManual() {
  evidenceRows.push({name:'',category:'书证',pages:1,copies:1,copyType:'复印件',purpose:'',remark:''});
  renderEvidenceTable();
  setTimeout(()=>{ const inputs=document.querySelectorAll('#evidence-tbody input[type="text"]'); if(inputs.length) inputs[inputs.length-5].focus(); }, 50);
}
function removeEvidenceRow(idx){ evidenceRows.splice(idx,1); renderEvidenceTable(); }
function evMoveRow(idx,dir){ const n=idx+dir; if(n<0||n>=evidenceRows.length)return; [evidenceRows[idx],evidenceRows[n]]=[evidenceRows[n],evidenceRows[idx]]; renderEvidenceTable(); }

let evDragSrcIdx=null;
function evDragStart(e,idx){ evDragSrcIdx=idx; e.dataTransfer.effectAllowed='move'; }
function evDragOver(e,idx){ e.preventDefault(); document.querySelectorAll('#evidence-tbody tr').forEach(r=>r.style.outline=''); const row=document.getElementById('ev-row-'+idx); if(row) row.style.outline='2px solid var(--accent)'; }
function evDragLeave(e,idx){ const row=document.getElementById('ev-row-'+idx); if(row) row.style.outline=''; }
function evDrop(e,idx){ e.preventDefault(); document.querySelectorAll('#evidence-tbody tr').forEach(r=>r.style.outline=''); if(evDragSrcIdx===null||evDragSrcIdx===idx)return; const moved=evidenceRows.splice(evDragSrcIdx,1)[0]; evidenceRows.splice(idx,0,moved); evDragSrcIdx=null; renderEvidenceTable(); }

function exportExcel() {
  if(!evidenceRows.length){showToast('证据清单为空，请先上传证据文件','warn');return;}
  recalcPageRanges();
  const pName=getVal('p_name')||'原告', dName=(defendants[0]&&defendants[0].name)||'被告';
  const court=getVal('court')||'', cause=document.getElementById('cause').value||'';
  const today=new Date().toLocaleDateString('zh-CN');
  const BOM='\uFEFF';
  const headers=['序号','证据名称','证据类型','页数','页码范围','份数','原件/复印件','证明目的','备注'];
  const dataRows=evidenceRows.map((r,i)=>[i+1,r.name,r.category,r.pages,`第${r.pageStart}—${r.pageEnd}页`,r.copies,r.copyType,r.purpose,r.remark].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(','));
  const totalPages=evidenceRows.reduce((s,r)=>s+Number(r.pages),0);
  const totalCopies=evidenceRows.reduce((s,r)=>s+Number(r.copies),0);
  const csv=BOM+`"证  据  清  单"\n"案由：${cause}","","","","管辖法院：${court}"\n"原告：${pName}","","","","被告：${dName}"\n"制作日期：${today}"\n\n`+headers.map(h=>`"${h}"`).join(',')+'\n'+dataRows.join('\n')+'\n'+`"合计","","",${totalPages},"","${totalCopies}","","",""\n\n"注：本证据清单共 ${evidenceRows.length} 份，共 ${totalPages} 页"`;
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`证据清单_${pName}诉${dName}_${today.replace(/\//g,'-')}.csv`; a.click();
  showToast('Excel 证据清单已下载','success');
}

function exportEvidencePDF() {
  if(!evidenceRows.length){showToast('证据清单为空，请先上传证据文件','warn');return;}
  recalcPageRanges();
  const pName=getVal('p_name')||'原告', dName=(defendants[0]&&defendants[0].name)||'被告';
  const court=getVal('court')||'', cause=document.getElementById('cause').value||'', today=new Date().toLocaleDateString('zh-CN');
  const totalPages=evidenceRows.reduce((s,r)=>s+Number(r.pages),0), totalCopies=evidenceRows.reduce((s,r)=>s+Number(r.copies),0);
  const rows=evidenceRows.map((r,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${r.name||'—'}</td><td>${r.category}</td><td style="text-align:center">${r.pages}</td><td style="text-align:center;color:#1a3a6b;font-weight:600">第${r.pageStart}—${r.pageEnd}页</td><td style="text-align:center">${r.copies}</td><td>${r.copyType}</td><td>${r.purpose||''}</td><td>${r.remark||''}</td></tr>`).join('');
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>证据清单</title><style>body{font-family:'Microsoft YaHei',SimHei,sans-serif;font-size:11pt;padding:30px;color:#111}h2{text-align:center;font-size:16pt;letter-spacing:4px;margin-bottom:6px}.meta{text-align:center;font-size:10pt;color:#555;margin-bottom:16px;line-height:1.8}table{width:100%;border-collapse:collapse;font-size:10pt}th,td{border:1px solid #666;padding:6px 8px;vertical-align:middle}th{background:#1a3a6b;color:white;text-align:center}tr:nth-child(even) td{background:#f5f7ff}.foot{margin-top:14px;font-size:10pt;color:#333;line-height:2}.sign{margin-top:30px;font-size:10pt;display:flex;justify-content:space-between}@media print{body{padding:12mm 18mm}}</style></head><body><h2>证 据 清 单</h2><div class="meta">案由：${cause} &emsp; 管辖法院：${court}<br>原告：${pName} &emsp; 被告：${dName} &emsp; 制作日期：${today}</div><table><thead><tr><th style="width:40px">序号</th><th>证据名称</th><th style="width:72px">证据类型</th><th style="width:52px">页数</th><th style="width:88px">页码范围</th><th style="width:44px">份数</th><th style="width:88px">原件/复印件</th><th>证明目的</th><th style="width:64px">备注</th></tr></thead><tbody>${rows}<tr style="font-weight:bold;background:#dbe4f7"><td colspan="3" style="text-align:center">合计</td><td style="text-align:center">${totalPages}</td><td style="text-align:center;color:#1a3a6b">第1—${totalPages}页</td><td style="text-align:center">${totalCopies}</td><td colspan="3"></td></tr></tbody></table><div class="foot">共 <strong>${evidenceRows.length}</strong> 份证据，合计 <strong>${totalPages}</strong> 页</div><div class="sign"><span>制作人（原告/代理人）：________________</span><span>日期：__________</span></div><script>window.onload=()=>window.print()<\/script></body></html>`);
}

// ==================== 案件检索 ====================
const sampleCases=[
  {title:'张某诉李某民间借贷纠纷案',court:'北京市朝阳区人民法院',year:'2024',result:'win',amount:'28万元',summary:'法院认定双方借款事实清楚，有借条及转账记录为证，判决被告偿还借款本金及利息。原告一审胜诉。',points:['借条+转账记录构成完整证据链','利息约定未超法定上限','借款时间明确']},
  {title:'王公司诉赵某买卖合同纠纷',court:'上海市浦东新区人民法院',year:'2024',result:'win',amount:'65万元',summary:'原告提交了完整的合同文本、货物签收单及对账单，法院支持原告货款请求及违约金。',points:['书面合同约定明确','交货凭证齐全','违约金条款合法有效']},
  {title:'刘某诉某公司劳动合同纠纷',court:'广州市天河区人民法院',year:'2023',result:'settle',amount:'8.5万元',summary:'双方在庭前调解阶段达成和解协议，公司支付刘某经济补偿金及工资差额共8.5万元，调解结案。',points:['劳动关系认定存争议','双方均有和解意愿','调解节约时间成本']},
  {title:'陈某诉孙某借款合同纠纷',court:'杭州市西湖区人民法院',year:'2023',result:'lose',amount:'15万元',summary:'原告未能提供充分证据证明实际出借金额，仅有银行流水但缺少借款合意证明，法院驳回诉讼请求。',points:['缺乏书面借据','无法证明款项性质为借款','证据链不完整']},
  {title:'某贸易公司诉某科技公司合同违约纠纷',court:'北京市海淀区人民法院',year:'2024',result:'win',amount:'120万元',summary:'被告违反合同约定未按期交付货物，原告提交了合同、付款凭证及催告函，获得赔偿。',points:['合同条款清晰','付款凭证与合同一一对应','催告函固定违约证据']}
];

function autoFillSearch() {
  const cause=document.getElementById('cause').value;
  if(cause&&cause!=='自定义') setVal('search_cause',cause);
  const facts=getVal('facts');
  if(facts) setVal('search_fact',facts.substring(0,30).replace(/\n/g,' '));
}

function searchCases() {
  const cause=getVal('search_cause').trim();
  if(!cause){showToast('请输入案由关键词','warn');return;}
  const resultsDiv=document.getElementById('search-results');
  document.getElementById('case-list').innerHTML='<div class="status-bar loading"><div class="spinner"></div> 正在检索相关案件...</div>';
  resultsDiv.style.display='block';
  setTimeout(()=>{
    let matched=sampleCases;
    const win=matched.filter(c=>c.result==='win').length;
    const lose=matched.filter(c=>c.result==='lose').length;
    const settle=matched.filter(c=>c.result==='settle').length;
    const rate=matched.length>0?Math.round(win/matched.length*100):0;
    document.getElementById('result-count').textContent=matched.length;
    document.getElementById('stat-win').textContent=win;
    document.getElementById('stat-lose').textContent=lose;
    document.getElementById('stat-settle').textContent=settle;
    document.getElementById('stat-rate').textContent=rate+'%';
    document.getElementById('case-list').innerHTML=matched.map(c=>`<div class="analysis-card"><div class="case-title">${escHtml(c.title)}</div><div class="case-meta"><span>🏛️ ${c.court}</span><span>📅 ${c.year}</span><span>💰 ${c.amount}</span><span>${c.result==='win'?'<span class="tag tag-win">原告胜诉</span>':c.result==='lose'?'<span class="tag tag-lose">原告败诉</span>':'<span class="tag tag-settle">调解/撤诉</span>'}</span></div><div class="case-summary">${c.summary}</div>${c.points?`<div style="margin-top:8px;font-size:12px;color:#555"><strong>关键因素：</strong>${c.points.map(p=>`<span style="display:inline-block;background:#f0f4ff;padding:2px 8px;border-radius:4px;margin:2px">${p}</span>`).join('')}</div>`:''}</div>`).join('');
    generateStrategy(cause,win,lose,settle,rate);
    document.getElementById('analysis-summary').style.display='flex';
    document.getElementById('analysis-summary').innerHTML=`📊 共检索到 <strong>${matched.length}</strong> 件类似案例，同类案件原告胜诉率约 <strong>${rate}%</strong>。`;
    stepDone[3]=true; updateProgressBar();
  },1500);
}

function generateStrategy(cause,win,lose,settle,rate) {
  const high=rate>=70,med=rate>=40&&rate<70;
  const base=high?`根据检索结果，同类<strong>${cause}</strong>案件原告胜诉率较高（${rate}%），诉讼前景相对乐观。`:med?`根据检索结果，同类<strong>${cause}</strong>案件胜诉率中等（${rate}%），需充分准备证据。`:`根据检索结果，同类<strong>${cause}</strong>案件胜诉率偏低（${rate}%），建议审慎评估诉讼策略。`;
  document.getElementById('strategy-advice').innerHTML=`<p>${base}</p><br><p><strong>📌 证据准备建议：</strong></p><ul style="margin:8px 0 0 20px;line-height:2"><li>确保提交<strong>书面合同、协议</strong>原件或经公证的复印件</li><li>收集<strong>转账记录、银行流水</strong>作为资金往来证明</li><li>保存<strong>往来短信、微信聊天记录</strong>截图并做公证或时间戳处理</li><li>如有目击者，可准备<strong>证人证言</strong>配合其他证据</li><li>涉及违约的，应有<strong>催告函件</strong>（以挂号信或公证送达方式）</li></ul><br><p><strong>⚖️ 诉讼风险提示：</strong></p><ul style="margin:8px 0 0 20px;line-height:2"><li>注意<strong>诉讼时效</strong>（一般为3年），超时效将丧失胜诉权</li><li>确认<strong>管辖法院</strong>是否有管辖权，避免被移送或驳回</li><li>标的额较大时，可考虑申请<strong>财产保全</strong>防止对方转移资产</li><li>复杂案件强烈建议委托<strong>专业律师</strong>代理</li></ul><br><p style="color:var(--text-muted);font-size:12px">⚠️ 以上分析仅供参考，不构成法律意见。实际案件情况因人而异，建议咨询专业律师。</p>`;
}

// ==================== Tab 切换 ====================
function switchTab(groupId, tabId) {
  const group=document.getElementById(groupId);
  const ps=group.querySelectorAll('.tab-panel'), ts=group.previousElementSibling.querySelectorAll('.tab-item');
  ps.forEach((p,i)=>{ p.classList.toggle('active',p.id===tabId); ts[i].classList.toggle('active',p.id===tabId); });
}

// ==================== UI 工具 ====================
function showToast(msg, type='info') {
  const existing=document.querySelector('.toast');
  if(existing) existing.remove();
  const toast=document.createElement('div');
  toast.className=`toast toast-${type}`;
  toast.innerHTML=`<span>${type==='success'?'✅':type==='warn'?'⚠️':'ℹ️'}</span> ${msg}`;
  document.body.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('toast-show'));
  setTimeout(()=>{ toast.classList.remove('toast-show'); setTimeout(()=>toast.remove(),300); },2500);
}

function getFileIcon(name) {
  const ext=name.split('.').pop().toLowerCase();
  return {pdf:'📄',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',docx:'📝',doc:'📝',xlsx:'📊',xls:'📊'}[ext]||'📎';
}
function formatSize(bytes) {
  if(bytes<1024) return bytes+' B';
  if(bytes<1024*1024) return (bytes/1024).toFixed(1)+' KB';
  return (bytes/1024/1024).toFixed(1)+' MB';
}
function dragOver(event,id){ event.preventDefault(); document.getElementById(id).classList.add('drag-over'); }
function dragLeave(id){ document.getElementById(id).classList.remove('drag-over'); }
function escHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(str){ return (str||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 初始化案件
  if (allCases.length === 0 || !currentCaseId) {
    newCase();
  } else {
    renderCaseList();
    loadCaseToForm(getCurrent());
  }

  // 自动保存监听
  document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', autoSave);
    el.addEventListener('change', autoSave);
  });

  // 案由变化
  document.getElementById('cause').addEventListener('change', function() {
    document.getElementById('cause_custom_group').style.display = this.value==='自定义' ? '' : 'none';
  });

  // 进度条初始化
  updateProgressBar();

  // 关闭弹层
  document.getElementById('ai-modal').addEventListener('click', function(e) {
    if(e.target===this) closeAiModal();
  });
  document.getElementById('case-drawer').addEventListener('click', function(e) {
    if(e.target===this) closeCaseDrawer();
  });

  showToast('欢迎使用法院起诉素材智能体 v2.0','info');
});
