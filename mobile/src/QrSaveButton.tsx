import { useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './font';
import { C } from './ui';
import { errorText } from './api';
export default function QrSaveButton({ code }: { code: string }) {
  const qr = useRef<{ toDataURL: (fn: (data: string) => void) => void } | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const save = async () => {
    if (busy || !qr.current) return;
    setBusy(true);
    setMessage('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('QR 이미지를 만들지 못했어요. 다시 시도해주세요.')), 10000);
        qr.current!.toDataURL((data) => {
          clearTimeout(timer);
          resolve(data);
        });
      });
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = 'data:image/png;base64,' + base64;
        link.download = `StoreMate-QR-${code}.png`;
        link.click();
      } else {
        const { File, Paths } = await import('expo-file-system');
        const Media = await import('expo-media-library');
        const permission = await Media.requestPermissionsAsync(true);
        if (!permission.granted) throw Error('QR 이미지를 저장하려면 사진 저장 권한을 허용해주세요.');
        const file = new File(Paths.cache, `storemate-qr-${Date.now()}.png`);
        await file.write(base64, { encoding: 'base64' });
        try {
          await Media.Asset.create(file.uri);
        } finally {
          await file.delete();
        }
      }
      setMessage('QR 이미지를 저장했어요.');
    } catch (e) {
      setMessage(errorText(e, 'QR 저장 실패'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <View pointerEvents="none" style={{ position: 'absolute', left: -10000, width: 256, height: 256 }}>
        <QRCode
          value={code}
          size={240}
          quietZone={8}
          getRef={(ref) => {
            qr.current = ref;
          }}
        />
      </View>
      <Pressable
        disabled={busy}
        onPress={() => void save()}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: '#D8D3E8',
          borderRadius: 18,
        }}
      >
        <Ionicons name="download-outline" size={16} color={C.primary} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary }}>
          {busy ? '저장 중…' : 'QR 이미지 저장'}
        </Text>
      </Pressable>
      {!!message && <Text style={{ fontSize: 12, lineHeight: 20, color: C.primary, marginTop: 6 }}>{message}</Text>}
    </View>
  );
}
