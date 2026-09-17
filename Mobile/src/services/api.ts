import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';

let token:string|null = null;
let onUnauthorized:()=>void = () => {};
export function setUnauthorizedHandler(handler:()=>void) { onUnauthorized=handler; }
export async function restoreToken() { token=Platform.OS==='web'?null:await SecureStore.getItemAsync('cpn-token'); return token; }
export async function saveToken(value:string|null) {
  token=value;
  if(Platform.OS!=='web') { if(value)await SecureStore.setItemAsync('cpn-token',value);else await SecureStore.deleteItemAsync('cpn-token'); }
}
export class ApiError extends Error { constructor(message:string,public status:number) { super(message); } }
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T> {
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  let response:Response;
  try { response=await fetch(API_URL+path,{method,signal:controller.signal,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})}); }
  catch(error) { throw new Error(error instanceof Error && error.name==='AbortError'?'Máy chủ phản hồi quá lâu. Vui lòng thử lại.':'Không thể kết nối máy chủ. Kiểm tra mạng và địa chỉ API trong Mobile/.env.'); }
  finally { clearTimeout(timeout); }
  const data=await response.json();
  if(!response.ok) { if(response.status===401 && path!=='/auth/login'){await saveToken(null);onUnauthorized();}throw new ApiError(data.errors?.length?`${data.message} ${data.errors.map((e:{field:string;message:string})=>`${e.field}: ${e.message}`).join(' ')}`:data.message||'Yêu cầu thất bại.',response.status); }
  return data as T;
}
