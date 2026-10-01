import {z} from 'zod';
const optional = schema => z.preprocess(v=>v===''?undefined:v,schema.optional());
export const logisticsFilters=z.object({
 direction:optional(z.enum(['outgoing','incoming'])),
 status:optional(z.enum(['planned','dispatched','received','cancelled'])),
 service_code:optional(z.enum(['standard','express'])),
 date_from:optional(z.iso.date()),date_to:optional(z.iso.date()),
}).refine(v=>!v.date_from||!v.date_to||v.date_from<=v.date_to,'Ngày kết thúc phải từ ngày bắt đầu trở đi.');
export function dateFilter(filters,column,params){
 let sql='';
 if(filters.date_from){sql+=` AND ${column}>=?`;params.push(new Date(filters.date_from+'T00:00:00+07:00'));}
 if(filters.date_to){sql+=` AND ${column}<?`;params.push(new Date(new Date(filters.date_to+'T00:00:00+07:00').getTime()+86400000));}
 return sql;
}
