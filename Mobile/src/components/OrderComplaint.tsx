import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Text} from 'react-native';
import {api} from '../services/api';
import {Complaint,Page} from '../types';
import {Button,Card,ErrorText,Field,date,errorMessage,styles} from './ui';

const labels={open:'Chờ xử lý',processing:'Đang xử lý',resolved:'Đã giải quyết',rejected:'Từ chối'};
export default function OrderComplaint({orderId,revision}:{orderId:number;revision:string}){
  const [complaint,setComplaint]=useState<Complaint|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [title,setTitle]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[sent,setSent]=useState(false);
  async function load(){setLoading(true);setError('');try{const data=await api<Page<Complaint>>('/complaints?order_id='+orderId);setComplaint(data.items[0]||null);}catch(e){setError(errorMessage(e));}finally{setLoading(false);}}
  useEffect(()=>{void load();},[orderId,revision]);
  async function submit(){if(busy)return;setBusy(true);setError('');try{
    if(title.trim().length<3||message.trim().length<10)throw new Error('Nhập tiêu đề ít nhất 3 ký tự và nội dung ít nhất 10 ký tự.');
    await api('/complaints','POST',{order_id:orderId,title,message});setSent(true);await load();
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  return <Card><Text style={styles.subtitle}>Khiếu nại đơn hàng</Text><ErrorText message={error}/>
    {loading?<ActivityIndicator/>:error&&!complaint?<Button title="Tải lại khiếu nại" variant="secondary" onPress={()=>void load()}/>:null}
    {complaint?<><Text style={styles.label}>{labels[complaint.status]} · {date(complaint.created_at)}</Text><Text style={styles.label}>{complaint.title}</Text><Text style={styles.muted}>{complaint.message}</Text>
      <Text style={styles.label}>Phản hồi từ quản lý</Text><Text style={styles.muted}>{complaint.response||'Chưa có phản hồi. Chúng tôi sẽ thông báo khi có cập nhật.'}</Text>
      {!!complaint.handled_at&&<Text style={styles.muted}>{date(complaint.handled_at)} · {complaint.handler_name}</Text>}
      <Button title="Cập nhật phản hồi" variant="secondary" onPress={()=>void load()}/>
    </>:!loading&&!sent?<><Text style={styles.muted}>Mỗi đơn gửi một khiếu nại. Phản hồi sẽ hiển thị tại đây và trong Thông báo.</Text>
      <Field label="Tiêu đề khiếu nại" value={title} onChangeText={setTitle} maxLength={150}/>
      <Field label="Nội dung khiếu nại" value={message} onChangeText={setMessage} multiline maxLength={2000}/>
      <Button title="Gửi khiếu nại" busy={busy} onPress={()=>void submit()}/></>:null}
  </Card>;
}
