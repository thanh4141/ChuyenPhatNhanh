import {RouteGeometry} from '../types';
export interface MapPoint{latitude:number;longitude:number;province_code?:string;formatted_address?:string}
export interface MapRoute{geometry:RouteGeometry;distance_meters:number;data_version?:string|null}
export interface MapPickerProps{initial?:{latitude:number;longitude:number};route?:MapRoute;onSelect:(point:MapPoint)=>void;onClose:()=>void}
