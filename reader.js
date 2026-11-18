import {pageForPosition,pageVerses,colorRuns,verseDisplayParts} from './core.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rules=['taj-madd','taj-ghunnah','taj-qalqalah','taj-silent','taj-other'];
function tajClass(rule){if(!rule)return '';if(rule.startsWith('madd'))return 'taj-madd';if(rule==='qalqalah')return 'taj-qalqalah';if(['silent','hamzat_wasl','lam_shamsiyyah'].includes(rule))return 'taj-silent';if(rule.includes('ghunnah')||rule.startsWith('ikhfa')||rule==='iqlab'||rule==='idghaam_shafawi')return 'taj-ghunnah';return 'taj-other';}

// A verse stays one unmodified text node. Highlight ranges paint glyphs without
// splitting the Arabic shaping run. Older browsers safely retain plain text.
export function paintTajweed(surahs,enabled){
  if(!globalThis.CSS?.highlights||!globalThis.Highlight)return;
  for(const rule of rules)CSS.highlights.delete(rule);
  if(!enabled)return;
  const highlights=new Map(rules.map(rule=>[rule,new Highlight()]));
  for(const node of document.querySelectorAll('.verse-text')){
    const a=surahs.find(s=>s.id===Number(node.dataset.surah))?.ayahs[Number(node.dataset.ayah)-1];
    if(!a?.tajweed||node.firstChild?.nodeType!==Node.TEXT_NODE)continue;
    let offset=0;const fragmentStart=Number(node.dataset.start||0),fragmentEnd=fragmentStart+node.textContent.length;
    for(const run of colorRuns(a.text,a.tajweed)){
      const from=Math.max(offset,fragmentStart),to=Math.min(offset+run.text.length,fragmentEnd);
      if(run.rule&&to>from){const range=new Range();range.setStart(node.firstChild,from-fragmentStart);range.setEnd(node.firstChild,to-fragmentStart);highlights.get(tajClass(run.rule)).add(range);}
      offset+=run.text.length;
    }
  }
  for(const [rule,highlight] of highlights)CSS.highlights.set(rule,highlight);
}

