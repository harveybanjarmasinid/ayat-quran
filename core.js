export const AUDIO_BASE='https://cdn.mp3quran.net/audio/mishary-alafasy/r1/';
export const audioURL=(id,base=AUDIO_BASE)=>`${base}${String(id).padStart(3,'0')}.mp3`;
export function normalizeSearch(value){
  return String(value).normalize('NFD').replace(/[\u064b-\u065f\u0670\u0300-\u036f]/g,'').replace(/[أإآٱ]/g,'ا').replace(/[\s'’\-]/g,'').toLowerCase();
}
export function findSurahs(surahs,query){
  const q=normalizeSearch(query);
  return surahs.filter(s=>[s.id,s.name,s.originalName,s.meaning,s.arabic,s.english].filter(v=>v!=null).some(v=>normalizeSearch(v).includes(q)));
}
export function parseRoute(hash,surahs,pages=[]){
  const p=hash.match(/^#page\/(\d+)(?:\/(\d+)\/(\d+))?$/);
  if(p){
    const page=pages.find(v=>v.id===Number(p[1]));if(!page)return null;
    const position={surah:Number(p[2]),ayah:Number(p[3])};
    const selected=isValidPosition(position,surahs)&&pageForPosition(pages,position.surah,position.ayah)===page.id?position:page;
    return {surah:selected.surah,ayah:selected.ayah,page:page.id};
  }
  const m=hash.match(/^#read\/(\d+)(?:\/(\d+))?$/);
  if(!m)return null;
  const surah=surahs.find(s=>s.id===Number(m[1]));
  if(!surah)return null;
  return {surah:surah.id,ayah:Math.min(surah.count,Math.max(1,Number(m[2]||1)))};
}
export function pageForPosition(pages,surah,ayah){
  return pages.findLast(p=>p.surah<surah||p.surah===surah&&p.ayah<=ayah)?.id||1;
}
export function pageVerses(corpus,pageId){
  const start=corpus.pages.find(p=>p.id===pageId),end=corpus.pages.find(p=>p.id===pageId+1);
  if(!start)return [];
  return corpus.surahs.flatMap(s=>s.ayahs.filter(a=>(s.id>start.surah||s.id===start.surah&&a.n>=start.ayah)&&(!end||s.id<end.surah||s.id===end.surah&&a.n<end.ayah)).map(a=>({surah:s.id,ayah:a.n})));
}
// Tanzil stores the unnumbered opening basmala with the first verse of each
// surah except Al-Fatihah and At-Tawbah. Split presentation only, at a space;
// retaining both fragments reconstructs the exact original source string.
export function verseDisplayParts(surah,ayah,text){
  if(surah===1||surah===9||ayah!==1)return {basmala:'',body:text,start:0};
  const match=text.match(/^(\S+\s+\S+\s+\S+\s+\S+\s+)([\s\S]*)$/);
  const normalized=match?.[1].replace(/\p{Mark}/gu,'').replace(/ٱ/g,'ا').trim();
  if(normalized!=='بسم الله الرحمن الرحيم')return {basmala:'',body:text,start:0};
  return {basmala:match[1],body:match[2],start:match[1].length};
}
export function colorRuns(text,spans){
  if(!spans)return [{text,rule:null}];
  const chars=[...text],marks=chars.map(()=>null);
  for(const [start,end,rule] of spans){
    if(start<0||end>chars.length||start>=end)continue;
    for(let i=start;i<end;i++)if(!marks[i])marks[i]=rule;
  }
  const runs=[];
  for(let i=0;i<chars.length;i++){
    let rule=marks[i];
    if(/\p{Mark}/u.test(chars[i])&&runs.length)rule=runs.at(-1).rule;
    if(runs.at(-1)?.rule===rule)runs.at(-1).text+=chars[i];
    else runs.push({text:chars[i],rule});
  }
  return runs;
}
export function bytesLabel(n){return n>=1e9?`${(n/1e9).toFixed(2)} GB`:`${(n/1e6).toFixed(1)} MB`;}
export function timeLabel(n){n=Math.max(0,Math.floor(n||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
export function isValidPosition(p,surahs){const s=surahs.find(s=>s.id===p?.surah);return Boolean(s&&Number.isInteger(p.ayah)&&p.ayah>=1&&p.ayah<=s.count);}
