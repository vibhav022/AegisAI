/* AegisAI — Safety guide (based on NDMA public guidance), bilingual, plus shared emergency kit */
(function () {
  const A = window.Aegis, { $, $$, esc, t } = A
  const I = window.AegisI18n

  // Each guide: en + hi lists. Kept short and plain.
  const G = {
    flood: { type: 'Flood', name: ['Flood', 'बाढ़'],
      before: [['Know if your area floods and where the nearest high ground or relief camp is', 'जानें कि आपके इलाके में बाढ़ आती है या नहीं, और सबसे नज़दीकी ऊँची जगह या राहत शिविर कहाँ है'], ['Keep documents, medicines and valuables in waterproof bags on a high shelf', 'दस्तावेज़, दवाइयाँ और कीमती सामान वाटरप्रूफ़ थैलों में ऊँची जगह पर रखें'], ['Store drinking water, dry food, a torch and a charged power bank', 'पीने का पानी, सूखा खाना, टॉर्च और चार्ज पावर बैंक रखें'], ['Save 112 and 1078 in your phone', '112 और 1078 अपने फ़ोन में सेव करें']],
      during: [['Move to higher ground immediately if told to evacuate — do not wait', 'निकलने को कहा जाए तो तुरंत ऊँची जगह पर जाएँ — इंतज़ार न करें'], ['Switch off electricity and gas at the mains before leaving', 'निकलने से पहले बिजली और गैस का मेन स्विच बंद करें'], ['Never walk, swim or drive through flood water — 15 cm can knock you down, 60 cm can sweep away a car', 'बाढ़ के पानी में कभी न चलें, न तैरें, न गाड़ी चलाएँ — 15 सेमी पानी आपको गिरा सकता है, 60 सेमी कार बहा सकता है'], ['Stay away from electric poles, fallen wires and drains', 'बिजली के खंभों, गिरे तारों और नालों से दूर रहें']],
      after: [['Return home only when officials say it is safe', 'अधिकारी सुरक्षित कहें तभी घर लौटें'], ['Drink only boiled or treated water', 'केवल उबला या साफ़ किया पानी पिएँ'], ['Do not touch wet electrical equipment; get it checked first', 'गीले बिजली के उपकरण न छुएँ; पहले जाँच कराएँ'], ['Watch for snakes and insects that may have entered the house', 'घर में घुसे साँप और कीड़ों से सावधान रहें']] },
    cyclone: { type: 'Cyclone', name: ['Cyclone', 'चक्रवात'],
      before: [['Follow IMD cyclone warnings on radio, TV or SMS', 'रेडियो, टीवी या SMS पर IMD की चक्रवात चेतावनी सुनें'], ['Secure loose objects like tin sheets, pots and signboards', 'टिन की चादरें, गमले और बोर्ड जैसी ढीली चीज़ें बाँध दें'], ['Fishermen should not go to sea and should bring boats to safe harbour', 'मछुआरे समुद्र में न जाएँ और नावें सुरक्षित बंदरगाह पर लाएँ'], ['Know the way to the nearest cyclone shelter', 'नज़दीकी चक्रवात शेल्टर का रास्ता जानें']],
      during: [['Stay indoors, away from windows; go to a shelter if your house is weak (kutcha)', 'खिड़कियों से दूर घर के अंदर रहें; घर कच्चा हो तो शेल्टर जाएँ'], ['Switch off main power and gas', 'बिजली और गैस का मेन स्विच बंद करें'], ['If the wind suddenly stops, stay inside — the eye may be passing and winds will return', 'हवा अचानक रुक जाए तो भी अंदर रहें — तूफ़ान की आँख गुज़र रही हो सकती है, हवा फिर लौटेगी'], ['Keep listening to official updates', 'सरकारी अपडेट सुनते रहें']],
      after: [['Do not go outside until officials declare it safe', 'अधिकारी सुरक्षित घोषित करें तब तक बाहर न जाएँ'], ['Stay away from fallen trees, poles and loose power lines', 'गिरे पेड़ों, खंभों और ढीले तारों से दूर रहें'], ['Report damage to the local control room (1077)', 'नुकसान की सूचना ज़िला नियंत्रण कक्ष (1077) को दें'], ['Beware of flooding after the storm', 'तूफ़ान के बाद बाढ़ से सावधान रहें']] },
    earthquake: { type: 'Earthquake', name: ['Earthquake', 'भूकंप'],
      before: [['Fix heavy furniture, cupboards and gas cylinders to the wall', 'भारी फ़र्नीचर, अलमारी और गैस सिलेंडर को दीवार से बाँधें'], ['Identify safe spots: under a strong table or against an inside wall', 'सुरक्षित जगह पहचानें: मज़बूत मेज़ के नीचे या अंदरूनी दीवार के पास'], ['Practise “Drop, Cover, Hold On” with your family', 'परिवार के साथ “झुकें, ढकें, पकड़ें” का अभ्यास करें'], ['Keep an emergency kit near the exit', 'आपातकालीन किट दरवाज़े के पास रखें']],
      during: [['DROP to your hands and knees, take COVER under a sturdy table, HOLD ON until shaking stops', 'घुटनों के बल झुकें, मज़बूत मेज़ के नीचे ढकें, झटके रुकने तक पकड़े रहें'], ['Stay away from glass, windows, outer walls and hanging objects', 'काँच, खिड़कियों, बाहरी दीवारों और लटकी चीज़ों से दूर रहें'], ['If outside, move to an open area away from buildings, trees and wires', 'बाहर हों तो इमारतों, पेड़ों और तारों से दूर खुली जगह पर जाएँ'], ['If driving, stop away from bridges and flyovers and stay inside', 'गाड़ी चला रहे हों तो पुल और फ्लाईओवर से दूर रुकें और अंदर ही रहें']],
      after: [['Expect aftershocks — Drop, Cover, Hold On again', 'आफ्टरशॉक आ सकते हैं — फिर से झुकें, ढकें, पकड़ें'], ['Do not use lifts; use stairs carefully', 'लिफ़्ट का इस्तेमाल न करें; सीढ़ियों से सावधानी से उतरें'], ['If you smell gas, open windows and leave', 'गैस की गंध आए तो खिड़कियाँ खोलें और बाहर निकलें'], ['Do not enter damaged buildings', 'क्षतिग्रस्त इमारतों में न जाएँ']] },
    heatwave: { type: 'Heatwave', name: ['Heatwave', 'लू'],
      before: [['Drink water often, even if not thirsty', 'प्यास न हो तब भी बार-बार पानी पिएँ'], ['Plan outdoor work for early morning or evening', 'बाहर के काम सुबह जल्दी या शाम को करें'], ['Keep ORS, lemon water, buttermilk or lassi handy', 'ORS, नींबू पानी, छाछ या लस्सी पास रखें'], ['Check on elderly neighbours, children and outdoor workers', 'बुज़ुर्ग पड़ोसियों, बच्चों और बाहर काम करने वालों का हाल पूछें']],
      during: [['Avoid going out between 12 noon and 3 pm', 'दोपहर 12 से 3 बजे तक बाहर न निकलें'], ['Wear light, loose cotton clothes and cover your head', 'हल्के, ढीले सूती कपड़े पहनें और सिर ढकें'], ['Never leave children or pets in parked vehicles', 'बच्चों या पालतू जानवरों को खड़ी गाड़ी में कभी न छोड़ें'], ['Heatstroke signs: confusion, very hot dry skin, fainting — call 108 immediately', 'लू लगने के लक्षण: भ्रम, बहुत गर्म सूखी त्वचा, बेहोशी — तुरंत 108 पर कॉल करें']],
      after: [['Cool an affected person with wet cloths and a fan; give water if conscious', 'प्रभावित व्यक्ति को गीले कपड़े और पंखे से ठंडा करें; होश में हो तो पानी दें'], ['Keep drinking fluids', 'तरल पदार्थ पीते रहें'], ['Rest in shade or a cool room', 'छाँव या ठंडे कमरे में आराम करें']] },
    thunderstorm: { type: 'Thunderstorm', name: ['Lightning', 'बिजली गिरना'],
      before: [['Check the IMD nowcast or the Damini lightning app before going out', 'बाहर जाने से पहले IMD नाउकास्ट या दामिनी ऐप देखें'], ['Unplug electrical appliances when a storm approaches', 'तूफ़ान आने पर बिजली के उपकरणों के प्लग निकाल दें']],
      during: [['Go inside a building or a hard-top vehicle with windows closed', 'किसी इमारत या खिड़कियाँ बंद करके पक्की छत वाली गाड़ी में जाएँ'], ['If in open fields, crouch low with feet together — do not lie flat', 'खुले खेत में हों तो पैर जोड़कर नीचे बैठ जाएँ — लेटें नहीं'], ['Avoid trees, towers, poles, water bodies and metal objects', 'पेड़, टावर, खंभे, पानी और धातु की चीज़ों से दूर रहें'], ['Do not use corded phones or bathe during lightning', 'बिजली के दौरान तार वाला फ़ोन इस्तेमाल न करें और न नहाएँ']],
      after: [['Wait 30 minutes after the last thunder before going out', 'आखिरी गरज के 30 मिनट बाद बाहर निकलें'], ['A person struck by lightning is safe to touch — give CPR and call 108', 'बिजली गिरे व्यक्ति को छूना सुरक्षित है — CPR दें और 108 पर कॉल करें']] },
    landslide: { type: 'Landslide', name: ['Landslide', 'भूस्खलन'],
      before: [['Avoid building or camping on steep slopes and near drainage paths', 'खड़ी ढलानों और पानी के बहाव के रास्ते के पास घर या कैंप न बनाएँ'], ['Watch for new cracks in ground or walls, and tilting trees and poles', 'ज़मीन या दीवारों में नई दरारें, झुके पेड़ और खंभे देखें']],
      during: [['Move quickly away from the slide path to stable high ground', 'खिसकती मिट्टी के रास्ते से हटकर तुरंत स्थिर ऊँची जगह पर जाएँ'], ['Rumbling sounds and muddy stream water are warning signs', 'गड़गड़ाहट और नदी-नालों का मटमैला पानी खतरे के संकेत हैं'], ['Avoid travel on hill roads during heavy rain', 'भारी बारिश में पहाड़ी सड़कों पर यात्रा न करें']],
      after: [['Stay away from the slide area — more slides may follow', 'भूस्खलन वाली जगह से दूर रहें — और भूस्खलन हो सकते हैं'], ['Report blocked roads and trapped people to 112', 'बंद सड़कों और फँसे लोगों की सूचना 112 पर दें']] },
    tsunami: { type: 'Tsunami', name: ['Tsunami', 'सुनामी'],
      before: [['If you live on the coast, know evacuation routes to high ground', 'तट पर रहते हैं तो ऊँची जगह तक जाने के रास्ते जानें'], ['A strong earthquake near the coast is a natural tsunami warning', 'तट के पास तेज़ भूकंप सुनामी की प्राकृतिक चेतावनी है']],
      during: [['If the sea suddenly pulls back, run to high ground immediately', 'समुद्र अचानक पीछे हटे तो तुरंत ऊँची जगह की ओर दौड़ें'], ['Move inland or to the upper floors of a strong concrete building', 'तट से दूर या मज़बूत पक्की इमारत की ऊपरी मंज़िल पर जाएँ'], ['Do not go to the beach to watch the waves', 'लहरें देखने समुद्र तट पर न जाएँ']],
      after: [['Stay away from the coast — several waves may come for hours', 'तट से दूर रहें — घंटों तक कई लहरें आ सकती हैं'], ['Return only when INCOIS or officials announce all clear', 'INCOIS या अधिकारी सब सुरक्षित घोषित करें तभी लौटें']] },
    coldwave: { type: 'Cold wave', name: ['Cold wave', 'शीतलहर'],
      before: [['Keep warm clothes, blankets and extra food ready', 'गर्म कपड़े, कंबल और अतिरिक्त खाना तैयार रखें'], ['Know where the night shelters (rain basera) near you are', 'जानें कि पास में रैन बसेरा कहाँ है']],
      during: [['Wear layered clothes and cover your head, hands and feet', 'कई परतों में कपड़े पहनें और सिर, हाथ, पैर ढकें'], ['Never use a coal or wood heater in a closed room — carbon monoxide can kill', 'बंद कमरे में कोयले या लकड़ी की अंगीठी कभी न जलाएँ — कार्बन मोनोऑक्साइड जानलेवा है'], ['Check on elderly people and the homeless', 'बुज़ुर्गों और बेघर लोगों का ध्यान रखें']],
      after: [['Watch for frostbite: numb, white or grey skin', 'शीतदंश के लक्षण देखें: सुन्न, सफ़ेद या भूरी त्वचा'], ['Warm the person gradually; do not rub the skin', 'व्यक्ति को धीरे-धीरे गर्म करें; त्वचा को रगड़ें नहीं']] },
    fog: { type: 'Fog', name: ['Fog', 'कोहरा'],
      before: [['Check fog warnings and train or flight status before travel', 'यात्रा से पहले कोहरे की चेतावनी और ट्रेन/फ़्लाइट की स्थिति देखें'], ['Clean your vehicle lights and windscreen', 'गाड़ी की लाइटें और शीशा साफ़ करें']],
      during: [['Drive slowly with low-beam headlights and fog lamps — never high beam', 'लो-बीम हेडलाइट और फ़ॉग लैंप के साथ धीरे चलाएँ — हाई-बीम कभी नहीं'], ['Keep a long distance from the vehicle in front', 'आगे की गाड़ी से ज़्यादा दूरी रखें'], ['If you cannot see, pull off the road fully and switch on hazard lights', 'कुछ न दिखे तो सड़क से पूरी तरह हटकर हैज़र्ड लाइट जलाएँ']],
      after: [['Roads may stay slippery — continue driving carefully', 'सड़कें फिसलन भरी रह सकती हैं — सावधानी से चलाते रहें']] },
    air: { type: 'Air', name: ['Air pollution', 'वायु प्रदूषण'],
      before: [['Check the AQI daily, especially in winter', 'रोज़ AQI देखें, खासकर सर्दियों में'], ['Keep N95 masks and any inhalers ready', 'N95 मास्क और ज़रूरी इनहेलर तैयार रखें']],
      during: [['Limit outdoor exercise when AQI is above 150', 'AQI 150 से ऊपर हो तो बाहर व्यायाम कम करें'], ['Wear a well-fitted N95 mask outdoors — cloth masks do not help', 'बाहर अच्छे से फ़िट N95 मास्क पहनें — कपड़े का मास्क काम नहीं करता'], ['Keep windows closed during peak pollution hours', 'प्रदूषण के समय खिड़कियाँ बंद रखें'], ['Children, elderly and people with asthma or heart disease should stay indoors', 'बच्चे, बुज़ुर्ग और अस्थमा या दिल के मरीज़ घर के अंदर रहें']],
      after: [['See a doctor if you have breathlessness, chest pain or persistent cough', 'साँस फूलना, सीने में दर्द या लगातार खाँसी हो तो डॉक्टर को दिखाएँ']] },
  }
  const L = () => (I.lang === 'hi' ? 1 : 0)
  A.GUIDES = G
  A.guideName = k => G[k].name[L()]
  A.guideList = (k, phase) => G[k][phase].map(x => x[L()])

  // ---------- shared emergency kit ----------
  A.KIT = [['Drinking water (3 days)', 'पीने का पानी (3 दिन)'], ['Dry food / ready-to-eat', 'सूखा / तैयार खाना'], ['First-aid kit', 'प्राथमिक चिकित्सा किट'], ['Regular medicines', 'नियमित दवाइयाँ'], ['Torch + spare batteries', 'टॉर्च + अतिरिक्त बैटरी'], ['Power bank (charged)', 'पावर बैंक (चार्ज)'], ['ID, Aadhaar & documents (waterproof)', 'पहचान पत्र, आधार और दस्तावेज़ (वाटरप्रूफ़)'], ['Cash in small notes', 'छोटे नोटों में नकद'], ['Whistle', 'सीटी'], ['Battery / FM radio', 'बैटरी / FM रेडियो'], ['Warm clothes & blanket', 'गर्म कपड़े और कंबल'], ['Masks & sanitiser', 'मास्क और सैनिटाइज़र'], ['Baby / elderly supplies', 'बच्चों / बुज़ुर्गों का सामान'], ['Rope & knife', 'रस्सी और चाकू'], ['Emergency contact list on paper', 'काग़ज़ पर आपातकालीन संपर्क सूची']]
  A.renderKit = (box, onChange) => {
    const saved = new Set(A.load('aegis.kit', []))
    const draw = () => {
      box.innerHTML = `<div class="kit-head"><span class="muted small" aria-live="polite">${t('plan.ready', { n: saved.size, m: A.KIT.length })}</span></div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${A.KIT.length}" aria-valuenow="${saved.size}" aria-label="${t('plan.kit')}"><i style="width:${(saved.size / A.KIT.length) * 100}%"></i></div>
        <div class="kit">${A.KIT.map((k, i) => `<label class="${saved.has(i) ? 'done' : ''}"><input type="checkbox" data-i="${i}" ${saved.has(i) ? 'checked' : ''} /><span>${esc(k[L()])}</span></label>`).join('')}</div>`
      $$('input', box).forEach(c => c.onchange = () => { c.checked ? saved.add(+c.dataset.i) : saved.delete(+c.dataset.i); A.save('aegis.kit', [...saved]); draw(); onChange && onChange(); const n = box.querySelector(`input[data-i="${c.dataset.i}"]`); n && n.focus() })
    }
    draw()
  }

  // Ordered topics for a state: its known hazards first
  const HAZARD_TOPIC = { Flood: 'flood', Cyclone: 'cyclone', Earthquake: 'earthquake', Heatwave: 'heatwave', Lightning: 'thunderstorm', Landslide: 'landslide', Cloudburst: 'flood', Tsunami: 'tsunami', 'Cold wave': 'coldwave', Avalanche: 'landslide', Fog: 'fog', Drought: 'heatwave', 'Air pollution': 'air' }
  A.topicsForState = code => {
    const s = A.store.stateByCode[code]; const first = []
    ;(s?.hazards || []).forEach(h => { const k = HAZARD_TOPIC[h]; if (k && !first.includes(k)) first.push(k) })
    return [...first, ...Object.keys(G).filter(k => !first.includes(k))]
  }

  A.views.guide = (params, topic) => {
    const r = A.locRisk()
    const act = r && r.level ? A.actionFor(r) : null
    const suggested = act?.topic && G[act.topic] ? act.topic : null
    let cur = G[topic] ? topic : suggested || 'flood'
    const order = A.store.loc?.state ? A.topicsForState(A.store.loc.state) : Object.keys(G)
    $('#main').innerHTML = `
      <div class="page">
        <div class="page-head"><div><span class="eyebrow">${t('guide.eyebrow')}</span><h1>${t('guide.title')}</h1><p>${t('guide.sub')}</p></div></div>
        ${suggested && !topic ? `<div class="notice" style="margin-bottom:16px"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>${t('guide.active', { t: '<b>' + esc(A.guideName(suggested).toLowerCase()) + '</b>' })}</span></div>` : ''}
        <div class="guide-tabs chip-row" id="guide-tabs" role="tablist" aria-label="${t('guide.title')}">${order.map(k => `<button type="button" role="tab" aria-selected="${k === cur}" class="chip ${k === cur ? 'active' : ''}" data-k="${k}">${A.typeIcon(G[k].type)}${esc(A.guideName(k))}</button>`).join('')}</div>
        <section class="guide-cols" id="guide-cols" role="tabpanel" aria-live="polite"></section>
        <section class="section card" id="kit-section">
          <div class="card-head"><h2><i class="fa-solid fa-kit-medical" style="color:var(--safe)" aria-hidden="true"></i> ${t('guide.kit')}</h2><a href="#/plan">${t('nav.plan')} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div>
          <div id="kit"></div>
          <p class="muted small" style="margin-top:10px">${t('guide.kitSaved')}</p>
        </section>
        <section class="section card"><div class="card-head"><h2>${t('guide.resources')}</h2></div>
          <div class="chip-row">
            <a class="chip" href="https://ndma.gov.in" target="_blank" rel="noopener"><i class="fa-solid fa-building-shield" aria-hidden="true"></i>NDMA</a>
            <a class="chip" href="https://mausam.imd.gov.in" target="_blank" rel="noopener"><i class="fa-solid fa-cloud-sun" aria-hidden="true"></i>IMD</a>
            <a class="chip" href="https://sachet.ndma.gov.in" target="_blank" rel="noopener"><i class="fa-solid fa-tower-broadcast" aria-hidden="true"></i>SACHET</a>
            <a class="chip" href="https://ffs.india-water.gov.in" target="_blank" rel="noopener"><i class="fa-solid fa-water" aria-hidden="true"></i>CWC</a>
            <a class="chip" href="https://incois.gov.in" target="_blank" rel="noopener"><i class="fa-solid fa-anchor" aria-hidden="true"></i>INCOIS</a>
            <a class="chip" href="https://riseq.seismo.gov.in" target="_blank" rel="noopener"><i class="fa-solid fa-house-crack" aria-hidden="true"></i>NCS</a>
          </div></section>
      </div>`
    function renderGuide() {
      const col = (phase, icon, color) => `<div class="card guide-col"><h3><i class="fa-solid ${icon}" style="color:${color}" aria-hidden="true"></i>${t('guide.' + phase)}</h3><ul>${A.guideList(cur, phase).map(x => `<li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${esc(x)}</span></li>`).join('')}</ul></div>`
      $('#guide-cols').innerHTML = col('before', 'fa-clipboard-list', 'var(--brand)') + col('during', 'fa-person-running', 'var(--action)') + col('after', 'fa-house-circle-check', 'var(--safe)')
    }
    $$('#guide-tabs .chip').forEach(b => b.onclick = () => { cur = b.dataset.k; $$('#guide-tabs .chip').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', String(x === b)) }); renderGuide(); history.replaceState(null, '', '#/guide/' + cur) })
    renderGuide(); A.renderKit($('#kit'))
  }
})()
