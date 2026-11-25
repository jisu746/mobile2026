export function validateProfile(name: string, birth: string, now = new Date()) {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 30) throw new Error('이름은 1~30자로 입력해 주세요.');
  if (!/^\d{8}$/.test(birth)) throw new Error('생년월일을 YYYY.MM.DD 형식으로 입력해 주세요.');
  const y = Number(birth.slice(0, 4)),
    m = Number(birth.slice(4, 6)),
    d = Number(birth.slice(6, 8)),
    date = new Date(y, m - 1, d),
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (y < 1900 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || date > today)
    throw new Error('생년월일은 1900년 이후부터 오늘까지의 유효한 날짜로 입력해 주세요.');
  return { name: cleanName, birth };
}
