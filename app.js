"use strict";

const $ = s => document.querySelector(s);
const rich = s => esc(s).replace(/\n/g,'<br>');
const SUBJ = ['Physics','Chemistry','Mathematics'];
const TYPES = {single:'Single correct', numerical:'Numerical', multi:'Multiple correct', paragraph:'Paragraph-based', matrix:'Match the column'};
const QT = {single:'Multiple Choice', numerical:'Numerical Value', multi:'Multiple Choice (one or more correct)', paragraph:'Comprehension', matrix:'Matrix Match'};
const SECLBL = {single:'MCQ', numerical:'Numerical', multi:'Multiple Correct', paragraph:'Comprehension', matrix:'Matrix Match'};
const TRANK = {single:0, assertion_reason:0, numerical:1, multi:2, multiple:2, paragraph:3, comprehension:3, matrix:4, column_match:4};


const QTS = { single: 'MCQ', multi: 'MSQ', numerical: 'NAT', paragraph: 'Comprehension', matrix: 'Matrix' };
const STAR = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.5-3.4 3.1 1 4.5L8 11.5 3.9 13.8l1-4.5L1.5 6.2l4.6-.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';


const fmtAns = (q, a) => {
  if(a == null || a === '') return '—';
  const t = q.rawType || q.type;
  if(t === 'numerical') return String(a);
  if(Array.isArray(a)) return a.map(k => LET[k] || k).join(', ');
  if(typeof a === 'number') return LET[a] || String(a);
  return String(a);
};

const keyText = q => {
  if(!q) return 'not available';
  if(q.correct_option) return String(q.correct_option);
  if(q.answer) return String(q.answer);
  const t = q.rawType || q.type;
  if(t === 'numerical') return q.range ? (q.range[0] + ' to ' + q.range[1]) : String(q.ans != null ? q.ans : '');
  if(Array.isArray(q.ans)) return q.ans.map(k => LET[k] || k).join(', ');
  if(typeof q.ans === 'number') return LET[q.ans] || String(q.ans);
  return String(q.ans != null ? q.ans : (q.answer || 'not available'));
};

function toggleBm(id){
  if(!id) return;
  if(BM.has(id)) BM.delete(id);
  else BM.add(id);
  saveSet('aits_bookmarks', BM);
}


function stripWatermarks(text){
  if(!text) return '';
  return String(text)
    .replace(/(?:FIITJEE\s*Ltd\.?|FIITJEE\s*House)[^\n<]*/gi, '')
    .replace(/website:\s*www\.fiitjee\.com[^\n<]*/gi, '')
    .replace(/For More Join:\s*@\S+/gi, '')
    .replace(/@FIITJEE\S*/gi, '')
    .replace(/Kalu\s*Sarai[^\n<]*/gi, '')
    .replace(/Sarvapriya\s*Vihar[^\n<]*/gi, '')
    .replace(/\b\d{4}\s*FIITJEE\s*Students[^\n<]*/gi, '')
    .trim();
}

function cleanSourceTag(q){
  if(!q) return '';
  if(q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'))){
    const sec = q.hcv_section || 'Selected';
    const num = q.hcv_qnum ? (' • Q' + q.hcv_qnum) : '';
    return 'HC Verma • ' + sec + num;
  }
  if(q.paper === 'qrp' || (q.id && String(q.id).startsWith('qrp_'))){
    const qrpNum = q.qrpNumber ? ('0' + q.qrpNumber).slice(-2) : (String(q.id).match(/qrp_(\d+)/i) ? ('0' + String(q.id).match(/qrp_(\d+)/i)[1]).slice(-2) : '');
    return 'Quizrr QRP' + (qrpNum ? (' • QRP ' + qrpNum) : '');
  }
  if(q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))){
    if(q.star === 'two_star') return 'MS Chouhan • Selected (★★)';
    if(q.star === 'one_star') return 'MS Chouhan • Selected (★)';
    if(q.star === 'normal') return 'MS Chouhan • Selected (Normal)';
    return 'MS Chouhan • ' + (q.exercise || 'Level 1');
  }
  if(q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))){
    const isAdv = (q.subSource === 'jee_advanced' || (q.exam && /adv/i.test(q.exam)) || String(q.id).includes('_jee_adv') || q.level === 'Level 2' || q.exercise === 'Exercise II');
    const ex = isAdv ? 'Advanced' : 'Mains';
    const sec = q.section ? (' • ' + q.section) : '';
    return 'Neeraj Kumar • ' + ex + sec;
  }
  if(q.paper === 'allen_jee' || (q.id && String(q.id).startsWith('allenjee_'))){
    const b = q.bank || q.exercise || (String(q.id).includes('_o2_') ? 'O-2' : 'O-1');
    return 'Allen JEE • ' + b;
  }
  if(q.paper === 'allen' || (q.id && String(q.id).startsWith('allenchem_'))){
    return 'Allen NEET';
  }
  let yr = q.year || '';
  let s = q.source || q.paperTitle || '';
  s = s.replace(/^q_/i, '').replace(/^QM__/i, '').replace(/FIITJEE\s*AITS\s*/i, '');
  let m = s.match(/(?:FT|CRT|PT|OT)[-_ ]*(?:[IVX\d]+)/i);
  let ptype = m ? m[0].toUpperCase() : (q.paper === 'adv' ? 'JEE Adv' : (q.paper === 'main' ? 'JEE Main' : 'AITS'));
  let qn = q.questionNumber ? 'Q' + q.questionNumber : (q.id ? String(q.id).split('_').pop() : '');
  if(!qn || isNaN(+qn.replace(/\D/g, ''))) qn = '';
  else qn = 'Q' + parseInt(qn.replace(/\D/g, ''), 10);
  if(yr && qn) return yr + ' | ' + qn;
  if(yr && ptype) return yr + ' | ' + ptype;
  return (yr ? yr + ' | ' : '') + (q.chapter ? q.chapter.slice(0, 18) : 'AITS');
}

function sortQuestionsByPattern(list){
  if(!list || !list.length) return [];
  function isNeet(q){
    return !!((q.id && String(q.id).startsWith('allenchem_')) || (q.paper === 'allen'));
  }
  // Order: single (non-neet: 0, neet: 1 - last of single before multi) -> multi: 2 -> numerical: 3 -> paragraph: 4 -> matrix: 5
  const orderMap = { single: 0, multi: 2, numerical: 3, paragraph: 4, matrix: 5 };
  return list.slice().sort((a, b) => {
    const isParaA = !!(a.paragraph || a.type === 'paragraph' || a.type === 'comprehension');
    const isParaB = !!(b.paragraph || b.type === 'paragraph' || b.type === 'comprehension');
    let typeA = isParaA ? 'paragraph' : (a.type || 'single');
    let typeB = isParaB ? 'paragraph' : (b.type || 'single');
    if(typeA === 'multiple') typeA = 'multi';
    if(typeB === 'multiple') typeB = 'multi';
    if(typeA === 'assertion_reason') typeA = 'single';
    if(typeB === 'assertion_reason') typeB = 'single';
    if(typeA === 'column_match') typeA = 'matrix';
    if(typeB === 'column_match') typeB = 'matrix';
    if(typeA === 'integer') typeA = 'numerical';
    if(typeB === 'integer') typeB = 'numerical';

    const baseRankA = orderMap[typeA] != null ? orderMap[typeA] : 0;
    const baseRankB = orderMap[typeB] != null ? orderMap[typeB] : 0;

    const rankA = (typeA === 'single' && isNeet(a)) ? 1 : baseRankA;
    const rankB = (typeB === 'single' && isNeet(b)) ? 1 : baseRankB;

    if(rankA !== rankB) return rankA - rankB;
    if(isParaA && isParaB){
      const pidA = a.paragraphId || '';
      const pidB = b.paragraphId || '';
      if(pidA !== pidB) return pidA.localeCompare(pidB);
    }
    return (a.questionNumber || 0) - (b.questionNumber || 0);
  });
}
window.sortQuestionsByPattern = sortQuestionsByPattern;
const LET = 'ABCDEFGH';
const PRESETS = {
  adv:{name:'JEE Advanced: single +3/−1, multiple +4/−2 with partial, numerical +4', single:{c:3,w:-1}, multi:{c:4,w:-2,p:1}, numerical:{c:4,w:0}, paragraph:{c:3,w:-1}},
  main:{name:'JEE Main: +4/−1 for all types', single:{c:4,w:-1}, multi:{c:4,w:-1,p:1}, numerical:{c:4,w:-1}, paragraph:{c:4,w:-1}},
  none:{name:'No negative marking: +4 for all types', single:{c:4,w:0}, multi:{c:4,w:0,p:1}, numerical:{c:4,w:0}, paragraph:{c:4,w:0}}
};
const store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
};
const ATT_KEY='aits_attempted';
let ATT=new Set(); try{ ATT=new Set(JSON.parse(store.get(ATT_KEY)||'[]')); }catch(e){}
const saveAtt=()=>store.set(ATT_KEY,JSON.stringify([...ATT]));
const markAttempted=q=>{ if(q && !ATT.has(q.id)){ ATT.add(q.id); saveAtt(); } };
const loadIds=k=>{ try{ return new Set(JSON.parse(store.get(k)||'[]')); }catch(e){ return new Set(); } };
const BM=loadIds('aits_bookmarks'), MIS=loadIds('aits_mistakes');
const RPT_KEY='aits_reported_questions';
function getReports(){ try{ return JSON.parse(store.get(RPT_KEY)||'[]'); }catch(e){ return []; } }
function saveReports(list){ store.set(RPT_KEY,JSON.stringify(list)); updateReportBadge(); }
function isQuestionReported(qId){ if(!qId) return false; return getReports().some(r=>r.questionId===qId); }
function updateReportBadge(){ const badge=$('#rptBadge'); if(!badge) return; const count=getReports().length; badge.textContent=count; badge.style.display=count>0?'inline-block':'none'; }
function findQuestionById(id){ if(!id) return null; const sId=String(id); if(T&&T.qs){ const found=T.qs.find(q=>q.id===id||String(q.id)===sId); if(found) return found; } return DB.find(q=>q.id===id||String(q.id)===sId)||null; }
const qById = id => findQuestionById(id);
const saveSet=(k,S)=>store.set(k,JSON.stringify([...S]));
const answered=a=>a!=null && !(Array.isArray(a)&&!a.length) && a!=='';
const typeset = el => { try{ if(window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise(el?[el]:undefined).catch(()=>{}); }catch(e){} };
const mmss = s => { s=Math.max(0,Math.floor(s)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
const hms = s => { s=Math.max(0,Math.round(s)); const h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return [h,m,x].map(n=>String(n).padStart(2,'0')).join(':'); };
const subjRank = s => { const i=SUBJ.indexOf(s); return i<0?99:i; };

/* ---------- normalisation of database.json ---------- */
function normSubject(s){
  const t=String(s||'').toLowerCase();
  if(/phy/.test(t)) return 'Physics';
  if(/chem/.test(t)) return 'Chemistry';
  if(/math/.test(t)) return 'Mathematics';
  return s || 'Other';
}
function normType(t){
  const s=String(t==null?'':t).toLowerCase();
  if(!s) return null;
  if(s.includes('multi')) return 'multi';
  if(/single|^mcq/.test(s)) return 'single';
  if(/num|integer|^int|subjective|decimal/.test(s)) return 'numerical';
  if(/para|comprehension/.test(s)) return 'paragraph';
  if(/assertion|reason/.test(s)) return 'single';
  if(/match|matrix|column/.test(s)) return 'matrix';
  return null;
}
function normOptions(o){
  if(!o) return null;
  let arr = Array.isArray(o) ? o : (typeof o==='object' ? Object.keys(o).sort().map(k=>o[k]) : null);
  if(!arr || !arr.length) return null;
  return arr.map(x=>{
    let t = (x && typeof x==='object') ? (x.text!=null?x.text:(x.option!=null?x.option:(x.value!=null?x.value:JSON.stringify(x)))) : String(x);
    return String(t).replace(/^\s*(\([A-Da-d1-4]\)|[A-Da-d][\).])\s*/,'').trim();
  });
}
function parseChoice(a,opts){
  if(a==null || a==='') return null;
  const items = Array.isArray(a) ? a.map(String) : [String(a)];
  const out = new Set();
  for(const it of items){
    const s = it.trim();
    if(opts){ const k = opts.findIndex(o=>o.toLowerCase()===s.toLowerCase()); if(k>=0 && s.length>1){ out.add(k); continue; } }
    const c = s.replace(/[^A-Za-z0-9]/g,'');
    if(/^[A-Ha-h]+$/.test(c)) [...c.toUpperCase()].forEach(ch=>out.add(LET.indexOf(ch)));
    else if(/^[1-8]+$/.test(c)) [...c].forEach(ch=>out.add(+ch-1));
  }
  return out.size ? [...out].sort((x,y)=>x-y) : null;
}
function parseNum(a){
  if(a==null || a==='') return null;
  if(typeof a==='number') return isFinite(a)?a:null;
  const m = String(a).replace(/,/g,'').match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  return m ? parseFloat(m[0]) : null;
}
function isMatchQuestion(q){
  if(!q) return false;
  const t = (q.type || '').toLowerCase();
  const raw = (q.rawType || '').toLowerCase();
  if(t.includes('match') || t.includes('matrix') || raw.includes('match') || raw.includes('matrix')) return true;
  const text = ((q.text || '') + ' ' + (q.stem || '') + ' ' + (q.question || '')).toLowerCase();
  if(/match\s+(the\s+)?(following|list)|matching\s+list|matrix\s+match|match\s+list|list\s*[-–—]?\s*i\b|column\s*[-–—]?\s*i\b/i.test(text)) return true;
  if(Array.isArray(q.options) && q.options.some(o => /(?:[I|1|2|3|4|V|X]+)\s*(?:->|–|—|-|→|\uf0ae)\s*[A-Za-z\(\)]/i.test(String(o)))) return true;
  return false;
}
function hasRealOptions(opts){
  if(!Array.isArray(opts) || opts.length < 2) return false;
  return opts.some(o => {
    if(!o) return false;
    const s = String(o).trim().toLowerCase();
    if(!s || s.length <= 1) return false;
    if(/^(option\s*\(?[a-d1-4]\)?|\(?[a-d1-4]\)?)$/i.test(s)) return false;
    return true;
  });
}
function extractMatchOptionsFromText(text){
  if(!text) return null;
  const m = [...text.matchAll(/(?:\(([A-D])\)|(?<![A-Za-z0-9])([A-D])[\.\:\)]\s*)([\s\S]+?)(?=(?:\([A-D]\)|(?<![A-Za-z0-9])[A-D][\.\:\)]\s*)|$)/g)];
  if(m.length >= 4){
    const letters = m.slice(0, 4).map(x => x[1] || x[2]);
    if(letters.join('') === 'ABCD'){
      const candidates = m.slice(0, 4).map(x => x[3].trim());
      if(candidates.every(c => c.length > 0 && c.length < 300)){
        return candidates;
      }
    }
  }
  return null;
}
function hasAnswerKey(q){
  const k = q.answer!=null?q.answer:(q.correct_answer!=null?q.correct_answer:(q.correct!=null?q.correct:q.key));
  if(k == null || k === '') return false;
  if(Array.isArray(k)) return k.length > 0;
  if(typeof k === 'object') return Object.keys(k).length > 0;
  return true;
}

