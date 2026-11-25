import { api } from './api';
export function validatePasswordChange(current: string, next: string, confirmation: string) {
  if (!current) throw new Error('현재 비밀번호를 입력해 주세요.');
  if (
    next.length < 8 ||
    next.length > 72 ||
    /[^!-~]/.test(next) ||
    !/[A-Za-z]/.test(next) ||
    !/[0-9]/.test(next) ||
    /^[A-Za-z0-9]+$/.test(next)
  )
    throw new Error('새 비밀번호는 공백 없이 영문·숫자·특수문자를 포함한 8~72자로 입력해 주세요.');
  if (next !== confirmation) throw new Error('새 비밀번호 확인이 일치하지 않아요.');
  if (current === next) throw new Error('현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.');
}
export async function changePassword(
  username: string,
  currentPassword: string,
  newPassword: string,
  confirmation: string,
) {
  validatePasswordChange(currentPassword, newPassword, confirmation);
  if (!username) throw new Error('다시 로그인해 주세요.');
  await api('PUT', '/api/me/password', { username, currentPassword, newPassword });
}
