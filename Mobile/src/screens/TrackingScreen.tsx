import React,{useState} from 'react';
import { ScrollView,Text,View } from 'react-native';
import { api } from '../services/api';
import { Status } from '../types';
import { Badge,Button,Card,ErrorText,Field,colors,date,errorMessage,styles } from '../components/ui';

type Tracking={order:{tracking_code:string;status:Status};events:{status:Status;label:string;created_at:string}[]};
export default function TrackingScreen(){
  const [code,setCode]=useState('');const [data,setData]=useState<Tracking|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function track(){if(busy)return;setBusy(true);setData(null);setError('');try{setData(await api(`/tracking/${encodeURIComponent(code.trim().toUpperCase())}`));}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  return <ScrollView keyboardShouldPersistTaps="handled" style={styles.screen} contentContainerStyle={styles.content}><Text style={styles.eyebrow}>THEO DÕI MỌI HÀNH TRÌNH</Text><Text style={styles.title}>Tra cứu vận đơn</Text><Text style={styles.muted}>Nhập mã vận đơn được cấp khi tạo đơn để biết trạng thái mới nhất.</Text><Card><Field label="Mã vận đơn" value={code} onChangeText={setCode} placeholder="VD: CPNDEMO000001" autoCapitalize="characters" maxLength={30} returnKeyType="search" onSubmitEditing={()=>void track()}/><Button title="Tra cứu hành trình" busy={busy} disabled={!code.trim()} onPress={()=>void track()}/><ErrorText message={error}/></Card>{data&&<Card><Text selectable style={styles.link}>{data.order.tracking_code}</Text><Badge status={data.order.status}/><View style={styles.divider}/>{data.events.map((e,i)=><View key={`${e.created_at}-${i}`} style={{paddingLeft:15,borderLeftWidth:2,borderColor:i===0?colors.green:colors.line,gap:7,paddingBottom:10}}><Text style={{fontSize:13,fontWeight:'600',color:colors.ink}}>{e.label}</Text><Text style={styles.muted}>{date(e.created_at)}</Text></View>)}</Card>}</ScrollView>;
}
