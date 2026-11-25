// 회원가입 화면 (여러 단계)
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './font';
import { Ionicons } from '@expo/vector-icons';
import { exists, signup } from './auth';
import { Button, C, Field, Pill, SignupHeader } from './ui';
import { saveLocalProfile } from './profileRepository';

const ID_RE = /^[a-z0-9]+$/;
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

type Props = { step: 1 | 2 | 3 | 4; onStep: (n: 1 | 2 | 3 | 4) => void; onBack: () => void; onDone: () => void };

export default function Signup({ step, onStep, onBack, onDone }: Props) {
  const [fontsLoaded] = useFonts({ NotoSansKR: require('../assets/NotoSansKR-VF.ttf') });
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [idError, setIdError] = useState('');
  const [formError, setFormError] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('owner');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');

  // 완료 화면은 1.5초 후 로그인으로 자동 이동
  useEffect(() => {
    if (step !== 4) return;
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [step]);

  if (step === 4) {
    return (
      <View style={s.root}>
        <SignupHeader />
        <View style={s.center}>
          <Text style={s.done}>가입이 완료 되었어요!</Text>
        </View>
      </View>
    );
  }

  const next = async () => {
    try {
      if (step === 1 && (await exists(id))) return setIdError('이미 사용 중인 아이디예요');
      if (step === 3) {
        await signup(id, { pw, role, name, birth });
        // Keep signup profile data available to the frontend before profile APIs are wired.
        await saveLocalProfile(id, { name, birth });
      }
      setFormError('');
      onStep((step + 1) as 2 | 3 | 4);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '요청을 처리하지 못했어요';
      if (step === 1) setIdError(msg);
      else setFormError(msg);
    }
  };

  const mismatch = pw2 !== '' && pw !== pw2;
  const ok =
    step === 1 ? ID_RE.test(id) : step === 2 ? PW_RE.test(pw) && pw === pw2 : !!name.trim() && birth.length === 8;

  if (!fontsLoaded) return null;

  return (
    <View style={s.root}>
      <Pressable onPress={onBack} hitSlop={12} style={s.back}>
        <Ionicons name="arrow-back" size={24} color={C.text} />
      </Pressable>
      <SignupHeader />

      <View style={s.steps}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[s.step, n === step && s.stepOn]}>
            <Text style={[s.stepText, n === step && { color: '#fff' }]}>{n}</Text>
          </View>
        ))}
      </View>

      {step === 1 && (
        <>
          <Text style={s.title}>아이디를 입력하세요</Text>
          <Field
            placeholder="아이디"
            value={id}
            onChangeText={(t) => {
              setId(t);
              setIdError('');
            }}
            style={s.input}
          />
          <Text style={s.hint}>{'•  '}아이디는 알파벳 소문자와 숫자만 사용할 수 있어요</Text>
          {!!idError && (
            <Text style={s.error}>
              {'•  '}
              {idError}
            </Text>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <Text style={s.title}>비밀번호를 입력하세요</Text>
          <View style={s.fields}>
            <Field placeholder="비밀번호" value={pw} onChangeText={setPw} secureTextEntry style={s.input} />
            <Field placeholder="비밀번호 확인" value={pw2} onChangeText={setPw2} secureTextEntry style={s.input} />
          </View>
          <Text style={s.hint}>{'•  '}특수문자와 숫자, 알파벳 조합으로 만들어주세요</Text>
          {mismatch && <Text style={s.error}>{'•  '}비밀번호가 일치하지 않아요</Text>}
        </>
      )}
      {step === 3 && (
        <>
          <Text style={s.title}>사용자님의 정보를 입력해주세요</Text>
          <View style={s.roles}>
            <Pill
              label="사장님으로 시작할게요"
              active={role === 'owner'}
              onPress={() => setRole('owner')}
              fontFamily="NotoSansKR"
            />
            <Pill
              label="직원으로 시작할게요"
              active={role === 'staff'}
              onPress={() => setRole('staff')}
              fontFamily="NotoSansKR"
            />
          </View>
          <View style={s.fields}>
            <Field placeholder="이름" value={name} onChangeText={setName} style={s.input} />
            <Field
              placeholder="YYYY.MM.DD"
              value={formatBirthInput(birth)}
              onChangeText={(value) => setBirth(value.replace(/\D/g, '').slice(0, 8))}
              keyboardType="number-pad"
              maxLength={10}
              style={s.input}
            />
          </View>
        </>
      )}

      <View style={s.bottom}>
        {!!formError && <Text style={[s.error, { marginBottom: 8 }]}>{formError}</Text>}
        <Button label={step === 3 ? '완료' : '다음'} disabled={!ok} onPress={next} fontFamily="NotoSansKR" />
      </View>
    </View>
  );
}

function formatBirthInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 },
  back: { marginTop: 14, width: 32 },
  error: { fontSize: 13.8, color: '#D93025', marginTop: 8, fontFamily: 'NotoSansKR' },
  steps: { flexDirection: 'row', gap: 12, marginTop: 40, marginBottom: 28, paddingLeft: 4 },
  step: {
    width: 34,
    height: 32,
    borderRadius: 20,
    backgroundColor: C.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOn: { backgroundColor: C.primary },
  stepText: { fontSize: 14, fontWeight: '500', color: '#000', fontFamily: 'NotoSansKR' },
  title: { fontSize: 16, fontWeight: '600', color: C.primary, marginBottom: 12, fontFamily: 'NotoSansKR' },
  hint: { fontSize: 13.8, color: C.primary, marginTop: 14, fontFamily: 'NotoSansKR' },
  roles: { gap: 8, alignItems: 'flex-start', marginBottom: 16 },
  fields: { gap: 10 },
  input: { fontFamily: 'NotoSansKR' },
  bottom: { marginTop: 'auto', paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  done: { fontSize: 24, fontWeight: '600', color: C.primary, fontFamily: 'NotoSansKR' },
});
