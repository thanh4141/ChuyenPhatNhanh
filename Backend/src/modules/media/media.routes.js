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
import {canReadOrder} from '../orders/order.domain.js';
export const MAX_IMAGE_BYTES=15*1024*1024;
export const mediaRouter=Router();
const storage=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_IMAGE_BYTES+1,files:1,fields:0}}).single('image');
mediaRouter.post('/:purpose',authorize('customer','employee'),rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{message:'Bạn tải ảnh quá nhanh. Vui lòng thử lại sau.'}}),(req,res,next)=>{const purpose=z.enum(['parcel','incident','delivery']).parse(req.params.purpose);if((purpose==='parcel'&&req.user.role!=='customer')||(['incident','delivery'].includes(purpose)&&req.user.role!=='employee'))throw new AppError(403,'Không có quyền tải loại ảnh này.');storage(req,res,next);},async(req,res)=>{
  if(!req.file)throw new AppError(400,'Vui lòng chọn một ảnh.');
  if(req.file.size>MAX_IMAGE_BYTES)throw new AppError(413,'Ảnh vượt quá giới hạn 15 MB.');
  let image;
  try{const decoder=sharp(req.file.buffer,{limitInputPixels:40000000,failOn:'error'});const meta=await decoder.metadata();if(!['jpeg','png','webp','heif'].includes(meta.format)||meta.pages>1)throw new Error();image=await decoder.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();}catch{throw new AppError(400,'Ảnh không hợp lệ. Dùng JPEG, PNG hoặc WebP, tối đa 15 MB và 40 triệu điểm ảnh.');}
  const uploadId=randomUUID(),storageName=`${uploadId}.jpg`,directory=req.app.locals.uploadDirectory;
  await mkdir(directory,{recursive:true});const path=resolve(directory,storageName);await writeFile(path,image);
  try{await pool.execute("INSERT INTO tep_tai_len(ma_so,ma_chu_so_huu,muc_dich,ten_tep_luu,loai_noi_dung,dung_luong_byte,dung_luong_goc_byte) VALUES (?,?,?,?,?,?,?)",[uploadId,req.user.id,req.params.purpose,storageName,'image/jpeg',image.length,req.file.size]);}catch(error){await unlink(path).catch(()=>{});throw error;}
  res.status(201).json({id:uploadId,purpose:req.params.purpose,size_bytes:image.length});
});
mediaRouter.get('/:id/content',async(req,res)=>{
  const uploadId=z.uuid().parse(req.params.id);
  const [[upload]]=await pool.execute('SELECT * FROM tep_tai_len WHERE ma_so=?',[uploadId]);
  if(!upload)throw new AppError(404,'Không tìm thấy ảnh.');
  if(upload.owner_id!==req.user.id&&req.user.role!=='admin'){
    const [orders]=await pool.execute('SELECT o.*,b.ma_tram_dich AS next_station_id FROM anh_don_hang m JOIN don_hang o ON o.ma_so=m.ma_don_hang LEFT JOIN chuyen_trung_chuyen b ON b.ma_so=o.ma_chuyen_hien_tai WHERE m.ma_tep_tai_len=?',[uploadId]);
    if(!(await Promise.all(orders.map(o=>canReadOrder(pool,o,req.user)))).some(Boolean))throw new AppError(404,'Không tìm thấy ảnh.');
  }
  res.type(upload.mime_type).set('Cache-Control','private, no-store').sendFile(resolve(req.app.locals.uploadDirectory,upload.storage_name),{dotfiles:'allow'});
});
export async function attachMedia(c,uploadId,userId,purpose,orderId,eventId=null){
  const [[upload]]=await c.execute("SELECT ma_so FROM tep_tai_len WHERE ma_so=? AND ma_chu_so_huu=? AND muc_dich=? FOR UPDATE",[uploadId,userId,purpose]);
  if(!upload)throw new AppError(400,'Ảnh không tồn tại hoặc không thuộc tài khoản của bạn.');
  const [[used]]=await c.execute("SELECT ma_so FROM anh_don_hang WHERE ma_tep_tai_len=?",[uploadId]);if(used)throw new AppError(409,'Ảnh đã được sử dụng cho một đơn hàng/sự cố.');
  await c.execute("INSERT INTO anh_don_hang(ma_don_hang,ma_tep_tai_len,ma_lich_su) VALUES (?,?,?)",[orderId,uploadId,eventId]);
}
