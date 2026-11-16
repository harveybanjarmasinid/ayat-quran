import {pageForPosition,pageVerses,colorRuns,bytesLabel} from './core.js';

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
    let offset=0;
    for(const run of colorRuns(a.text,a.tajweed)){
      if(run.rule){const range=new Range();range.setStart(node.firstChild,offset);range.setEnd(node.firstChild,offset+run.text.length);highlights.get(tajClass(run.rule)).add(range);}
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
  const text=(id,a)=>`<span class="verse-text" data-surah="${id}" data-ayah="${a.n}">${esc(a.text)}</span>`;
  const marker=n=>`<span class="verse-medallion" aria-label="Ayat ${n}">${n.toLocaleString('ar-EG')}</span>`;
  const saveButton=(id,n)=>`<button class="save-position" data-action="save-position" data-surah="${id}" data-ayah="${n}" title="Simpan posisi terakhir dibaca">${icon(saved(id,n)?'check':'clock')}${saved(id,n)?'Posisi tersimpan':'Simpan posisi'}</button>`;
  const buttons=(id,n)=>`<div class="ayah-buttons"><button data-action="play-ayah" data-surah="${id}" data-ayah="${n}" aria-label="Putar ayat ${n}">${icon('play')}</button><button data-action="bookmark" data-surah="${id}" data-ayah="${n}" aria-label="${marked(id,n)?'Hapus':'Simpan'} penanda ayat ${n}" aria-pressed="${marked(id,n)}" class="${marked(id,n)?'marked':''}">${icon('bookmark')}</button></div>`;
  const title=isPage?'Qur’an per lembar':s.id+'. '+s.name;
  const header=`<div class="reader-sticky"><div class="reader-bar"><a class="icon-btn" href="#home" aria-label="Kembali ke daftar Al-Qur’an">${icon('back')}</a><h1>${title}</h1>${isPage?`<button class="page-counter" data-action="page-picker" aria-label="Pilih halaman">${page}<span> / 604</span></button>`:''}<div class="reader-tools"><button class="icon-btn" data-action="audio-panel" aria-label="Buka pemutar audio">${icon('headphones')}</button><button class="icon-btn" data-action="settings" aria-label="Pengaturan bacaan">${icon('sliders')}</button></div></div><div class="reading-modes" role="group" aria-label="Mode baca"><button data-action="reading-mode" data-mode="page" aria-pressed="${isPage}">${icon('book')}Per Lembar</button><button data-action="reading-mode" data-mode="ayah" aria-pressed="${!isPage}">${icon('list')}Per Ayat</button></div></div>`;
  const tools=`<div class="reading-options">${!isPage?`<button class="pill ${settings.latin?'active':''}" data-action="latin" aria-pressed="${settings.latin}">Latin</button><button class="pill ${settings.translation?'active':''}" data-action="translation" aria-pressed="${settings.translation}">Arti</button>`:''}<button class="pill ${settings.tajweed?'active':''}" data-action="tajweed" aria-pressed="${settings.tajweed}">Tajwid <small>β</small></button><button class="pill" data-action="download" data-surah="${s.id}" id="reader-download">${icon(downloaded.has(s.id)?'check':'download')}${downloaded.has(s.id)?'Audio tersimpan':`Unduh · ${bytesLabel(s.audioBytes)}`}</button></div>`;
  const tajweed=settings.tajweed?`<details class="tajweed-note"><summary>Tajwid warna · pratinjau ${globalThis.CSS?.highlights?'':'(browser ini menampilkan teks tanpa warna)'}</summary><p>Warna tersedia pada ${data.provenance.alignedAyahs.toLocaleString('id-ID')} dari 6.236 ayat dan belum ditashih secara independen. Ayat lainnya tetap tanpa warna.</p><div class="legend"><span class="taj-madd">Mad</span><span class="taj-ghunnah">Ghunnah & ikhfa</span><span class="taj-qalqalah">Qalqalah</span><span class="taj-other">Idgham lainnya</span><span class="taj-silent">Tidak dibaca / wasal</span></div><button data-action="sources">Sumber & batasannya</button></details>`:'';
  let content;
  if(isPage){
    const verses=pageVerses(data,page),first=verses[0],last=verses.at(-1),firstSurah=byId(first.surah);
    const juz=data.juzs.findLast(j=>j.surah<first.surah||j.surah===first.surah&&j.ayah<=first.ayah)?.id||1;
    const groups=[];
    for(const v of verses){if(groups.at(-1)?.id!==v.surah)groups.push({id:v.surah,ayahs:[]});groups.at(-1).ayahs.push(byId(v.surah).ayahs[v.ayah-1]);}
    content=`<div class="mushaf-viewport" tabindex="0" role="region" aria-label="Halaman Al-Qur’an. Geser kiri atau kanan untuk pindah halaman. Cubit atau ketuk dua kali untuk zoom."><div class="mushaf-stage"><section class="mushaf-sheet" aria-label="Mushaf halaman ${page}"><header class="mushaf-meta"><span>${firstSurah.id}. ${esc(firstSurah.name)}</span><b>${page}</b><span>Juz ${juz}</span></header><div class="mushaf-text" lang="ar" dir="rtl">${groups.map(g=>`${g.ayahs[0].n===1?`<h2 class="mushaf-surah">${esc(byId(g.id).arabic)}</h2>`:''}<p class="mushaf-lines">${g.ayahs.map(a=>`<span class="page-ayah ${active(g.id,a.n)?'active':''} ${route.surah===g.id&&route.ayah===a.n?'selected':''} ${saved(g.id,a.n)?'saved':''}" id="page-ayah-${g.id}-${a.n}" role="button" tabindex="0" data-action="select-ayah" data-surah="${g.id}" data-ayah="${a.n}" aria-label="${esc(byId(g.id).name)}, ayat ${a.n}" aria-pressed="${route.surah===g.id&&route.ayah===a.n}">${text(g.id,a)} ${marker(a.n)}</span>`).join(' ')}</p>`).join('')}</div><footer class="mushaf-foot">${esc(firstSurah.name)} ${first.ayah} – ${last.surah!==first.surah?esc(byId(last.surah).name)+' ':''}${last.ayah}</footer></section></div></div><div class="page-zoom" role="group" aria-label="Perbesaran halaman"><button data-zoom="out" aria-label="Perkecil halaman">−</button><button data-zoom="reset" aria-label="Tampilkan satu halaman utuh">Pas layar</button><button data-zoom="in" aria-label="Perbesar halaman">+</button></div>`;
  }else{
    const tabs=surahs.filter(v=>Math.abs(v.id-s.id)<=2);
    content=`<nav class="surah-strip" aria-label="Pilih surah">${tabs.map(v=>`<a href="#read/${v.id}/1" ${v.id===s.id?'aria-current="page"':''}>${v.id}. ${esc(v.name)}</a>`).join('')}</nav><header class="reader-header surah-banner"><span>${s.type==='Meccan'?'Makkiyah':'Madaniyah'}</span><div><strong class="arabic-title" dir="rtl" lang="ar">${esc(s.arabic)}</strong><p>${esc(s.meaning)}</p></div><span>${s.count} ayat</span></header><div id="verses">${s.ayahs.map(a=>`<article class="ayah ${saved(s.id,a.n)?'saved':''} ${active(s.id,a.n)?'active':''}" id="ayah-${a.n}" data-surah="${s.id}" data-ayah="${a.n}"><div class="ayah-row"><span class="verse-medallion" aria-label="Ayat ${a.n}">${a.n}</span>${buttons(s.id,a.n)}</div><p class="arabic" lang="ar" dir="rtl">${text(s.id,a)}</p>${settings.latin?`<p class="latin" lang="id" dir="ltr">${a.n===1&&s.id!==1&&s.id!==9?`<span class="latin-basmala">${esc(byId(1).ayahs[0].latin)}</span>`:''}${esc(a.latin)}</p>`:''}${settings.translation?`<p class="translation" lang="id" dir="ltr">${esc(a.translation)}</p>`:''}<div class="ayah-foot"><span>${saved(s.id,a.n)?'Terakhir dibaca':''}</span>${saveButton(s.id,a.n)}</div></article>`).join('')}</div><div class="reader-end">${s.id>1?`<a class="pill" href="#read/${s.id-1}/1">${icon('back')}${esc(byId(s.id-1).name)}</a>`:'<span></span>'}${s.id<114?`<a class="pill" href="#read/${s.id+1}/1">${esc(byId(s.id+1).name)}${icon('arrow')}</a>`:''}</div><p class="translation-source">Arti & bacaan Latin: <a href="https://equran.id" target="_blank" rel="noopener">EQuran.id</a> · sumber Kementerian Agama RI</p>`;
  }
  return `<div class="reader-shell ${isPage?'mode-page':'mode-ayah'}">${header}${content}</div>`;
}
