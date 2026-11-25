// 로그인 화면 (사장님/직원)
import { useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './font';
import { Account, login, Role } from './auth';
import { Button, C, Field, Pill } from './ui';
import SocialLogin from './SocialLogin';

type Props = { onSignup: () => void; onLoggedIn: (id: string, acc: Account) => void };

export default function Login({ onSignup, onLoggedIn }: Props) {
  const [role, setRole] = useState<Role>('owner');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const working = useRef(false);

  const submit = async () => {
    if (working.current || !id.trim() || !pw) return;
    working.current = true;
    setLoading(true);
    setError('');
    try {
      const acc = await login(id.trim(), pw, role);
      if (acc) onLoggedIn(id.trim(), acc);
      else setError('아이디 또는 비밀번호가 일치하지 않아요');
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인하지 못했어요');
    } finally {
      working.current = false;
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={s.root}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.top}>
        <Image
          source={require('../assets/storemate-store-icon.png')}
          style={{ width: 96, height: 96 }}
          resizeMode="contain"
          accessibilityLabel="StoreMate"
        />
        <Text style={s.brand}>StoreMate</Text>
      </View>

      <View style={s.pills}>
        <Pill
          label="사장으로 로그인"
          active={role === 'owner'}
          onPress={() => {
            if (!loading) setRole('owner');
          }}
        />
        <Pill
          label="직원으로 로그인"
          active={role === 'staff'}
          onPress={() => {
            if (!loading) setRole('staff');
          }}
        />
      </View>

      <Text style={s.title}>로그인</Text>
      <Text style={s.sub}>아이디와 비밀번호를 입력해주세요</Text>

      <View style={s.form}>
        <Field
          editable={!loading}
          autoCorrect={false}
          textContentType="username"
          placeholder="아이디"
          value={id}
          onChangeText={(t) => {
            setId(t);
            setError('');
          }}
          style={s.input}
        />
        <Field
          editable={!loading}
          autoCorrect={false}
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          placeholder="비밀번호"
          value={pw}
          onChangeText={(t) => {
            setPw(t);
            setError('');
          }}
          secureTextEntry
          style={s.input}
        />
        {!!error && <Text style={s.error}>{error}</Text>}
        <Button label={loading ? '로그인 중…' : '계속'} onPress={submit} disabled={loading || !id.trim() || !pw} />
      </View>

      <View style={s.bottom}>
        <SocialLogin role={role} onLoggedIn={onLoggedIn} />
        <Text style={s.bottomSub}>아직 계정이 없으신가요?</Text>
        <Pressable onPress={onSignup}>
          <Text style={s.bottomLink}>가입하기</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flexGrow: 1, paddingHorizontal: 20, backgroundColor: '#fff' },
  top: { alignItems: 'center', marginTop: 24 },
  brand: { fontSize: 24, fontWeight: '700', color: C.primary, marginTop: 8 },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 24 },
  title: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: C.primary, marginTop: 28 },
  sub: { textAlign: 'center', fontSize: 14, color: C.primary, marginTop: 2 },
  form: { gap: 12, marginTop: 20 },
  error: { fontSize: 12.5, color: '#D93025' },
  input: {
    height: Platform.OS === 'android' ? 48 : 42,
    borderRadius: 8,
    borderColor: '#E0E0E0',
    fontSize: 14,
    ...(Platform.OS === 'android'
      ? {
          fontFamily: 'sans-serif',
          paddingVertical: 0,
          includeFontPadding: false,
          textAlignVertical: 'center' as const,
        }
      : {}),
  },
  bottom: { marginTop: 24, alignItems: 'center', paddingBottom: 24 },
  bottomSub: { fontSize: 14, color: C.primary },
  bottomLink: { fontSize: 16, fontWeight: '600', color: C.primary, marginTop: 2 },
});
