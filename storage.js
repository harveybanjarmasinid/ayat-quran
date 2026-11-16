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
export const getAudio=id=>operation('readonly',store=>store.get(id));
export const listAudio=()=>operation('readonly',store=>store.getAllKeys());
export const saveAudio=record=>operation('readwrite',store=>store.put(record));
export const removeAudio=id=>operation('readwrite',store=>store.delete(id));
export function readState(){try{return JSON.parse(localStorage.getItem('ayat-state')||'{}')}catch{return {}}}
export function writeState(state){localStorage.setItem('ayat-state',JSON.stringify(state));}
