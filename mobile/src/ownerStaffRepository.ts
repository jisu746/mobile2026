// 직원 화면 데이터 경계. 현재는 시안용 메모리 저장소다.
// 서버에는 요청 조회(GET /api/stores/{id}/requests), 승인/거절(POST /api/members/{id}/{decision})이 있다.
// 승인 직원 목록·근무 파트 변경·직원 제거 API가 추가되면 이 인터페이스의 서버 구현으로 교체한다.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StaffPerson = { id: string; name: string; email: string; part: string; time: string };
export type OwnerStaffLists = { pending: StaffPerson[]; approved: StaffPerson[] };

export interface OwnerStaffRepository {
  getRequests(storeId: number): Promise<OwnerStaffLists>;
  decideRequest(storeId: number, requestId: string, decision: 'approve' | 'reject', part?: string): Promise<void>;
  getEmployees(storeId: number): Promise<StaffPerson[]>;
  updateEmployeePart(storeId: number, employeeId: string, part: string): Promise<void>;
  removeEmployee(storeId: number, employeeId: string): Promise<void>;
}

const initialPending: StaffPerson[] = [
  { id: 'p1', name: '홍지수', email: 'jisu.hong@storemate.kr', part: '오후', time: '3분 전' },
  { id: 'p2', name: '민보람', email: 'boram.min@storemate.kr', part: '마감', time: '1시간 전' },
];
const initialApproved: StaffPerson[] = [
  { id: 'a1', name: '홍지수', email: 'jisu.hong@storemate.kr', part: '오후', time: '3분 전' },
  { id: 'a2', name: '민보람', email: 'boram.min@storemate.kr', part: '마감', time: '1시간 전' },
  { id: 'a3', name: '이주영', email: 'juyoung.lee@storemate.kr', part: '마감', time: '1시간 전' },
];
const initialEmployees: StaffPerson[] = [
  { id: 's1', name: '홍지수', email: 'jisu.hong@storemate.kr', part: '오후', time: '3분 전' },
  { id: 's2', name: '민보람', email: 'boram.min@storemate.kr', part: '오후', time: '3분 전' },
  { id: 's3', name: '이주영', email: 'juyoung.lee@storemate.kr', part: '오후', time: '3분 전' },
  { id: 's4', name: '정채원', email: 'chaewon.jung@storemate.kr', part: '오후', time: '3분 전' },
];

type StoreData = OwnerStaffLists & { employees: StaffPerson[] };
const byStore = new Map<number, StoreData>();
const copyPeople = (people: StaffPerson[]) => people.map((person) => ({ ...person }));
const storageKey = (storeId: number) => `ownerStaffDemo:${storeId}`;

async function getStore(storeId: number): Promise<StoreData> {
  let data = byStore.get(storeId);
  if (!data) {
    try {
      const raw = await AsyncStorage.getItem(storageKey(storeId));
      if (raw) {
        const saved = JSON.parse(raw) as StoreData;
        if (Array.isArray(saved.pending) && Array.isArray(saved.approved) && Array.isArray(saved.employees)) data = saved;
      }
    } catch {
      // 저장 값을 읽지 못하면 초기 시안 데이터로 다시 시작한다.
    }
    data ??= { pending: copyPeople(initialPending), approved: copyPeople(initialApproved), employees: copyPeople(initialEmployees) };
    byStore.set(storeId, data);
  }
  return data;
}

async function persistStore(storeId: number, data: StoreData) {
  await AsyncStorage.setItem(storageKey(storeId), JSON.stringify(data));
}

// 시안용 데이터. 서버 대신 기기 저장소에 보관해 앱을 다시 열어도 변경 내용을 유지한다.
export const demoOwnerStaffRepository: OwnerStaffRepository = {
  async getRequests(storeId) {
    const { pending, approved } = await getStore(storeId);
    return { pending: copyPeople(pending), approved: copyPeople(approved) };
  },
  async decideRequest(storeId, requestId, decision, part) {
    const data = await getStore(storeId);
    const index = data.pending.findIndex((person) => person.id === requestId);
    if (index < 0) throw new Error('요청을 찾을 수 없어요. 목록을 새로고침해 주세요.');
    const [person] = data.pending.splice(index, 1);
    if (decision === 'approve') {
      const approvedPerson = { ...person, part: part ?? person.part };
      data.approved.unshift({ ...approvedPerson, id: `approved-${person.id}` });
      if (!data.employees.some((employee) => employee.email === person.email)) {
        data.employees.unshift({ ...approvedPerson, id: `employee-${person.id}` });
      }
    }
    await persistStore(storeId, data);
  },
  async getEmployees(storeId) {
    return copyPeople((await getStore(storeId)).employees);
  },
  async updateEmployeePart(storeId, employeeId, part) {
    const data = await getStore(storeId);
    const person = data.employees.find((item) => item.id === employeeId);
    if (!person) throw new Error('직원을 찾을 수 없어요. 목록을 새로고침해 주세요.');
    person.part = part;
    data.approved = data.approved.map((approved) => approved.email === person.email ? { ...approved, part } : approved);
    await persistStore(storeId, data);
  },
  async removeEmployee(storeId, employeeId) {
    const data = await getStore(storeId);
    const employee = data.employees.find((person) => person.id === employeeId);
    if (!employee) throw new Error('직원을 찾을 수 없어요. 목록을 새로고침해 주세요.');
    data.employees = data.employees.filter((person) => person.id !== employeeId);
    data.approved = data.approved.filter((person) => person.email !== employee.email);
    await persistStore(storeId, data);
  },
};
