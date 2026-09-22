import { Router } from 'express';
import { z } from 'zod';
import { pool,transaction } from '../../config/database.js';
import { provinces } from '../../config/provinces.js';
import { authorize } from '../../common/auth.js';
import { AppError } from '../../common/errors.js';
import { id,text,phone,validate } from '../../common/validation.js';
import { verifyLocation } from '../maps/maps.service.js';
export const locationSchema=z.object({contact_name:text(120),phone,province_code:z.enum(provinces.map(p=>p.code)),ward:text(120),village:z.string().trim().max(120).default(''),detail:text(255),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)}).strict();
const addressSchema=locationSchema.extend({label:text(80).default('Địa chỉ lấy hàng'),is_default:z.boolean().default(false)});
export function formatAddress(address,provinceName){return [address.detail,address.village,address.ward,provinceName].filter(Boolean).join(', ');}
export const addressesRouter=Router();
addressesRouter.use(authorize('customer'));
addressesRouter.get('/',async(req,res)=>{const [items]=await pool.execute('SELECT a.*,p.name AS province_name,p.region FROM addresses a JOIN provinces p ON p.code=a.province_code WHERE a.user_id=? ORDER BY a.is_default DESC,a.id DESC',[req.user.id]);res.json({items});});
async function save(req,res){
  const address=req.input;const verified=await verifyLocation(req.app.locals.maps,address);const addressId=req.params.id?id.parse(req.params.id):null;
  const result=await transaction(async c=>{
    await c.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[req.user.id]);
    if(addressId){const [[old]]=await c.execute('SELECT id FROM addresses WHERE id=? AND user_id=? FOR UPDATE',[addressId,req.user.id]);if(!old)throw new AppError(404,'Không tìm thấy địa chỉ.');}
    const [[{defaults}]]=await c.execute('SELECT COUNT(*) AS defaults FROM addresses WHERE user_id=? AND is_default=TRUE AND id<>?',[req.user.id,addressId||0]);
    const isDefault=address.is_default||defaults===0;
    if(isDefault)await c.execute('UPDATE addresses SET is_default=FALSE WHERE user_id=?',[req.user.id]);
    const record={...address,is_default:isDefault,formatted_address:formatAddress(address,verified.province.name)};
    if(addressId){await c.execute(`UPDATE addresses SET ${Object.keys(record).map(k=>`${k}=?`).join(',')} WHERE id=?`,[...Object.values(record),addressId]);return addressId;}
    const [created]=await c.execute(`INSERT INTO addresses(user_id,${Object.keys(record).join(',')}) VALUES (${Array(Object.keys(record).length+1).fill('?').join(',')})`,[req.user.id,...Object.values(record)]);return created.insertId;
  });
  res.status(addressId?200:201).json({id:result,message:'Đã lưu địa chỉ.'});
}
addressesRouter.post('/',validate(addressSchema),save);
addressesRouter.patch('/:id',validate(addressSchema),save);
addressesRouter.delete('/:id',async(req,res)=>{
  await transaction(async c=>{await c.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[req.user.id]);const addressId=id.parse(req.params.id);const [[address]]=await c.execute('SELECT * FROM addresses WHERE id=? AND user_id=?',[addressId,req.user.id]);if(!address)throw new AppError(404,'Không tìm thấy địa chỉ.');await c.execute('DELETE FROM addresses WHERE id=?',[addressId]);if(address.is_default)await c.execute('UPDATE addresses SET is_default=TRUE WHERE user_id=? ORDER BY id LIMIT 1',[req.user.id]);});
  res.json({message:'Đã xóa địa chỉ. Địa chỉ trên đơn cũ vẫn được giữ nguyên.'});
});
