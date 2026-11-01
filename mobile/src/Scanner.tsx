import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { C } from './ui';

type Props = {
  title: string;
  onClose: () => void;
  onScan: (data: string) => void;
  tag: string; // 스캔 직후 시트의 안내 문구
  name: string;
  sub?: string;
  confirmLabel: string;
  confirmIcon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
};

const GREEN = '#1E8E3E';

export default function Scanner({ title, onClose, onScan, tag, name, sub, confirmLabel, confirmIcon, onConfirm }: Props) {
  const [perm, ask] = useCameraPermissions();
  const [found, setFound] = useState(false);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} style={s.close}>
          <Ionicons name="close" size={24} color={C.text} />
        </Pressable>
        <Text style={s.headerText}>{title}</Text>
      </View>

      <View style={s.camera}>
        {perm?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={found ? undefined : ({ data }) => { onScan(data.trim().toUpperCase()); setFound(true); }}
          />
        ) : (
          <Pressable style={s.permBtn} onPress={ask}>
            <Text style={s.permText}>카메라 권한 허용하기</Text>
          </Pressable>
        )}
        <View pointerEvents="none" style={s.frame}>
          <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 }]} />
          <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 }]} />
          <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 }]} />
          <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 }]} />
          <View style={s.line} />
        </View>
        <Text pointerEvents="none" style={s.hint}>QR 코드를 프레임 안에 맞춰주세요</Text>
      </View>

      {found && (
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.found}>
            <View style={s.foundIcon}>
              <Ionicons name="storefront-outline" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.foundTag}>
                <Ionicons name="checkmark-circle" size={12} color={GREEN} />
                <Text style={s.foundTagText}>{tag}</Text>
              </View>
              <Text style={s.foundName}>{name}</Text>
              {!!sub && <Text style={s.foundSub}>{sub}</Text>}
            </View>
          </View>
          <Pressable style={s.confirm} onPress={onConfirm}>
            {confirmIcon && <Ionicons name={confirmIcon} size={18} color="#fff" />}
            <Text style={s.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { height: 52, alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', left: 16 },
  headerText: { fontSize: 15, fontWeight: '700', color: C.text },
  camera: { flex: 1, backgroundColor: '#1E1B2B', alignItems: 'center', justifyContent: 'center' },
  permBtn: { paddingHorizontal: 20, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  permText: { fontSize: 14, fontWeight: '700', color: C.primary },
  frame: { position: 'absolute', width: 220, height: 220 },
  corner: { position: 'absolute', width: 46, height: 46, borderColor: '#fff' },
  line: { position: 'absolute', left: 20, right: 20, top: '50%', height: 2, backgroundColor: '#8F86D6' },
  hint: { position: 'absolute', bottom: 150, color: '#fff', fontSize: 13, fontWeight: '600' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E1DFEA', marginBottom: 14 },
  found: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  foundIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0EEF8', alignItems: 'center', justifyContent: 'center' },
  foundTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  foundTagText: { fontSize: 10.5, fontWeight: '700', color: GREEN },
  foundName: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 2 },
  foundSub: { fontSize: 11, color: '#828282', marginTop: 2 },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 25, backgroundColor: C.primary },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
