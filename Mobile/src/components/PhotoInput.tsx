import React,{useEffect,useRef,useState} from 'react';
import {Platform,Text,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {api} from '../services/api';
import {Button,ErrorText,errorMessage,styles} from './ui';
import MediaImage from './MediaImage';
import {preparePhoto,PreparedPhoto} from '../services/preparePhoto';
export default function PhotoInput({purpose,value,onChange,onBusy}:{purpose:'parcel'|'incident'|'delivery';value:string;onChange:(id:string)=>void;onBusy?:(busy:boolean)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<PreparedPhoto|null>(null);
 useEffect(()=>()=>{pending.current?.dispose();},[]);
 async function sendPhoto(){if(!pending.current)return;const uploaded=await api<{id:string}>('/media/'+purpose,'POST',pending.current.form);onChange(uploaded.id);pending.current.dispose();pending.current=null;}
 async function retry(){if(busy||!pending.current)return;setBusy(true);onBusy?.(true);setError('');try{await sendPhoto();}catch(e){setError(errorMessage(e));}finally{setBusy(false);onBusy?.(false);}}
 async function pick(camera:boolean){if(busy)return;setBusy(true);onBusy?.(true);setError('');
 try{
 if(camera&&Platform.OS!=='web'){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)throw new Error('Hãy cho phép truy cập camera để chụp ảnh.');}
 const result=await (camera?ImagePicker.launchCameraAsync:ImagePicker.launchImageLibraryAsync)({mediaTypes:['images'],quality:1,allowsMultipleSelection:false});
 if(result.canceled)return;const asset=result.assets[0];
 if(asset.fileSize&&asset.fileSize>15*1024*1024)throw new Error('Ảnh tối đa 15 MB. Vui lòng chọn ảnh nhỏ hơn.');
 const prepared=await preparePhoto(asset);pending.current?.dispose();pending.current=prepared;
 onChange('');await sendPhoto();
 }catch(e){setError(errorMessage(e));}finally{setBusy(false);onBusy?.(false);}
 }
 return <View style={{gap:10}}><Text style={styles.label}>{purpose==='parcel'?'Ảnh hàng hóa (bắt buộc)':purpose==='delivery'?'Ảnh bằng chứng giao hàng (bắt buộc)':'Ảnh sự cố (bắt buộc)'}</Text>{!!value&&<MediaImage id={value} label="Ảnh đã chọn"/>}{purpose!=='delivery'&&<Button title={value?'Đổi ảnh từ thư viện':'Chọn ảnh từ thư viện'} variant="secondary" busy={busy} onPress={()=>void pick(false)}/>}<Button title={purpose==='delivery'?'Chụp ảnh bằng chứng':'Chụp ảnh'} variant="secondary" disabled={busy} onPress={()=>void pick(true)}/><Text style={styles.muted}>Mỗi ảnh tối đa 15 MB · Ảnh trên điện thoại được chuyển sang JPEG để tải ổn định hơn.</Text><ErrorText message={error}/>{!!error&&!!pending.current&&<Button title="Thử tải lại ảnh vừa chọn/chụp" busy={busy} onPress={()=>void retry()}/>}</View>;
}
