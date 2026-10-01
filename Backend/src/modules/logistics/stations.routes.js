import {Router} from 'express';
import {z} from 'zod';
import bcrypt from 'bcryptjs';
import {pool} from '../../config/database.js';
import {authorize} from '../../common/auth.js';
import {id,text,email,password,phone,validate} from '../../common/validation.js';
import {AppError} from '../../common/errors.js';
import {verifyLocation} from '../maps/maps.service.js';
export const stationsRouter=Router();
stationsRouter.use(authorize('admin','station_manager'));
stationsRouter.get('/',async(req,res)=>{
 const [items]=await pool.query('SELECT s.*,p.ten AS province_name FROM tram_chuyen_phat s JOIN tinh_thanh p ON p.ma_dinh_danh=s.ma_tinh_thanh ORDER BY p.ten');res.json({items});
});
const coordinates={latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)};
async function verifyStationPoint(req,province_code){
 const point={latitude:req.input.latitude,longitude:req.input.longitude,province_code};
 await verifyLocation(req.app.locals.maps,point);
 const [distance]=await req.app.locals.maps.stationDistances([point],point);
 if(distance===null)throw new AppError(422,'Không có đường bộ tại vị trí trạm. Hãy đặt ghim gần lối vào kho.');
}
stationsRouter.post('/',authorize('admin'),validate(z.object({name:text(120),province_code:z.string().regex(/^\d{2}$/),address:text(500),...coordinates}).strict()),async(req,res)=>{
 const {name,province_code,address,latitude,longitude}=req.input;
 const [[province]]=await pool.execute('SELECT ma_dinh_danh FROM tinh_thanh WHERE ma_dinh_danh=?',[province_code]);if(!province)throw new AppError(400,'Tỉnh/thành không hợp lệ.');
 await verifyStationPoint(req,province_code);
 const [r]=await pool.execute('INSERT INTO tram_chuyen_phat(ten,ma_tinh_thanh,dia_chi_lien_he,vi_do,kinh_do) VALUES (?,?,?,?,?)',[name,province_code,address,latitude,longitude]);res.status(201).json({id:r.insertId});
});
stationsRouter.patch('/:id/location',authorize('admin'),validate(z.object(coordinates).strict()),async(req,res)=>{
 const stationId=id.parse(req.params.id);const [[station]]=await pool.execute('SELECT ma_tinh_thanh FROM tram_chuyen_phat WHERE ma_so=?',[stationId]);
 if(!station)throw new AppError(404,'Không tìm thấy trạm.');
 await verifyStationPoint(req,station.province_code);
 await pool.execute('UPDATE tram_chuyen_phat SET vi_do=?,kinh_do=? WHERE ma_so=?',[req.input.latitude,req.input.longitude,stationId]);
 res.json({message:'Đã lưu vị trí trạm. Có thể xác định lại trạm lấy cho các đơn chờ chưa nhận.'});
});
stationsRouter.post('/:id/managers',authorize('admin'),validate(z.object({name:text(120),email,password,phone}).strict()),async(req,res)=>{
 const stationId=id.parse(req.params.id);const [[s]]=await pool.execute('SELECT * FROM tram_chuyen_phat WHERE ma_so=? AND dang_hoat_dong=TRUE',[stationId]);if(!s)throw new AppError(404,'Không tìm thấy trạm.');
 const p=req.input;const [r]=await pool.execute("INSERT INTO tai_khoan(ten,thu_dien_tu,mat_khau_bam,so_dien_thoai,vai_tro,ma_tram) VALUES (?,?,?,?,'station_manager',?)",[p.name,p.email,await bcrypt.hash(p.password,12),p.phone,stationId]);res.status(201).json({id:r.insertId,message:'Đã tạo tài khoản quản lý trạm.'});
});
