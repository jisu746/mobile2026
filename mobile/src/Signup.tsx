// 회원가입 화면 (여러 단계)
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exists, signup } from './auth';
import { Button, C, Field, Pill, SignupHeader } from './ui';

const ID_RE = /^[a-z0-9]+$/;
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

type Props = { step: 1 | 2 | 3 | 4; onStep: (n: 1 | 2 | 3 | 4) => void; onBack: () => void; onDone: () => void };

export default function Signup({ step, onStep, onBack, onDone }: Props) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [idError, setIdError] = useState('');
  const [formError, setFormError] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('owner');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [agree, setAgree] = useState(false);

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
      if (step === 3) await signup(id, { pw, role, name, birth });
      setFormError('');
      onStep((step + 1) as 2 | 3 | 4);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '요청을 처리하지 못했어요';
      if (step === 1) setIdError(msg);
      else setFormError(msg);
    }
  };

  const mismatch = pw2 !== '' && pw !== pw2;
  const ok = step === 1 ? ID_RE.test(id) : step === 2 ? PW_RE.test(pw) && pw === pw2 : !!name && !!birth && agree;

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
          <Field placeholder="아이디" value={id} onChangeText={(t) => { setId(t); setIdError(''); }} />
          <Text style={s.hint}>•  아이디는 알파벳 소문자와 숫자만 사용할 수 있어요</Text>
          {!!idError && <Text style={s.error}>•  {idError}</Text>}
        </>
      )}
      {step === 2 && (
        <>
          <Text style={s.title}>비밀번호를 입력하세요</Text>
          <View style={s.fields}>
            <Field placeholder="비밀번호" value={pw} onChangeText={setPw} secureTextEntry />
            <Field placeholder="비밀번호 확인" value={pw2} onChangeText={setPw2} secureTextEntry />
          </View>
          <Text style={s.hint}>•  특수문자와 숫자, 알파벳 조합으로 만들어주세요</Text>
          {mismatch && <Text style={s.error}>•  비밀번호가 일치하지 않아요</Text>}
        </>
      )}
      {step === 3 && (
        <>
          <Text style={s.title}>사용자님의 정보를 입력해주세요</Text>
          <View style={s.roles}>
            <Pill label="사장님으로 시작할게요" active={role === 'owner'} onPress={() => setRole('owner')} />
            <Pill label="직원으로 시작할게요" active={role === 'staff'} onPress={() => setRole('staff')} />
          </View>
          <View style={s.fields}>
            <Field placeholder="이름" value={name} onChangeText={setName} />
            <Field placeholder="생년월일" value={birth} onChangeText={setBirth} keyboardType="number-pad" maxLength={8} />
          </View>
          <Pressable style={s.agree} onPress={() => setAgree(!agree)}>
            <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={20} color="#004AC6" />
            <Text style={s.agreeText}>[필수] StoreMate 서비스 이용약관 및 개인정보 수집·이용에 동의합니다.</Text>
          </Pressable>
        </>
      )}

      <View style={s.bottom}>
        {!!formError && <Text style={[s.error, { marginBottom: 8 }]}>{formError}</Text>}
        <Button label={step === 3 ? '완료' : '다음'} disabled={!ok} onPress={next} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 },
  back: { marginTop: 14, width: 32 },
  error: { fontSize: 13.8, color: '#D93025', marginTop: 8 },
  steps: { flexDirection: 'row', gap: 12, marginTop: 40, marginBottom: 28, paddingLeft: 4 },
  step: { width: 34, height: 32, borderRadius: 20, backgroundColor: C.pill, alignItems: 'center', justifyContent: 'center' },
  stepOn: { backgroundColor: C.primary },
  stepText: { fontSize: 14, fontWeight: '500', color: '#000' },
  title: { fontSize: 16, fontWeight: '600', color: C.primary, marginBottom: 12 },
  hint: { fontSize: 13.8, color: C.primary, marginTop: 14 },
  roles: { gap: 8, alignItems: 'flex-start', marginBottom: 16 },
  fields: { gap: 10 },
  agree: { flexDirection: 'row', gap: 10, marginTop: 20, paddingRight: 8 },
  agreeText: { flex: 1, fontSize: 12, lineHeight: 16, color: '#131B2E' },
  bottom: { marginTop: 'auto', paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  done: { fontSize: 24, fontWeight: '600', color: C.primary },
});
