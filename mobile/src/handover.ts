// 인수인계 메모 서버 연동 (목록, 작성, 긴급 확인 완료)
import { api } from './api';

// 인수인계 메모는 서버에 저장한다 (매장별 최근 20개)
export type Handover = { title?:string|null;relatedTaskId?:number|null;relatedTaskTitle?:string|null;relatedTaskStatus?:string|null; id: number; author: string; mine: boolean; content: string; urgent: boolean; resolved: boolean; createdAt: Date; revision:number; updatedAt:string|null;canEdit:boolean;canDelete:boolean;confirmedByMe:boolean;confirmations:{name:string;confirmedAt:string;mine:boolean}[] };

type View = Omit<Handover, 'createdAt'> & { createdAt: string };
const toHandover = (v: View): Handover => ({ ...v, createdAt: new Date(v.createdAt) });
const base = (storeId: number) => { if(!Number.isSafeInteger(storeId)||storeId<=0)throw new Error('매장을 다시 선택해 주세요.');return `/api/stores/${storeId}/handovers`; };
function target(storeId:number,id:number,revision:number){if(!Number.isSafeInteger(id)||id<=0||!Number.isSafeInteger(revision)||revision<0)throw new Error('메모를 새로고침해 주세요.');return `${base(storeId)}/${id}`;}
function text(content:string){const value=content.trim();if(!value||value.length>500)throw new Error('내용은 1~500자로 입력해 주세요.');return value;}

export const listHandovers = (storeId: number) => api<View[]>('GET', base(storeId)).then((l) => l.map(toHandover));

function metadata(title:string|null|undefined,relatedTaskId:number|null|undefined){return {...(title===undefined?{}:{title}),...(relatedTaskId===undefined?{}:{relatedTaskId})};}
export const writeHandover = (storeId: number, content: string, urgent: boolean, title?:string, relatedTaskId?:number|null) =>
  api<View>('POST', base(storeId), { content:text(content), urgent,...metadata(title,relatedTaskId) }).then(toHandover);

// 긴급 인수인계 확인 완료 표시 (done=false 로 되돌릴 수 있다)
export const resolveHandover = (storeId: number, id: number, done: boolean, revision:number) =>
  api<View>('POST', `${target(storeId,id,revision)}/resolve`, { done,revision }).then(toHandover);
export const editHandover=(storeId:number,h:Handover,content:string,urgent:boolean,title?:string,relatedTaskId?:number|null)=>api<View>('PUT',target(storeId,h.id,h.revision),{content:text(content),urgent,revision:h.revision,...metadata(title??h.title,relatedTaskId===undefined?h.relatedTaskId:relatedTaskId)}).then(toHandover);
export const deleteHandover=(storeId:number,h:Handover)=>api<void>('DELETE',target(storeId,h.id,h.revision),{revision:h.revision});

export type PreviousHandover={author:string|null;workPart:string|null;clockIn:string|null;clockOut:string|null;items:Handover[]};
export const previousHandovers=(storeId:number)=>api<Omit<PreviousHandover,'items'>&{items:View[]}>('GET',base(storeId)+'/previous').then(v=>({...v,items:v.items.map(toHandover)}));