function normQuestion(q,i,defSubject){
  if(!q || typeof q!=='object') return null;
  if(q._isNormalized) return q;
  const text = q.question!=null?q.question:(q.text!=null?q.text:(q.statement!=null?q.statement:''));
  const imgs = [].concat(q.images||q.question_images||q.image||q.raster_images||[]).filter(Boolean);
  if(!String(text).trim() && !imgs.length) return null;
  const subject = normSubject(q.subject!=null?q.subject:defSubject);
  const chapter = String(q.chapter!=null?q.chapter:(q.topic!=null?q.topic:'Unsorted')).trim() || 'Unsorted';
  let options = normOptions(q.options!=null?q.options:q.choices);
  let type = normType(q.type!=null?q.type:(q.question_type!=null?q.question_type:q.qtype));
  const rawAns = q.answer!=null?q.answer:(q.correct_answer!=null?q.correct_answer:(q.correct!=null?q.correct:q.key));
  const isPara = !!(q.paragraph || q.passage_images || q.paragraph_id || (q.type && (String(q.type).includes('para') || String(q.type).includes('comp'))) || (q.rawType && (String(q.rawType).includes('para') || String(q.rawType).includes('comp'))));
  const rawType = type || 'single';
  const isMatch = isMatchQuestion({ ...q, text, type, rawType, options }) || type === 'matrix';
  if(!hasRealOptions(options) && isMatch){
    const fullText = (text || '') + '\n' + (q.stem || '');
    const extracted = extractMatchOptionsFromText(fullText);
    if(extracted){
      options = extracted;
    }
  }
  const passageImgs = [].concat(q.passage_images||q.passageImages||[]).filter(Boolean).map(String);
  let labelOnly = false;
  if(type==='numerical') options=null;
  let ans=null, tol=null, range=null, keyOk=false;
  if(!type){
    if(options){ const p=parseChoice(rawAns,options); type = p && p.length>1 ? 'multi' : 'single'; }
    else type='numerical';
  }
  if(type === 'matrix' || isMatch){
    keyOk = hasAnswerKey(q);
    ans = rawAns;
  } else if(type!=='numerical'){
    if(!options){ const n = +(q.option_count||q.optionCount||4); options = Array.from({length:Math.min(Math.max(n,2),8)},(_,k)=>LET[k]); labelOnly=true; }
    if(hasRealOptions(options)) labelOnly=false;
    ans = parseChoice(rawAns,labelOnly?null:options);
    if(ans) ans = ans.filter(k=>k<options.length);
    keyOk = !!(ans && ans.length);
  } else {
    const r = q.range||q.answer_range;
    if(Array.isArray(r) && r.length===2 && isFinite(+r[0]) && isFinite(+r[1])){ range=[Math.min(+r[0],+r[1]),Math.max(+r[0],+r[1])]; keyOk=true; ans=(range[0]+range[1])/2; }
    else { ans = parseNum(rawAns); keyOk = ans!=null; }
    tol = q.tolerance!=null ? Math.abs(+q.tolerance)||0 : 0.01;
  }
  return {
    id:String(q.id!=null?q.id:(q.question_id!=null?q.question_id:('Q'+(i+1)))),
    subject, chapter, type: isPara ? 'paragraph' : rawType, rawType,
    paragraph:isPara, paragraphId:q.paragraph_id?String(q.paragraph_id):null,
    paragraphGroup:Array.isArray(q.paragraph_group)?q.paragraph_group:null,
    passageImages:passageImgs,
    isMatch,
    text:String(text), options, labelOnly, ans, tol, range, keyOk,
    pdfName: q.pdfName || null,
    segments: q.segments || null,
    allenCode: q.allenCode || null,
    solution:String(q.solution!=null?q.solution:(q.explanation||'')),
    images:imgs.map(String),
    raster_images:[].concat(q.raster_images||imgs).filter(Boolean).map(String),
    solImages:[].concat(q.solution_images||q.solutionImages||[]).filter(Boolean).map(String),
    source:String(q.source!=null?q.source:(q.source_paper!=null?q.source_paper:(q.paper!=null?q.paper:(q.test||'')))),
    bank: (q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'))) ? 'HC Verma' : ((q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) ? (q.bank || ((q.subSource === 'jee_advanced' || (q.exam && /adv/i.test(q.exam)) || String(q.id).includes('_jee_adv')) ? 'JEE Advanced' : 'JEE Main')) : ((q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))) ? (q.bank || 'Selected Questions') : (q.bank || q.exercise || (String(q.id).includes('_o1_') ? 'O-1' : (String(q.id).includes('_o2_') ? 'O-2' : ''))))),
    branch: q.branch || ((q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) ? 'Physical Chemistry' : ((q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))) ? 'Organic Chemistry' : (((q.paper === 'allen' || (q.id && String(q.id).startsWith('allenchem_'))) ? 'NEET Modules' : '')))),
    paper: (q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'))) ? 'hcv' : ((q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) ? 'neeraj' : ((q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))) ? 'mschouhan' : ((q.paper === 'allen_jee' || (q.id && String(q.id).startsWith('allenjee_'))) ? 'allen_jee' : ((q.paper === 'allen' || (q.id && String(q.id).startsWith('allenchem_')) || /allen/i.test(String(q.source||''))) ? 'allen' : (q.exam ? (/adv/i.test(q.exam)?'adv':(/main/i.test(q.exam)?'main':q.exam)) : paperOf(String(q.source||'')+' '+String(q.paperTitle||q.paper_title||''))))))),
    is_vector: q.is_vector || false,
    svg_path: q.svg_path || null,
    svg_dimensions: q.svg_dimensions || null,
    hcv_chapter: q.hcv_chapter || null,
    hcv_section: q.hcv_section || null,
    hcv_qnum: q.hcv_qnum || null,
    selected: !!q.selected,
    star: q.star || null,
    exercise: q.exercise || ((q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) ? ((q.subSource === 'jee_advanced' || (q.exam && /adv/i.test(q.exam)) || String(q.id).includes('_jee_adv')) ? 'Exercise II' : 'Exercise I') : ((q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))) ? 'Level 1' : null)),
    exam: q.exam || ((q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) ? ((q.subSource === 'jee_advanced' || String(q.id).includes('_jee_adv')) ? 'JEE Advanced' : 'JEE Main') : null),
    subSource: q.subSource || ((q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) ? ((q.subSource === 'jee_advanced' || String(q.id).includes('_jee_adv')) ? 'jee_advanced' : 'jee_main') : null),
    answer: q.answer || (q.ans != null ? (Array.isArray(q.ans) ? q.ans.map(k=>LET[k]||k).join('') : q.ans) : null),
    year:yearOf(q)
  };
}
function yearOf(q){
  const y=parseInt(q.year,10);
  if(y>=1990 && y<=2100) return String(y);
  const m=(String(q.source||'')+' '+String(q.paperTitle||q.paper_title||'')).match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : 'Unknown';
}
function paperOf(s){
  const m=/(\bJM\b|JEE[\s_-]?M\b|JEEM|\bMains?\b|_Mains?\b)/i.test(s), a=/(\bJA\b|JEE[\s_-]?A\b|JEEA|\bAdv)/i.test(s);
  if(m&&!a) return 'main';
  if(a&&!m) return 'adv';
  if(m&&a) return /\bMain\b/i.test(s)?'main':'adv';
  if(/Paper[- _]?(1|2|I{1,2})\b|\bP[- ]?[12]\b/i.test(s)) return 'adv';
  return 'other';
}
const PAPERS={main:'Mains paper', adv:'Advanced paper'};
function extractList(raw){
  if(Array.isArray(raw)) return raw.map(x=>({q:x}));
  if(raw && typeof raw==='object'){
    for(const k of ['questions','data','items','database']) if(Array.isArray(raw[k])) return raw[k].map(x=>({q:x}));
    const out=[];
    for(const k of Object.keys(raw)) if(Array.isArray(raw[k])) raw[k].forEach(x=>out.push({q:x,subject:k}));
    if(out.length) return out;
  }
  return null;
}

/* ---------- state ---------- */
let DB=[], dbLabel='', dbSample=false, dbSkipped=0, dbNoKey=0;
const cfg = {subjects:new Set(['Physics']), chapters:new Set(), types:new Set(Object.keys(TYPES)), typeCounts:{single:null, multi:null, numerical:null, paragraph:null}, paper:'all', years:new Set(), count:30, countAuto:true, minutes:90, minAuto:true, shuffle:false, unattFirst:store.get('aits_unatt')!=='0', preset:'adv', mode:'test'};
const ui = {mag:false, size:0, theme:(store.get('aits_xtheme')==='dark'?'dark':'light'), invert:store.get('aits_xinvert')==='1'};
let T=null, timerId=null, lastResult=null;

// Set to false to also show chemistry questions that have no answer key.
const CHEM_ONLY_KEYED = true;
const CHEM_ALIAS = {
  'Isomerism':'Isomerism (Structural & Stereoisomerism)',
  'Metallurgy':'Principles & Processes of Isolation of Metals (Metallurgy)',
  'General Principles and Processes of Isolation of Metals (Metallurgy)':'Principles & Processes of Isolation of Metals (Metallurgy)',
  'p-Block: Group 13 & 14':'p-Block Elements: Group 13 (Boron family) & Group 14 (Carbon family)',
  'p-Block: Group 15 & 16':'p-Block Elements: Group 15 (Nitrogen family) & Group 16 (Oxygen family)',
  'p-Block: Group 17 & 18':'p-Block Elements: Group 17 (Halogens) & Group 18 (Noble gases)',
  'p-Block Elements: Group 13 to Group 18':'p-Block Elements: Group 15 (Nitrogen family) & Group 16 (Oxygen family)',
  'Environmental Chemistry':'Chemistry in Everyday Life',
  'Organic Compounds Containing Oxygen (Alcohols, Phenols, Ethers, Aldehydes, Ketones, Carboxylic Acids)':'Aldehydes, Ketones & Carboxylic Acids',
  'Equilibrium':'Chemical Equilibrium',
  'Chemical Thermodynamics':'Thermodynamics (Chemical)',
  'Solutions':'Liquid Solutions & Colligative Properties',
  'Purification and Characterisation of Organic Compounds & General Organic Chemistry (GOC)':'General Organic Chemistry (GOC)',
  'Redox Reactions & Electrochemistry':'Electrochemistry',
  'Principles Related to Practical Chemistry (Salt Analysis)':'Qualitative Salt Analysis',
  'Organic Compounds Containing Halogens (Haloalkanes & Haloarenes)':'Haloalkanes & Haloarenes',
  'Organic Compounds Containing Nitrogen (Amines & Diazonium Salts)':'Amines & Diazonium Salts',
  's-Block Elements (Alkali and Alkaline Earth Metals)':'s-Block Elements',
  'Classification of Elements & Periodicity in Properties':'Periodic Table & Periodicity'
};
function loadDB(raw,label,isSample){
  const list = extractList(raw);
  if(!list){ showNote('That file is not a list of questions. Expected an array, or an object with a "questions" array.'); return false; }
  const out=[]; let skipped=0;
  list.forEach((e,i)=>{
    if(e.q && e.q._isNormalized){
      if(e.q.paper === 'aits' || !e.q.paper || e.q.paper === 'other'){
        const isSpecial = e.q.paper === 'qrp' || e.q.paper === 'neeraj' || e.q.paper === 'allen' || e.q.paper === 'allen_jee' || e.q.paper === 'mschouhan' || (e.q.id && (String(e.q.id).startsWith('qrp_') || String(e.q.id).startsWith('nk_') || String(e.q.id).startsWith('allenjee_') || String(e.q.id).startsWith('allenchem_') || String(e.q.id).startsWith('mschouhan_')));
        if(!isSpecial){
          e.q.paper = (e.q.exam && /main/i.test(e.q.exam)) ? 'main' : ((e.q.exam && /adv/i.test(e.q.exam)) ? 'adv' : (paperOf(String(e.q.source||'')+' '+String(e.q.paperTitle||e.q.paper_title||'')+' '+String(e.q.id||'')) === 'main' ? 'main' : 'adv'));
        }
      }
      if(e.q.subject === 'Chemistry' && CHEM_ALIAS[e.q.chapter]){
        e.q.chapter = CHEM_ALIAS[e.q.chapter];
      }
      out.push(e.q);
      return;
    }
    const n=normQuestion(e.q,i,e.subject);
    if(n && SUBJ.includes(n.subject) && n.keyOk){
      if(n.subject==='Chemistry'){ n.chapter=CHEM_ALIAS[n.chapter]||n.chapter; }
      out.push(n);
    } else skipped++;
  });
  if(!out.length){ showNote('No usable questions were found in that file.'); return false; }
  const seen=new Map();
  out.forEach(q=>{ const c=(seen.get(q.id)||0)+1; seen.set(q.id,c); if(c>1) q.id=q.id+'#'+c; });
  DB=out; dbLabel=label; dbSample=!!isSample; dbSkipped=skipped; dbNoKey=out.filter(q=>!q.keyOk).length;
  const practiceDB = out.filter(q => q.paper !== 'allen' && q.paper !== 'allen_jee' && q.paper !== 'mschouhan');
  cfg.subjects=new Set([SUBJ.find(s=>practiceDB.some(q=>q.subject===s))||'Physics']);
  cfg.chapters=new Set(practiceDB.filter(q=>cfg.subjects.has(q.subject)).map(q=>q.subject+'||'+q.chapter)); cfg.types=new Set(Object.keys(TYPES)); cfg.paper='all';
  cfg.years=new Set(practiceDB.map(q=>q.year));
  cfg.countAuto=true; cfg.minAuto=true; $('#chSearch').value='';
  renderSetup(); return true;
}

