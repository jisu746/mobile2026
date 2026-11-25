import AsyncStorage from '@react-native-async-storage/async-storage';

export type EmploymentContract = {
  employeeId: string;
  employeeName: string;
  photoUri: string;
  capturedAt: string;
};

const key = (storeId: number, employeeId: string) => `employmentContract:${storeId}:${employeeId}`;

// Local demo storage keeps a captured contract available when the employee is opened again.
export const contractRepository = {
  async get(storeId: number, employeeId: string): Promise<EmploymentContract | null> {
    const raw = await AsyncStorage.getItem(key(storeId, employeeId));
    return raw ? (JSON.parse(raw) as EmploymentContract) : null;
  },
  async getForEmployee(storeId: number, employeeId: string, employeeName: string): Promise<EmploymentContract | null> {
    const direct = await this.get(storeId, employeeId);
    if (direct) return direct;
    // Demo staff IDs differ from account usernames, so use the displayed name as a local-only fallback.
    const prefix = `employmentContract:${storeId}:`;
    const keys = (await AsyncStorage.getAllKeys()).filter((item) => item.startsWith(prefix));
    const records = await AsyncStorage.multiGet(keys);
    for (const [, raw] of records) {
      if (!raw) continue;
      try {
        const value = JSON.parse(raw) as EmploymentContract;
        if (value.employeeName === employeeName) return value;
      } catch {
        /* Ignore invalid local demo records. */
      }
    }
    return null;
  },
  async save(storeId: number, contract: EmploymentContract): Promise<void> {
    await AsyncStorage.setItem(key(storeId, contract.employeeId), JSON.stringify(contract));
  },
};
