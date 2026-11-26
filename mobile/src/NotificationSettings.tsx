// 알림 설정 화면 (알림 화면의 톱니바퀴에서 열린다)
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './font';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';
import { registerPushDevice } from './pushRegistration';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  NotificationPreferences,
  saveNotificationPreferences,
  validateNotificationPreferences,
} from './notificationPreferencesRepository';
import { DEFAULT_STORE_SETUP_SETTINGS, getStoreSetupSettingsOrDefault } from './storeSetupRepository';
import { errorText } from './api';

type NotificationToggleKey = 'task' | 'expiry' | 'stock' | 'memo' | 'pay';
const KINDS: { id: NotificationToggleKey; title: string; sub?: string }[] = [
  { id: 'task', title: '업무 배정 · 승인', sub: '새 업무, 완료 승인/반려' },
  { id: 'expiry', title: '유통기한 임박' },
  { id: 'stock', title: '재고 부족' },
  { id: 'memo', title: '인수인계 메모', sub: '매장의 인수인계 메모' },
  { id: 'pay', title: '근무표 · 급여', sub: '근무표·급여 알림 설정' },
];

export default function NotificationSettings({
  userId,
  storeId,
  onBack,
}: {
  userId: string;
  storeId: number;
  onBack: () => void;
}) {
  const [on, setOn] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETUP_SETTINGS);
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);

  const [ready, setReady] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [retry, setRetry] = useState(0);
  const [timeDraft, setTimeDraft] = useState({ quietStart: '23:00', quietEnd: '08:00' });
  const working = useRef(false),
    accountRef = useRef(userId);
  accountRef.current = userId;
  useEffect(() => {
    let active = true;
    setReady(false);
    setError('');
    setNotice('');
    setOn(DEFAULT_NOTIFICATION_PREFERENCES);
    getNotificationPreferences(userId).then(
      (value) => {
        if (active) {
          setOn(value);
          setReady(true);
        }
      },
      (e) => {
        if (active) setError(errorText(e, '설정을 불러오지 못했어요.'));
      },
    );
    return () => {
      active = false;
    };
  }, [userId, retry]);

  useEffect(() => {
    let active = true;
    getStoreSetupSettingsOrDefault(storeId)
      .then((settings) => {
        if (active) setStoreSettings(settings);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storeId]);

  // 안드로이드 뒤로가기로 설정 화면만 닫는다
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const saveNext = async (next: NotificationPreferences) => {
    if (!ready || working.current) return false;
    try {
      validateNotificationPreferences(next);
    } catch (e) {
      setError(errorText(e, '시간을 확인해 주세요.'));
      return false;
    }
    working.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveNotificationPreferences(userId, next);
      if (accountRef.current !== userId) return false;
      setOn(saved);
      setNotice('계정에 저장했어요.');
      return true;
    } catch (e) {
      if (accountRef.current === userId) {
        setError(errorText(e, '저장하지 못했어요.'));
        setReady(false);
      }
      return false;
    } finally {
      working.current = false;
      setSaving(false);
    }
  };
  const toggle = (
    id: keyof Pick<NotificationPreferences, 'push' | 'task' | 'expiry' | 'stock' | 'memo' | 'pay' | 'quiet'>,
    v: boolean,
  ) => {
    void saveNext({ ...on, [id]: v });
  };
  const changeTime = (field: 'quietStart' | 'quietEnd', delta: number) =>
    setTimeDraft((current) => {
      const [hour, minute] = current[field].split(':').map(Number),
        minutes = (hour * 60 + minute + delta + 1440) % 1440;
      return {
        ...current,
        [field]: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
      };
    });

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>알림 설정</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.rowSub}>
          이 계정에 저장되어 다른 기기에서도 유지돼요. 푸시 수신은 설치한 앱에서 기기를 연결한 뒤 사용할 수 있어요.
        </Text>
        {!ready && !error && <Text style={s.rowSub}>설정을 불러오는 중이에요…</Text>}
        {saving && <Text style={s.rowSub}>저장 중…</Text>}
        {!!notice && <Text style={[s.rowSub, { color: '#237A45' }]}>{notice}</Text>}
        {!!error && (
          <>
            <Text style={[s.rowSub, { color: '#B3261E' }]}>{error}</Text>
            <Pressable onPress={() => setRetry((v) => v + 1)}>
              <Text style={[s.rowSub, { color: C.primary, paddingVertical: 12 }]}>다시 불러오기</Text>
            </Pressable>
          </>
        )}
        <View pointerEvents={!ready || saving ? 'none' : 'auto'} style={{ opacity: ready && !saving ? 1 : 0.5 }}>
          <View style={s.card}>
            <Row
              title="푸시 알림 받기"
              sub="꺼도 알림 목록에는 계속 쌓여요"
              value={on.push}
              onChange={(v) => toggle('push', v)}
            />
          </View>

          <Pressable
            disabled={saving}
            onPress={async () => {
              setSaving(true);
              try {
                setNotice(await registerPushDevice());
              } catch (e) {
                setError(errorText(e, '푸시 연결 실패'));
              } finally {
                setSaving(false);
              }
            }}
          >
            <Text style={[s.rowSub, { color: C.primary, paddingVertical: 12 }]}>이 기기 푸시 알림 연결</Text>
          </Pressable>
          <Text style={s.section}>받을 푸시 알림</Text>
          <View style={s.card}>
            {KINDS.map((k, i) => (
              <Row
                key={k.id}
                line={i > 0}
                title={k.title}
                sub={
                  k.id === 'expiry'
                    ? `매장 기준 D-${storeSettings.expirationAlertDays}`
                    : k.id === 'stock'
                      ? `재고 ${storeSettings.lowStockThresholdCount}개 이하`
                      : (k.sub ?? '')
                }
                value={on[k.id]}
                onChange={(v) => toggle(k.id, v)}
              />
            ))}
          </View>

          <Text style={s.section}>방해 금지</Text>
          <View style={s.card}>
            <Row
              title="방해 금지 사용"
              sub="지정한 시간 동안 푸시를 미루고 종료 후 전송"
              value={on.quiet}
              onChange={(v) => toggle('quiet', v)}
            />
            <Pressable
              style={[s.row, s.line]}
              onPress={() => {
                setTimeDraft({ quietStart: on.quietStart, quietEnd: on.quietEnd });
                setTimeEditorOpen(true);
              }}
            >
              <View style={s.moon}>
                <Ionicons name="moon-outline" size={18} color={C.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>방해 금지 시간</Text>
                <Text style={s.rowSub}>
                  {on.quietStart} – {on.quietEnd}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#5E5C6B" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <Modal
        transparent
        visible={timeEditorOpen}
        animationType="fade"
        onRequestClose={() => {
          if (!saving) setTimeEditorOpen(false);
        }}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>방해 금지 시간</Text>
            <View pointerEvents={saving ? 'none' : 'auto'}>
              <TimeRow
                label="시작"
                value={timeDraft.quietStart}
                onChange={(delta) => changeTime('quietStart', delta)}
              />
              <TimeRow label="종료" value={timeDraft.quietEnd} onChange={(delta) => changeTime('quietEnd', delta)} />
            </View>
            {!!error && <Text style={[s.rowSub, { color: '#B3261E' }]}>{error}</Text>}
            <Pressable
              disabled={saving || !ready}
              style={[s.modalDone, (saving || !ready) && { opacity: 0.5 }]}
              onPress={() => {
                void saveNext({ ...on, ...timeDraft }).then((saved) => {
                  if (saved) setTimeEditorOpen(false);
                });
              }}
            >
              <Text style={s.modalDoneText}>{saving ? '저장 중…' : '저장'}</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={() => setTimeEditorOpen(false)} style={{ padding: 12 }}>
              <Text style={[s.rowSub, { textAlign: 'center' }]}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (delta: number) => void }) {
  return (
    <View style={s.timeRow}>
      <Text style={s.rowTitle}>{label}</Text>
      <Pressable accessibilityLabel={`${label} 시간 30분 앞당기기`} style={s.timeButton} onPress={() => onChange(-30)}>
        <Ionicons name="remove" size={18} color={C.primary} />
      </Pressable>
      <Text style={s.timeValue}>{value}</Text>
      <Pressable accessibilityLabel={`${label} 시간 30분 늦추기`} style={s.timeButton} onPress={() => onChange(30)}>
        <Ionicons name="add" size={18} color={C.primary} />
      </Pressable>
    </View>
  );
}

