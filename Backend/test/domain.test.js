import test from 'node:test';
import assert from 'node:assert/strict';
import {assertTransition,calculateFee,canAccess,routeType} from '../src/modules/orders/order.domain.js';
import {provinceByCode,provinceByName} from '../src/config/provinces.js';
const rate={base_fee:15000,included_km:5,extra_km_fee:3000,included_weight:1,weight_step:.5,extra_weight_fee:2500,cod_fee:1000,insurance_fee:9900,packaging_fee:5000};
test('Cước tính chính xác tại biên 5 km và mỗi bước cân, không cộng tiền COD',()=>{
 for(const [weight,fee] of [[.01,15000],[1,15000],[1.01,17500],[1.5,17500],[1.51,20000],[2,20000]])assert.equal(calculateFee(rate,weight,5000).total_amount,fee);
 for(const [meters,fee] of [[0,15000],[4999,15000],[5000,15000],[5001,15003],[6321,18963]])assert.equal(calculateFee(rate,1,meters).total_amount,fee);
 assert.equal(calculateFee(rate,1.51,6321,{has_cod:true,cod_amount:999999,has_insurance:true,has_packaging:true}).total_amount,39863);
});
test('Phân tuyến dựa trên mã tỉnh và miền; nhận tên tỉnh trước sáp nhập',()=>{
 assert.equal(routeType(provinceByCode('79'),provinceByCode('79')),'same_province');
 assert.equal(routeType(provinceByCode('79'),provinceByCode('75')),'same_region');
 assert.equal(routeType(provinceByCode('79'),provinceByCode('01')),'inter_region');
 assert.equal(provinceByName('Bình Dương').code,'79');assert.equal(provinceByName('Ha Noi').code,'01');
});
test('Nhân viên không bỏ bước, cập nhật đơn người khác hoặc mở lại đơn kết thúc',()=>{
 const staff={id:2,role:'employee'},o={employee_id:2,status:'accepted'};
 assert.doesNotThrow(()=>assertTransition(o,'awaiting_pickup',staff));
 assert.throws(()=>assertTransition(o,'completed',staff),{status:409});
 assert.throws(()=>assertTransition(o,'awaiting_pickup',{id:3,role:'employee'}),{status:403});
 for(const status of ['completed','incomplete','cancelled'])assert.throws(()=>assertTransition({...o,status},'delivering',staff),{status:409});
});
test('Khách chỉ hủy đơn của mình từ chờ nhận đến chờ lấy hàng, cần lý do',()=>{
 const customer={id:10,role:'customer'};
 for(const status of ['pending','accepted','awaiting_pickup'])assert.doesNotThrow(()=>assertTransition({status,customer_id:10},'cancelled',customer,'Đổi kế hoạch'));
 assert.throws(()=>assertTransition({status:'picked_up',customer_id:10},'cancelled',customer,'Đổi kế hoạch'),{status:409});
 assert.throws(()=>assertTransition({status:'pending',customer_id:11},'cancelled',customer,'Đổi kế hoạch'),{status:404});
 assert.throws(()=>assertTransition({status:'pending',customer_id:10},'cancelled',customer,''),{status:400});
});
test('Admin chỉ xem; sự cố bắt buộc có cả text và ảnh',()=>{
 assert.throws(()=>assertTransition({status:'pending'},'accepted',{id:1,role:'admin'}),{status:403});
 const o={status:'delivering',employee_id:2},u={id:2,role:'employee'};
 assert.throws(()=>assertTransition(o,'incomplete',u,'Có sự cố'),{status:400});
 assert.throws(()=>assertTransition(o,'incomplete',u,'','image-id'),{status:400});
 assert.doesNotThrow(()=>assertTransition(o,'incomplete',u,'Có sự cố','image-id'));
});
test('Đơn chờ chưa nhận xem được bởi nhân viên; khi đã nhận chỉ nhân viên phụ trách',()=>{
 const o={customer_id:10,employee_id:null,status:'pending'};
 assert.equal(canAccess(o,{id:2,role:'employee'}),true);
 assert.equal(canAccess({...o,status:'accepted',employee_id:3},{id:2,role:'employee'}),false);
 assert.equal(canAccess(o,{id:11,role:'customer'}),false);
 assert.equal(canAccess(o,{id:10,role:'customer'}),true);
});
