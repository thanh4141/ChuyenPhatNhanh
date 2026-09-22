import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {Quote} from '../types';
import {Button,styles} from './ui';
import MapPicker from './MapPicker';
export default function RouteButton({quote}:{quote:Quote}){
 const [open,setOpen]=useState(false);
 if(!quote.route_geometry)return null;
 return <View style={{gap:8}}><Button title="Xem toàn bộ đường đi trên bản đồ" variant="secondary" onPress={()=>setOpen(true)}/><Text style={styles.muted}>Tuyến đường bộ ô tô từ điểm lấy đến điểm giao. {quote.route_data_version?'Ngày dữ liệu: '+new Date(quote.route_data_version).toLocaleDateString('vi-VN')+'.':'Máy chủ không công bố ngày dữ liệu tuyến.'}</Text>{open&&<MapPicker route={{geometry:quote.route_geometry,distance_meters:quote.distance_meters,data_version:quote.route_data_version}} onSelect={()=>{}} onClose={()=>setOpen(false)}/>}</View>;
}
