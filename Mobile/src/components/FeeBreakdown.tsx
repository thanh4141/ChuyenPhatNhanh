import React from 'react';
import {Text,View} from 'react-native';
import {Fees} from '../types';
import {money,styles} from './ui';
export default function FeeBreakdown({fees,cod=0}:{fees:Fees;cod?:number}){
 const rows:[string,number][]=[['Cước cơ bản',fees.base_fee],['Vượt quãng đường',fees.distance_fee],['Vượt khối lượng',fees.weight_fee],['Phí dịch vụ COD',fees.cod_fee],['Bảo hiểm',fees.insurance_fee],['Đóng gói',fees.packaging_fee]];
 return <View style={{gap:10}}>{rows.map(([label,n])=><View key={label} style={styles.row}><Text style={styles.muted}>{label}</Text><Text style={styles.label}>{money(n)}</Text></View>)}<View style={styles.divider}/><View style={styles.row}><Text style={styles.label}>Tổng thanh toán</Text><Text style={styles.subtitle}>{money(fees.total_amount)}</Text></View><Text style={styles.muted}>Tiền thu hộ COD: {money(cod)} (tách riêng khỏi tổng thanh toán).</Text></View>;
}
