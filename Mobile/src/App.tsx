import React,{useState} from 'react';
import { ActivityIndicator,Pressable,StyleSheet,Text,View } from 'react-native';
import { SafeAreaProvider,SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider,useAuth } from './context/AuthContext';
import { Button,ErrorText,colors,styles } from './components/ui';
import AuthScreen from './screens/AuthScreen';
import OrdersScreen from './screens/OrdersScreen';
import CreateOrderScreen from './screens/CreateOrderScreen';
import OrderDetailScreen from './screens/OrderDetailScreen';
import TrackingScreen from './screens/TrackingScreen';
import ProfileScreen from './screens/ProfileScreen';

type Tab='orders'|'create'|'tracking'|'profile';
function AuthenticatedApp(){
  const {user}=useAuth();const [tab,setTab]=useState<Tab>('orders');const [detail,setDetail]=useState<number|null>(null);
  const tabs:{id:Tab;label:string;symbol:string}[]=[{id:'orders',label:user?.role==='employee'?'Công việc':'Đơn hàng',symbol:'▤'},...(user?.role==='customer'?[{id:'create' as Tab,label:'Tạo đơn',symbol:'＋'}]:[]),{id:'tracking',label:'Tra cứu',symbol:'⌕'},{id:'profile',label:'Tài khoản',symbol:'◉'}];
  return <><View style={local.header}><View style={local.brand}><Text style={local.logo}>CPN</Text><Text style={local.brandText}>Chuyển Phát Nhanh</Text></View><View style={local.role}><Text style={local.roleText}>{user?.role==='employee'?'NHÂN VIÊN':'KHÁCH HÀNG'}</Text></View></View><View style={{flex:1}}>{detail!==null?<OrderDetailScreen id={detail} onBack={()=>setDetail(null)}/>:tab==='orders'?<OrdersScreen onOpen={setDetail} onCreate={()=>setTab('create')}/>:tab==='create'&&user?.role==='customer'?<CreateOrderScreen onCreated={id=>{setTab('orders');setDetail(id);}}/>:tab==='tracking'?<TrackingScreen/>:<ProfileScreen/>}</View><View style={local.tabs}>{tabs.map(t=><Pressable key={t.id} accessibilityRole="tab" accessibilityState={{selected:tab===t.id}} onPress={()=>{setDetail(null);setTab(t.id);}} style={local.tab}><Text style={[local.tabSymbol,tab===t.id&&{color:colors.green}]}>{t.symbol}</Text><Text style={[local.tabText,tab===t.id&&{color:colors.green,fontWeight:'700'}]}>{t.label}</Text>{tab===t.id&&<View style={local.tabDot}/>}</Pressable>)}</View></>;
}
function Content(){const auth=useAuth();if(auth.loading)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator size="large" color={colors.green}/></View>;if(auth.restoreError)return <View style={[styles.content,{flex:1,justifyContent:'center'}]}><Text style={styles.title}>Kết nối lại hành trình</Text><ErrorText message={auth.restoreError}/><Button title="Thử kết nối lại" onPress={()=>void auth.retry()}/><Button title="Về màn hình đăng nhập" variant="secondary" onPress={()=>void auth.logout().catch(()=>{})}/></View>;return auth.user?<AuthenticatedApp key={auth.user.id}/>:<AuthScreen/>;}
export default function App(){return <SafeAreaProvider><SafeAreaView style={{flex:1,backgroundColor:'white'}}><StatusBar style="dark"/><AuthProvider><Content/></AuthProvider></SafeAreaView></SafeAreaProvider>;}
const local=StyleSheet.create({header:{height:64,paddingHorizontal:20,borderBottomWidth:1,borderColor:colors.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},brand:{flexDirection:'row',alignItems:'center',gap:9},logo:{color:'#e5efb7',fontSize:12,fontWeight:'800',backgroundColor:colors.green,borderRadius:10,padding:10},brandText:{fontSize:13,fontWeight:'700',color:colors.ink},role:{backgroundColor:colors.mint,padding:7,borderRadius:5},roleText:{fontSize:8,fontWeight:'700',letterSpacing:.7,color:colors.green},tabs:{flexDirection:'row',borderTopWidth:1,borderColor:colors.line,paddingTop:8,paddingBottom:6,backgroundColor:'white'},tab:{flex:1,alignItems:'center',gap:3,paddingVertical:5},tabSymbol:{fontSize:22,color:'#99a79f'},tabText:{fontSize:10,color:'#8d9e94'},tabDot:{width:4,height:4,borderRadius:2,backgroundColor:colors.green,marginTop:2}});