/* ---------- On-Demand Lazy Subject Loading ---------- */
const loadedSubjects = new Set();
const loadingSubjectPromises = {};

async function ensureSubjectLoaded(subject){
  if(!subject || loadedSubjects.has(subject)) return true;
  if(loadingSubjectPromises[subject]) return loadingSubjectPromises[subject];

  const isLocal = window.location.hostname==='localhost' || window.location.hostname==='127.0.0.1' || window.location.protocol==='file:';
  const conf = window.AITS_CONFIG || {};

  loadingSubjectPromises[subject] = (async () => {
    try {
      let fileUrls = [];
      if(subject === 'Physics'){
        const remote = isLocal ? '' : (conf.databaseUrl || '').trim();
        fileUrls = [
          ['priority_database.json'],
          ['hcv_database.json', 'public/hcv_database.json'],
          ['qrp_database.json', 'public/qrp_database.json', (conf.qrpUrl || '').trim()],
          ['database.json', remote, 'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/database.json']
        ];
      } else if(subject === 'Chemistry'){
        const chemRemote = (conf.chemistryUrl || '').trim();
        fileUrls = [
          ['chemistry_main_database.json', 'chemistry_database.json', chemRemote, 'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/chemistry_database.json'],
          ['allenjee_database.json', (conf.allenJeeUrl || '').trim(), 'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/public/allenjee_database.json'],
          ['allenchem_database.json', (conf.allenChemUrl || '').trim(), 'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/public/allenchem_database.json'],
          ['mschouhan_database.json', 'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/public/mschouhan_database.json'],
          ['neeraj_database.json', 'public/neeraj_database.json']
        ];
      } else if(subject === 'Mathematics'){
        const mathAdvRemote = (conf.mathsAdvancedUrl || '').trim();
        const mathMainRemote = (conf.mathsMainUrl || '').trim();
        fileUrls = [
          ['maths_main_database.json', mathMainRemote, 'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/maths_main_database.json'],
          ['maths_advanced_database.json', mathAdvRemote, 'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/maths_advanced_database.json']
        ];
      }

      for(const candList of fileUrls){
        for(const u of candList.filter(Boolean)){
          try {
            const raw = await fetchCachedJson(u);
            if(raw){
              mergeSubjectQuestions(raw, subject);
              if($('#scrPracticeList') && !$('#scrPracticeList').hidden && prkState.subj === subject){
                renderPracticeScreen();
              }
              break;
            }
          } catch(e) {
            console.warn('Candidate subject load failed for ' + u, e);
          }
        }
      }
      loadedSubjects.add(subject);
      if($('#scrPracticeList') && !$('#scrPracticeList').hidden && prkState.subj === subject){
        renderPracticeScreen();
      }
      return true;
    } finally {
      delete loadingSubjectPromises[subject];
    }
  })();

  return loadingSubjectPromises[subject];
}

function mergeSubjectQuestions(raw, subject){
  const list = extractList(raw) || [];
  if(!list.length) return;
  const existingMap = new Map();
  DB.forEach(q => { existingMap.set(String(q.id), q); });
  const toAdd = [];

  list.forEach(e => {
    if(e.q && e.q.id){
      const qid = String(e.q.id);
      if(existingMap.has(qid)){
        const q = existingMap.get(qid);
        delete e.q._isNormalized;
        const norm = normQuestion(e.q, 0, subject);
        if(norm){ Object.assign(q, norm); }
        else { Object.assign(q, e.q, { _isNormalized: true, keyOk: true }); }
      } else {
        delete e.q._isNormalized;
        const norm = normQuestion(e.q, 0, subject);
        if(norm){ toAdd.push(norm); }
        else { toAdd.push(Object.assign({}, e.q, { _isNormalized: true, keyOk: true })); }
        existingMap.set(qid, e.q);
      }
    }
  });
  if(toAdd.length){
    DB.push(...toAdd);
  }
}
window.ensureSubjectLoaded = ensureSubjectLoaded;
function showNote(t){ const n=$('#dbNote'); n.textContent=t; n.hidden=!t; }

/* ---------- screens ---------- */
function show(id){
  ['scrPracticeList','scrPracticeDetail'].forEach(s=>{ const el=$('#'+s); if(el) el.hidden = s!==id; });
  if(id !== 'scrPracticeDetail' && typeof stopPrkQTimer === 'function') stopPrkQTimer();
  if(id === 'scrTestBuilder' && typeof renderTbArchive === 'function') renderTbArchive();
  if(typeof toggleAcc === 'function') toggleAcc(false);
  if(typeof hideTip === 'function') hideTip();
  window.scrollTo(0,0);
}

/* ---------- setup ---------- */
const paperOnlyOK = q => {
  if(q.paper === 'allen' || q.paper === 'allen_jee' || q.paper === 'mschouhan') return false;
  if(cfg.paper === 'all') return true;
  let p = q.paper;
  if(p === 'aits' || !p || p === 'other' || p === 'neeraj'){
    p = (q.exam && /main/i.test(q.exam)) ? 'main' : ((q.exam && /adv/i.test(q.exam)) ? 'adv' : (String(q.id).includes('_jee_adv') ? 'adv' : (String(q.id).includes('_jee_main') ? 'main' : (paperOf(String(q.source||'')+' '+String(q.paperTitle||q.paper_title||'')+' '+String(q.id||'')) === 'main' ? 'main' : 'adv'))));
  }
  return p === cfg.paper;
};
const paperOK = q => paperOnlyOK(q) && cfg.years.has(q.year);

function evaluate(q,s,m){
  if(!hasAns(q,s)) return {r:'skip',marks:0};
  if(!q.keyOk) return {r:'nokey',marks:0};
  const t = q.rawType || q.type;
  if(t==='single'){
    const co = Array.isArray(q.ans) ? q.ans : (q.ans!=null ? [q.ans] : []);
    return co.includes(s.ans) ? {r:'ok',marks:(m[t]||m.single).c} : {r:'bad',marks:(m[t]||m.single).w};
  }
  if(q.type==='multi'){
    const ch = Array.isArray(s.ans) ? s.ans : (s.ans!=null ? [s.ans] : []);
    const co = Array.isArray(q.ans) ? q.ans : (q.ans!=null ? [q.ans] : []);
    if(ch.some(x=>!co.includes(x))) return {r:'bad',marks:m.multi.w};
    if(ch.length===co.length) return {r:'ok',marks:m.multi.c};
    return {r:'part',marks:Math.min(ch.length*m.multi.p,m.multi.c-1)};
  }
  const v=parseFloat(s.ans); if(!isFinite(v)) return {r:'skip',marks:0};
  const ok = q.range ? (v>=q.range[0]-1e-9 && v<=q.range[1]+1e-9) : Math.abs(v-q.ans)<=((q.tol||0)+1e-9);
  return ok ? {r:'ok',marks:(m.numerical||m.single).c} : {r:'bad',marks:(m.numerical||m.single).w};
}

let _cachedSessionAttemptedSet = null;
function getSessionAttemptedSet(){
  if(_cachedSessionAttemptedSet) return _cachedSessionAttemptedSet;
  try {
    const raw = sessionStorage.getItem(PRK_SESSION_ATT_KEY);
    _cachedSessionAttemptedSet = new Set(raw ? JSON.parse(raw) : []);
  } catch(e){
    _cachedSessionAttemptedSet = new Set();
  }
  return _cachedSessionAttemptedSet;
}

function getSessionAttemptedCount(){
  return getSessionAttemptedSet().size;
}

function markSessionAttempted(qId){
  if(!qId) return;
  const s = getSessionAttemptedSet();
  const prevSize = s.size;
  s.add(String(qId));
  try {
    sessionStorage.setItem(PRK_SESSION_ATT_KEY, JSON.stringify([...s]));
  } catch(e){}
  if(s.size !== prevSize){
    updateSessionAttemptedCounters();
  }
}

function resetSessionAttempted(){
  _cachedSessionAttemptedSet = new Set();
  try {
    sessionStorage.removeItem(PRK_SESSION_ATT_KEY);
  } catch(e){}
  updateSessionAttemptedCounters();
}

function updateSessionAttemptedCounters(){
  const count = getSessionAttemptedCount();
  ['prkSessionAttemptedCount', 'prkTopSessionCount', 'prkListSessionCount', 'prkHeroSessionCount', 'examSessionAttemptedCount'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = count;
  });
}
setTimeout(updateSessionAttemptedCounters, 0);

let _cachedPrkAnswers = null;
function getPrkAnswers(){
  if(_cachedPrkAnswers) return _cachedPrkAnswers;
  try {
    _cachedPrkAnswers = JSON.parse(store.get(PRK_ANS_KEY) || '{}');
  } catch(e){
    _cachedPrkAnswers = {};
  }
  return _cachedPrkAnswers;
}
function invalidatePrkAnswersCache(){
  _cachedPrkAnswers = null;
}
function savePrkAnswer(qId, val, status){
  const map = getPrkAnswers();
  map[qId] = { val, status, t: Date.now() };
  try {
    store.set(PRK_ANS_KEY, JSON.stringify(map));
  } catch(e){}
  markAttempted({ id: qId });
  if(status === 'ok' || status === 'bad'){
    markSessionAttempted(qId);
  }
}

const prkState = {
  subj: 'Physics',
  chap: null,
  sourceGroup: 'priority', // 'priority' | 'fiitjee' | 'qrp' | 'neeraj' | 'mschouhan' | null
  paper: 'all',
  year: 'all',
  type: 'all',
  status: 'all',
  hideAttempted: false,
  sortOrder: 'desc'
};

let prkVisibleLimit = 50;

function openPracticeList(initialOpts){
  prkVisibleLimit = 50;
  if(initialOpts){
    if(initialOpts.subject && SUBJ.includes(initialOpts.subject)) prkState.subj = initialOpts.subject;
    if(initialOpts.chapter){
      prkState.chap = initialOpts.chapter;
      if(String(prkState.chap).startsWith('QRP ')) prkState.sourceGroup = 'qrp';
      else prkState.sourceGroup = 'fiitjee';
    }
  }
  const availableSubjs = SUBJ.filter(s => DB.some(q => q.paper !== 'allen' && q.subject === s));
  if(!availableSubjs.includes(prkState.subj)) prkState.subj = availableSubjs[0] || 'Physics';

  ensureSubjectLoaded(prkState.subj).then(() => {
    if($('#scrPracticeList') && !$('#scrPracticeList').hidden) renderPracticeScreen();
  }).catch(() => {});
  renderPracticeScreen();
  show('scrPracticeList');
}

function renderPracticeScreen(){
  renderPracticeSidebar();
  renderPracticeFilterYears();
  renderPracticeMain();
  updateSessionAttemptedCounters();
}

function applyPrkChapSearch(){
  const searchInput = $('#prkChapSearch');
  if(!searchInput) return;
  const q = searchInput.value.trim().toLowerCase();
  const items = document.querySelectorAll('#prkChapList .marks-sb-item');
  const groups = document.querySelectorAll('#prkChapList .marks-sb-group');
  if(!q){
    items.forEach(el => el.style.display = '');
    groups.forEach(el => el.style.display = '');
    return;
  }
  items.forEach(el => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(q) ? '' : 'none';
  });
  groups.forEach(grp => {
    const hasVisible = [...grp.querySelectorAll('.marks-sb-item')].some(it => it.style.display !== 'none');
    grp.style.display = hasVisible ? '' : 'none';
    if(hasVisible) grp.open = true;
  });
}

