// 앱에서 쓰는 텍스트와 입력창에 기본 Noto Sans KR 폰트를 적용한다.
import { Platform, Text as NativeText, TextInput as NativeTextInput, TextInputProps, TextProps } from 'react-native';

const notoStyle = Platform.OS === 'android'
  ? { fontFamily: 'sans-serif', includeFontPadding: false } as const
  : { fontFamily: 'NotoSansKR' } as const;

export function Text(props: TextProps) {
  return <NativeText {...props} style={[notoStyle, props.style]} />;
}

export function TextInput(props: TextInputProps) {
  return <NativeTextInput underlineColorAndroid="transparent" {...props} style={[notoStyle, Platform.OS === 'android' && { textAlignVertical: props.multiline ? 'top' : 'center' }, props.style]} />;
}
