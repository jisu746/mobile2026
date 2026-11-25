import { api } from './api';
export type CustomTask = {
  id: number;
  title: string;
  description: string;
  urgent: boolean;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED';
  assignedMemberId: number | null;
  assignee: string | null;
  reporter: string | null;
  reportedAt: string | null;
  reportNote: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  revision: number;
  canReport: boolean;
  createdAt: string;
};
export type TaskPerson = { memberId: number; name: string };
function base(storeId: number) {
  if (!Number.isSafeInteger(storeId) || storeId <= 0) throw new Error('매장을 다시 선택해 주세요.');
  return `/api/stores/${storeId}/tasks/custom`;
}
function target(storeId: number, task: CustomTask) {
  if (!Number.isSafeInteger(task.id) || task.id <= 0 || !Number.isSafeInteger(task.revision) || task.revision < 0)
    throw new Error('업무를 새로고침해 주세요.');
  return `${base(storeId)}/${task.id}`;
}
export const taskStatus = (task: CustomTask) =>
  task.status === 'APPROVED'
    ? '완료'
    : task.status === 'SUBMITTED'
      ? '승인 대기'
      : task.reviewNote
        ? '반려 · 재보고 필요'
        : '대기';
export const customTasks = {
  edit: (storeId: number, task: CustomTask, input: { title: string; description: string; urgent: boolean }) =>
    api<CustomTask>('PUT', target(storeId, task), { revision: task.revision, ...input }),
  list: (storeId: number) => api<CustomTask[]>('GET', base(storeId)),
  people: (storeId: number) => {
    base(storeId);
    return api<TaskPerson[]>('GET', `/api/stores/${storeId}/staff`);
  },
  create: (
    storeId: number,
    input: { clientKey: string; title: string; description: string; urgent: boolean; assignedMemberId: number | null },
  ) => {
    if (
      !input.title.trim() ||
      input.title.trim().length > 100 ||
      input.description.trim().length > 500 ||
      !input.clientKey ||
      input.clientKey.length > 120
    )
      throw new Error('업무명과 설명을 확인해 주세요.');
    return api<CustomTask>('POST', base(storeId), {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
    });
  },
  assign: (storeId: number, task: CustomTask, assignedMemberId: number | null) =>
    api<CustomTask>('PUT', `${target(storeId, task)}/assignee`, { revision: task.revision, assignedMemberId }),
  report: (storeId: number, task: CustomTask, note: string) =>
    api<CustomTask>('POST', `${target(storeId, task)}/report`, { revision: task.revision, note: note.trim() }),
  review: (storeId: number, task: CustomTask, approve: boolean, note: string) => {
    if (!approve && !note.trim()) throw new Error('반려 사유를 입력해 주세요.');
    return api<CustomTask>('POST', `${target(storeId, task)}/review`, {
      revision: task.revision,
      approve,
      note: note.trim(),
    });
  },
  remove: (storeId: number, task: CustomTask) =>
    api<void>('DELETE', target(storeId, task), { revision: task.revision }),
};