function renderPracticeSidebar(){
  const availableSubjs = SUBJ.filter(s => DB.some(q => q.paper !== 'allen' && q.subject === s));
  const subjBox = $('#prkSubjList');
  if(subjBox){
    subjBox.innerHTML = availableSubjs.map(s => {
      const isAct = s === prkState.subj;
      return '<button type="button" class="prk-subj-tab' + (isAct ? ' active' : '') + '" data-prksubj="' + esc(s) + '">' +
        esc(s) +
      '</button>';
    }).join('');
  }

  const inSubj = DB.filter(q => q.paper !== 'allen' && q.subject === prkState.subj);
  const chapCountEl = $('#prkChapCount');
  if(chapCountEl) chapCountEl.textContent = inSubj.length + ' Qs';

  // Canonical taxonomy order for clean syllabus sequence
  const TAXONOMY_CHAPTER_ORDER = {
    "Units, Dimensions & Measurements": 1, "Vectors & Basic Mathematics": 2, "Kinematics": 3,
    "Newton's Laws of Motion": 4, "Laws of Motion": 4, "Friction": 5, "Circular Motion": 6, "Work, Energy & Power": 7, "Work Energy Power": 7,
    "Centre of Mass & Momentum": 8, "COM & Collision": 8, "Collision & Variable Mass": 9, "Rotational Mechanics": 10, "Rotation": 10,
    "Gravitation": 11, "Mechanical Properties of Solids": 12, "Fluid Mechanics": 13,
    "Kinetic Theory of Gases": 14, "Thermodynamics": 15, "Thermal Properties & Calorimetry": 16,
    "Heat Transfer": 17, "Simple Harmonic Motion": 18, "Wave Motion & Waves on String": 19,
    "Sound Waves": 20, "Electrostatics": 21, "Gauss's Law": 22, "Capacitance": 23, "Capacitors": 23,
    "Current Electricity": 24, "Moving Charges & Magnetism": 25, "Magnetic Field": 25, "Magnetic Field Due to Current": 25.5, "Magnetism & Matter": 26,
    "Electromagnetic Induction": 27, "EMI": 27, "Alternating Current": 28, "Electromagnetic Waves": 29,
    "Ray Optics": 30, "Wave Optics": 31, "Optical Instruments": 32,
    "Dual Nature of Matter & Radiation": 33, "Atoms": 34, "Nuclei": 35, "Semiconductor Devices": 36
  };

  // Group by question source
  const isPriority = q => Boolean(window.PRIORITY_MAP && window.PRIORITY_MAP[q.id]);
  const isQrp = q => (q.paper === 'qrp' || (q.id && String(q.id).startsWith('qrp_'))) && !isPriority(q);
  const isMs = q => (q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))) && !isPriority(q);
  const isNk = q => (q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) && !isPriority(q);
  const isHcv = q => (q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'))) && !isPriority(q);
  const isFiitjee = q => !isQrp(q) && !isMs(q) && !isNk(q) && !isHcv(q) && !isPriority(q);

  const priorityQs = inSubj.filter(isPriority);
  const fiitjeeQs = inSubj.filter(isFiitjee);
  const qrpQs = inSubj.filter(isQrp);
  const msQs = inSubj.filter(isMs);
  const nkQs = inSubj.filter(isNk);
  const hcvQs = inSubj.filter(isHcv);

  const byChPriority = {};
  priorityQs.forEach(q => {
    const ch = (window.PRIORITY_MAP && window.PRIORITY_MAP[q.id] && window.PRIORITY_MAP[q.id].chapter) || q.chapter;
    if(ch) byChPriority[ch] = (byChPriority[ch] || 0) + 1;
  });

  const byChFiitjee = {};
  fiitjeeQs.forEach(q => { if(q.chapter) byChFiitjee[q.chapter] = (byChFiitjee[q.chapter] || 0) + 1; });

  const byChQrp = {};
  qrpQs.forEach(q => { if(q.chapter) byChQrp[q.chapter] = (byChQrp[q.chapter] || 0) + 1; });

  const byChMs = {};
  msQs.forEach(q => { if(q.chapter) byChMs[q.chapter] = (byChMs[q.chapter] || 0) + 1; });

  const byChNk = {};
  nkQs.forEach(q => { if(q.chapter) byChNk[q.chapter] = (byChNk[q.chapter] || 0) + 1; });

  const byChHcv = {};
  hcvQs.forEach(q => { if(q.chapter) byChHcv[q.chapter] = (byChHcv[q.chapter] || 0) + 1; });

  // Update top source tabs active state and visibility based on subject
  document.querySelectorAll('#prkSourceTabs .source-tab-btn').forEach(btn => {
    const grp = btn.dataset.prksrcgroup;
    if(grp === 'hcv' || grp === 'qrp'){
      btn.style.display = (prkState.subj === 'Physics') ? '' : 'none';
    } else if(grp === 'mschouhan' || grp === 'neeraj'){
      btn.style.display = (prkState.subj === 'Chemistry') ? '' : 'none';
    } else {
      btn.style.display = '';
    }
    const isAct = (grp === 'all' && !prkState.sourceGroup) || (grp === prkState.sourceGroup);
    btn.classList.toggle('active', isAct);
    if(grp === 'priority'){
      btn.style.borderColor = isAct ? '#eab308' : 'var(--line)';
      btn.style.background = isAct ? 'rgba(234,179,8,0.15)' : 'var(--surface)';
    }
  });

  // Retain collapse/expand state
  const priorityEl = $('#prkGroupPriority');
  const fiitjeeEl = $('#prkGroupFiitjee');
  const qrpEl = $('#prkGroupQrp');
  const msEl = $('#prkGroupMs');
  const nkEl = $('#prkGroupNk');
  const hcvEl = $('#prkGroupHcv');
  const hcvOpen = hcvEl ? (hcvEl.open || prkState.sourceGroup === 'hcv') : (prkState.sourceGroup === 'hcv');
  const priorityOpen = priorityEl ? (priorityEl.open || prkState.sourceGroup === 'priority') : (prkState.sourceGroup === 'priority');
  const fiitjeeOpen = fiitjeeEl ? (fiitjeeEl.open || prkState.sourceGroup === 'fiitjee') : (prkState.sourceGroup === 'fiitjee');
  const qrpOpen = qrpEl ? (qrpEl.open || prkState.sourceGroup === 'qrp') : (prkState.sourceGroup === 'qrp');
  const msOpen = msEl ? (msEl.open || prkState.sourceGroup === 'mschouhan') : (prkState.sourceGroup === 'mschouhan');
  const nkOpen = nkEl ? (nkEl.open || prkState.sourceGroup === 'neeraj') : (prkState.sourceGroup === 'neeraj');

  const ansMap = getPrkAnswers();
  const getProgressHtml = (qs) => {
    if(!qs || !qs.length) return '';
    const att = qs.filter(q => ansMap[q.id] && ansMap[q.id].status !== 'skip').length;
    if(!att) return '';
    const pct = Math.min(100, Math.round(att / qs.length * 100));
    return '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + pct + '%"></div></div>';
  };

  const priorityBadge = $('#prkPriorityBadgeCount');
  if(priorityBadge) priorityBadge.textContent = priorityQs.length + ' Qs';
  const hcvBadge = $('#prkHcvBadgeCount');
  if(hcvBadge) hcvBadge.textContent = hcvQs.length + ' Qs';
  const qrpBadge = $('#prkQrpBadgeCount');
  if(qrpBadge) { qrpBadge.textContent = qrpQs.length + ' Qs'; qrpBadge.style.display = qrpQs.length ? '' : 'none'; }
  const msBadge = $('#prkMsBadgeCount');
  if(msBadge) { msBadge.textContent = msQs.length + ' Qs'; msBadge.style.display = msQs.length ? '' : 'none'; }
  const nkBadge = $('#prkNkBadgeCount');
  if(nkBadge) { nkBadge.textContent = nkQs.length + ' Qs'; nkBadge.style.display = nkQs.length ? '' : 'none'; }

  const chapBox = $('#prkChapList');
  if(chapBox){
    const allAtt = inSubj.filter(q => ansMap[q.id] && ansMap[q.id].status !== 'skip').length;
    const allPct = inSubj.length ? Math.min(100, Math.round(allAtt / inSubj.length * 100)) : 0;
    const allProg = allAtt > 0 ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + allPct + '%"></div></div>' : '';

    let chHtml = '<button type="button" class="marks-sb-item' + (!prkState.chap && !prkState.sourceGroup ? ' active' : '') + '" data-prkchap="__ALL__" data-prksource="__ALL__">' +
      '<div class="marks-sb-item-row">' +
        '<span class="marks-sb-item-name" style="font-weight:600">All Chapters</span>' +
        '<span class="marks-sb-count">' + inSubj.length + '</span>' +
      '</div>' +
      allProg +
    '</button>';

    // 0. Selected Bank (2024-2025 JEE Main)
    if(priorityQs.length > 0 || Object.keys(byChPriority).length > 0){
      const keys = Object.keys(byChPriority).sort((a,b) => (TAXONOMY_CHAPTER_ORDER[a] || 99) - (TAXONOMY_CHAPTER_ORDER[b] || 99) || a.localeCompare(b));
      const isAllPriority = !prkState.chap && prkState.sourceGroup === 'priority';
      const prioAtt = priorityQs.reduce((acc, q) => acc + (ansMap[q.id] && ansMap[q.id].status !== 'skip' ? 1 : 0), 0);
      const prioPct = priorityQs.length ? Math.min(100, Math.round(prioAtt / priorityQs.length * 100)) : 0;
      const prioProg = prioAtt > 0 ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + prioPct + '%"></div></div>' : '';

      // Pre-aggregate attempted counts per chapter
      const prioAttByCh = {};
      priorityQs.forEach(q => {
        if(ansMap[q.id] && ansMap[q.id].status !== 'skip'){
          const qCh = (window.PRIORITY_MAP && window.PRIORITY_MAP[q.id] && window.PRIORITY_MAP[q.id].chapter) || q.chapter;
          if(qCh) prioAttByCh[qCh] = (prioAttByCh[qCh] || 0) + 1;
        }
      });

      chHtml += '<details class="marks-sb-group" id="prkGroupPriority"' + (priorityOpen ? ' open' : '') + '>' +
        '<summary class="marks-sb-group-hdr" style="background:rgba(37,99,235,0.08);border-left:3.5px solid var(--brand)">' +
          '<span class="marks-sb-group-title" style="color:var(--fg);font-weight:700">' +
            '<span class="marks-sb-caret">&#9656;</span>' +
            '<span>Selected Bank</span>' +
          '</span>' +
          '<span class="marks-sb-count" style="background:var(--brand);color:#fff;font-weight:700">' + priorityQs.length + '</span>' +
        '</summary>' +
        '<div class="marks-sb-sublist">' +
          '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAllPriority ? ' active' : '') + '" data-prkchap="__ALL_PRIORITY__" data-prksource="priority">' +
            '<div class="marks-sb-item-row">' +
              '<span class="marks-sb-item-name" style="font-weight:700">All Selected Bank</span>' +
              '<span class="marks-sb-count">' + priorityQs.length + '</span>' +
            '</div>' +
            prioProg +
          '</button>' +
          keys.map(c => {
            const isAct = prkState.chap === c && prkState.sourceGroup === 'priority';
            const totalC = byChPriority[c] || 0;
            const attC = prioAttByCh[c] || 0;
            const cProg = (attC > 0 && totalC > 0) ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + Math.min(100, Math.round(attC / totalC * 100)) + '%"></div></div>' : '';
            return '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAct ? ' active' : '') + '" data-prkchap="' + esc(c) + '" data-prksource="priority">' +
              '<div class="marks-sb-item-row">' +
                '<span class="marks-sb-item-name">' + esc(c) + '</span>' +
                '<span class="marks-sb-count">' + totalC + '</span>' +
              '</div>' +
              cProg +
            '</button>';
          }).join('') +
        '</div>' +
      '</details>';
    }

    // HC Verma Dropdown Menu
    if(hcvQs.length > 0){
      const keys = Object.keys(byChHcv).sort((a,b) => (TAXONOMY_CHAPTER_ORDER[a] || 99) - (TAXONOMY_CHAPTER_ORDER[b] || 99) || a.localeCompare(b));
      const isAllHcv = !prkState.chap && prkState.sourceGroup === 'hcv';
      const hcvAtt = hcvQs.filter(q => ansMap[q.id] && ansMap[q.id].status !== 'skip').length;
      const hcvPct = hcvQs.length ? Math.min(100, Math.round(hcvAtt / hcvQs.length * 100)) : 0;
      const hcvProg = hcvAtt > 0 ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + hcvPct + '%"></div></div>' : '';

      chHtml += '<details class="marks-sb-group" id="prkGroupHcv"' + (hcvOpen ? ' open' : '') + '>' +
        '<summary class="marks-sb-group-hdr" style="background:rgba(37,99,235,0.06);border-left:3.5px solid #2563eb">' +
          '<span class="marks-sb-group-title" style="color:var(--fg);font-weight:700">' +
            '<span class="marks-sb-caret">&#9656;</span>' +
            '<span>HC Verma (Selected)</span>' +
          '</span>' +
          '<span class="marks-sb-count" style="background:#2563eb;color:#fff;font-weight:700">' + hcvQs.length + '</span>' +
        '</summary>' +
        '<div class="marks-sb-sublist">' +
          '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAllHcv ? ' active' : '') + '" data-prkchap="__ALL_HCV__" data-prksource="hcv">' +
            '<div class="marks-sb-item-row">' +
              '<span class="marks-sb-item-name" style="font-weight:700">All HC Verma</span>' +
              '<span class="marks-sb-count">' + hcvQs.length + '</span>' +
            '</div>' +
            hcvProg +
          '</button>' +
          // Pre-aggregate HCV attempted counts
          (() => {
            const hcvAttByCh = {};
            hcvQs.forEach(q => {
              if(ansMap[q.id] && ansMap[q.id].status !== 'skip' && q.chapter) hcvAttByCh[q.chapter] = (hcvAttByCh[q.chapter] || 0) + 1;
            });
            return keys.map(c => {
              const isAct = prkState.chap === c && prkState.sourceGroup === 'hcv';
              const totalC = byChHcv[c] || 0;
              const attC = hcvAttByCh[c] || 0;
              const cProg = (attC > 0 && totalC > 0) ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + Math.min(100, Math.round(attC / totalC * 100)) + '%"></div></div>' : '';
              return '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAct ? ' active' : '') + '" data-prkchap="' + esc(c) + '" data-prksource="hcv">' +
                '<div class="marks-sb-item-row">' +
                  '<span class="marks-sb-item-name">' + esc(c) + '</span>' +
                  '<span class="marks-sb-count">' + totalC + '</span>' +
                '</div>' +
                cProg +
              '</button>';
            }).join('');
          })() +
        '</div>' +
      '</details>';
    }

    // 1. FIITJEE Dropdown Menu
    if(fiitjeeQs.length > 0){
      const keys = Object.keys(byChFiitjee).sort((a,b) => svOrder(prkState.subj, a) - svOrder(prkState.subj, b) || a.localeCompare(b));
      const isAllFiitjee = !prkState.chap && prkState.sourceGroup === 'fiitjee';
      const fjAtt = fiitjeeQs.filter(q => ansMap[q.id] && ansMap[q.id].status !== 'skip').length;
      const fjPct = fiitjeeQs.length ? Math.min(100, Math.round(fjAtt / fiitjeeQs.length * 100)) : 0;
      const fjProg = fjAtt > 0 ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + fjPct + '%"></div></div>' : '';

      chHtml += '<details class="marks-sb-group" id="prkGroupFiitjee"' + (fiitjeeOpen ? ' open' : '') + '>' +
        '<summary class="marks-sb-group-hdr">' +
          '<span class="marks-sb-group-title">' +
            '<span class="marks-sb-caret">&#9656;</span>' +
            '<span>FIITJEE (AITS)</span>' +
          '</span>' +
          '<span class="marks-sb-count">' + fiitjeeQs.length + '</span>' +
        '</summary>' +
        '<div class="marks-sb-sublist">' +
          '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAllFiitjee ? ' active' : '') + '" data-prkchap="__ALL_FIITJEE__" data-prksource="fiitjee">' +
            '<div class="marks-sb-item-row">' +
              '<span class="marks-sb-item-name" style="font-weight:600">All FIITJEE Chapters</span>' +
              '<span class="marks-sb-count">' + fiitjeeQs.length + '</span>' +
            '</div>' +
            fjProg +
          '</button>' +
          (() => {
            const fjAttByCh = {};
            fiitjeeQs.forEach(q => {
              if(ansMap[q.id] && ansMap[q.id].status !== 'skip' && q.chapter) fjAttByCh[q.chapter] = (fjAttByCh[q.chapter] || 0) + 1;
            });
            return keys.map(c => {
              const isAct = prkState.chap === c && prkState.sourceGroup === 'fiitjee';
              const totalC = byChFiitjee[c] || 0;
              const attC = fjAttByCh[c] || 0;
              const cProg = (attC > 0 && totalC > 0) ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + Math.min(100, Math.round(attC / totalC * 100)) + '%"></div></div>' : '';
              return '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAct ? ' active' : '') + '" data-prkchap="' + esc(c) + '" data-prksource="fiitjee">' +
                '<div class="marks-sb-item-row">' +
                  '<span class="marks-sb-item-name">' + esc(c) + '</span>' +
                  '<span class="marks-sb-count">' + totalC + '</span>' +
                '</div>' +
                cProg +
              '</button>';
            }).join('');
          })() +
        '</div>' +
      '</details>';
    }

    // 2. Quizrr QRP Dropdown Menu
    if(qrpQs.length > 0){
      const keys = Object.keys(byChQrp).sort((a,b) => {
        const mA = a.match(/QRP\s*(\d+)/i), mB = b.match(/QRP\s*(\d+)/i);
        const nA = mA ? parseInt(mA[1]) : 99, nB = mB ? parseInt(mB[1]) : 99;
        if(nA !== nB) return nA - nB;
        return a.localeCompare(b);
      });
      const isAllQrp = !prkState.chap && prkState.sourceGroup === 'qrp';
      const qrpAtt = qrpQs.filter(q => ansMap[q.id] && ansMap[q.id].status !== 'skip').length;
      const qrpPct = qrpQs.length ? Math.min(100, Math.round(qrpAtt / qrpQs.length * 100)) : 0;
      const qrpProg = qrpAtt > 0 ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + qrpPct + '%"></div></div>' : '';

      chHtml += '<details class="marks-sb-group" id="prkGroupQrp"' + (qrpOpen ? ' open' : '') + '>' +
        '<summary class="marks-sb-group-hdr">' +
          '<span class="marks-sb-group-title">' +
            '<span class="marks-sb-caret">&#9656;</span>' +
            '<span>Quizrr QRP</span>' +
          '</span>' +
          '<span class="marks-sb-count">' + qrpQs.length + '</span>' +
        '</summary>' +
        '<div class="marks-sb-sublist">' +
          '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAllQrp ? ' active' : '') + '" data-prkchap="__ALL_QRP__" data-prksource="qrp">' +
            '<div class="marks-sb-item-row">' +
              '<span class="marks-sb-item-name" style="font-weight:600">All QRPs</span>' +
              '<span class="marks-sb-count">' + qrpQs.length + '</span>' +
            '</div>' +
            qrpProg +
          '</button>' +
          keys.map(c => {
            const isAct = prkState.chap === c && prkState.sourceGroup === 'qrp';
            const m = c.match(/^(QRP\s*\d+):\s*(.*)$/i);
            const pill = m ? m[1] : '';
            const subTitle = m ? m[2] : c;
            const labelHtml = pill
              ? '<span style="display:inline-flex;align-items:center;gap:6px;min-width:0;overflow:hidden"><span class="qrp-ch-pill">' + esc(pill) + '</span><span class="marks-sb-item-name">' + esc(subTitle) + '</span></span>'
              : '<span class="marks-sb-item-name">' + esc(c) + '</span>';
            const cQs = qrpQs.filter(q => q.chapter === c);
            const cProg = getProgressHtml(cQs);
            return '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAct ? ' active' : '') + '" data-prkchap="' + esc(c) + '" data-prksource="qrp">' +
              '<div class="marks-sb-item-row">' +
                labelHtml +
                '<span class="marks-sb-count">' + byChQrp[c] + '</span>' +
              '</div>' +
              cProg +
            '</button>';
          }).join('') +
        '</div>' +
      '</details>';
    }

    // 3. Neeraj Kumar (if present)
    if(nkQs.length > 0){
      const keys = Object.keys(byChNk).sort((a,b) => a.localeCompare(b));
      const isAllNk = !prkState.chap && prkState.sourceGroup === 'neeraj';
      const nkAtt = nkQs.filter(q => ansMap[q.id] && ansMap[q.id].status !== 'skip').length;
      const nkPct = nkQs.length ? Math.min(100, Math.round(nkAtt / nkQs.length * 100)) : 0;
      const nkProg = nkAtt > 0 ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + nkPct + '%"></div></div>' : '';

      chHtml += '<details class="marks-sb-group" id="prkGroupNk"' + (nkOpen ? ' open' : '') + '>' +
        '<summary class="marks-sb-group-hdr">' +
          '<span class="marks-sb-group-title"><span class="marks-sb-caret">&#9656;</span><span>Neeraj Kumar (Physical)</span></span>' +
          '<span class="marks-sb-count">' + nkQs.length + '</span>' +
        '</summary>' +
        '<div class="marks-sb-sublist">' +
          '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAllNk ? ' active' : '') + '" data-prkchap="__ALL_NEERAJ__" data-prksource="neeraj">' +
            '<div class="marks-sb-item-row">' +
              '<span class="marks-sb-item-name" style="font-weight:600">All Neeraj Kumar</span>' +
              '<span class="marks-sb-count">' + nkQs.length + '</span>' +
            '</div>' +
            nkProg +
          '</button>' +
          keys.map(c => {
            const isAct = prkState.chap === c && prkState.sourceGroup === 'neeraj';
            const cQs = nkQs.filter(q => q.chapter === c);
            const cProg = getProgressHtml(cQs);
            return '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAct ? ' active' : '') + '" data-prkchap="' + esc(c) + '" data-prksource="neeraj">' +
              '<div class="marks-sb-item-row">' +
                '<span class="marks-sb-item-name">' + esc(c) + '</span>' +
                '<span class="marks-sb-count">' + byChNk[c] + '</span>' +
              '</div>' +
              cProg +
            '</button>';
          }).join('') +
        '</div>' +
      '</details>';
    }

    // 4. M.S. Chouhan (if present)
    if(msQs.length > 0){
      const keys = Object.keys(byChMs).sort((a,b) => a.localeCompare(b));
      const isAllMs = !prkState.chap && prkState.sourceGroup === 'mschouhan';
      const msAtt = msQs.filter(q => ansMap[q.id] && ansMap[q.id].status !== 'skip').length;
      const msPct = msQs.length ? Math.min(100, Math.round(msAtt / msQs.length * 100)) : 0;
      const msProg = msAtt > 0 ? '<div class="marks-sb-progress-wrap"><div class="marks-sb-progress-bar" style="width:' + msPct + '%"></div></div>' : '';

      chHtml += '<details class="marks-sb-group" id="prkGroupMs"' + (msOpen ? ' open' : '') + '>' +
        '<summary class="marks-sb-group-hdr">' +
          '<span class="marks-sb-group-title"><span class="marks-sb-caret">&#9656;</span><span>M.S. Chouhan (Organic)</span></span>' +
          '<span class="marks-sb-count">' + msQs.length + '</span>' +
        '</summary>' +
        '<div class="marks-sb-sublist">' +
          '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAllMs ? ' active' : '') + '" data-prkchap="__ALL_MSCHOUHAN__" data-prksource="mschouhan">' +
            '<div class="marks-sb-item-row">' +
              '<span class="marks-sb-item-name" style="font-weight:600">All M.S. Chouhan</span>' +
              '<span class="marks-sb-count">' + msQs.length + '</span>' +
            '</div>' +
            msProg +
          '</button>' +
          keys.map(c => {
            const isAct = prkState.chap === c && prkState.sourceGroup === 'mschouhan';
            const cQs = msQs.filter(q => q.chapter === c);
            const cProg = getProgressHtml(cQs);
            return '<button type="button" class="marks-sb-item marks-sb-subitem' + (isAct ? ' active' : '') + '" data-prkchap="' + esc(c) + '" data-prksource="mschouhan">' +
              '<div class="marks-sb-item-row">' +
                '<span class="marks-sb-item-name">' + esc(c) + '</span>' +
                '<span class="marks-sb-count">' + byChMs[c] + '</span>' +
              '</div>' +
              cProg +
            '</button>';
          }).join('') +
        '</div>' +
      '</details>';
    }

    chapBox.innerHTML = chHtml;
  }

  // Update breadcrumb
  const bcSubj = $('#prkBcSubj'), bcChap = $('#prkBcChap');
  if(bcSubj) bcSubj.textContent = prkState.subj;
  if(bcChap){
    const sourceLabel = prkState.sourceGroup === 'priority' ? 'Selected Bank'
      : prkState.sourceGroup === 'fiitjee' ? 'FIITJEE (AITS)'
      : prkState.sourceGroup === 'qrp' ? 'Quizrr QRP'
      : prkState.sourceGroup === 'neeraj' ? 'Neeraj Kumar'
      : prkState.sourceGroup === 'mschouhan' ? 'M.S. Chouhan'
      : 'All Chapters';
    bcChap.textContent = prkState.chap || sourceLabel;
  }

  // Wire search input listener if not already bound
  const searchInput = $('#prkChapSearch');
  if(searchInput && !searchInput.dataset.bound){
    searchInput.dataset.bound = '1';
    searchInput.addEventListener('input', applyPrkChapSearch);
  }
  applyPrkChapSearch();
}
window.openPracticeList = openPracticeList;
window.applyPrkChapSearch = applyPrkChapSearch;

