import AsyncStorage from '@react-native-async-storage/async-storage';
import { demoOwnerStaffRepository } from './ownerStaffRepository';

// 급여 화면 데이터 계약. 현재는 로컬 시안 저장소이며, 서버 구현으로 교체할 수 있다.
export type PayrollShift = {
  id: string;
  date: string;
  weekday: string;
  start: string;
  end: string;
  amount: number;
  breakMinutes?: number;
  hourlyRate?: number;
};
export type PayrollEmployee = {
  id: string;
  name: string;
  hourlyRate: number;
  days: number;
  hours: number;
  regularPay: number;
  holidayPay: number;
  totalPay: number;
  monthsEmployed: number;
  shifts: PayrollShift[];
};

export interface PayrollRepository {
  getEmployees(storeId: number, year: number, month: number): Promise<PayrollEmployee[]>;
  getEmployee(storeId: number, employeeId: string, year: number, month: number): Promise<PayrollEmployee>;
  addManualShift(storeId: number, employeeId: string, year: number, month: number, shift: PayrollShift): Promise<void>;
  updateManualShift(
    storeId: number,
    employeeId: string,
    year: number,
    month: number,
    shiftId: string,
    shift: PayrollShift,
  ): Promise<void>;
  updateHourlyRate(storeId: number, employeeId: string, year: number, month: number, hourlyRate: number): Promise<void>;
}

const byStoreMonth = new Map<string, PayrollEmployee[]>();
const storeMonthKey = (storeId: number, year: number, month: number) =>
  `${storeId}:${year}-${String(month).padStart(2, '0')}`;
const storageKey = (key: string) => `payrollDemo:${key}`;
const copyEmployee = (employee: PayrollEmployee): PayrollEmployee => ({
  ...employee,
  shifts: employee.shifts.map((shift) => ({ ...shift })),
});

function demoEmployees(year: number, month: number, people: { id: string; name: string }[]): PayrollEmployee[] {
  const shifts: PayrollShift[] = [15, 12, 11].map((day) => {
    const date = new Date(year, month - 1, day);
    return {
      id: `sample-${year}-${month}-${day}`,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      weekday: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
      start: day === 12 ? '13:58' : '14:00',
      end: day === 12 ? '20:02' : '19:00',
      amount: day === 12 ? 60180 : 50150,
      hourlyRate: 10030,
    };
  });
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    hourlyRate: 10030,
    days: 11,
    hours: 62,
    regularPay: 621860,
    holidayPay: 142140,
    totalPay: 764000,
    monthsEmployed: 0,
    shifts: shifts.map((item) => ({ ...item })),
  }));
}

async function getStore(storeId: number, year: number, month: number): Promise<PayrollEmployee[]> {
  const key = storeMonthKey(storeId, year, month);
  let employees = byStoreMonth.get(key);
  if (!employees) {
    try {
      const raw = await AsyncStorage.getItem(storageKey(key));
      if (raw) employees = JSON.parse(raw) as PayrollEmployee[];
    } catch {
      /* Invalid draft data falls back to the sample state. */
    }
    employees ??= [];
  }
  const staff = await demoOwnerStaffRepository.getEmployees(storeId);
  const sample = demoEmployees(year, month, staff);
  const currentById = new Map(employees.map((person) => [person.id, person]));
  employees = sample.map((newPerson) => {
    const existing = currentById.get(newPerson.id);
    return existing ? { ...existing, name: newPerson.name } : newPerson;
  });
  byStoreMonth.set(key, employees);
  if (employees.length !== currentById.size || employees.some((person) => !currentById.has(person.id))) {
    await AsyncStorage.setItem(storageKey(key), JSON.stringify(employees));
  }
  return employees;
}

async function persist(storeId: number, year: number, month: number, employees: PayrollEmployee[]) {
  const key = storeMonthKey(storeId, year, month);
  byStoreMonth.set(key, employees);
  await AsyncStorage.setItem(storageKey(key), JSON.stringify(employees));
}

// API를 붙일 때 이 인터페이스의 구현체만 교체하면 화면은 그대로 사용할 수 있다.
export const demoPayrollRepository: PayrollRepository = {
  async getEmployees(storeId, year, month) {
    return (await getStore(storeId, year, month)).map(copyEmployee);
  },
  async getEmployee(storeId, employeeId, year, month) {
    const employee = (await getStore(storeId, year, month)).find((item) => item.id === employeeId);
    if (!employee) throw new Error('직원 급여 정보를 찾을 수 없어요.');
    return copyEmployee(employee);
  },
  async addManualShift(storeId, employeeId, year, month, shift) {
    const employees = await getStore(storeId, year, month);
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) throw new Error('직원 급여 정보를 찾을 수 없어요.');
    employee.shifts.unshift({ ...shift, id: shift.id || `manual-${Date.now()}` });
    employee.days += 1;
    const toMinutes = (time: string) => {
      const [hour, minute] = time.split(':').map(Number);
      return hour * 60 + minute;
    };
    const workedMinutes = ((toMinutes(shift.end) - toMinutes(shift.start) + 1440) % 1440) - (shift.breakMinutes ?? 0);
    employee.hours += Math.max(0, workedMinutes / 60);
    employee.regularPay += shift.amount;
    employee.totalPay += shift.amount;
    await persist(storeId, year, month, employees);
  },
  async updateManualShift(storeId, employeeId, year, month, shiftId, shift) {
    const employees = await getStore(storeId, year, month);
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) throw new Error('직원 급여 정보를 찾을 수 없어요.');
    const index = employee.shifts.findIndex((item) => item.id === shiftId);
    const oldShift = employee.shifts[index];
    if (!oldShift) throw new Error('수정할 근무 내역을 찾을 수 없어요.');
    const duration = (item: PayrollShift) => {
      const mins = (time: string) => {
        const [hour, minute] = time.split(':').map(Number);
        return hour * 60 + minute;
      };
      return Math.max(0, ((mins(item.end) - mins(item.start) + 1440) % 1440) - (item.breakMinutes ?? 0)) / 60;
    };
    employee.shifts[index] = { ...shift, id: shiftId };
    employee.hours = Math.max(0, employee.hours + duration(shift) - duration(oldShift));
    employee.regularPay = Math.max(0, employee.regularPay + shift.amount - oldShift.amount);
    employee.totalPay = Math.max(0, employee.totalPay + shift.amount - oldShift.amount);
    await persist(storeId, year, month, employees);
  },
  async updateHourlyRate(storeId, employeeId, year, month, hourlyRate) {
    const employees = await getStore(storeId, year, month);
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) throw new Error('직원 급여 정보를 찾을 수 없어요.');
    employee.shifts = employee.shifts.map((shift) => ({
      ...shift,
      hourlyRate: shift.hourlyRate ?? employee.hourlyRate,
    }));
    employee.hourlyRate = hourlyRate;
    await persist(storeId, year, month, employees);
  },
};
