import React,{useEffect,useState} from 'react';
import {Image,Platform,Text,View} from 'react-native';
import {API_URL} from '../config/api';
import {authHeaders} from '../services/api';
import {Button,styles} from './ui';

export default function MediaImage({id,label}:{id:string;label:string}){
 const [uri,setUri]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let live=true,blobUrl='';
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),30000);
  setUri('');setError('');
  async function load(){
   try{
    const response=await fetch(API_URL+'/media/'+encodeURIComponent(id)+'/content',{headers:authHeaders(),signal:controller.signal});
    if(!response.ok)throw new Error(response.status===401?'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.':response.status===404?'Ảnh không còn trên máy chủ hoặc bạn không có quyền xem.':'Không tải được ảnh từ máy chủ ('+response.status+').');
    const blob=await response.blob();
    if(!blob.type.startsWith('image/'))throw new Error('Máy chủ trả về dữ liệu không phải ảnh.');
    if(!live)return;
    let nextUri:string;
    if(Platform.OS==='web'){blobUrl=URL.createObjectURL(blob);nextUri=blobUrl;}
    else{
     // Native image loaders may handle auth headers differently. Download with
     // the same authenticated fetch as the API, then display the local data.
     nextUri=await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result));
      reader.onerror=()=>reject(new Error('Không đọc được dữ liệu ảnh.'));
      reader.readAsDataURL(blob);
     });
    }
    if(live)setUri(nextUri);
   }catch(e){if(live)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Tải ảnh quá lâu. Kiểm tra kết nối và thử lại.');}
   finally{clearTimeout(timeout);}
  }
  void load();
  return()=>{live=false;clearTimeout(timeout);controller.abort();if(blobUrl)URL.revokeObjectURL(blobUrl);};
 },[id,attempt]);
 return <View style={{gap:8}}><Text style={styles.label}>{label}</Text>{error?<><Text style={styles.error}>{error}</Text><Button title="Tải lại ảnh" variant="secondary" onPress={()=>setAttempt(n=>n+1)}/></>:uri?<Image accessibilityLabel={label} source={{uri}} style={{width:'100%',height:220,borderRadius:10}} resizeMode="contain" onError={()=>setError('Thiết bị không đọc được ảnh. Vui lòng tải lại.')}/>:<Text style={styles.muted}>Đang tải ảnh…</Text>}</View>;
}