function renderPracticeFilterYears(){
  const yrSel = $('#prkFilterYear');
  if(!yrSel) return;
  const inSubj = DB.filter(q => {
    if(q.paper === 'allen') return false;
    if(q.subject !== prkState.subj) return false;
    if(prkState.sourceGroup === 'priority'){
      const pInfo = window.PRIORITY_MAP && window.PRIORITY_MAP[q.id];
      if(!pInfo) return false;
      const qChap = pInfo.chapter || q.chapter;
      if(prkState.chap && qChap !== prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'fiitjee'){
      if(window.PRIORITY_MAP && window.PRIORITY_MAP[q.id]) return false;
      if(q.paper === 'qrp' || (q.id && String(q.id).startsWith('qrp_'))) return false;
      if(q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'))) return false;
      if(q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) return false;
      if(q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'hcv'){
      if(q.paper !== 'hcv' && !(q.id && String(q.id).startsWith('HCV_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'qrp'){
      if(q.paper !== 'qrp' && !(q.id && String(q.id).startsWith('qrp_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'neeraj'){
      if(q.paper !== 'neeraj' && !(q.id && String(q.id).startsWith('nk_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'mschouhan'){
      if(q.paper !== 'mschouhan' && !(q.id && String(q.id).startsWith('mschouhan_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else {
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    }
    return true;
  });
  const years = [...new Set(inSubj.map(q => q.year).filter(Boolean))].sort((a,b) => b - a);

  let opts = '<option value="all">All Years</option>';
  years.forEach(y => {
    opts += '<option value="' + y + '"' + (prkState.year === String(y) ? ' selected' : '') + '>' + y + '</option>';
  });
  yrSel.innerHTML = opts;
}

function getFilteredPracticeQuestions(){
  const ansMap = getPrkAnswers();
  const list = DB.filter(q => {
    if(q.paper === 'allen') return false;
    if(q.subject !== prkState.subj) return false;
    if(prkState.sourceGroup === 'priority'){
      const pInfo = window.PRIORITY_MAP && window.PRIORITY_MAP[q.id];
      if(!pInfo) return false;
      const qChap = pInfo.chapter || q.chapter;
      if(prkState.chap && qChap !== prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'fiitjee'){
      if(window.PRIORITY_MAP && window.PRIORITY_MAP[q.id]) return false;
      if(q.paper === 'qrp' || (q.id && String(q.id).startsWith('qrp_'))) return false;
      if(q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'))) return false;
      if(q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) return false;
      if(q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'hcv'){
      if(q.paper !== 'hcv' && !(q.id && String(q.id).startsWith('HCV_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'qrp'){
      if(q.paper !== 'qrp' && !(q.id && String(q.id).startsWith('qrp_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'neeraj'){
      if(q.paper !== 'neeraj' && !(q.id && String(q.id).startsWith('nk_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else if(prkState.sourceGroup === 'mschouhan'){
      if(q.paper !== 'mschouhan' && !(q.id && String(q.id).startsWith('mschouhan_'))) return false;
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    } else {
      if(prkState.chap && q.chapter !== prkState.chap) return false;
    }
    if(prkState.paper !== 'all'){
      if(prkState.paper === 'qrp'){
        if(q.paper !== 'qrp' && !String(q.id).startsWith('qrp_')) return false;
      } else if(prkState.paper === 'hcv'){
        if(q.paper !== 'hcv' && !String(q.id).startsWith('HCV_')) return false;
      } else {
        const isAdv = q.paper === 'adv' || (q.exam && /adv/i.test(q.exam)) || String(q.id).includes('_jee_adv') || q.subSource === 'jee_advanced' || q.level === 'Level 2' || q.exercise === 'Exercise II' || (q.paper === 'allen_jee' && (q.bank === 'O-2' || q.exercise === 'O-2'));
        const isMain = q.paper === 'main' || q.paper === 'qrp' || String(q.id).startsWith('qrp_') || (q.exam && /main/i.test(q.exam)) || String(q.id).includes('_jee_main') || q.subSource === 'jee_main' || q.level === 'Level 1' || q.exercise === 'Exercise I' || (q.paper === 'allen_jee' && (q.bank === 'O-1' || q.exercise === 'O-1'));
        if(prkState.paper === 'priority'){
          if(!window.PRIORITY_MAP || !window.PRIORITY_MAP[q.id]) return false;
        }
        if(prkState.paper === 'main' && !isMain) return false;
        if(prkState.paper === 'adv' && !isAdv) return false;
      }
    }
    if(prkState.year !== 'all' && String(q.year) !== String(prkState.year)) return false;
    if(prkState.type !== 'all'){
      const qTypeForFilter = q.paragraph ? 'paragraph' : q.type;
      if(qTypeForFilter !== prkState.type) return false;
    }

    const isAtt = Boolean(ansMap[q.id] && ansMap[q.id].status !== 'skip');
    if(prkState.hideAttempted && isAtt) return false;

    if(prkState.status === 'unattempted' && isAtt) return false;
    if(prkState.status === 'attempted' && !isAtt) return false;
    if(prkState.status === 'correct'){
      if(!ansMap[q.id] || ansMap[q.id].status !== 'ok') return false;
    }
    if(prkState.status === 'wrong'){
      if(!ansMap[q.id] || ansMap[q.id].status !== 'bad') return false;
    }

    return true;
  });

  list.sort((a,b) => {
    const yA = a.year || 0, yB = b.year || 0;
    if(prkState.sortOrder === 'asc') return yA - yB;
    return yB - yA;
  });

  return list;
}

function renderPracticeMain(){
  const topTitle = $('#prkTopbarTitle');
  const groupNames = {
    priority: 'Selected Bank',
    hcv: 'HC Verma',
    fiitjee: 'FIITJEE (AITS)',
    qrp: 'Quizrr QRP',
    neeraj: 'Neeraj Kumar',
    mschouhan: 'M.S. Chouhan'
  };
  const scopeLabel = prkState.chap || groupNames[prkState.sourceGroup] || 'All Chapters';
  if(topTitle) topTitle.textContent = 'Practice - ' + prkState.subj + ' - ' + scopeLabel;

  const heroTitle = $('#prkHeroTitle');
  if(heroTitle) heroTitle.textContent = prkState.chap ? prkState.chap : (scopeLabel + ' (' + prkState.subj + ')');

  const qs = getFilteredPracticeQuestions();
  prkFilteredList = qs;
  const ansMap = getPrkAnswers();
  let totalInScope = 0;
  let attInScope = 0;
  for(let i = 0; i < DB.length; i++){
    const q = DB[i];
    if(q.paper === 'allen') continue;
    if(q.subject !== prkState.subj) continue;
    if(prkState.sourceGroup === 'priority'){
      const pInfo = window.PRIORITY_MAP && window.PRIORITY_MAP[q.id];
      if(!pInfo) continue;
      const qChap = pInfo.chapter || q.chapter;
      if(prkState.chap && qChap !== prkState.chap && q.chapter !== prkState.chap) continue;
    } else if(prkState.sourceGroup === 'fiitjee'){
      if(window.PRIORITY_MAP && window.PRIORITY_MAP[q.id]) continue;
      if(q.paper === 'qrp' || (q.id && String(q.id).startsWith('qrp_'))) continue;
      if(q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'))) continue;
      if(q.paper === 'neeraj' || (q.id && String(q.id).startsWith('nk_'))) continue;
      if(q.paper === 'mschouhan' || (q.id && String(q.id).startsWith('mschouhan_'))) continue;
      if(prkState.chap && q.chapter !== prkState.chap) continue;
    } else if(prkState.sourceGroup === 'hcv'){
      if(q.paper !== 'hcv' && !(q.id && String(q.id).startsWith('HCV_'))) continue;
      if(prkState.chap && q.chapter !== prkState.chap) continue;
    } else if(prkState.sourceGroup === 'qrp'){
      if(q.paper !== 'qrp' && !(q.id && String(q.id).startsWith('qrp_'))) continue;
      if(prkState.chap && q.chapter !== prkState.chap) continue;
    } else if(prkState.sourceGroup === 'neeraj'){
      if(q.paper !== 'neeraj' && !(q.id && String(q.id).startsWith('nk_'))) continue;
      if(prkState.chap && q.chapter !== prkState.chap) continue;
    } else if(prkState.sourceGroup === 'mschouhan'){
      if(q.paper !== 'mschouhan' && !(q.id && String(q.id).startsWith('mschouhan_'))) continue;
      if(prkState.chap && q.chapter !== prkState.chap) continue;
    } else {
      if(prkState.chap && q.chapter !== prkState.chap) continue;
    }
    totalInScope++;
    if(ansMap[q.id] && ansMap[q.id].status !== 'skip') attInScope++;
  }

  const statsEl = $('#prkHeroStats');
  if(statsEl) statsEl.textContent = 'Showing ' + Math.min(prkVisibleLimit, qs.length) + ' of ' + qs.length + ' Qs (' + totalInScope + ' total)';

  const bcCount = $('#prkBcCount');
  if(bcCount) bcCount.textContent = '(' + qs.length + ' Qs)';

  const sortEl = $('#prkSortBtn');
  if(sortEl) sortEl.innerHTML = prkState.sortOrder === 'asc' ? '&uarr;&darr; Year-wise (Old to New)' : '&uarr;&darr; Year-wise (New to Old)';

  const cont = $('#prkQuestionsContainer');
  if(!cont) return;

  if(!qs.length){
    cont.innerHTML = '<div class="muted" style="text-align:center;padding:48px 16px;background:var(--surface);border:1px solid var(--line);border-radius:6px">' +
      'No questions match the current filters. Adjust your filters or switch chapters.</div>';
    return;
  }

  // Render clean, minimalist question preview rows (Marks style list) with lazy pagination
  const slice = qs.slice(0, prkVisibleLimit);
  let html = slice.map((q, idx) => {
    return renderPracticeRowHtml(q, idx, ansMap);
  }).join('');

  if(prkVisibleLimit < qs.length){
    html += '<div style="text-align:center;padding:24px 16px">' +
      '<button id="prkLoadMoreBtn" type="button" class="btn" style="padding:10px 28px;font-size:14px;background:var(--brand);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.1)">' +
        'Load More Questions (' + prkVisibleLimit + ' of ' + qs.length + ')' +
      '</button>' +
    '</div>';
  }
  cont.innerHTML = html;

  const loadMoreBtn = $('#prkLoadMoreBtn');
  if(loadMoreBtn){
    loadMoreBtn.onclick = () => {
      prkVisibleLimit += 50;
      renderPracticeMain();
    };
  }
}

function renderPracticeRowHtml(q, idx, passedAnsMap){
  const ansMap = passedAnsMap || getPrkAnswers();
  const savedAns = ansMap[q.id];
  const isAttempted = Boolean(savedAns && savedAns.status !== 'skip');
  const isCorrect = savedAns && savedAns.status === 'ok';
  const isWrong = savedAns && savedAns.status === 'bad';

  let rowClasses = 'marks-q-row';
  if(isAttempted) rowClasses += ' attempted';
  if(isCorrect) rowClasses += ' attempted-correct';
  else if(isWrong) rowClasses += ' attempted-wrong';

  const effType = q.paragraph ? 'paragraph' : (q.type || 'single');
  const typeLabel = q.paragraph ? 'Comprehension' : (QTS[effType] || effType.toUpperCase());
  const tag = cleanSourceTag(q);
  const isBm = BM.has(q.id);

  let statusBadge = '';
  if(isCorrect) statusBadge = '<span class="marks-q-badge correct" style="font-size:11px;padding:1px 6px">Correct</span>';
  else if(isWrong) statusBadge = '<span class="marks-q-badge wrong" style="font-size:11px;padding:1px 6px">Incorrect</span>';
  else if(isAttempted) statusBadge = '<span class="marks-q-badge" style="font-size:11px;padding:1px 6px">Attempted</span>';

  // Question text preview
  let previewText = '';
  const qInfo = (typeof questionTextsMap !== 'undefined' && questionTextsMap[q.id]) ? questionTextsMap[q.id] : null;
  if(q.previewText && String(q.previewText).trim()){
    previewText = String(q.previewText).trim();
  } else if(qInfo && qInfo.preview){
    previewText = qInfo.preview;
  } else if(q.text && String(q.text).trim()){
    const clean = stripWatermarks(q.text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if(clean) previewText = clean.length > 150 ? (clean.slice(0, 150) + '...') : clean;
  }
  if(!previewText){
    const yrStr = q.year ? (' ' + q.year) : '';
    const isPri = Boolean(window.PRIORITY_MAP && window.PRIORITY_MAP[q.id]);
  const isHcv = q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'));
  const paperName = isPri ? 'Selected Bank' : (isHcv ? 'HC Verma' : ((q.paper === 'qrp' || String(q.id).startsWith('qrp_')) ? 'Quizrr QRP' : (q.paper === 'adv' ? 'JEE Advanced' : (q.paper === 'main' ? 'JEE Main' : 'AITS'))));
    const ch = q.chapter || q.subject || 'Practice Question';
    previewText = (tag ? (tag + ' - ') : (paperName + yrStr + ' - ')) + ch + ' (' + typeLabel + ')';
  }

  const metaParts = [];
  if(tag) metaParts.push('<span>' + esc(tag) + '</span>');
  if(q.chapter) metaParts.push('<span>' + esc(q.chapter) + '</span>');
  metaParts.push('<span class="marks-q-badge" style="font-size:11px;padding:1px 6px">' + esc(typeLabel) + '</span>');
  if(q.solution_timeline_url || q.solution_video_url){
    metaParts.push('<span class="marks-q-badge" style="background:rgba(239,68,68,0.12);color:#dc2626;border-color:rgba(239,68,68,0.25);font-size:11px;padding:1px 6px;font-weight:600">▶ Video Sol</span>');
  }
  if(statusBadge) metaParts.push(statusBadge);

  return '<div class="' + rowClasses + '" data-prkqid="' + esc(q.id) + '" data-idx="' + idx + '">' +
    '<div class="marks-q-num-box">' + (idx + 1) + '</div>' +
    '<div class="marks-q-row-body">' +
      '<div class="marks-q-row-text">' + esc(previewText) + '</div>' +
      '<div class="marks-q-row-meta">' + metaParts.join(' <span>&bull;</span> ') + '</div>' +
    '</div>' +
    '<div style="flex:none;display:flex;align-items:center;gap:10px">' +
      '<button type="button" class="bmb" data-bm="' + esc(q.id) + '" aria-pressed="' + isBm + '" title="Bookmark" style="padding:4px">' + STAR + '</button>' +
      '<span style="font-size:15px;color:var(--muted);user-select:none">&rarr;</span>' +
    '</div>' +
  '</div>';
}

let prkCurrentDetailIdx = 0;
let prkFilteredList = [];
let prkQTimerInterval = null;
let prkQSeconds = 0;

function startPrkQTimer(){
  clearInterval(prkQTimerInterval);
  prkQSeconds = 0;
  updatePrkTimerDisplay();
  prkQTimerInterval = setInterval(() => {
    prkQSeconds++;
    updatePrkTimerDisplay();
  }, 1000);
}

function stopPrkQTimer(){
  clearInterval(prkQTimerInterval);
}

function updatePrkTimerDisplay(){
  const el = $('#prkTimerText');
  if(!el) return;
  const m = Math.floor(prkQSeconds / 60);
  const s = prkQSeconds % 60;
  el.textContent = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
}

function openPracticeDetail(target){
  const qs = getFilteredPracticeQuestions();
  prkFilteredList = qs;
  if(!qs.length) return;

  if(typeof target === 'number'){
    prkCurrentDetailIdx = Math.max(0, Math.min(target, qs.length - 1));
  } else if(typeof target === 'string'){
    const found = qs.findIndex(q => q.id === target);
    prkCurrentDetailIdx = found !== -1 ? found : 0;
  } else {
    prkCurrentDetailIdx = 0;
  }

  show('scrPracticeDetail');
  renderPracticeDetailView();
}

function renderPracticeDetailView(){
  updateSessionAttemptedCounters();
  if(!prkFilteredList.length) return;
  if(prkCurrentDetailIdx < 0) prkCurrentDetailIdx = 0;
  if(prkCurrentDetailIdx >= prkFilteredList.length) prkCurrentDetailIdx = prkFilteredList.length - 1;

  const q = prkFilteredList[prkCurrentDetailIdx];
  if(!q) return;

  if(!q.options && !q.images && q.subject){
    ensureSubjectLoaded(q.subject).then(() => {
      // Re-fetch question from DB to get newly loaded options/images
      const updated = findQuestionById(q.id);
      if(updated){
        prkFilteredList[prkCurrentDetailIdx] = updated;
        renderPracticeDetailView();
      }
    });
  }

  const isPri = Boolean(window.PRIORITY_MAP && window.PRIORITY_MAP[q.id]);
  const isHcv = q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'));
  const paperName = isPri ? 'Selected Bank' : (isHcv ? 'HC Verma' : ((q.paper === 'qrp' || String(q.id).startsWith('qrp_')) ? 'Quizrr QRP' : (q.paper === 'adv' ? 'JEE Advanced' : (q.paper === 'main' ? 'JEE Main' : 'AITS'))));
  const breadcrumbEl = $('#prkDetailBreadcrumb');
  if(breadcrumbEl){
    const chapPart = prkState.chap || (isPri && window.PRIORITY_MAP[q.id] ? window.PRIORITY_MAP[q.id].chapter : q.chapter);
    breadcrumbEl.textContent = paperName + (chapPart ? (' >> ' + chapPart) : (' >> ' + prkState.subj));
  }

  const qNumEl = $('#prkDetailQNum');
  if(qNumEl) qNumEl.textContent = 'Q ' + (prkCurrentDetailIdx + 1);

  const qMetaEl = $('#prkDetailQMeta');
  if(qMetaEl){
    if(isHcv){
      const sec = q.hcv_section || 'Selected';
      const num = q.hcv_qnum ? (' Q' + q.hcv_qnum) : '';
      const vidTag = (q.solution_timeline_url || q.solution_video_url) ? ' &bull; <span style="background:rgba(239,68,68,0.12);color:#dc2626;padding:2px 8px;border-radius:12px;font-weight:600;font-size:12px">▶ Video Solution' + (q.solution_timestamp ? (' @ ' + esc(q.solution_timestamp)) : '') + '</span>' : '';
      qMetaEl.innerHTML = '<span style="color:var(--brand);font-weight:700">HC Verma</span> &bull; <span>' + esc(sec + num) + '</span> &bull; <span>' + esc(q.chapter || '') + '</span>' + vidTag;
    } else if(isPri && window.PRIORITY_MAP[q.id]){
      const pInfo = window.PRIORITY_MAP[q.id];
      qMetaEl.innerHTML = '<span style="color:var(--brand);font-weight:700">Topic: ' + esc(pInfo.topic || '') + '</span> &bull; <span>JEE Main ' + esc(pInfo.year || q.year || 2025) + '</span> &bull; <span>' + esc(pInfo.chapter || q.chapter || '') + '</span>';
    } else {
      const yrStr = q.year ? (' ' + q.year) : '';
      const src = cleanSourceTag(q) || (paperName + yrStr);
      qMetaEl.textContent = src + (q.chapter ? (' · ' + q.chapter) : '') + ' (' + (q.paragraph ? 'Comprehension' : (QTS[q.type] || q.type)) + ')';
    }
  }

  const bmBtn = $('#prkDetailBmBtn');
  if(bmBtn){
    bmBtn.setAttribute('data-bm', q.id);
    bmBtn.setAttribute('aria-pressed', String(BM.has(q.id)));
  }

  const rptBtn = $('#prkDetailRptBtn');
  if(rptBtn){
    rptBtn.setAttribute('data-rpt', q.id);
    const isRpt = isQuestionReported(q.id);
    rptBtn.textContent = isRpt ? 'Reported' : 'Report';
    rptBtn.style.color = isRpt ? '#d32f2f' : 'inherit';
  }

  // Prev / Next button state
  const prevBtn = $('#prkPrevQBtn');
  if(prevBtn){
    prevBtn.disabled = prkCurrentDetailIdx <= 0;
  }
  const nextBtn = $('#prkNextQBtn');
  if(nextBtn){
    nextBtn.disabled = prkCurrentDetailIdx >= prkFilteredList.length - 1;
  }

  // Bottom Check / Action button state
  const ansMap = getPrkAnswers();
  const savedAns = ansMap[q.id];
  const solBtn = $('#prkBottomSolBtn');
  if(solBtn){
    if(savedAns){
      solBtn.textContent = 'Hide Solution';
    } else {
      solBtn.textContent = (isHcv && (q.solution_timeline_url || q.solution_video_url)) ? '▶ Video Solution' : 'Show Solution';
    }
  }
  const checkBtn = $('#prkBottomCheckBtn');
  if(checkBtn){
    if(savedAns){
      checkBtn.textContent = 'Clear & Try Again';
      checkBtn.style.background = 'var(--surface-2)';
      checkBtn.style.color = 'var(--fg)';
      checkBtn.style.border = '1px solid var(--line)';
    } else {
      checkBtn.textContent = 'Check Answer';
      checkBtn.style.background = '#2563eb';
      checkBtn.style.color = '#fff';
      checkBtn.style.border = 'none';
    }
  }

  // Render question card
  const cont = $('#prkDetailCardContainer');
  if(cont){
    cont.innerHTML = renderPracticeCardHtml(q, prkCurrentDetailIdx);
    hydrateZipImages(cont);
    typeset(cont);
  }

  // Start question stopwatch & reset zoom (HCV questions default to 75%, others default to 100%)
  const isHcv = q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'));
  const defaultZoom = isHcv ? 75 : 100;
  setPrkZoom(defaultZoom);
  startPrkQTimer();
}

function prevDetailQuestion(){
  if(prkCurrentDetailIdx > 0){
    prkCurrentDetailIdx--;
    renderPracticeDetailView();
    window.scrollTo(0, 0);
  }
}

function nextDetailQuestion(){
  if(prkCurrentDetailIdx < prkFilteredList.length - 1){
    prkCurrentDetailIdx++;
    renderPracticeDetailView();
    window.scrollTo(0, 0);
  }
}

function renderPracticeCardHtml(q, idx){
  const ansMap = getPrkAnswers();
  const savedAns = ansMap[q.id];
  const isAttempted = Boolean(savedAns && savedAns.status !== 'skip');
  const isCorrect = savedAns && savedAns.status === 'ok';
  const isWrong = savedAns && savedAns.status === 'bad';

  const effType = q.paragraph ? (q.rawType || 'single') : (q.rawType || q.type || 'single');

  // Passage
  let passageHtml = '';
  const hasPassageImgs = !!(q.paragraph && q.passageImages && q.passageImages.length);
  if(q.paragraph && (hasPassageImgs || q.passageText)){
    passageHtml = '<div style="margin-bottom:16px;padding:14px 18px;background:var(--surface-2);border-left:3px solid var(--brand);border-radius:0 8px 8px 0;font-size:14px;line-height:1.6">' +
      '<div style="font-weight:700;color:var(--brand);margin-bottom:8px">Common Paragraph / Passage:</div>' +
      (!hasPassageImgs && q.passageText ? '<div style="margin-bottom:8px">' + rich(stripWatermarks(q.passageText)) + '</div>' : '') +
      (hasPassageImgs ? ('<div class="marks-q-img-scroll-wrap">' + q.passageImages.map(u => imageMarkup(u, 'Passage figure', 'practice-svg', q.crop)).join('') + '</div>') : '') +
    '</div>';
  }

  // Question figures/diagrams (primary question display)
  const qImgs = (q.images || []).filter(u => !(q.passageImages || []).includes(u));
  const hasImgs = qImgs && qImgs.length > 0;
  const imgsHtml = hasImgs ? ('<div class="marks-q-img-scroll-wrap">' + qImgs.map(u => imageMarkup(u, 'Question figure', 'practice-svg', q.crop)).join('') + '</div>') : '';

  // Fallback text (only shown if question has no image)
  const qInfo = (typeof questionTextsMap !== 'undefined' && questionTextsMap[q.id]) ? questionTextsMap[q.id] : null;
  const rawText = (q.stem || q.text || (qInfo && qInfo.full) || '').trim();
  let textHtml = '';
  if(!hasImgs && rawText){
    textHtml = '<div class="marks-detail-qtext">' + rich(stripWatermarks(rawText)) + '</div>';
  }

  // Zoom Bar (Smooth in-card zooming)
  const isHcvCard = q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_'));
  const defZoomVal = isHcvCard ? 75 : 100;
  const zoomBarHtml = '<div class="marks-zoom-bar">' +
    '<button type="button" class="marks-zoom-btn" id="prkZoomOutBtn" title="Zoom Out">&minus;</button>' +
    '<span id="prkZoomLevelText" style="font-size:12px;font-family:monospace;font-weight:600">' + defZoomVal + '%</span>' +
    '<button type="button" class="marks-zoom-btn" id="prkZoomInBtn" title="Zoom In">&plus;</button>' +
    '<button type="button" class="marks-zoom-btn" id="prkZoomResetBtn" title="Reset Zoom" style="font-size:11px;padding:3px 8px">Reset</button>' +
  '</div>';

  // Options Display (Cards with full options for Match the following / text options, grid for label-only)
  let interactHtml = '';
  if(effType === 'numerical'){
    const userVal = savedAns ? savedAns.val : '';
    interactHtml = '<div style="margin-top:24px">' +
      '<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--muted)">Enter Numerical Value:</div>' +
      '<div class="marks-q-numinput-wrap" style="max-width:320px">' +
        '<input type="text" class="marks-q-numinput" data-prknuminput="' + esc(q.id) + '" placeholder="e.g. 4.25" value="' + esc(userVal != null ? userVal : '') + '">' +
      '</div>' +
    '</div>';
  } else {
    const isMulti = effType === 'multi';
    const chosenList = savedAns ? (Array.isArray(savedAns.val) ? savedAns.val : [savedAns.val]) : [];
    const correctList = Array.isArray(q.ans) ? q.ans : (q.ans != null ? [q.ans] : []);
    const numOpts = (Array.isArray(q.options) && q.options.length) ? q.options.length : 4;
    const hasCustomOpts = Array.isArray(q.options) && q.options.length > 0 && !q.labelOnly;
    const optLabels = Array.from({length: numOpts}, (_, i) => {
      if(hasCustomOpts && q.options[i] != null && String(q.options[i]).trim()){
        return rich(stripWatermarks(String(q.options[i])));
      }
      return 'Option (' + (LET[i] || (i+1)) + ')';
    });

    interactHtml = '<div class="marks-options-grid">' + optLabels.map((label, oIdx) => {
      let optClass = 'marks-opt-chip';
      const isSelected = chosenList.includes(oIdx);
      if(isSelected) optClass += ' selected';
      if(savedAns){
        if(correctList.includes(oIdx)) optClass += ' correct';
        else if(isSelected) optClass += ' wrong';
      }
      return '<div class="' + optClass + '" data-prkopt="' + esc(q.id) + '" data-oidx="' + oIdx + '" data-multi="' + (isMulti ? '1' : '0') + '">' +
        '<div class="marks-opt-circle">' + LET[oIdx] + '</div>' +
        '<div class="marks-opt-text">' + label + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  // Solution Box
  let solHtml = '';
  if(savedAns){
    const hasVideo = Boolean(q.solution_timeline_url || q.solution_video_url);
    const videoUrl = q.solution_timeline_url || q.solution_video_url;
    
    let videoSolCardHtml = '';
    if(hasVideo){
      videoSolCardHtml = '<div class="marks-hcv-video-banner">' +
        '<div style="display:flex;align-items:center;gap:12px;min-width:220px">' +
          '<div style="width:38px;height:38px;border-radius:50%;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(239,68,68,0.35)">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>' +
          '</div>' +
          '<div>' +
            '<div style="font-weight:700;font-size:14.5px;color:var(--fg)">HC Verma Video Solution</div>' +
            '<div style="font-size:12.5px;color:var(--muted);margin-top:2px">' +
              (q.solution_timestamp ? ('Timestamp: <strong style="color:var(--fg);font-family:monospace;font-size:13px">' + esc(q.solution_timestamp) + '</strong>') : 'Full Chapter Video') +
              (q.hcv_section ? (' &bull; ' + esc(q.hcv_section)) : '') +
              (q.hcv_qnum ? (' Q' + esc(q.hcv_qnum)) : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<a href="' + esc(videoUrl) + '" target="_blank" rel="noopener noreferrer" class="marks-hcv-video-btn">' +
          '<span>Watch on YouTube</span>' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>' +
        '</a>' +
      '</div>';
    }

    const solText = q.original_answer_mathjax || q.solution || q.original_answer || '';
    const hasSolText = Boolean(solText && solText.trim());
    const hasSolImgs = Boolean(q.solImages && q.solImages.length);

    solHtml = '<div class="marks-sol-box" style="margin-top:28px">' +
      '<div style="margin-bottom:12px;font-size:14.5px">' +
        '<b>Correct Key:</b> <span style="font-weight:700;color:var(--good,#15803d);margin-right:12px">' + esc(keyText(q)) + '</span>' +
        (savedAns.status !== 'skip' ? ('&bull; <b style="margin-left:12px">Your Answer:</b> <span style="font-weight:700">' + esc(fmtAns(q, savedAns.val)) + '</span>') : '<span class="muted" style="margin-left:8px">(Solution viewed)</span>') +
      '</div>' +
      videoSolCardHtml +
      ((hasSolText || hasSolImgs) ?
        ('<div><b>' + (isHcv ? 'Book Answer / Solution:' : 'Solution:') + '</b><div style="margin-top:8px;font-size:15.5px;line-height:1.65;font-family:var(--font-q)">' + rich(solText) + (q.solImages || []).map(u => imageMarkup(u, 'Solution figure', 'practice-svg')).join('') + '</div></div>') :
        (!hasVideo ? '<div class="muted">No extended solution image was attached in archive.</div>' : '')) +
    '</div>';
  }

  return '<article class="marks-detail-card" id="prkCard_' + esc(q.id) + '" data-qid="' + esc(q.id) + '">' +
    zoomBarHtml +
    '<div class="marks-q-body">' +
      passageHtml +
      textHtml +
      imgsHtml +
      interactHtml +
    '</div>' +
    (solHtml ? solHtml : '') +
  '</article>';
}

let prkCurrentZoom = 100;

function setPrkZoom(zoomPercent){
  prkCurrentZoom = Math.max(50, Math.min(300, zoomPercent));
  const el = document.getElementById('prkZoomLevelText');
  if(el) el.textContent = prkCurrentZoom + '%';
  const svgs = document.querySelectorAll('#prkDetailCardContainer .vector-inline-svg, #prkDetailCardContainer .qimg');
  svgs.forEach(item => {
    if(prkCurrentZoom === 100){
      item.style.setProperty('width', '100%', 'important');
      item.style.setProperty('max-width', '100%', 'important');
      item.style.setProperty('min-width', '100%', 'important');
    } else {
      const zStr = prkCurrentZoom + '%';
      item.style.setProperty('width', zStr, 'important');
      item.style.setProperty('max-width', (prkCurrentZoom > 100) ? 'none' : zStr, 'important');
      item.style.setProperty('min-width', (prkCurrentZoom > 100) ? zStr : '0', 'important');
    }
    item.style.transform = 'none';
    item.style.transition = 'width 0.15s ease, min-width 0.15s ease';
  });
}

function handlePrkOptionClick(qId, oIdx, isMulti){
  const card = document.getElementById('prkCard_' + qId);
  if(!card) return;

  // Don't change selection if already checked/attempted
  const ansMap = getPrkAnswers();
  if(ansMap[qId]) return;

  if(!isMulti){
    card.querySelectorAll('.marks-opt-chip').forEach(el => el.classList.remove('selected'));
    const optEl = card.querySelector('.marks-opt-chip[data-oidx="' + oIdx + '"]');
    if(optEl) optEl.classList.add('selected');
  } else {
    const optEl = card.querySelector('.marks-opt-chip[data-oidx="' + oIdx + '"]');
    if(optEl) optEl.classList.toggle('selected');
  }
}

function handlePrkBottomCheck(){
  if(!prkFilteredList.length) return;
  const q = prkFilteredList[prkCurrentDetailIdx];
  if(!q) return;

  const ansMap = getPrkAnswers();
  const savedAns = ansMap[q.id];
  if(savedAns){
    // Retry / Clear
    handlePrkRetry(q.id);
    return;
  }

  const effType = q.rawType || q.type || 'single';
  const card = document.getElementById('prkCard_' + q.id);
  if(!card) return;

  if(effType === 'numerical'){
    const input = card.querySelector('input[data-prknuminput]');
    const val = input ? input.value.trim() : '';
    if(!val){
      alert('Please enter a numerical answer.');
      return;
    }
    const parsed = parseFloat(val);
    let isOk = false;
    if(q.range && q.range.length >= 2){
      isOk = parsed >= q.range[0] && parsed <= q.range[1];
    } else {
      isOk = Math.abs(parsed - parseFloat(q.ans)) < 0.01;
    }
    savePrkAnswer(q.id, val, isOk ? 'ok' : 'bad');
    renderPracticeDetailView();
  } else {
    const isMulti = effType === 'multi';
    const selected = [...card.querySelectorAll('.marks-opt-chip.selected')].map(el => parseInt(el.dataset.oidx, 10));
    if(!selected.length){
      alert('Please select an option before checking.');
      return;
    }
    const correctList = Array.isArray(q.ans) ? q.ans : (q.ans != null ? [q.ans] : []);
    let isOk = false;
    if(isMulti){
      isOk = selected.length === correctList.length && selected.every(x => correctList.includes(x));
      savePrkAnswer(q.id, selected, isOk ? 'ok' : 'bad');
    } else {
      isOk = correctList.includes(selected[0]);
      savePrkAnswer(q.id, selected[0], isOk ? 'ok' : 'bad');
    }
    renderPracticeDetailView();
  }
}

function handlePrkRetry(qId){
  const map = getPrkAnswers();
  delete map[qId];
  invalidatePrkAnswersCache();
  try { store.set(PRK_ANS_KEY, JSON.stringify(map)); } catch(e){}
  if(ATT.has(qId)){
    ATT.delete(qId);
    saveAtt();
  }
  renderPracticeDetailView();
}

function handlePrkShowSol(qId){
  if(!qId && prkFilteredList.length){
    const curr = prkFilteredList[prkCurrentDetailIdx];
    if(curr) qId = curr.id;
  }
  const q = findQuestionById(qId);
  if(!q) return;
  const map = getPrkAnswers();
  if(map[qId]){
    handlePrkRetry(qId);
  } else {
    savePrkAnswer(qId, null, 'skip');
    renderPracticeDetailView();
  }
}

// Global event delegation for Practice portal
document.addEventListener('click', e => {
  const previewImage = e.target.closest('img.qimg');
  if(previewImage){
    e.preventDefault();
    const src = previewImage.currentSrc || previewImage.src;
    if(src && src !== 'data:,'){
      const alt = previewImage.alt || 'Question figure';
      openModal('<div class="image-preview-title"><span>' + esc(alt) + '</span><button type="button" class="btn" id="closeImagePreview">Close</button></div><div class="image-preview"><img src="' + esc(src) + '" alt="' + esc(alt) + '"></div>', () => {
        const close = $('#closeImagePreview'); if(close) close.onclick = closeModal;
      });
    }
    return;
  }

  // Row click in practice list
  const qRow = e.target.closest('.marks-q-row[data-prkqid]');
  if(qRow){
    const bmBtn = e.target.closest('.bmb, button[data-bm]');
    if(bmBtn){
      const qId = bmBtn.dataset.bm || qRow.dataset.prkqid;
      toggleBm(qId);
      bmBtn.setAttribute('aria-pressed', String(BM.has(qId)));
      return;
    }
    const qId = qRow.dataset.prkqid;
    openPracticeDetail(qId);
    return;
  }

  // Option chip click
  const optChip = e.target.closest('.marks-opt-chip[data-prkopt]');
  if(optChip){
    const qId = optChip.dataset.prkopt;
    const oIdx = parseInt(optChip.dataset.oidx, 10);
    const isMulti = optChip.dataset.multi === '1';
    handlePrkOptionClick(qId, oIdx, isMulti);
    return;
  }

  // Subfilter chip
  const subChip = e.target.closest('.marks-subfilter-chip[data-prksubtag]');
  if(subChip){
    const tag = subChip.dataset.prksubtag;
    prkState.type = tag;
    document.querySelectorAll('.marks-subfilter-chip').forEach(c => c.classList.toggle('active', c.dataset.prksubtag === tag));
    const sel = $('#prkFilterType');
    if(sel) sel.value = tag;
    renderPracticeMain();
    return;
  }

  // Mobile sidebar overlay
  if(e.target && e.target.id === 'prkSidebarOverlay'){
    $('#prkSidebar')?.classList.remove('open');
    $('#prkSidebarOverlay')?.classList.remove('show');
    return;
  }

  const b = e.target.closest('button, .pattern-pill');
  if(!b) return;

  if(b.id === 'prkBottomCheckBtn'){
    handlePrkBottomCheck();
  }
  else if(b.id === 'prkBottomSolBtn'){
    handlePrkShowSol();
  }
  else if(b.id === 'prkPrevQBtn'){
    prevDetailQuestion();
  }
  else if(b.id === 'prkNextQBtn'){
    nextDetailQuestion();
  }
  else if(b.id === 'prkDetailListBtn' || b.id === 'prkDetailBackToListBtn'){
    stopPrkQTimer();
    show('scrPracticeList');
    renderPracticeMain();
    const targetRow = document.querySelector('.marks-q-row[data-idx="' + prkCurrentDetailIdx + '"]');
    if(targetRow) targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  else if(b.id === 'prkZoomInBtn'){
    setPrkZoom(prkCurrentZoom + 25);
  }
  else if(b.id === 'prkZoomOutBtn'){
    setPrkZoom(prkCurrentZoom - 25);
  }
  else if(b.id === 'prkZoomResetBtn'){
    const q = prkFilteredList[prkCurrentDetailIdx];
    const isHcv = q && (q.paper === 'hcv' || (q.id && String(q.id).startsWith('HCV_')));
    setPrkZoom(isHcv ? 75 : 100);
  }
  else if(b.closest('#prkDetailBmBtn')){
    if(!prkFilteredList.length) return;
    const q = prkFilteredList[prkCurrentDetailIdx];
    if(q){
      toggleBm(q.id);
      const isBm = BM.has(q.id);
      const btn = $('#prkDetailBmBtn');
      if(btn) btn.setAttribute('aria-pressed', String(isBm));
    }
  }
  else if(b.closest('#prkDetailRptBtn')){
    if(!prkFilteredList.length) return;
    const q = prkFilteredList[prkCurrentDetailIdx];
    if(q) openReportModal(q.id);
  }
  else if(b.id === 'prkSidebarToggle' || b.closest('#prkSidebarToggle')){
    $('#prkSidebar')?.classList.toggle('open');
    $('#prkSidebarOverlay')?.classList.toggle('show');
  }
  else if(b.id === 'prkResetAttemptBtn'){
    resetAllPracticeAttempts();
  }
  else if(b.closest('#prkDetailSessionPill, #prkTopSessionPill, #prkListSessionPill, #prkHeroSessionStat')){
    const count = getSessionAttemptedCount();
    if(count > 0){
      if(confirm('You have attempted ' + count + ' question' + (count === 1 ? '' : 's') + ' in this session.\n\nReset the session counter to 0?')){
        resetSessionAttempted();
      }
    } else {
      alert('Session counter: 0 questions attempted so far in this session.');
    }
  }
  else if(b.closest('[data-prksubj]')){
    const s = b.closest('[data-prksubj]').dataset.prksubj;
    prkState.subj = s;
    prkState.chap = null;
    prkState.sourceGroup = null;
    renderPracticeScreen();
    if(window.innerWidth <= 900){
      $('#prkSidebar')?.classList.remove('open');
      $('#prkSidebarOverlay')?.classList.remove('show');
    }
  }
  else if(b.closest('#prkSourceTabs [data-prksrcgroup]')){
    const btn = b.closest('#prkSourceTabs [data-prksrcgroup]');
    const grp = btn.dataset.prksrcgroup;
    prkState.chap = null;
    prkState.sourceGroup = (grp === 'all') ? null : grp;
    renderPracticeSidebar();
    renderPracticeFilterYears();
    renderPracticeMain();
  }
  else if(b.closest('.marks-sb-item[data-prkchap]')){
    const item = b.closest('.marks-sb-item[data-prkchap]');
    const c = item.dataset.prkchap;
    const src = item.dataset.prksource || null;
    if(c === '__ALL__'){
      prkState.chap = null;
      prkState.sourceGroup = null;
    } else if(c === '__ALL_PRIORITY__'){
      prkState.chap = null;
      prkState.sourceGroup = 'priority';
    } else if(c === '__ALL_HCV__'){
      prkState.chap = null;
      prkState.sourceGroup = 'hcv';
    } else if(c === '__ALL_FIITJEE__'){
      prkState.chap = null;
      prkState.sourceGroup = 'fiitjee';
    } else if(c === '__ALL_QRP__'){
      prkState.chap = null;
      prkState.sourceGroup = 'qrp';
    } else if(c === '__ALL_NEERAJ__'){
      prkState.chap = null;
      prkState.sourceGroup = 'neeraj';
    } else if(c === '__ALL_MSCHOUHAN__'){
      prkState.chap = null;
      prkState.sourceGroup = 'mschouhan';
    } else {
      prkState.chap = c;
      prkState.sourceGroup = src;
    }
    renderPracticeSidebar();
    renderPracticeFilterYears();
    renderPracticeMain();
    if(window.innerWidth <= 900){
      $('#prkSidebar')?.classList.remove('open');
      $('#prkSidebarOverlay')?.classList.remove('show');
    }
  }
  else if(b.closest('#prkToggleHideAttempted')){
    prkState.hideAttempted = !prkState.hideAttempted;
    const btn = $('#prkToggleHideAttempted');
    const dot = $('#prkHideDot');
    if(btn) btn.classList.toggle('active', prkState.hideAttempted);
    if(dot) dot.style.background = prkState.hideAttempted ? '#fff' : 'var(--line)';
    renderPracticeMain();
  }
  else if(b.id === 'prkResetFiltersBtn'){
    prkState.paper = 'all';
    prkState.year = 'all';
    prkState.type = 'all';
    prkState.status = 'all';
    prkState.hideAttempted = false;
    const btn = $('#prkToggleHideAttempted'), dot = $('#prkHideDot');
    if(btn) btn.classList.remove('active');
    if(dot) dot.style.background = 'var(--line)';
    const fp = $('#prkFilterPaper'), fy = $('#prkFilterYear'), ft = $('#prkFilterType'), fs = $('#prkFilterStatus');
    if(fp) fp.value = 'all';
    if(fy) fy.value = 'all';
    if(ft) ft.value = 'all';
    if(fs) fs.value = 'all';
    renderPracticeMain();
  }
  else if(b.id === 'prkPracticeFirstBtn'){
    openPracticeDetail(0);
  }
  else if(b.id === 'prkSortBtn'){
    prkState.sortOrder = prkState.sortOrder === 'asc' ? 'desc' : 'asc';
    b.innerHTML = prkState.sortOrder === 'asc' ? '&uarr;&darr; Year-wise (Old to New)' : '&uarr;&darr; Year-wise (New to Old)';
    renderPracticeMain();
  }
});

// Dropdown filter change handlers
document.addEventListener('change', e => {
  const t = e.target;
  if(!t) return;
  if(t.id === 'prkFilterPaper'){
    prkState.paper = t.value;
    renderPracticeMain();
  } else if(t.id === 'prkFilterYear'){
    prkState.year = t.value;
    renderPracticeMain();
  } else if(t.id === 'prkFilterType'){
    prkState.type = t.value;
    renderPracticeMain();
  } else if(t.id === 'prkFilterStatus'){
    prkState.status = t.value;
    renderPracticeMain();
  }
});

// Auto-boot practice portal on startup
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', () => openPracticeList());
} else {
  openPracticeList();
}


function resetAllPracticeAttempts(){
  if(confirm('Reset all your recorded practice attempts in this browser?')){
    const map = getPrkAnswers();
    Object.keys(map).forEach(id => ATT.delete(id));
    saveAtt();
    store.set(PRK_ANS_KEY, '{}');
    resetSessionAttempted();
    renderPracticeMain();
  }
}

function startTestForCurrentPracticeChapter(){}

;