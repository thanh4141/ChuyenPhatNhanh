export type Role = 'admin' | 'employee' | 'customer';
export type Status = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';
export interface User { id:number; name:string; email:string; phone:string; address:string; role:Role; active:boolean; created_at:string }
export interface Service { id:number; code:string; name:string; description:string; base_fee:number; extra_half_kg:number; domestic_surcharge:number; estimated_days:string; active:boolean }
export interface Order { id:number; tracking_code:string; customer_id:number; employee_id:number|null; service_id:number; sender_name:string; sender_phone:string; sender_address:string; receiver_name:string; receiver_phone:string; receiver_address:string; package_name:string; weight:number; zone:'same_city'|'domestic'; cod_amount:number; shipping_fee:number; payer:'sender'|'receiver'; note:string; status:Status; created_at:string; delivered_at:string|null; service_name:string; employee_name:string|null }
export interface OrderEvent { id:number; status:Status; note:string; actor_name:string; created_at:string }
export interface Page<T> { items:T[]; total:number; page:number; limit:number }
