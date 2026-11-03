import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as auth from './src/auth';
import Login from './src/Login';
import OwnerHome from './src/OwnerHome';
import Profile from './src/Profile';
import Signup from './src/Signup';
import StaffHome from './src/StaffHome';
import StoreSwitcher from './src/StoreSwitcher';
import StaffJoin from './src/StaffJoin';
import StoreSetup from './src/StoreSetup';

// 화면 수가 적어서 네비게이션 라이브러리 없이 상태로 전환
// login / s1~s4: 회원가입 / o1~o3: 사장님 매장 등록 / f1~f4: 직원 매장 참여 / home, shome: 사장님, 직원 메인
// 프로필은 메인 위에 덮어서 띄운다 (메인의 상태를 유지하기 위해)
type Screen = 'login' | 's1' | 's2' | 's3' | 's4' | 'o1' | 'o2' | 'o3' | 'f1' | 'f2' | 'f3' | 'f4' | 'home' | 'shome';
const BACK: Record<Screen, Screen | null> = {
  login: null, home: null, shome: null, s1: 'login', s2: 's1', s3: 's2', s4: 'login',
  o1: 'login', o2: 'o1', o3: 'o2',
  f1: 'login', f2: 'f1', f3: 'f1', f4: 'login',
};

const homeOf = (acc: auth.Account): Screen => (acc.role === 'owner' ? 'home' : 'shome');
// 매장이 있으면 메인, 없으면 첫 로그인(매장 등록/참여) 화면
const startScreen = (acc: auth.Account): Screen => (acc.stores.length ? homeOf(acc) : acc.role === 'owner' ? 'o1' : 'f1');

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('login');
  const [userId, setUserId] = useState('');
  const [account, setAccount] = useState<auth.Account | null>(null);
  const [switcher, setSwitcher] = useState(false); // 프로필 아이콘의 매장 변경 시트

  const store = account?.stores[account.current] ?? { name: '', type: '' };

  // 매장 등록/참여 화면에서 뒤로: 이미 매장이 있으면(매장 추가 중) 메인으로
  const backOf = (sc: Screen): Screen | null =>
    (sc === 'o1' || sc === 'f1') && account?.stores.length ? homeOf(account) : BACK[sc];

  const enter = (id: string, acc: auth.Account) => {
    setUserId(id);
    setAccount(acc);
    setScreen(startScreen(acc));
  };

  const finishStore = async (st: auth.Store, next: Screen) => {
    setAccount(await auth.addStore(userId, st));
    setScreen(next);
  };

  const logout = async () => {
    await auth.logout();
    setSwitcher(false);
    setAccount(null);
    setScreen('login');
  };

  useEffect(() => {
    auth.session().then((ss) => {
      if (ss) enter(ss.id, ss.acc);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const prev = backOf(screen);
      if (!prev) return false;
      setScreen(prev);
      return true;
    });
    return () => sub.remove();
  }, [screen, account]);

  // MY 탭 화면 (사장님·직원 메인의 하단 탭에서 보여준다)
  const renderMy = (onBell: () => void) =>
    account && (
      <Profile
        id={userId}
        acc={account}
        onSelect={async (i) => setAccount(await auth.selectStore(userId, i))}
        onAdd={() => setScreen(account.role === 'owner' ? 'o1' : 'f1')}
        onLogout={logout}
        onBell={onBell}
      />
    );

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar style="dark" />
        {screen === 'login' && <Login onSignup={() => setScreen('s1')} onLoggedIn={enter} />}
        {screen[0] === 'f' && (
          <StaffJoin
            step={Number(screen[1]) as 1 | 2 | 3 | 4}
            onStep={(n) => setScreen(`f${n}` as Screen)}
            onBack={() => setScreen(backOf(screen) ?? 'login')}
            onDone={(name) => finishStore({ name, type: '' }, 'shome')}
          />
        )}
        {screen === 'shome' && <StaffHome storeName={store.name} userName={account?.name ?? ''} renderMy={renderMy} onSwitchStore={() => setSwitcher(true)} />}
        {screen[0] === 's' && screen !== 'shome' && (
          <Signup
            step={Number(screen[1]) as 1 | 2 | 3 | 4}
            onStep={(n) => setScreen(`s${n}` as Screen)}
            onBack={() => setScreen(BACK[screen] ?? 'login')}
            onDone={() => setScreen('login')}
          />
        )}
        {screen[0] === 'o' && (
          <StoreSetup
            step={Number(screen[1]) as 1 | 2 | 3}
            onStep={(n) => setScreen(`o${n}` as Screen)}
            onBack={account?.stores.length ? () => setScreen(backOf(screen) ?? 'login') : undefined}
            onDone={(st) => finishStore(st, 'home')}
          />
        )}
        {screen === 'home' && <OwnerHome store={store} userName={account?.name ?? ''} renderMy={renderMy} onSwitchStore={() => setSwitcher(true)} />}

        {switcher && account && (
          <StoreSwitcher
            acc={account}
            onClose={() => setSwitcher(false)}
            onSelect={async (i) => {
              setAccount(await auth.selectStore(userId, i));
              setSwitcher(false);
            }}
            onAdd={() => {
              setSwitcher(false);
              setScreen(account.role === 'owner' ? 'o1' : 'f1');
            }}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
