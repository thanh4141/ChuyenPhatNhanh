import { AppError } from '../../common/errors.js';

export const statusLabels={at_origin:'Đã về kho / Chờ trung chuyển',in_transit:'Đang trung chuyển',at_destination:'Đã về trạm giao',ready_delivery:'Đã phân công giao',pending:'Chờ nhận',accepted:'Đã nhận',awaiting_pickup:'Chờ lấy hàng',picked_up:'Đã lấy hàng',delivering:'Đang giao',completed:'Hoàn thành',incomplete:'Chưa hoàn thành',cancelled:'Đã hủy'};
export const transitions={pending:[],accepted:['awaiting_pickup'],awaiting_pickup:['picked_up'],picked_up:['delivering'],delivering:['completed','incomplete'],completed:[],incomplete:[],cancelled:[]};
export const cancellable=['pending','accepted','awaiting_pickup'];
export const routeLabels={same_province:'Nội tỉnh',same_region:'Nội miền',inter_region:'Liên miền'};
export async function canReadOrder(connection,order,user){
  if(canAccess(order,user))return true;
  if(user.role!=='station_manager'||!user.station_id)return false;
  const [[related]]=await connection.execute('SELECT 1 FROM kien_trung_chuyen k JOIN chuyen_trung_chuyen b ON b.ma_so=k.ma_chuyen WHERE k.ma_don_hang=? AND (b.ma_tram_gui=? OR b.ma_tram_dich=?) LIMIT 1',[order.id,user.station_id,user.station_id]);
  return !!related;
}
export function canAccess(order,user){
 if(user.role==='station_manager')return !!user.station_id&&[order.origin_station_id,order.destination_station_id,order.current_station_id,order.next_station_id].includes(user.station_id);
 if(order.origin_station_id&&user.role==='employee')return order.status==='pending'?(order.pickup_employee_id===user.id&&order.pickup_station_distance_meters!=null&&!!user.station_id&&order.origin_station_id===user.station_id):(order.pickup_employee_id===user.id||order.delivery_employee_id===user.id);
return user.role==='admin'||(user.role==='customer'&&order.customer_id===user.id)||(user.role==='employee'&&order.employee_id===user.id);}
export function isDirectLocalPickup(order){
  return !!order.origin_station_id && !!order.destination_station_id
    && order.route_type==='same_province' && order.status==='picked_up' && !order.current_station_id && !order.current_batch_id;
}
export function assertTransition(order,next,user,note='',incidentPhotoId=null,deliveryPhotoId=null){
  if(['admin','station_manager'].includes(user.role))throw new AppError(403,'Quản lí chỉ được xem đơn hàng.');
  if(user.role==='customer'){
    if(order.customer_id!==user.id)throw new AppError(404,'Không tìm thấy đơn hàng.');
    if(next!=='cancelled')throw new AppError(403,'Khách hàng chỉ được hủy đơn.');
    if(!cancellable.includes(order.status))throw new AppError(409,'Đơn đã được lấy hoặc kết thúc, không thể hủy.');
    if(note.trim().length<3)throw new AppError(400,'Nhập lý do hủy ít nhất 3 ký tự.');
    return;
  }
  if(order.origin_station_id){
    const direct=isDirectLocalPickup(order)&&order.pickup_employee_id===user.id;
    const pickup=['accepted','awaiting_pickup'].includes(order.status)&&order.pickup_employee_id===user.id;
    const delivery=['ready_delivery','delivering'].includes(order.status)&&order.delivery_employee_id===user.id;
    const allowed={picked_up:direct?['delivering']:[],accepted:['awaiting_pickup'],awaiting_pickup:['picked_up'],ready_delivery:['delivering'],delivering:['completed','incomplete']};
    if(user.role!=='employee'||!(pickup||delivery||direct))throw new AppError(403,'Bạn không phụ trách công đoạn này.');
    if(!allowed[order.status]?.includes(next))throw new AppError(409,'Hàng phải qua kiểm nhận tại trạm và phân công trước khi giao.');
    if(next==='incomplete'&&(note.trim().length<3||!incidentPhotoId))throw new AppError(400,'Sự cố cần lý do và ảnh.');
    if(next==='completed'&&!deliveryPhotoId)throw new AppError(400,'Phải chụp ảnh bằng chứng giao hàng trước khi hoàn thành đơn.');return;
  }
  if(order.employee_id!==user.id)throw new AppError(403,'Bạn chưa nhận đơn hàng này.');
  if(!transitions[order.status]?.includes(next))throw new AppError(409,'Không thể chuyển trạng thái theo thứ tự này.');
  if(next==='incomplete'&&(note.trim().length<3||!incidentPhotoId))throw new AppError(400,'Sự cố cần lý do và ảnh chụp (tối đa 15 MB).');
  if(next==='completed'&&!deliveryPhotoId)throw new AppError(400,'Phải chụp ảnh bằng chứng giao hàng trước khi hoàn thành đơn.');
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
