export type Role='admin'|'employee'|'customer';
export type Status='pending'|'accepted'|'awaiting_pickup'|'picked_up'|'delivering'|'completed'|'incomplete'|'cancelled';
export type Route='same_province'|'same_region'|'inter_region';
export interface User{id:number;name:string;email:string;phone:string;address:string;role:Role;active:boolean;created_at:string}
export interface Province{code:string;name:string;region:string}
export interface LocationData{contact_name:string;phone:string;province_code:string;ward:string;village:string;detail:string;latitude:number;longitude:number}
export type LocationDraft=Omit<LocationData,'latitude'|'longitude'>&{latitude:number|null;longitude:number|null};
export interface Address extends LocationData{id:number;label:string;is_default:boolean;formatted_address:string;province_name:string}
export interface Service{id:number;service_id:number;service_name:string;service_code:string;route_type:Route;base_fee:number;included_km:number;extra_km_fee:number;included_weight:number;weight_step:number;extra_weight_fee:number;cod_fee:number;insurance_fee:number;packaging_fee:number;min_days:number;max_days:number;active:boolean}
export interface Fees{base_fee:number;distance_fee:number;weight_fee:number;shipping_fee:number;cod_fee:number;insurance_fee:number;packaging_fee:number;total_amount:number}
export interface RouteGeometry{type:'LineString';coordinates:[number,number][]}
export interface Quote extends Fees{source:string;route_geometry?:RouteGeometry;route_data_version?:string|null;route_fetched_at?:string;pickup?:LocationData;delivery?:LocationData;quote_id:string;expires_at:string;distance_meters:number;route_type:Route;rate:Service;cod_amount:number}
export interface Order{id:number;tracking_code:string;customer_id:number;employee_id:number|null;service_id:number;sender_name:string;sender_phone:string;sender_address:string;receiver_name:string;receiver_phone:string;receiver_address:string;package_name:string;weight:number;cod_amount:number;shipping_fee:number;cod_fee:number;insurance_fee:number;packaging_fee:number;total_amount:number;payer:'sender'|'receiver';note:string;status:Status;created_at:string;delivered_at:string|null;service_name:string;employee_name:string|null;route_type:Route|null;distance_meters:number|null;distance_source:string;pricing_snapshot:Quote|null;pickup_snapshot:LocationData|null;delivery_snapshot:LocationData|null}
export interface OrderEvent{id:number;status:Status;note:string;actor_name:string;created_at:string}
export interface Media{id:string;purpose:'parcel'|'incident';event_id:number|null}
export interface Review{id:number;stars:number;comment:string;customer_name:string;tracking_code:string;created_at:string}
export interface OrderDetail{order:Order;events:OrderEvent[];media:Media[];review:Review|null}
export interface Page<T>{items:T[];total:number;page:number;limit:number}
export interface Notice{id:number;order_id:number|null;type:string;title:string;message:string;read_at:string|null;created_at:string}
export interface EmployeeProfile{id:number;user_id:number;employee_code:string;hometown:string;identity_number:string|null;hired_at:string;employment_status:'active'|'stopped'}
export interface EmployeeSummary{profile:EmployeeProfile|null;stats:{total:number;completed:number;incomplete:number;average_stars:number;review_count:number};reviews:Review[];page:number;limit:number}