export function readerHTML({data,surahs,route,settings,lastRead,bookmarks,player,downloaded,icon}){
  const byId=id=>surahs.find(s=>s.id===id),s=byId(route.surah);
  const page=route.page||pageForPosition(data.pages,s.id,route.ayah),isPage=Boolean(route.page);
  const marked=(id,n)=>bookmarks.some(b=>b.surah===id&&b.ayah===n);
  const saved=(id,n)=>lastRead?.surah===id&&lastRead.ayah===n;
  const active=(id,n)=>player?.surah===id&&player.ayah===n;
  const text=(id,a)=>{const parts=verseDisplayParts(id,a.n,a.text);return `<span class="verse-text" data-surah="${id}" data-ayah="${a.n}" data-start="${parts.start}">${esc(parts.body)}</span>`;};
  const basmala=(id,withMeaning=false)=>{const parts=verseDisplayParts(id,1,byId(id).ayahs[0].text);return parts.basmala?`<div class="${withMeaning?'surah-basmala':'mushaf-basmala'}" aria-label="Basmalah pembuka, tanpa nomor ayat"><p class="basmala-arabic" lang="ar" dir="rtl"><span class="verse-text" data-surah="${id}" data-ayah="1" data-start="0">${esc(parts.basmala)}</span></p>${withMeaning&&settings.latin?`<p class="basmala-latin">${esc(byId(1).ayahs[0].latin)}</p>`:''}${withMeaning&&settings.translation?`<p class="basmala-meaning">${esc(byId(1).ayahs[0].translation)}</p>`:''}</div>`:'';};
  const marker=n=>`<span class="verse-medallion" aria-label="Ayat ${n}">${n.toLocaleString('ar-EG')}</span>`;
  const saveButton=(id,n)=>`<button class="save-position" data-action="save-position" data-surah="${id}" data-ayah="${n}" aria-pressed="${saved(id,n)}" aria-label="${saved(id,n)?'Batalkan':'Simpan'} posisi terakhir dibaca" title="${saved(id,n)?'Batalkan':'Simpan'} posisi terakhir dibaca">${icon(saved(id,n)?'check':'clock')}${saved(id,n)?'Batalkan posisi':'Simpan posisi'}</button>`;
  const buttons=(id,n)=>`<div class="ayah-buttons"><button data-action="play-ayah" data-surah="${id}" data-ayah="${n}" aria-label="Putar ayat ${n}">${icon('play')}</button><button data-action="bookmark" data-surah="${id}" data-ayah="${n}" aria-label="${marked(id,n)?'Hapus':'Simpan'} penanda ayat ${n}" aria-pressed="${marked(id,n)}" class="${marked(id,n)?'marked':''}">${icon('bookmark')}</button></div>`;
  const mode=isPage?'page':route.mode||'ayah',navigationTab=mode==='surah'?'surah':'juz';
  const title=isPage?'Qur’an per halaman':mode==='surah'?s.id+'. '+s.name:'Qur’an per ayat';
  const currentJuz=data.juzs.findLast(j=>j.surah<route.surah||j.surah===route.surah&&j.ayah<=route.ayah)?.id||1;
  const navigation=`<nav class="reader-navigation" aria-label="${navigationTab==='juz'?'Pindah juz':'Pindah surah'}"><div id="reader-${navigationTab}-panel" class="reader-strip" aria-label="${navigationTab==='juz'?'Daftar juz':'Daftar surah'}">${navigationTab==='juz'?data.juzs.map(j=>`<button data-action="reader-open" data-surah="${j.surah}" data-ayah="${j.ayah}" ${j.id===currentJuz?'aria-current="true"':''}>Juz ${j.id}</button>`).join(''):surahs.map(v=>`<button data-action="reader-open" data-surah="${v.id}" data-ayah="1" ${v.id===s.id?'aria-current="true"':''}>${v.id}. ${esc(v.name)}</button>`).join('')}</div></nav>`;
  const playback=`<div class="reader-playback-bar" role="group" aria-label="Putar bacaan"><button class="reader-play-context" data-action="play-scope" data-kind="${navigationTab}" data-scope-id="${navigationTab==='juz'?currentJuz:s.id}" aria-label="Putar ${navigationTab==='juz'?'Juz '+currentJuz:'Surah '+esc(s.name)} dari awal">${icon('play')}<span>Dengarkan Audio</span></button>${isPage?`<div class="page-zoom" role="group" aria-label="Perbesaran halaman"><button data-zoom="out" aria-label="Perkecil halaman">−</button><button data-zoom="reset" aria-label="Tampilkan satu halaman utuh">Pas Layar</button><button data-zoom="in" aria-label="Perbesar halaman">+</button></div>`:''}</div>`;
  const header=`<div class="reader-sticky"><div class="reader-bar"><a class="icon-btn" href="#home" aria-label="Kembali ke daftar Al-Qur’an">${icon('back')}</a><h1>${esc(title)}</h1>${isPage?`<div class="reader-page-controls"><button class="page-counter" data-action="page-picker" aria-label="Pilih halaman">${page}<span> / 604</span></button></div>`:''}<div class="reader-tools"><button class="icon-btn" data-action="audio-panel" aria-label="Buka pemutar audio">${icon('headphones')}</button><button class="icon-btn" data-action="settings" aria-label="Pengaturan bacaan">${icon('sliders')}</button>${isPage?`<button class="icon-btn clear-display-toggle" data-page-focus="toggle" aria-label="Aktifkan layar bersih" aria-pressed="false" title="Layar bersih">${icon('expand')}${icon('collapse')}</button>`:''}</div></div>${playback}${navigation}</div>`;
  let content;
  if(isPage){
    const verses=pageVerses(data,page),first=verses[0],last=verses.at(-1),firstSurah=byId(first.surah);
    const juz=data.juzs.findLast(j=>j.surah<first.surah||j.surah===first.surah&&j.ayah<=first.ayah)?.id||1;
    content=`<div class="mushaf-viewport" tabindex="0" role="region" aria-label="Halaman Al-Qur’an. Usap jari ke kanan untuk halaman berikutnya, ke kiri untuk sebelumnya. Ketuk tepi kiri untuk halaman berikutnya, tepi kanan untuk sebelumnya. Cubit atau ketuk dua kali untuk zoom."><div class="mushaf-stage"><section class="mushaf-sheet" aria-label="Mushaf halaman ${page}"><header class="mushaf-meta"><span>${firstSurah.id}. ${esc(firstSurah.name)}</span><b>${page}</b><span>Juz ${juz}</span></header><div class="mushaf-artwork-host" aria-busy="true"><p class="mushaf-loading" role="status">Memuat halaman mushaf…</p></div><footer class="mushaf-foot">${esc(firstSurah.name)} ${first.ayah} – ${last.surah!==first.surah?esc(byId(last.surah).name)+' ':''}${last.ayah} · ${verses.length} ayat</footer></section></div></div>`;
  }else{
    content=`<header class="reader-header surah-banner"><span>${s.type==='Meccan'?'Makkiyah':'Madaniyah'}</span><div><strong class="arabic-title" dir="rtl" lang="ar">${esc(s.arabic)}</strong><p>${esc(s.meaning)}</p></div><span>${s.count} ayat</span></header>${basmala(s.id,true)}<div id="verses">${s.ayahs.map(a=>`<article class="ayah ${saved(s.id,a.n)?'saved':''} ${active(s.id,a.n)?'active':''}" id="ayah-${a.n}" data-surah="${s.id}" data-ayah="${a.n}"><div class="ayah-row"><span class="verse-medallion" aria-label="Ayat ${a.n}">${a.n}</span>${buttons(s.id,a.n)}</div><p class="arabic" lang="ar" dir="rtl">${text(s.id,a)}</p>${settings.latin?`<p class="latin" lang="id" dir="ltr">${esc(a.latin)}</p>`:''}${settings.translation?`<p class="translation" lang="id" dir="ltr">${esc(a.translation)}</p>`:''}<div class="ayah-foot"><span>${saved(s.id,a.n)?'Terakhir dibaca':''}</span>${saveButton(s.id,a.n)}</div></article>`).join('')}</div><div class="reader-end">${s.id>1?`<a class="pill" href="#${mode==='surah'?'surah':'read'}/${s.id-1}/1">${icon('back')}${esc(byId(s.id-1).name)}</a>`:'<span></span>'}${s.id<114?`<a class="pill" href="#${mode==='surah'?'surah':'read'}/${s.id+1}/1">${esc(byId(s.id+1).name)}${icon('arrow')}</a>`:''}</div><p class="translation-source">Arti & bacaan Latin: <a href="https://equran.id" target="_blank" rel="noopener">EQuran.id</a> · sumber Kementerian Agama RI</p>`;
  }
  return `<div data-reading-view="${mode}" class="reader-shell ${isPage?'mode-page':'mode-ayah'}">${header}${content}</div>`;
}

