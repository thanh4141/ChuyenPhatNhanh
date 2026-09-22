import React,{useState} from 'react';
import {Platform,Text,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {api} from '../services/api';
import {Button,ErrorText,errorMessage,styles} from './ui';
import MediaImage from './MediaImage';
export default function PhotoInput({purpose,value,onChange,onBusy}:{purpose:'parcel'|'incident';value:string;onChange:(id:string)=>void;onBusy?:(busy:boolean)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function pick(camera:boolean){if(busy)return;setBusy(true);onBusy?.(true);setError('');
 try{
 if(camera&&Platform.OS!=='web'){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)throw new Error('Hãy cho phép truy cập camera để chụp ảnh.');}
 const result=await (camera?ImagePicker.launchCameraAsync:ImagePicker.launchImageLibraryAsync)({mediaTypes:['images'],quality:1,allowsMultipleSelection:false});
 if(result.canceled)return;const asset=result.assets[0];
 if(asset.fileSize&&asset.fileSize>15*1024*1024)throw new Error('Ảnh tối đa 15 MB. Vui lòng chọn ảnh nhỏ hơn.');
 const form=new FormData();
 if(Platform.OS==='web'){const blob=asset.file||await (await fetch(asset.uri)).blob();if(blob.size>15*1024*1024)throw new Error('Ảnh tối đa 15 MB.');form.append('image',blob,asset.fileName||'photo.jpg');}
 else form.append('image',{uri:asset.uri,name:asset.fileName||'photo.jpg',type:asset.mimeType||'image/jpeg'} as unknown as Blob);
 const uploaded=await api<{id:string}>('/media/'+purpose,'POST',form);onChange(uploaded.id);
 }catch(e){setError(errorMessage(e));}finally{setBusy(false);onBusy?.(false);}
 }
 return <View style={{gap:10}}><Text style={styles.label}>{purpose==='parcel'?'Ảnh hàng hóa (bắt buộc)':'Ảnh sự cố (bắt buộc)'}</Text>{!!value&&<MediaImage id={value} label="Ảnh đã chọn"/>}<Button title={value?'Đổi ảnh từ thư viện':'Chọn ảnh từ thư viện'} variant="secondary" busy={busy} onPress={()=>void pick(false)}/><Button title="Chụp ảnh" variant="secondary" disabled={busy} onPress={()=>void pick(true)}/><Text style={styles.muted}>Mỗi ảnh tối đa 15 MB · JPG, PNG, WebP, HEIC được thiết bị hỗ trợ.</Text><ErrorText message={error}/></View>;
}
