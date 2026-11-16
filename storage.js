let dbPromise;
function db(){return dbPromise??=new Promise((resolve,reject)=>{
  const request=indexedDB.open('ayat-audio',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('surahs',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});}
async function operation(mode,fn){const d=await db();return new Promise((resolve,reject)=>{
  const tx=d.transaction('surahs',mode),r=fn(tx.objectStore('surahs'));
  tx.oncomplete=()=>resolve(r.result);tx.onabort=()=>reject(tx.error||Error('Penyimpanan dibatalkan'));tx.onerror=()=>reject(tx.error);
});}
export const audioKey=(id,reciter=123)=>reciter===123?id:`${reciter}:${id}`;
export const getAudio=(id,reciter=123)=>operation('readonly',store=>store.get(audioKey(id,reciter)));
export const listAudio=async(reciter=123)=>(await operation('readonly',store=>store.getAllKeys())).filter(key=>reciter===123?typeof key==='number':typeof key==='string'&&key.startsWith(reciter+':')).map(key=>typeof key==='number'?key:Number(key.split(':')[1]));
export const saveAudio=(record,reciter=123)=>operation('readwrite',store=>store.put({...record,id:audioKey(record.id,reciter),surah:record.id,reciter}));
export const removeAudio=(id,reciter=123)=>operation('readwrite',store=>store.delete(audioKey(id,reciter)));
export function readState(){try{return JSON.parse(localStorage.getItem('ayat-state')||'{}')}catch{return {}}}
export function writeState(state){localStorage.setItem('ayat-state',JSON.stringify(state));}
