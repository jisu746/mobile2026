import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Text } from './font';
import { api } from './api';
import { currentLocation } from './location';
export default function ShiftLocationStatus({ storeId }: { storeId: number }) {
  const [store, setStore] = useState<{ latitude: number; longitude: number; radius: number } | null>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<typeof store>('GET', `/api/stores/${storeId}/details`).then(setStore, () => {});
  }, [storeId]);
  return (
    <Pressable
      disabled={!store || !store.radius || busy}
      onPress={async () => {
        if (!store || busy) return;
        setBusy(true);
        try {
          const p = await currentLocation(),
            a =
              Math.pow(Math.sin(((p.latitude - store.latitude) * Math.PI) / 360), 2) +
              Math.cos((store.latitude * Math.PI) / 180) *
                Math.cos((p.latitude * Math.PI) / 180) *
                Math.pow(Math.sin(((p.longitude - store.longitude) * Math.PI) / 360), 2),
            distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
          setMessage(
            `매장까지 약 ${Math.round(distance)}m · ${distance <= store.radius ? '출근 반경 안이에요' : '출근 반경 밖이에요'}`,
          );
        } catch (e) {
          setMessage(e instanceof Error ? e.message : '위치 확인 실패');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Text style={{ fontSize: 12, lineHeight: 21, color: '#fff', paddingVertical: 8 }}>
        {message ||
          (!store
            ? '매장 위치 기준 조회 중…'
            : store.radius
              ? `매장 반경 ${store.radius}m · 눌러서 현재 위치 확인`
              : '매장 반경 확인 사용 안 함 · QR로 출근해요')}
      </Text>
    </Pressable>
  );
}
