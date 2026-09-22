import React,{useRef,useState} from 'react';
import {Modal,SafeAreaView,Text} from 'react-native';
import {WebView} from 'react-native-webview';
import {API_URL} from '../config/api';
import {Button,styles} from './ui';
import {MapPickerProps,MapPoint} from './MapPicker.types';
export default function MapPicker({initial,route,onSelect,onClose}:MapPickerProps){
 const web=useRef<WebView>(null),[channel]=useState(()=>Math.random().toString(36).slice(2)),[error,setError]=useState('');
 const origin=new URL(API_URL).origin;
 const url=origin+'/maps/picker.html?'+new URLSearchParams({channel,...(route?{view:'route'}:{}),...(initial?{lat:String(initial.latitude),lng:String(initial.longitude)}:{})}).toString();
 return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={{flex:1}}><Button title="Đóng bản đồ" variant="secondary" onPress={onClose}/>{!!error&&<Text style={styles.error}>{error}</Text>}<WebView ref={web} source={{uri:url}} style={{flex:1}} originWhitelist={[origin]} onLoadEnd={()=>{if(route)web.current?.postMessage(JSON.stringify({type:'cpn-map-route',channel,route}));}} onShouldStartLoadWithRequest={r=>r.url.startsWith(origin+'/maps/')||r.url==='about:blank'} onError={()=>setError('Không tải được bản đồ. Kiểm tra kết nối máy chủ.')} onMessage={event=>{try{const m=JSON.parse(event.nativeEvent.data);const p=m.location as MapPoint;if(!route&&m.type==='cpn-map-location'&&m.channel===channel&&Number.isFinite(p?.latitude)&&Number.isFinite(p?.longitude)){onSelect(p);onClose();}}catch{setError('Không đọc được vị trí bản đồ.');}}}/></SafeAreaView></Modal>;
}
