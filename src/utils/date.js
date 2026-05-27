export const BS_DATA = {
  2070:[31,32,31,32,31,30,30,30,29,29,30,30],
  2071:[31,31,32,31,31,31,30,29,30,29,30,30],
  2072:[31,32,31,32,31,30,30,30,29,30,29,31],
  2073:[31,31,31,32,31,31,30,29,30,29,30,30],
  2074:[31,31,32,31,31,31,30,29,30,29,30,30],
  2075:[31,32,31,32,31,30,30,29,30,29,30,30],
  2076:[31,32,31,32,31,30,30,30,29,30,29,31],
  2077:[31,31,31,32,31,31,30,29,30,29,30,30],
  2078:[31,31,32,31,31,31,30,29,30,29,30,30],
  2079:[31,32,31,32,31,30,30,30,29,29,30,31],
  2080:[31,31,31,32,31,31,30,29,30,29,30,30],
  2081:[31,31,32,31,31,31,30,29,30,29,30,30],
  2082:[31,32,31,32,31,30,30,29,30,29,30,30],
  2083:[31,32,31,32,31,30,30,30,29,30,29,31],
  2084:[31,31,31,32,31,31,30,29,30,29,30,30],
  2085:[31,31,32,31,31,31,30,29,30,29,30,30],
};

export const BS_MO_NE = ['बैशाख','जेठ','असार','श्रावण','भदौ','आश्विन','कार्तिक','मंसिर','पौष','माघ','फाल्गुन','चैत्र'];
export const BS_MO_EN = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const AD_EPOCH = new Date(2013, 3, 14);

export function adToBS(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  let rem = Math.floor((d - AD_EPOCH) / 86400000);
  let y = 2070, m = 0;
  while (true) {
    const yDays = (BS_DATA[y] || []).reduce((a,b) => a+b, 0);
    if (rem >= yDays) { rem -= yDays; y++; } else break;
  }
  const mo = BS_DATA[y] || [31,31,32,31,31,31,30,29,30,29,30,30];
  while (rem >= mo[m] && m < 11) { rem -= mo[m]; m++; }
  return { y, m: m+1, d: rem+1 };
}

export function fmtBS(ts, lang = 'ne') {
  if (!ts) return '';
  const { y, m, d } = adToBS(new Date(ts));
  const mo = lang === 'ne' ? BS_MO_NE[m-1] : BS_MO_EN[m-1];
  return lang === 'ne'
    ? `${d} ${mo} ${y}`
    : `${d} ${mo} ${y}`;
}

export const fmt  = n => `रु.${Number(n||0).toLocaleString('ne-NP')}`;
export const fmts = n => Number(n||0).toLocaleString('ne-NP');
export const now  = () => Date.now();
export const tsToDateStr = ts => new Date(ts || Date.now()).toISOString().split('T')[0];
export const dateStrToTs = s => { if (!s) return Date.now(); const d = new Date(s); d.setHours(12,0,0,0); return d.getTime(); };
export const oa = obj => obj ? Object.entries(obj).map(([id,v]) => ({id,...v})) : [];
