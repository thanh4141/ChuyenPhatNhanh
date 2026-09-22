import { Router } from 'express';
import { pool } from '../../config/database.js';
import { id,pagination } from '../../common/validation.js';
import { AppError } from '../../common/errors.js';
export async function notify(c,userId,orderId,type,title,message){await c.execute('INSERT INTO notifications(user_id,order_id,type,title,message) VALUES (?,?,?,?,?)',[userId,orderId,type,title,message]);}
export const notificationsRouter=Router();
notificationsRouter.get('/',async(req,res)=>{const {page,limit}=pagination.parse(req.query);const [[{total}]]=await pool.execute('SELECT COUNT(*) AS total FROM notifications WHERE user_id=?',[req.user.id]);const [[{unread}]]=await pool.execute('SELECT COUNT(*) AS unread FROM notifications WHERE user_id=? AND read_at IS NULL',[req.user.id]);const [items]=await pool.query('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT ? OFFSET ?',[req.user.id,limit,(page-1)*limit]);res.json({items,total,unread_count:unread,page,limit});});
notificationsRouter.patch('/read-all',async(req,res)=>{await pool.execute('UPDATE notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP()) WHERE user_id=?',[req.user.id]);res.json({message:'Đã đọc tất cả thông báo.'});});
notificationsRouter.patch('/:id/read',async(req,res)=>{const [result]=await pool.execute('UPDATE notifications SET read_at=COALESCE(read_at,UTC_TIMESTAMP()) WHERE id=? AND user_id=?',[id.parse(req.params.id),req.user.id]);if(!result.affectedRows)throw new AppError(404,'Không tìm thấy thông báo.');res.json({message:'Đã đọc thông báo.'});});
