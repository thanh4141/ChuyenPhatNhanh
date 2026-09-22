import { AppError } from '../../common/errors.js';

export const statusLabels={pending:'Chờ nhận',accepted:'Đã nhận',awaiting_pickup:'Chờ lấy hàng',picked_up:'Đã lấy hàng',delivering:'Đang giao',completed:'Hoàn thành',incomplete:'Chưa hoàn thành',cancelled:'Đã hủy'};
export const transitions={pending:[],accepted:['awaiting_pickup'],awaiting_pickup:['picked_up'],picked_up:['delivering'],delivering:['completed','incomplete'],completed:[],incomplete:[],cancelled:[]};
export const cancellable=['pending','accepted','awaiting_pickup'];
export const routeLabels={same_province:'Nội tỉnh',same_region:'Nội miền',inter_region:'Liên miền'};
export function canAccess(order,user){return user.role==='admin'||(user.role==='customer'&&order.customer_id===user.id)||(user.role==='employee'&&(order.employee_id===user.id||(order.status==='pending'&&!order.employee_id)));}
export function assertTransition(order,next,user,note='',incidentPhotoId=null){
  if(user.role==='admin')throw new AppError(403,'Quản lí chỉ được xem đơn hàng.');
  if(user.role==='customer'){
    if(order.customer_id!==user.id)throw new AppError(404,'Không tìm thấy đơn hàng.');
    if(next!=='cancelled')throw new AppError(403,'Khách hàng chỉ được hủy đơn.');
    if(!cancellable.includes(order.status))throw new AppError(409,'Đơn đã được lấy hoặc kết thúc, không thể hủy.');
    if(note.trim().length<3)throw new AppError(400,'Nhập lý do hủy ít nhất 3 ký tự.');
    return;
  }
  if(order.employee_id!==user.id)throw new AppError(403,'Bạn chưa nhận đơn hàng này.');
  if(!transitions[order.status]?.includes(next))throw new AppError(409,'Không thể chuyển trạng thái theo thứ tự này.');
  if(next==='incomplete'&&(note.trim().length<3||!incidentPhotoId))throw new AppError(400,'Sự cố cần lý do và ảnh chụp (tối đa 15 MB).');
}
export function routeType(pickup,delivery){return pickup.code===delivery.code?'same_province':pickup.region===delivery.region?'same_region':'inter_region';}
export function calculateFee(rate,weight,distanceMeters,extras={}){
  const excessMeters=Math.max(0,distanceMeters-Math.round(Number(rate.included_km)*1000));
  const weightUnits=Math.max(0,Math.ceil((Math.round(weight*100)-Math.round(Number(rate.included_weight)*100))/Math.round(Number(rate.weight_step)*100)));
  const result={base_fee:Number(rate.base_fee),distance_fee:Math.ceil(excessMeters*Number(rate.extra_km_fee)/1000),weight_fee:weightUnits*Number(rate.extra_weight_fee),cod_fee:extras.has_cod?Number(rate.cod_fee):0,insurance_fee:extras.has_insurance?Number(rate.insurance_fee):0,packaging_fee:extras.has_packaging?Number(rate.packaging_fee):0};
  result.shipping_fee=result.base_fee+result.distance_fee+result.weight_fee;
  result.total_amount=result.shipping_fee+result.cod_fee+result.insurance_fee+result.packaging_fee;
  return result;
}
