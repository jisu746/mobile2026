import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from './font';
import { api } from './api';
import { C } from './ui';
import { currentLocation } from './location';
type Info = {
  name: string;
  type: string;
  branch: string | null;
  address: string;
  addressDetail: string | null;
  openTime: string;
  closeTime: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  revision: number;
};
export default function StoreDetailsEditor({ storeId }: { storeId: number }) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<Info | null>(null),
    [lat, setLat] = useState(''),
    [lng, setLng] = useState(''),
    [radius, setRadius] = useState('0'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const path = `/api/stores/${storeId}/details`;
  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<Info>('GET', path).then(
      (v) => {
        if (alive) {
          setData(v);
          setLat(v.latitude == null ? '' : String(v.latitude));
          setLng(v.longitude == null ? '' : String(v.longitude));
          setRadius(String(v.radius));
        }
      },
      (e) => {
        if (alive) setError(e.message);
      },
    );
    return () => {
      alive = false;
    };
  }, [path, open]);
  return (
    <View style={{ marginTop: 14 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{ borderWidth: 1, borderColor: '#E4E2EC', borderRadius: 14, padding: 16 }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>
          매장 정보·영업시간·출근 반경 {open ? '⌄' : '〉'}
        </Text>
      </Pressable>
      {open && data && (
        <View style={{ padding: 12 }}>
          {(['name', 'type', 'branch', 'address', 'addressDetail', 'openTime', 'closeTime'] as const).map(
            (field, i) => (
              <View key={field}>
                <Text style={{ fontSize: 13 }}>
                  {['매장 이름', '업종', '지점명', '주소', '상세 주소', '영업 시작 HH:mm', '영업 종료 HH:mm'][i]}
                </Text>
                <TextInput
                  style={{
                    height: 44,
                    borderWidth: 1,
                    borderColor: '#D8D3E8',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    marginVertical: 6,
                    color: C.text,
                  }}
                  value={data[field] ?? ''}
                  onChangeText={(v) => setData({ ...data, [field]: v })}
                />
              </View>
            ),
          )}
          <Text style={{ fontSize: 12, lineHeight: 21 }}>
            반경 0m는 위치 확인을 사용하지 않아요. 사용하면 직원의 현재 위치와 매장 위치를 비교하고, QR 확인 후 출근을
            기록해요.
          </Text>
          {[
            ['매장 위도', lat, setLat],
            ['매장 경도', lng, setLng],
            ['출근 허용 반경 (0~1000m)', radius, setRadius],
          ].map(([label, value, setter]) => (
            <View key={label as string}>
              <Text>{label as string}</Text>
              <TextInput
                style={{
                  height: 44,
                  borderWidth: 1,
                  borderColor: '#D8D3E8',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  marginVertical: 6,
                  color: C.text,
                }}
                value={value as string}
                onChangeText={setter as (v: string) => void}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          ))}
          <Pressable
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              try {
                const p = await currentLocation();
                setLat(String(p.latitude));
                setLng(String(p.longitude));
                setError('현재 위치를 불러왔어요. 매장 위치가 맞는지 확인 후 저장해주세요.');
              } catch (e) {
                setError(e instanceof Error ? e.message : '위치 확인 실패');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ paddingVertical: 12, color: C.primary }}>현재 위치를 매장 위치로 불러오기</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              try {
                if (
                  !/^\d+$/.test(radius) ||
                  (lat !== '' && !Number.isFinite(Number(lat))) ||
                  (lng !== '' && !Number.isFinite(Number(lng)))
                )
                  throw Error('위치와 반경을 숫자로 입력해주세요.');
                const result = await api<Info>('PUT', path, {
                  ...data,
                  latitude: lat === '' ? null : Number(lat),
                  longitude: lng === '' ? null : Number(lng),
                  radius: Number(radius),
                });
                setData(result);
                setError('매장 정보를 저장했어요. 매장 이름은 다시 로그인하면 상단에도 반영돼요.');
              } catch (e) {
                setError(e instanceof Error ? e.message : '저장 실패');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Text style={{ paddingVertical: 12, color: C.primary, fontWeight: '700' }}>
              {busy ? '처리 중…' : '매장 정보 저장'}
            </Text>
          </Pressable>
        </View>
      )}
      {open && !!error && <Text style={{ padding: 12, color: C.primary, fontSize: 12 }}>{error}</Text>}
    </View>
  );
}
