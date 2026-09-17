import { AppError } from '../../common/errors.js';

export const statusLabels = {
  pending: 'Chờ xác nhận', assigned: 'Chờ lấy hàng', picked_up: 'Đã lấy hàng',
  in_transit: 'Đang vận chuyển', out_for_delivery: 'Đang giao hàng',
  delivered: 'Giao thành công', failed: 'Giao thất bại', cancelled: 'Đã hủy',
};
export const transitions = {
  pending: ['cancelled'], assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'], in_transit: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'failed'], failed: ['out_for_delivery', 'cancelled'],
  delivered: [], cancelled: [],
};
export function assertTransition(order, next, user, note = '') {
  if (!transitions[order.status]?.includes(next)) throw new AppError(409, 'Không thể chuyển trạng thái đơn hàng theo thứ tự này.');
  if (user.role === 'customer' && !(order.customer_id === user.id && order.status === 'pending' && next === 'cancelled')) {
    throw new AppError(403, 'Khách hàng chỉ có thể hủy đơn của mình khi chờ xác nhận.');
  }
  if (user.role === 'employee' && (order.employee_id !== user.id || next === 'cancelled')) throw new AppError(403, 'Bạn chỉ được cập nhật đơn hàng đã được phân công.');
  if (['failed', 'cancelled'].includes(next) && note.trim().length < 3) throw new AppError(400, 'Vui lòng nhập lý do (ít nhất 3 ký tự).');
}
export function calculateFee(service, weight, zone) {
  const extra = Math.max(0, Math.ceil((weight - 1) * 2));
  return Math.round(Number(service.base_fee) + extra * Number(service.extra_half_kg) + (zone === 'domestic' ? Number(service.domestic_surcharge) : 0));
}
export function canAccess(order, user) {
  return user.role === 'admin' || (user.role === 'customer' && order.customer_id === user.id) || (user.role === 'employee' && order.employee_id === user.id);
}
