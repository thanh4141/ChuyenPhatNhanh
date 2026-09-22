// Official 34 province codes (Decision 19/2025/QD-TTg). Regions below are CPN's tariff regions.
export const provinces = [
  ['01','Hà Nội','north',['Hanoi']],['04','Cao Bằng','north',[]],['08','Tuyên Quang','north',['Hà Giang']],
  ['11','Điện Biên','north',[]],['12','Lai Châu','north',[]],['14','Sơn La','north',[]],['15','Lào Cai','north',['Yên Bái']],
  ['19','Thái Nguyên','north',['Bắc Kạn']],['20','Lạng Sơn','north',[]],['22','Quảng Ninh','north',[]],['24','Bắc Ninh','north',['Bắc Giang']],
  ['25','Phú Thọ','north',['Vĩnh Phúc','Hòa Bình']],['31','Hải Phòng','north',['Hải Dương']],['33','Hưng Yên','north',['Thái Bình']],
  ['37','Ninh Bình','north',['Hà Nam','Nam Định']],['38','Thanh Hóa','central',[]],['40','Nghệ An','central',[]],['42','Hà Tĩnh','central',[]],
  ['44','Quảng Trị','central',['Quảng Bình']],['46','Huế','central',['Thừa Thiên Huế']],['48','Đà Nẵng','central',['Quảng Nam']],
  ['51','Quảng Ngãi','central',['Kon Tum']],['52','Gia Lai','central',['Bình Định']],['56','Khánh Hòa','central',['Ninh Thuận']],
  ['66','Đắk Lắk','central',['Phú Yên','Dak Lak']],['68','Lâm Đồng','central',['Đắk Nông','Bình Thuận']],
  ['75','Đồng Nai','south',['Bình Phước']],['79','Hồ Chí Minh','south',['Ho Chi Minh City','HCMC','Bình Dương','Bà Rịa Vũng Tàu']],
  ['80','Tây Ninh','south',['Long An']],['82','Đồng Tháp','south',['Tiền Giang']],['86','Vĩnh Long','south',['Bến Tre','Trà Vinh']],
  ['91','An Giang','south',['Kiên Giang']],['92','Cần Thơ','south',['Sóc Trăng','Hậu Giang']],['96','Cà Mau','south',['Bạc Liêu']],
].map(([code,name,region,aliases])=>({code,name,region,aliases}));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/province|city|thanh pho|tinh|tp\.?/g,'').replace(/[^a-z]/g,'');
export const provinceByName = name => provinces.find(p=>[p.name,...p.aliases].some(alias=>normalize(alias)===normalize(name)));
export const provinceByCode = code => provinces.find(p=>p.code===code);
