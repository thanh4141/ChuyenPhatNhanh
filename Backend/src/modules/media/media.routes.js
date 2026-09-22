import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir,writeFile,unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../../config/database.js';
import { AppError } from '../../common/errors.js';
import { authorize } from '../../common/auth.js';
export const MAX_IMAGE_BYTES=15*1024*1024;
export const mediaRouter=Router();
const storage=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_IMAGE_BYTES,files:1,fields:0}}).single('image');
mediaRouter.post('/:purpose',authorize('customer','employee'),rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{message:'Bạn tải ảnh quá nhanh. Vui lòng thử lại sau.'}}),(req,res,next)=>{const purpose=z.enum(['parcel','incident']).parse(req.params.purpose);if((purpose==='parcel'&&req.user.role!=='customer')||(purpose==='incident'&&req.user.role!=='employee'))throw new AppError(403,'Không có quyền tải loại ảnh này.');storage(req,res,next);},async(req,res)=>{
  if(!req.file)throw new AppError(400,'Vui lòng chọn một ảnh.');
  let image;
  try{const decoder=sharp(req.file.buffer,{limitInputPixels:40000000,failOn:'error'});const meta=await decoder.metadata();if(!['jpeg','png','webp','heif'].includes(meta.format)||meta.pages>1)throw new Error();image=await decoder.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();}catch{throw new AppError(400,'Ảnh không hợp lệ. Dùng JPEG, PNG hoặc WebP, tối đa 15 MB và 40 triệu điểm ảnh.');}
  const uploadId=randomUUID(),storageName=`${uploadId}.jpg`,directory=req.app.locals.uploadDirectory;
  await mkdir(directory,{recursive:true});const path=resolve(directory,storageName);await writeFile(path,image);
  try{await pool.execute('INSERT INTO uploads(id,owner_id,purpose,storage_name,mime_type,size_bytes,original_size_bytes) VALUES (?,?,?,?,?,?,?)',[uploadId,req.user.id,req.params.purpose,storageName,'image/jpeg',image.length,req.file.size]);}catch(error){await unlink(path).catch(()=>{});throw error;}
  res.status(201).json({id:uploadId,purpose:req.params.purpose,size_bytes:image.length});
});
mediaRouter.get('/:id/content',async(req,res)=>{
  const uploadId=z.uuid().parse(req.params.id);
  const [[upload]]=await pool.execute(`SELECT u.* FROM uploads u WHERE u.id=? AND (u.owner_id=? OR ?='admin' OR EXISTS(SELECT 1 FROM order_media m JOIN orders o ON o.id=m.order_id WHERE m.upload_id=u.id AND (o.customer_id=? OR o.employee_id=? OR (?='employee' AND o.status='pending' AND o.employee_id IS NULL))))`,[uploadId,req.user.id,req.user.role,req.user.id,req.user.id,req.user.role]);
  if(!upload)throw new AppError(404,'Không tìm thấy ảnh.');
  res.type(upload.mime_type).set('Cache-Control','private, no-store').sendFile(resolve(req.app.locals.uploadDirectory,upload.storage_name),{dotfiles:'allow'});
});
export async function attachMedia(c,uploadId,userId,purpose,orderId,eventId=null){
  const [[upload]]=await c.execute('SELECT id FROM uploads WHERE id=? AND owner_id=? AND purpose=? FOR UPDATE',[uploadId,userId,purpose]);
  if(!upload)throw new AppError(400,'Ảnh không tồn tại hoặc không thuộc tài khoản của bạn.');
  const [[used]]=await c.execute('SELECT id FROM order_media WHERE upload_id=?',[uploadId]);if(used)throw new AppError(409,'Ảnh đã được sử dụng cho một đơn hàng/sự cố.');
  await c.execute('INSERT INTO order_media(order_id,upload_id,event_id) VALUES (?,?,?)',[orderId,uploadId,eventId]);
}
