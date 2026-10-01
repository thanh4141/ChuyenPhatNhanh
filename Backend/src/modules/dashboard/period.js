import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value;
}, 'Ngày không hợp lệ.');
export function dashboardPeriod(query, now = new Date()) {
  const input = z.object({ from: date.optional(), to: date.optional() }).parse(query);
  const today = new Date(+now + 7 * 3600000).toISOString().slice(0, 10);
  const to = input.to || today;
  const from = input.from || new Date(Date.parse(to + 'T00:00:00Z') - 6 * 86400000).toISOString().slice(0, 10);
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  z.number().min(1, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.').max(366, 'Chọn tối đa 366 ngày.').parse(days);
  return { from, to, days, start: new Date(from + 'T00:00:00+07:00'), end: new Date(Date.parse(to + 'T00:00:00+07:00') + 86400000) };
}
