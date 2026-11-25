import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './font';
import { api } from './api';
import { C } from './ui';
import type { Product } from './inventory';
type Photo = { version: string; contentType: string; imageBase64: string };
const endpoint = (storeId: number, barcode: string) =>
  `/api/stores/${storeId}/products/${encodeURIComponent(barcode)}/photo`;
export function ProductPhotoButton({
  storeId,
  product,
  onPress,
}: {
  storeId: number;
  product: Product;
  onPress: () => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUri(null);
    if (product.photoVersion)
      api<Photo>('GET', endpoint(storeId, product.barcode)).then(
        (p) => {
          if (alive) setUri(`data:${p.contentType};base64,${p.imageBase64}`);
        },
        () => {},
      );
    return () => {
      alive = false;
    };
  }, [storeId, product.barcode, product.photoVersion]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name} 상품 사진 ${product.photoVersion ? '변경' : '추가'}`}
      onPress={onPress}
      style={{
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: '#F1F0F5',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image source={{ uri }} resizeMode="cover" style={{ width: 56, height: 56, borderRadius: 10 }} />
      ) : (
        <Ionicons name="camera-outline" size={23} color={C.primary} />
      )}
      <View
        style={{
          position: 'absolute',
          bottom: -3,
          right: -3,
          width: 21,
          height: 21,
          borderRadius: 11,
          backgroundColor: C.primary,
          borderWidth: 2,
          borderColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="add" size={13} color="#fff" />
      </View>
    </Pressable>
  );
}
export default function ProductPhotoCapture({
  storeId,
  product,
  onClose,
  onSaved,
}: {
  storeId: number;
  product: Product;
  onClose: () => void;
  onSaved: (version: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null),
    working = useRef(false),
    requestKey = useRef('');
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null),
    [error, setError] = useState('');
  const capture = async () => {
    if (working.current || !ready || !camera.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const picture = await camera.current.takePictureAsync({ base64: true, quality: 0.35, exif: false });
      if (!picture?.base64) throw Error('사진을 촬영하지 못했어요. 다시 시도해주세요.');
      if (picture.base64.length > 5600000) throw Error('사진 용량이 커요. 카메라 해상도를 낮춰 다시 촬영해주세요.');
      requestKey.current = 'photo-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      setPhoto({ uri: picture.uri, base64: picture.base64 });
    } catch (e) {
      setError(e instanceof Error ? e.message : '촬영하지 못했어요.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const save = async () => {
    if (working.current || !photo) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await api<Photo>('PUT', endpoint(storeId, product.barcode), {
        imageBase64: photo.base64,
        expectedVersion: product.photoVersion ?? null,
        requestKey: requestKey.current,
      });
      onSaved(saved.version);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 저장하지 못했어요.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const button = {
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center' as const,
    marginTop: 12,
  };
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={{ flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 48 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.text }}>
          상품 사진 {product.photoVersion ? '변경' : '추가'}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 22, color: '#686373', marginVertical: 12 }}>
          {product.name}
          {'\n'}상품을 화면 가운데에 맞춰 촬영해주세요. 저장한 사진은 매장 구성원과 공유돼요.
        </Text>
        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            resizeMode="contain"
            style={{ flex: 1, backgroundColor: '#F1F0F5', borderRadius: 16 }}
          />
        ) : permission?.granted ? (
          <CameraView
            ref={camera}
            facing="back"
            style={{ flex: 1, borderRadius: 16 }}
            onCameraReady={() => setReady(true)}
            onMountError={() => setError('카메라를 열 수 없어요. 카메라를 사용하는 다른 화면을 닫고 다시 열어주세요.')}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, lineHeight: 22, color: C.text }}>
              상품 사진을 촬영하려면 카메라 권한이 필요해요.
            </Text>
            <Pressable style={button} onPress={() => void requestPermission()}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>카메라 권한 허용</Text>
            </Pressable>
          </View>
        )}
        {!!error && <Text style={{ fontSize: 13, lineHeight: 21, color: '#B3261E', marginTop: 10 }}>{error}</Text>}
        {permission?.granted &&
          (photo ? (
            <>
              <Pressable disabled={busy} style={[button, busy && { opacity: 0.5 }]} onPress={() => void save()}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{busy ? '사진 저장 중…' : '이 사진 저장'}</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => {
                  setReady(false);
                  setPhoto(null);
                  setError('');
                }}
                style={{ padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: C.primary }}>다시 촬영</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              disabled={busy || !ready}
              style={[button, (busy || !ready) && { opacity: 0.5 }]}
              onPress={() => void capture()}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{busy ? '촬영 중…' : '사진 촬영'}</Text>
            </Pressable>
          ))}
        <Pressable disabled={busy} onPress={onClose} style={{ padding: 14, alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: C.primary }}>취소</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
