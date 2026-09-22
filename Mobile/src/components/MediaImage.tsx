import React,{useEffect,useState} from 'react';
import {Image,Platform,Text,View} from 'react-native';
import {API_URL} from '../config/api';
import {authHeaders} from '../services/api';
import {styles} from './ui';
export default function MediaImage({id,label}:{id:string;label:string}){
 const [uri,setUri]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{let live=true,blobUrl='';setFailed(false);const url=API_URL+'/media/'+id+'/content';if(Platform.OS==='web'){fetch(url,{headers:authHeaders()}).then(async r=>{if(!r.ok)throw new Error();return r.blob();}).then(blob=>{if(live){blobUrl=URL.createObjectURL(blob);setUri(blobUrl);}}).catch(()=>{if(live)setFailed(true);});}else setUri(url);return()=>{live=false;if(blobUrl)URL.revokeObjectURL(blobUrl);};},[id]);
 return <View style={{gap:8}}><Text style={styles.label}>{label}</Text>{failed?<Text style={styles.error}>Không tải được ảnh.</Text>:uri?<Image accessibilityLabel={label} source={{uri,...(Platform.OS!=='web'?{headers:authHeaders()}:{})}} style={{width:'100%',height:220,borderRadius:10}} resizeMode="contain" onError={()=>setFailed(true)}/>:<Text style={styles.muted}>Đang tải ảnh…</Text>}</View>;
}
