// 28 States + 8 Union Territories of India.
// lat/lon = representative weather sampling point (capital or major central city).
// Population: Census of India 2011 (latest official census).
export type StateInfo = {
  code: string
  name: string
  type: 'State' | 'UT'
  capital: string
  lat: number
  lon: number
  population: number
  hazards: string[]
  sdma: string
}

export const STATES: StateInfo[] = [
  { code: 'AP', name: 'Andhra Pradesh', type: 'State', capital: 'Amaravati', lat: 16.515, lon: 80.516, population: 49577103, hazards: ['Cyclone', 'Flood', 'Heatwave', 'Drought'], sdma: 'https://apsdma.ap.gov.in' },
  { code: 'AR', name: 'Arunachal Pradesh', type: 'State', capital: 'Itanagar', lat: 27.0844, lon: 93.6053, population: 1383727, hazards: ['Earthquake', 'Landslide', 'Flood'], sdma: 'https://arunachalsdma.in' },
  { code: 'AS', name: 'Assam', type: 'State', capital: 'Dispur', lat: 26.1433, lon: 91.7898, population: 31205576, hazards: ['Flood', 'Earthquake', 'Landslide'], sdma: 'https://asdma.assam.gov.in' },
  { code: 'BR', name: 'Bihar', type: 'State', capital: 'Patna', lat: 25.5941, lon: 85.1376, population: 104099452, hazards: ['Flood', 'Earthquake', 'Heatwave', 'Lightning'], sdma: 'https://bsdma.org' },
  { code: 'CT', name: 'Chhattisgarh', type: 'State', capital: 'Raipur', lat: 21.2514, lon: 81.6296, population: 25545198, hazards: ['Drought', 'Lightning', 'Heatwave'], sdma: 'https://revenue.cg.nic.in' },
  { code: 'GA', name: 'Goa', type: 'State', capital: 'Panaji', lat: 15.4909, lon: 73.8278, population: 1458545, hazards: ['Flood', 'Cyclone'], sdma: 'https://sdma.goa.gov.in' },
  { code: 'GJ', name: 'Gujarat', type: 'State', capital: 'Gandhinagar', lat: 23.0225, lon: 72.5714, population: 60439692, hazards: ['Earthquake', 'Cyclone', 'Drought', 'Flood'], sdma: 'https://gsdma.org' },
  { code: 'HR', name: 'Haryana', type: 'State', capital: 'Chandigarh', lat: 28.8955, lon: 76.6066, population: 25351462, hazards: ['Heatwave', 'Flood', 'Earthquake'], sdma: 'https://hdmc.hry.gov.in' },
  { code: 'HP', name: 'Himachal Pradesh', type: 'State', capital: 'Shimla', lat: 31.1048, lon: 77.1734, population: 6864602, hazards: ['Landslide', 'Earthquake', 'Cloudburst', 'Avalanche'], sdma: 'https://hpsdma.nic.in' },
  { code: 'JH', name: 'Jharkhand', type: 'State', capital: 'Ranchi', lat: 23.3441, lon: 85.3096, population: 32988134, hazards: ['Lightning', 'Drought', 'Heatwave'], sdma: 'https://jsdma.jharkhand.gov.in' },
  { code: 'KA', name: 'Karnataka', type: 'State', capital: 'Bengaluru', lat: 12.9716, lon: 77.5946, population: 61095297, hazards: ['Drought', 'Flood', 'Landslide'], sdma: 'https://ksdma.karnataka.gov.in' },
  { code: 'KL', name: 'Kerala', type: 'State', capital: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366, population: 33406061, hazards: ['Flood', 'Landslide', 'Cyclone'], sdma: 'https://sdma.kerala.gov.in' },
  { code: 'MP', name: 'Madhya Pradesh', type: 'State', capital: 'Bhopal', lat: 23.2599, lon: 77.4126, population: 72626809, hazards: ['Drought', 'Heatwave', 'Flood'], sdma: 'https://mpsdma.mp.gov.in' },
  { code: 'MH', name: 'Maharashtra', type: 'State', capital: 'Mumbai', lat: 19.076, lon: 72.8777, population: 112374333, hazards: ['Flood', 'Drought', 'Cyclone', 'Landslide'], sdma: 'https://sdma.maharashtra.gov.in' },
  { code: 'MN', name: 'Manipur', type: 'State', capital: 'Imphal', lat: 24.817, lon: 93.9368, population: 2855794, hazards: ['Earthquake', 'Landslide', 'Flood'], sdma: 'https://manipursdma.nic.in' },
  { code: 'ML', name: 'Meghalaya', type: 'State', capital: 'Shillong', lat: 25.5788, lon: 91.8933, population: 2966889, hazards: ['Earthquake', 'Landslide', 'Flood'], sdma: 'https://megsdma.gov.in' },
  { code: 'MZ', name: 'Mizoram', type: 'State', capital: 'Aizawl', lat: 23.7271, lon: 92.7176, population: 1097206, hazards: ['Landslide', 'Earthquake'], sdma: 'https://dmr.mizoram.gov.in' },
  { code: 'NL', name: 'Nagaland', type: 'State', capital: 'Kohima', lat: 25.6751, lon: 94.1086, population: 1978502, hazards: ['Earthquake', 'Landslide'], sdma: 'https://nsdma.nagaland.gov.in' },
  { code: 'OR', name: 'Odisha', type: 'State', capital: 'Bhubaneswar', lat: 20.2961, lon: 85.8245, population: 41974218, hazards: ['Cyclone', 'Flood', 'Heatwave', 'Lightning'], sdma: 'https://osdma.org' },
  { code: 'PB', name: 'Punjab', type: 'State', capital: 'Chandigarh', lat: 30.901, lon: 75.8573, population: 27743338, hazards: ['Flood', 'Heatwave'], sdma: 'https://punjabrevenue.nic.in' },
  { code: 'RJ', name: 'Rajasthan', type: 'State', capital: 'Jaipur', lat: 26.9124, lon: 75.7873, population: 68548437, hazards: ['Drought', 'Heatwave', 'Dust storm'], sdma: 'https://dmrelief.rajasthan.gov.in' },
  { code: 'SK', name: 'Sikkim', type: 'State', capital: 'Gangtok', lat: 27.3389, lon: 88.6065, population: 610577, hazards: ['Earthquake', 'Landslide', 'Glacial lake flood'], sdma: 'https://ssdma.sikkim.gov.in' },
  { code: 'TN', name: 'Tamil Nadu', type: 'State', capital: 'Chennai', lat: 13.0827, lon: 80.2707, population: 72147030, hazards: ['Cyclone', 'Flood', 'Tsunami'], sdma: 'https://tnsdma.tn.gov.in' },
  { code: 'TG', name: 'Telangana', type: 'State', capital: 'Hyderabad', lat: 17.385, lon: 78.4867, population: 35003674, hazards: ['Heatwave', 'Drought', 'Flood'], sdma: 'https://tsdps.telangana.gov.in' },
  { code: 'TR', name: 'Tripura', type: 'State', capital: 'Agartala', lat: 23.8315, lon: 91.2868, population: 3673917, hazards: ['Earthquake', 'Flood'], sdma: 'https://tdma.tripura.gov.in' },
  { code: 'UP', name: 'Uttar Pradesh', type: 'State', capital: 'Lucknow', lat: 26.8467, lon: 80.9462, population: 199812341, hazards: ['Flood', 'Heatwave', 'Lightning', 'Cold wave'], sdma: 'https://upsdma.up.nic.in' },
  { code: 'UK', name: 'Uttarakhand', type: 'State', capital: 'Dehradun', lat: 30.3165, lon: 78.0322, population: 10086292, hazards: ['Landslide', 'Cloudburst', 'Earthquake', 'Flood'], sdma: 'https://usdma.uk.gov.in' },
  { code: 'WB', name: 'West Bengal', type: 'State', capital: 'Kolkata', lat: 22.5726, lon: 88.3639, population: 91276115, hazards: ['Cyclone', 'Flood', 'Lightning'], sdma: 'https://wbdmd.gov.in' },
  { code: 'AN', name: 'Andaman & Nicobar Islands', type: 'UT', capital: 'Sri Vijaya Puram', lat: 11.6234, lon: 92.7265, population: 380581, hazards: ['Tsunami', 'Earthquake', 'Cyclone'], sdma: 'https://andaman.gov.in' },
  { code: 'CH', name: 'Chandigarh', type: 'UT', capital: 'Chandigarh', lat: 30.7333, lon: 76.7794, population: 1055450, hazards: ['Earthquake', 'Heatwave'], sdma: 'https://chandigarh.gov.in' },
  { code: 'DH', name: 'Dadra & Nagar Haveli and Daman & Diu', type: 'UT', capital: 'Daman', lat: 20.3974, lon: 72.8328, population: 586956, hazards: ['Flood', 'Cyclone'], sdma: 'https://ddd.gov.in' },
  { code: 'DL', name: 'Delhi', type: 'UT', capital: 'New Delhi', lat: 28.6139, lon: 77.209, population: 16787941, hazards: ['Air pollution', 'Heatwave', 'Earthquake', 'Flood'], sdma: 'https://ddma.delhi.gov.in' },
  { code: 'JK', name: 'Jammu & Kashmir', type: 'UT', capital: 'Srinagar', lat: 34.0837, lon: 74.7973, population: 12267032, hazards: ['Earthquake', 'Avalanche', 'Flood', 'Landslide'], sdma: 'https://jksdma.jk.gov.in' },
  { code: 'LA', name: 'Ladakh', type: 'UT', capital: 'Leh', lat: 34.1526, lon: 77.5771, population: 274289, hazards: ['Earthquake', 'Avalanche', 'Cold wave', 'Cloudburst'], sdma: 'https://ladakh.gov.in' },
  { code: 'LD', name: 'Lakshadweep', type: 'UT', capital: 'Kavaratti', lat: 10.5667, lon: 72.6417, population: 64473, hazards: ['Cyclone', 'Sea surge'], sdma: 'https://lakshadweep.gov.in' },
  { code: 'PY', name: 'Puducherry', type: 'UT', capital: 'Puducherry', lat: 11.9416, lon: 79.8083, population: 1247953, hazards: ['Cyclone', 'Flood', 'Tsunami'], sdma: 'https://py.gov.in' },
]

