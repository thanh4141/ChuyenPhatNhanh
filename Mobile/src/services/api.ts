import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {API_URL} from '../config/api';
let token:string|null=null;
let onUnauthorized:()=>void=()=>{};
export const authHeaders=():Record<string,string>=>token?{Authorization:'Bearer '+token}:{};
export function setUnauthorizedHandler(handler:()=>void){onUnauthorized=handler;}
export async function restoreToken(){token=Platform.OS==='web'?null:await SecureStore.getItemAsync('cpn-token');return token;}
export async function saveToken(value:string|null){token=value;if(Platform.OS!=='web'){if(value)await SecureStore.setItemAsync('cpn-token',value);else await SecureStore.deleteItemAsync('cpn-token');}}
export class ApiError extends Error{constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
 try{
 const multipart=body instanceof FormData;
 const response=await fetch(API_URL+path,{method,signal:controller.signal,headers:{...(!multipart?{'Content-Type':'application/json'}:{}),...authHeaders()},...(body!==undefined?{body:multipart?body:JSON.stringify(body)}:{})});
 const data=await response.json();
 if(!response.ok){if(response.status===401&&path!=='/auth/login'){await saveToken(null);onUnauthorized();}throw new ApiError(data.errors?.length?data.message+' '+data.errors.map((e:{field:string;message:string})=>e.field+': '+e.message).join(' '):data.message||'Yêu cầu thất bại.',response.status);}
 return data as T;
 }catch(e){if(e instanceof ApiError)throw e;throw new Error(e instanceof Error&&e.name==='AbortError'?'Máy chủ phản hồi quá lâu. Vui lòng thử lại.':'Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API trong Mobile/.env.');}finally{clearTimeout(timeout);}
}
