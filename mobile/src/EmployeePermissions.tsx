import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Text } from './font';
import { api, errorText } from './api';
import { C } from './ui';
type Permissions = {
  deleteProducts: boolean;
  adjustStock: boolean;
  saveOrderPlans: boolean;
  revision: number;
  updatedAt: string | null;
  updatedBy: string | null;
};
export default function EmployeePermissions({ storeId, memberId }: { storeId: number; memberId: number }) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<Permissions | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const path = `/api/stores/${storeId}/staff/${memberId}/permissions`;
  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<Permissions>('GET', path).then(
      (v) => {
        if (alive) {
          setData(v);
          setError('');
        }
      },
      (e) => {
        if (alive) setError(e.message);
      },
    );
    return () => {
      alive = false;
    };
  }, [open, path]);
  return (
    <View style={{ paddingVertical: 8 }}>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={{ color: C.primary, paddingVertical: 10, fontWeight: '700' }}>
          직원 작업 권한 {open ? '⌄' : '〉'}
        </Text>
      </Pressable>
      {open && (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 12, lineHeight: 20 }}>이 매장에서만 적용돼요. 기본값은 모두 꺼짐이에요.</Text>
          {data && (
            <>
              {(
                [
                  ['deleteProducts', '상품 삭제'],
                  ['adjustStock', '재고 실사·수량 조정'],
                  ['saveOrderPlans', '발주 계획 저장·발주 완료 표시'],
                ] as const
              ).map(([field, label]) => (
                <View key={field} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ flex: 1, fontSize: 13 }}>{label}</Text>
                  <Switch
                    disabled={busy}
                    value={data[field]}
                    onValueChange={(value) => setData({ ...data, [field]: value })}
                  />
                </View>
              ))}
              <Pressable
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const v = await api<Permissions>('PUT', path, data);
                    setData(v);
                    setError('권한을 저장했어요.');
                  } catch (e) {
                    setError(errorText(e, '저장 실패'));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Text style={{ color: C.primary, paddingVertical: 10, fontWeight: '700' }}>
                  {busy ? '저장 중…' : '권한 저장'}
                </Text>
              </Pressable>
              {data.updatedAt && (
                <Text style={{ fontSize: 11, color: '#686373' }}>
                  변경: {data.updatedBy} · {data.updatedAt.replace('T', ' ')}
                </Text>
              )}
            </>
          )}
          {!!error && <Text style={{ fontSize: 12, color: C.primary, lineHeight: 20 }}>{error}</Text>}
        </View>
      )}
    </View>
  );
}
