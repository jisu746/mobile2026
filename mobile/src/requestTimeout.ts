export class RequestTimeoutError extends Error {}
export async function withRequestTimeout<T>(request:(signal:AbortSignal)=>Promise<T>,milliseconds=15000):Promise<T>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new RequestTimeoutError('서버 응답이 늦어요. 서버 연결을 확인하고 다시 시도해 주세요.'));controller.abort();},milliseconds);});
 try{return await Promise.race([request(controller.signal),timeout]);}
 finally{if(timer!==undefined)clearTimeout(timer);}
}
