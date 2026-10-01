import type {ImagePickerAsset} from 'expo-image-picker';
import {File} from 'expo-file-system';
import {ImageManipulator,SaveFormat} from 'expo-image-manipulator';
export interface PreparedPhoto {form:FormData;dispose:()=>void}
export async function preparePhoto(asset:ImagePickerAsset):Promise<PreparedPhoto>{
  // A real local JPEG avoids content URI / HEIC differences between phones.
  const context=ImageManipulator.manipulate(asset.uri);
  let rendered:Awaited<ReturnType<typeof context.renderAsync>>|undefined;
  try{
    if(Math.max(asset.width,asset.height)>2400)context.resize(asset.width>=asset.height?{width:2400,height:null}:{width:null,height:2400});
    rendered=await context.renderAsync();
    const saved=await rendered.saveAsync({format:SaveFormat.JPEG,compress:0.85});
    const file=new File(saved.uri);
    if(!file.exists||!file.size){if(file.exists)file.delete();throw new Error('Không đọc được ảnh vừa chụp. Vui lòng chụp lại.');}
    if(file.size>15*1024*1024){file.delete();throw new Error('Ảnh tối đa 15 MB. Vui lòng chụp lại với độ phân giải thấp hơn.');}
    const form=new FormData();form.append('image',file,'photo.jpg');
    return {form,dispose:()=>{try{if(file.exists)file.delete();}catch{/* Only our generated cache file. */}}};
  }finally{rendered?.release();context.release();}
}