// IMD regional centres / issuing agencies → state code
export const SENDER_STATE: Record<string, string> = {
  patna: 'BR', lucknow: 'UP', dehradun: 'UK', chennai: 'TN', bengaluru: 'KA', bangalore: 'KA', ranchi: 'JH',
  kolkata: 'WB', raipur: 'CT', mumbai: 'MH', nagpur: 'MH', pune: 'MH', hyderabad: 'TG', bhubaneswar: 'OR', guwahati: 'AS',
  thiruvananthapuram: 'KL', jaipur: 'RJ', bhopal: 'MP', ahmedabad: 'GJ', shimla: 'HP', srinagar: 'JK',
  delhi: 'DL', amaravati: 'AP', goa: 'GA', panaji: 'GA', agartala: 'TR', imphal: 'MN', gangtok: 'SK',
  shillong: 'ML', aizawl: 'MZ', kohima: 'NL', itanagar: 'AR', chandigarh: 'CH', leh: 'LA', 'port blair': 'AN',
}

// Extra aliases used for matching state names in alert text
export const STATE_ALIASES: [string, string][] = [
  ['andhra pradesh', 'AP'], ['andhra-pradesh', 'AP'], ['arunachal', 'AR'], ['assam', 'AS'], ['bihar', 'BR'],
  ['chhattisgarh', 'CT'], ['goa', 'GA'], ['gujarat', 'GJ'], ['haryana', 'HR'], ['himachal', 'HP'],
  ['jharkhand', 'JH'], ['karnataka', 'KA'], ['kerala', 'KL'], ['madhya pradesh', 'MP'], ['maharashtra', 'MH'],
  ['manipur', 'MN'], ['meghalaya', 'ML'], ['mizoram', 'MZ'], ['nagaland', 'NL'], ['odisha', 'OR'], ['orissa', 'OR'],
  ['punjab', 'PB'], ['rajasthan', 'RJ'], ['sikkim', 'SK'], ['tamil nadu', 'TN'], ['tamilnadu', 'TN'], ['telangana', 'TG'],
  ['tripura', 'TR'], ['uttar pradesh', 'UP'], ['uttarakhand', 'UK'], ['west bengal', 'WB'], ['andaman', 'AN'],
  ['dadra', 'DH'], ['daman', 'DH'], ['delhi', 'DL'], ['jammu', 'JK'], ['kashmir', 'JK'], ['ladakh', 'LA'],
  ['lakshadweep', 'LD'], ['puducherry', 'PY'], ['pondicherry', 'PY'],
  ['उत्तर प्रदेश', 'UP'], ['পশ্চিমবঙ্গ', 'WB'], ['অসম', 'AS'], ['महाराष्ट्र', 'MH'], ['ଓଡ଼ିଶା', 'OR'], ['बिहार', 'BR'], ['झारखंड', 'JH'], ['उत्तराखंड', 'UK'], ['राजस्थान', 'RJ'], ['मध्य प्रदेश', 'MP'],
]
