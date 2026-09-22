import React,{useEffect,useRef,useState} from 'react';
import {Modal,View} from 'react-native';
import {API_URL} from '../config/api';
import {Button} from './ui';
import {MapPickerProps,MapPoint} from './MapPicker.types';
export default function MapPicker({initial,route,onSelect,onClose}:MapPickerProps){
 const frame=useRef<HTMLIFrameElement>(null),[channel]=useState(()=>Math.random().toString(36).slice(2));const origin=new URL(API_URL).origin;
 useEffect(()=>{const receive=(e:MessageEvent)=>{const m=e.data,p=m?.location as MapPoint;if(!route&&e.origin===origin&&e.source===frame.current?.contentWindow&&m?.type==='cpn-map-location'&&m.channel===channel&&Number.isFinite(p?.latitude)&&Number.isFinite(p?.longitude)){onSelect(p);onClose();}};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[origin,channel,onSelect,onClose,route]);
 const url=origin+'/maps/picker.html?'+new URLSearchParams({channel,parent_origin:window.location.origin,...(route?{view:'route'}:{}),...(initial?{lat:String(initial.latitude),lng:String(initial.longitude)}:{})}).toString();
 return <Modal visible onRequestClose={onClose}><View style={{flex:1,padding:12,gap:12}}><Button title="Đóng bản đồ" variant="secondary" onPress={onClose}/><iframe ref={frame} title="Bản đồ OpenStreetMap" src={url} onLoad={()=>{if(route)frame.current?.contentWindow?.postMessage({type:'cpn-map-route',channel,route},origin);}} style={{flex:1,width:'100%',border:0,minHeight:350}}/></View></Modal>;
}
