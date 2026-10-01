import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {API_URL} from '../config/api';
import {fetch as expoFetch} from 'expo/fetch';
let token:string|null=null;
let onUnauthorized:()=>void=()=>{};
export const authHeaders=():Record<string,string>=>token?{Authorization:'Bearer '+token}:{};
export function setUnauthorizedHandler(handler:()=>void){onUnauthorized=handler;}
export async function restoreToken(){token=Platform.OS==='web'?null:await SecureStore.getItemAsync('cpn-token');return token;}
export async function saveToken(value:string|null){token=value;if(Platform.OS!=='web'){if(value)await SecureStore.setItemAsync('cpn-token',value);else await SecureStore.deleteItemAsync('cpn-token');}}
export class ApiError extends Error{constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const multipart=body instanceof FormData;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),multipart?120000:45000);
 try{
 const request=multipart&&Platform.OS!=='web'?expoFetch:fetch;
 let response;
 try{response=await request(API_URL+path,{method,signal:controller.signal,headers:{...(!multipart?{'Content-Type':'application/json'}:{}),...authHeaders()},...(body!==undefined?{body:multipart?body:JSON.stringify(body)}:{})});}
 catch(e){throw new ApiError(controller.signal.aborted?(multipart?'Tải ảnh quá 2 phút. Kiểm tra mạng rồi bấm thử tải lại ảnh.':'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'):`Không gửi được ${multipart?'ảnh':'yêu cầu'} đến ${API_URL}. Kiểm tra điện thoại và máy tính cùng mạng, API đang chạy và quyền mạng nội bộ.`,0);}
 let data;
 try{data=await response.json();}catch{throw new ApiError(`Máy chủ phản hồi HTTP ${response.status} nhưng không trả dữ liệu API hợp lệ. Kiểm tra địa chỉ ${API_URL}.`,response.status);}
 if(!response.ok){if(response.status===401&&path!=='/auth/login'){await saveToken(null);onUnauthorized();}throw new ApiError(data.errors?.length?data.message+' '+data.errors.map((e:{field:string;message:string})=>e.field+': '+e.message).join(' '):data.message||'Yêu cầu thất bại.',response.status);}
 return data as T;
 }finally{clearTimeout(timeout);}
}
