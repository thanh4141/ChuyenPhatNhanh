import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, calculateFee, canAccess } from '../src/modules/orders/order.domain.js';

const service={base_fee:25000,extra_half_kg:5000,domestic_surcharge:15000};
test('Cước 1 kg đầu và làm tròn khối lượng lên mỗi 0,5 kg',()=>{
  for(const [weight,fee] of [[0.1,25000],[1,25000],[1.01,30000],[1.5,30000],[1.51,35000],[2,35000]])assert.equal(calculateFee(service,weight,'same_city'),fee);
  assert.equal(calculateFee(service,1.51,'domestic'),50000);
});
test('Nhân viên chỉ cập nhật đơn được phân công và không được hủy',()=>{
  const order={status:'assigned',customer_id:10,employee_id:20};
  assert.doesNotThrow(()=>assertTransition(order,'picked_up',{id:20,role:'employee'}));
  assert.throws(()=>assertTransition(order,'picked_up',{id:21,role:'employee'}),{status:403});
  assert.throws(()=>assertTransition(order,'cancelled',{id:20,role:'employee'},'Không lấy được'),{status:403});
});
test('Khách hàng chỉ được hủy đơn của mình khi chờ xác nhận, có lý do',()=>{
  const user={id:10,role:'customer'};
  assert.doesNotThrow(()=>assertTransition({status:'pending',customer_id:10},'cancelled',user,'Đổi kế hoạch'));
  assert.throws(()=>assertTransition({status:'pending',customer_id:11},'cancelled',user,'Đổi kế hoạch'),{status:403});
  assert.throws(()=>assertTransition({status:'assigned',customer_id:10},'cancelled',user,'Đổi kế hoạch'),{status:403});
  assert.throws(()=>assertTransition({status:'pending',customer_id:10},'cancelled',user,''),{status:400});
});
test('Không bỏ qua bước vận chuyển hoặc mở lại đơn đã kết thúc',()=>{
  const admin={id:1,role:'admin'};
  assert.throws(()=>assertTransition({status:'assigned'},'delivered',admin),{status:409});
  assert.throws(()=>assertTransition({status:'delivered'},'out_for_delivery',admin),{status:409});
  assert.throws(()=>assertTransition({status:'out_for_delivery'},'failed',admin,''),{status:400});
});
test('Quyền đọc được giới hạn theo chủ đơn và nhân viên phụ trách',()=>{
  const order={customer_id:10,employee_id:20};
  assert.equal(canAccess(order,{id:10,role:'customer'}),true);
  assert.equal(canAccess(order,{id:11,role:'customer'}),false);
  assert.equal(canAccess(order,{id:20,role:'employee'}),true);
  assert.equal(canAccess(order,{id:21,role:'employee'}),false);
  assert.equal(canAccess(order,{id:1,role:'admin'}),true);
});
