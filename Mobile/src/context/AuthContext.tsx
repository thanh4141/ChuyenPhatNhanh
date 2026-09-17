import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, restoreToken, saveToken, setUnauthorizedHandler, ApiError } from '../services/api';
import { User } from '../types';

type Auth = { user:User|null; loading:boolean; restoreError:string; retry:()=>Promise<void>; login:(email:string,password:string)=>Promise<void>; register:(input:{name:string;email:string;password:string;phone:string;address:string})=>Promise<void>; logout:()=>Promise<void>; updateUser:(user:User)=>void };
const Context=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}) {
  const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);const [restoreError,setRestoreError]=useState('');
  const restore=async()=>{setLoading(true);setRestoreError('');try{if(await restoreToken()){const result=await api<{user:User}>('/auth/me');if(result.user.role==='admin'){await saveToken(null);}else setUser(result.user);}}catch(e){if(!(e instanceof ApiError && e.status===401))setRestoreError(e instanceof Error?e.message:'Không khôi phục được phiên đăng nhập.');}finally{setLoading(false);}};
  useEffect(()=>{setUnauthorizedHandler(()=>setUser(null));void restore();return()=>setUnauthorizedHandler(()=>{});},[]);
  const accept=async(result:{user:User;token:string})=>{if(result.user.role==='admin')throw new Error('Quản trị viên vui lòng đăng nhập trên web Admin.');await saveToken(result.token);setRestoreError('');setUser(result.user);};
  const login=async(email:string,password:string)=>accept(await api('/auth/login','POST',{email:email.trim(),password}));
  const register=async(input:{name:string;email:string;password:string;phone:string;address:string})=>accept(await api('/auth/register','POST',input));
  const logout=async()=>{try{await api('/auth/logout','POST');}catch(e){if(!(e instanceof ApiError && e.status===401))throw e;}finally{await saveToken(null);setUser(null);setRestoreError('');}};
  return <Context.Provider value={{user,loading,restoreError,retry:restore,login,register,logout,updateUser:setUser}}>{children}</Context.Provider>;
}
export function useAuth(){const auth=useContext(Context);if(!auth)throw new Error('AuthProvider is required');return auth;}
