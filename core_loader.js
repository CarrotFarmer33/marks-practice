// Core Cache & Image Hydration Engine

const zipCache = new Map();
let questionTextsMap = {};
function esc(value){
  return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
window.esc = esc;
function imageMarkup(u, alt, extraClass, crop){
  const x = String(u || '');
  const cls = 'qimg' + (extraClass ? (' ' + extraClass) : '');
  let cropAttrs = '';
  let cropStyles = '';
  const isSvg = /\.svg(?:[?#]|$)/i.test(x);
  if(crop && (crop.top || crop.bottom || crop.left || crop.right)){
    const ct = Math.max(0, parseFloat(crop.top) || 0);
    const cb = Math.max(0, parseFloat(crop.bottom) || 0);
    const cl = Math.max(0, parseFloat(crop.left) || 0);
    const cr = Math.max(0, parseFloat(crop.right) || 0);
    cropAttrs = ' data-crop-top="' + ct + '" data-crop-bottom="' + cb + '" data-crop-left="' + cl + '" data-crop-right="' + cr + '"';
    if(!isSvg){
      cropStyles = ' style="clip-path:inset(' + ct + '% ' + cr + '% ' + cb + '% ' + cl + '%);-webkit-clip-path:inset(' + ct + '% ' + cr + '% ' + cb + '% ' + cl + '%);"';
    }
  }
  if(x.startsWith('zipimg:')) return '<img class="' + cls + '" alt="' + esc(alt || 'Question figure') + '" data-zipimg="' + esc(x.slice(7)) + '"' + cropAttrs + cropStyles + ' src="data:,">';
  return '<img class="' + cls + '" alt="' + esc(alt || 'Question figure') + '"' + cropAttrs + cropStyles + ' src="' + esc(x) + '">';
}

function applySvgCrop(svgText, crop){
  if(!crop || (!crop.top && !crop.bottom && !crop.left && !crop.right)) return svgText;
  const vbMatch = svgText.match(/viewBox="([^"]+)"/i);
  if(!vbMatch) return svgText;
  const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
  if(parts.length !== 4 || parts.some(isNaN)) return svgText;

  const [x, y, w, h] = parts;
  const topP = Math.max(0, Math.min(50, Number(crop.top) || 0)) / 100;
  const botP = Math.max(0, Math.min(50, Number(crop.bottom) || 0)) / 100;
  const leftP = Math.max(0, Math.min(40, Number(crop.left) || 0)) / 100;
  const rightP = Math.max(0, Math.min(40, Number(crop.right) || 0)) / 100;

  const newX = x + (w * leftP);
  const newY = y + (h * topP);
  const newW = Math.max(1, w * (1 - leftP - rightP));
  const newH = Math.max(1, h * (1 - topP - botP));

  let res = svgText.replace(vbMatch[0], `viewBox="${newX.toFixed(2)} ${newY.toFixed(2)} ${newW.toFixed(2)} ${newH.toFixed(2)}"`);
  res = res.replace(/(<svg\b[^>]*\bwidth=")[0-9.]+(?:pt|px)?/i, `$1${newW.toFixed(2)}pt`);
  res = res.replace(/(<svg\b[^>]*\bheight=")[0-9.]+(?:pt|px)?/i, `$1${newH.toFixed(2)}pt`);
  if(!res.includes('overflow=')){
    res = res.replace(/(<svg\b)/i, '$1 overflow="hidden"');
  }
  return res;
}

let svgUidCounter = 0;
function processSvgMarkup(rawSvgText, isTestBuilder){
  svgUidCounter++;
  let svgText = rawSvgText;

  // 1. Strip diagonal FIITJEE vector watermark patterns and telegram promotions
  svgText = svgText.replace(/<pattern[^>]*id="[^"]*pattern[^"]*"[^>]*>[\s\S]*?<\/pattern>/gi, '');
  svgText = svgText.replace(/<rect[^>]*fill="url\(#[^)]*pattern[^)]*\)"[^>]*\/?>/gi, '');
  svgText = svgText.replace(/<path[^>]*fill="url\(#[^)]*pattern[^)]*\)"[^>]*\/?>/gi, '');
  svgText = svgText.replace(/<use[^>]*href="url\(#[^)]*pattern[^)]*\)"[^>]*\/?>/gi, '');
  svgText = svgText.replace(/<text[^>]*>[^<]*?(?:fiitjee|@fiitjee|for more join|sarvapriya vihar|kalu sarai)[^<]*?<\/text>/gi, '');
  svgText = svgText.replace(/<tspan[^>]*>[^<]*?(?:fiitjee|@fiitjee|for more join|sarvapriya vihar|kalu sarai)[^<]*?<\/tspan>/gi, '');

  // 2. Strip diagonal grey watermark text across the page (Physics, Chemistry, FIITJEE background text)
  svgText = svgText.replace(/<(?:use|path)[^>]*(?:fill|stroke)="#(?:c0c0c0|c4c4c4|cccccc|d0d0d0|d3d3d3|e0e0e0|e8e8e8)"[^>]*\/?>/gi, '');

  // 3. Strip residual QRP header/footer divider lines and background rects (safety net)
  svgText = svgText.replace(/<path [^>]*V8081\.[0-9]+[^>]*\/?>\s*/gi, '');
  svgText = svgText.replace(/<path [^>]*d="M337\.5\s+484\.199H5617\.5V499\.199H337\.5Z"[^>]*\/?>\s*/gi, '');
  svgText = svgText.replace(/<path [^>]*d="M337\.5\s+7924\.2H5617\.5V7939\.2H337\.5Z"[^>]*\/?>\s*/gi, '');

  // 4. Neutralize empty clipPaths: in W3C SVG spec, <clipPath id="X"></clipPath> with zero shapes
  // causes Chromium/browsers to clip all child elements to 0 pixels (making questions completely blank).
  const emptyClipRegex = /<clipPath id="([^"]+)">\s*<\/clipPath>/gi;
  let ecMatch;
  while((ecMatch = emptyClipRegex.exec(svgText)) !== null){
    const cid = ecMatch[1];
    svgText = svgText.replaceAll(`clip-path="url(#${cid})"`, '');
    svgText = svgText.replaceAll(`clip-path="url('#${cid}')"`, '');
    svgText = svgText.replaceAll(`clip-path='url("#${cid}")'`, '');
  }

  // 5. Strip all solid white background rects so question SVGs have 100% transparent backgrounds
  if(!isTestBuilder){
    // Protect rects inside clipPath from removal
    const clipPathMap = new Map();
    let cpIndex = 0;
    svgText = svgText.replace(/<clipPath\b[^>]*>[\s\S]*?<\/clipPath>/gi, function(match){
      const token = `___CLIP_PATH_PLACEHOLDER_${cpIndex++}___`;
      clipPathMap.set(token, match);
      return token;
    });

    // Strip solid white background rects
    svgText = svgText.replace(/<rect\b[^>]*\bfill="(?:#ffffff|#fff|white|rgb\(100%,\s*100%,\s*100%\)|rgb\(255,\s*255,\s*255\))"[^>]*\/?>/gi, '');
    svgText = svgText.replace(/<rect\b[^>]*\bfill="(?:#ffffff|#fff|white|rgb\(100%,\s*100%,\s*100%\)|rgb\(255,\s*255,\s*255\))"[^>]*>[\s\S]*?<\/rect>/gi, '');
    svgText = svgText.replace(/<rect\b[^>]*\bstyle="[^"]*fill:\s*(?:#ffffff|#fff|white|rgb\(100%,\s*100%,\s*100%\)|rgb\(255,\s*255,\s*255\))[^"]*"[^>]*\/?>/gi, '');
    svgText = svgText.replace(/<rect\s+width="100%"\s+height="100%"[^>]*\/?>/gi, '');

    // Restore clipPath blocks
    for(const [token, orig] of clipPathMap.entries()){
      svgText = svgText.replace(token, orig);
    }

    // Ensure root SVG has transparent background
    if(/<svg\b[^>]*\bstyle="/i.test(svgText)){
      svgText = svgText.replace(/(<svg\b[^>]*\bstyle=")([^"]*)(")/i, '$1background:transparent;$2$3');
    } else {
      svgText = svgText.replace(/(<svg\b)/i, '$1 style="background:transparent"');
    }
  }

  return svgText;
}
window.processSvgMarkup = processSvgMarkup;

/* ---------- IndexedDB High-Performance Cache ---------- */
const AitsCache = {
  dbPromise: null,
  getDb(){
    if(!this.dbPromise){
      this.dbPromise = new Promise((resolve) => {
        try {
          if(!window.indexedDB) return resolve(null);
          const req = indexedDB.open('aits_storage_cache_v15', 1);
          req.onupgradeneeded = e => {
            const db = e.target.result;
            if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch(e) { resolve(null); }
      });
    }
    return this.dbPromise;
  },
  async get(key){
    try {
      const db = await this.getDb();
      if(!db) return null;
      return new Promise(resolve => {
        const tx = db.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    } catch(e) { return null; }
  },
  async set(key, val){
    try {
      const db = await this.getDb();
      if(!db) return false;
      return new Promise(resolve => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch(e) { return false; }
  },
  async delete(key){
    try {
      const db = await this.getDb();
      if(!db) return;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').delete(key);
    } catch(e) {}
  },
  async clear(){
    try {
      const db = await this.getDb();
      if(!db) return;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').clear();
    } catch(e) {}
  }
};
window.AitsCache = AitsCache;

/* ---------- Selected Bank (2024-2025 JEE Main Curated) Data & Lookup ---------- */

window.PRIORITY_MAP = (window.PRIORITY_BANK && window.PRIORITY_BANK.questions) || {};



async function fetchCachedJson(url){
  const cacheKey = 'json:v30:' + url;
  const cached = await AitsCache.get(cacheKey);
  if(cached) return cached;
  const r = await fetch(url);
  if(!r.ok) throw new Error('Fetch failed for ' + url + ' (' + r.status + ')');
  const d = await r.json();
  AitsCache.set(cacheKey, d);
  return d;
}
window.fetchCachedJson = fetchCachedJson;

async function getZip(zipUrl){
  const rel = zipUrl.replace(/^\/+/, '');
  const cacheKey = zipUrl.startsWith('http') ? zipUrl : rel;
  if(zipCache.has(cacheKey)){
    try {
      return await zipCache.get(cacheKey);
    } catch(err) {
      zipCache.delete(cacheKey);
    }
  }

  const p = (async () => {
    // 1. Check local IndexedDB disk cache with versioned key
    try {
      const cachedBuf = await AitsCache.get('zip:v20:' + cacheKey);
      if(cachedBuf){
        return await JSZip.loadAsync(cachedBuf);
      }
    } catch(cErr){
      console.warn('Cached ZIP read error, re-fetching:', cErr);
    }

    const fname = zipUrl.split('#')[0].split('/').pop();
    const candidates = zipUrl.startsWith('http') ? ['/vector_zips/' + fname, zipUrl] : [
      'vector_zips/' + fname,
      '/vector_zips/' + fname,
      '/' + rel,
      rel,
      'public/vector_zips/' + fname,
      'public/' + rel,
      'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/public/vector_zips/' + fname,
      'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/public/' + rel,
      'https://raw.githubusercontent.com/CarrotFarmer33/aitsver2/main/' + rel,
      'https://huggingface.co/datasets/anwehsh/aits-physics/resolve/main/vector_zips/' + fname,
      'https://huggingface.co/datasets/anwehsh/aits-physics/resolve/main/' + fname
    ];

    let lastErr = null;
    for(const cand of candidates){
      try {
        const r = await fetch(cand);
        if(!r.ok){
          lastErr = new Error('Could not fetch ZIP (' + r.status + ') from ' + cand);
          continue;
        }
        const b = await r.arrayBuffer();
        AitsCache.set('zip:v20:' + cacheKey, b);
        return await JSZip.loadAsync(b);
      } catch(err) {
        lastErr = err;
        console.warn('Fetch ZIP candidate failed: ' + cand, err);
      }
    }
    zipCache.delete(cacheKey);
    throw lastErr || new Error('All ZIP candidates failed for: ' + zipUrl);
  })();

  zipCache.set(cacheKey, p);
  return p;
}

async function resolveZipImage(img){
  const ref=img.dataset.zipimg; if(!ref) return;
  const hash=ref.lastIndexOf('#'); if(hash<0) return;
  const zipUrl=ref.slice(0,hash), fileName=decodeURIComponent(ref.slice(hash+1));
  try{
    if(!window.JSZip) throw new Error('ZIP image support failed to load');
    const zip = await getZip(zipUrl);
    let f=zip.file(fileName);
    if(!f){ const match=Object.keys(zip.files).find(k=>!zip.files[k].dir && (k===fileName || k.endsWith('/'+fileName))); if(match) f=zip.file(match); }
    if(!f){
      try {
        const rel = zipUrl.replace(/^\/+/, '');
        AitsCache.delete('zip:v20:' + (zipUrl.startsWith('http') ? zipUrl : rel));
        zipCache.delete(zipUrl.startsWith('http') ? zipUrl : rel);
      } catch(_) {}
      throw new Error('Image not found in ZIP: '+fileName);
    }
    const isSvg = /\.svg$/i.test(fileName);
    const isCropModal = img.classList.contains('crop-modal-target-img') || !!img.closest('#cropTargetWrapper, #cropModal');
    const isTb = isCropModal || img.classList.contains('test-builder-svg') || img.classList.contains('cbt-svg') || !!img.closest('#scrTestPreview, #scrSheetView, #scrExam, #scrRes, #cropModal, #cropTargetWrapper, .preview-q-card, .preview-q-body, .preview-sol-box, .sheet-page, .allen-sheet-page');
    const crop = (!isCropModal && (img.dataset.cropTop || img.dataset.cropBottom || img.dataset.cropLeft || img.dataset.cropRight)) ? {
      top: parseFloat(img.dataset.cropTop || 0),
      bottom: parseFloat(img.dataset.cropBottom || 0),
      left: parseFloat(img.dataset.cropLeft || 0),
      right: parseFloat(img.dataset.cropRight || 0)
    } : null;

    if(isSvg){
      const rawSvgText = await f.async('text');
      let processedSvg = processSvgMarkup(rawSvgText, isTb);
      if(crop){
        processedSvg = applySvgCrop(processedSvg, crop);
      }
      // Render as isolated SVG blob to eliminate cross-SVG ID/clipPath/font collisions
      const blob = new Blob([processedSvg], { type: 'image/svg+xml;charset=utf-8' });
      img.src = URL.createObjectURL(blob);
      img.classList.add('qimg', 'vector-inline-svg', (isTb || isCropModal) ? 'test-builder-svg' : 'practice-svg');
      img.setAttribute('role', 'img');
      img.setAttribute('aria-label', img.alt || 'Question figure');
      const isNeet = /allenchem/i.test(fileName) || /data-intrinsic-w="2/i.test(processedSvg) || /viewBox="[^"]*?\b(21[0-9]|22[0-9]|23[0-9]|24[0-9]|25[0-9]|26[0-9])\b/i.test(processedSvg);
      const isNeeraj = /nk_/i.test(fileName);
      const isMsChouhan = /mschouhan/i.test(fileName);
      if(isCropModal){
        img.style.display = 'block';
        img.style.width = 'auto';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '52vh';
        img.style.height = 'auto';
        img.style.margin = '0 auto';
        img.style.background = '#ffffff';
        img.style.filter = 'none';
        img.style.webkitFilter = 'none';
        img.style.mixBlendMode = 'normal';
        img.style.clipPath = 'none';
        img.style.webkitClipPath = 'none';
      } else if(isTb){
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '0';
        img.style.background = '#ffffff';
        if(isMsChouhan){
          img.classList.add('mschouhan-svg');
          img.style.width = 'auto';
          img.style.maxWidth = '430pt';
        } else if(isNeeraj || isNeet){
          img.classList.add(isNeeraj ? 'neeraj-svg' : 'allen-svg-neet');
          img.style.width = 'auto';
          img.style.maxWidth = '255pt';
        } else {
          img.classList.add('allen-svg-jee');
          img.style.width = '100%';
          img.style.maxWidth = '100%';
        }
      } else {
        const z = (typeof prkCurrentZoom !== 'undefined' && prkCurrentZoom > 100) ? (prkCurrentZoom + '%') : '100%';
        img.style.setProperty('width', z, 'important');
        img.style.setProperty('max-width', (typeof prkCurrentZoom !== 'undefined' && prkCurrentZoom > 100) ? 'none' : '100%', 'important');
        img.style.setProperty('min-width', (typeof prkCurrentZoom !== 'undefined' && prkCurrentZoom > 100) ? z : '100%', 'important');
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '14px auto';
        img.style.background = 'transparent';
      }
      // Vector viewBox crop is already applied; clear CSS clipPath so there is zero double crop
      img.style.clipPath = 'none';
      img.style.webkitClipPath = 'none';
      img.removeAttribute('data-zipimg');
      return;
    }

    const rawBlob = await f.async('blob');
    img.src = URL.createObjectURL(rawBlob);
    img.classList.add((isTb || isCropModal) ? 'test-builder-svg' : 'practice-svg');
    if(isCropModal){
      img.style.display = 'block';
      img.style.width = 'auto';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '52vh';
      img.style.height = 'auto';
      img.style.margin = '0 auto';
      img.style.background = '#ffffff';
      img.style.filter = 'none';
      img.style.webkitFilter = 'none';
      img.style.mixBlendMode = 'normal';
      img.style.clipPath = 'none';
      img.style.webkitClipPath = 'none';
    } else if(!isTb){
      const z = (typeof prkCurrentZoom !== 'undefined' && prkCurrentZoom > 100) ? (prkCurrentZoom + '%') : '100%';
      img.style.setProperty('width', z, 'important');
      img.style.setProperty('max-width', (typeof prkCurrentZoom !== 'undefined' && prkCurrentZoom > 100) ? 'none' : '100%', 'important');
      img.style.setProperty('min-width', (typeof prkCurrentZoom !== 'undefined' && prkCurrentZoom > 100) ? z : '100%', 'important');
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '14px auto';
    }
    if(crop && !isCropModal){
      img.style.clipPath = `inset(${crop.top || 0}% ${crop.right || 0}% ${crop.bottom || 0}% ${crop.left || 0}%)`;
      img.style.webkitClipPath = `inset(${crop.top || 0}% ${crop.right || 0}% ${crop.bottom || 0}% ${crop.left || 0}%)`;
    } else {
      img.style.clipPath = 'none';
      img.style.webkitClipPath = 'none';
    }
    img.removeAttribute('data-zipimg');
  }catch(e){
    console.warn('Unable to load image from ZIP: ' + fileName, e);
    // Automatic fallback: fetch vector SVG directly from local vector engine
    if(fileName.startsWith('allenjee_') || fileName.startsWith('allenchem_') || fileName.startsWith('mschouhan_') || fileName.startsWith('nk_') || fileName.startsWith('chemistry_') || fileName.startsWith('physics_') || fileName.startsWith('mathematics_')){
      try {
        const qid = fileName.replace(/\.svg$/i, '');
        const baseOrigin = (window.location.protocol.startsWith('http') && window.location.origin && window.location.origin !== 'null') ? window.location.origin : 'http://127.0.0.1:8000';
        const candidateSvgUrls = [
          '/api/question-svg/' + encodeURIComponent(qid),
          baseOrigin + '/api/question-svg/' + encodeURIComponent(qid),
          'http://127.0.0.1:8000/api/question-svg/' + encodeURIComponent(qid),
          'http://localhost:8000/api/question-svg/' + encodeURIComponent(qid)
        ];
        if (window.AITS_CONFIG && window.AITS_CONFIG.localVectorEngineUrl) {
          candidateSvgUrls.push(window.AITS_CONFIG.localVectorEngineUrl.replace(/\/+$/, '') + '/api/question-svg/' + encodeURIComponent(qid));
        }
        let resp = null;
        for (const url of candidateSvgUrls) {
          try {
            const r = await fetch(url);
            if (r.ok) { resp = r; break; }
          } catch (_) {}
        }
        if(resp && resp.ok){
          const rawSvgText = await resp.text();
          let processedSvg = processSvgMarkup(rawSvgText, isTb);
          if(crop) processedSvg = applySvgCrop(processedSvg, crop);
          const blob = new Blob([processedSvg], { type: 'image/svg+xml;charset=utf-8' });
          img.src = URL.createObjectURL(blob);
          img.classList.add('qimg', 'vector-inline-svg', (isTb || isCropModal) ? 'test-builder-svg' : 'practice-svg');
          const isNeet = /allenchem/i.test(qid) || /data-intrinsic-w="2/i.test(processedSvg);
          const isMsChouhan = /mschouhan/i.test(qid);
          if(isCropModal){
            img.style.display = 'block';
            img.style.width = 'auto';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '52vh';
            img.style.height = 'auto';
            img.style.margin = '0 auto';
            img.style.background = '#ffffff';
            img.style.filter = 'none';
            img.style.webkitFilter = 'none';
            img.style.mixBlendMode = 'normal';
            img.style.clipPath = 'none';
            img.style.webkitClipPath = 'none';
            img.removeAttribute('data-zipimg');
            return;
          } else if(isTb){
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '0';
            img.style.background = '#ffffff';
            if(isMsChouhan){
              img.classList.add('mschouhan-svg');
              img.style.width = 'auto';
              img.style.maxWidth = '430pt';
            } else {
              if(isNeet) img.classList.add('allen-svg-neet');
              else img.classList.add('allen-svg-jee');
              img.style.width = '100%';
              img.style.maxWidth = '100%';
            }
          }
          if(crop){
            img.style.clipPath = `inset(${crop.top || 0}% ${crop.right || 0}% ${crop.bottom || 0}% ${crop.left || 0}%)`;
            img.style.webkitClipPath = `inset(${crop.top || 0}% ${crop.right || 0}% ${crop.bottom || 0}% ${crop.left || 0}%)`;
          }
          img.removeAttribute('data-zipimg');
          return;
        }
      } catch(err) {
        console.warn('Direct SVG endpoint fallback failed:', err);
      }
    }
    if(isCropModal){
      const wrap = document.createElement('div');
      wrap.style.cssText = 'padding:30px;text-align:center;color:var(--muted);font-size:13px;line-height:1.5';
      wrap.innerHTML = `⚠️ Unable to load figure image (<b>${esc(fileName)}</b>). Please verify that the image archive is available.`;
      if(img.parentNode) img.parentNode.replaceChild(wrap, img);
      return;
    }
    const fallback = img.dataset.fallback;
    if(fallback){
      const wrap = document.createElement('div');
      wrap.className = 'allen-qstem';
      wrap.innerHTML = decodeURIComponent(fallback);
      img.parentNode.replaceChild(wrap, img);
      return;
    }
    img.alt='Unable to load image: '+fileName;
    img.removeAttribute('data-zipimg');
  }
}
async function hydrateZipImages(root, onProgress){
  if(!root) return [];
  const imgs = Array.from(root.querySelectorAll('img[data-zipimg]'));
  if(!imgs.length) return [];
  let done = 0;
  const total = imgs.length;
  if(onProgress) onProgress(0, total);
  return Promise.all(imgs.map(async (img) => {
    try {
      await resolveZipImage(img);
    } catch(e) {
      console.warn('Image hydration error:', e);
    } finally {
      done++;
      if(onProgress) onProgress(done, total);
    }
  }));
}
window.hydrateZipImages = hydrateZipImages;