function Row({
  title,
  sub,
  value,
  onChange,
  line,
}: {
  title: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  line?: boolean;
}) {
  return (
    <View style={[s.row, line && s.line]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

// 시안의 스위치 (켜짐: 보라색 트랙 + 흰 손잡이, 꺼짐: 회색 테두리 + 작은 회색 손잡이)
// 켜고 끌 때 스프링으로 손잡이가 살짝 튀어 오르며 움직인다
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, bounciness: 0, speed: 16, useNativeDriver: false }).start();
  }, [value]);

  const size = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 24] });
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)}>
      <Animated.View
        style={[
          s.track,
          {
            backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#E6E0E9', '#6750A4'] }),
            borderColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#79747E', '#6750A4'] }),
          },
        ]}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: 12,
            left: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 22] }),
            top: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 2] }),
            backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#79747E', '#FFFFFF'] }),
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: 16, borderWidth: 2 },
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 56 },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  body: { paddingHorizontal: 20, paddingBottom: 30 },
  card: { borderWidth: 0.8, borderColor: '#E4E2EC', borderRadius: 12, backgroundColor: '#fff', marginTop: 8 },
  section: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 22, marginBottom: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 58,
    paddingVertical: 8,
  },
  line: { borderTopWidth: 1, borderTopColor: '#E4E2EC' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  rowSub: { fontSize: 12.5, color: '#5E5C6B', marginTop: 3 },
  moon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 312,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  timeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECEAF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: { width: 54, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.text },
  modalDone: {
    marginTop: 16,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneText: { color: '#fff', fontWeight: '700' },
});
