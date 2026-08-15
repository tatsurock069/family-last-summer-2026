document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const APP_KEY = 'seki-last-summer-2026:';
  const BUDGET = 25000;
  const yen = (value) => `${Number(value || 0).toLocaleString('ja-JP')}円`;
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const storage = {
    get(key, fallback) {
      try { const value = localStorage.getItem(APP_KEY + key); return value === null ? fallback : JSON.parse(value); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(APP_KEY + key, JSON.stringify(value)); return true; }
      catch { return false; }
    }
  };
  const appUsers = [
    {id:'parent',label:'管理者（親）',mission:null,toddler:false,admin:true},
    {id:'yusuke',label:'優典',mission:'優典',toddler:false},{id:'ayana',label:'綾菜',mission:'綾菜',toddler:false},{id:'keisuke',label:'慶典',mission:'慶典',toddler:false},
    {id:'anna',label:'あんな',mission:'杏菜',toddler:true},{id:'haruna',label:'はるな',mission:'波瑠菜',toddler:true,assisted:true}
  ];
  let selectedUserId = storage.get('current-user', null);
  let currentUser = appUsers.find((user) => user.id === selectedUserId) || appUsers.find((user) => user.id === 'yusuke');
  const isAdminUser = () => Boolean(currentUser.admin);
  const isToddlerUser = () => Boolean(currentUser.toddler);
  const isAssistedUser = () => Boolean(currentUser.assisted);
  const canUseShooting = () => ['parent','yusuke','ayana'].includes(currentUser.id);
  const missionProfileForUserId = (userId) => appUsers.find((user) => user.id === userId)?.mission || null;
  const userIdForMissionProfile = (profile) => appUsers.find((user) => user.mission === profile)?.id || profile;
  const actorLabel=(id)=>appUsers.find((user)=>user.id===id)?.label||'';
  const updateMetaCopy=(meta)=>{if(!meta?.actor)return '';const time=meta.updatedAt?new Date(meta.updatedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):'';const name=isToddlerUser()?(actorLabel(meta.actor).replace('管理者（親）','おうちの ひと').replace('優典','ゆうすけ').replace('綾菜','あやな').replace('慶典','けいすけ')):actorLabel(meta.actor);return name?`${name}${time?`・${time}`:''}`:'';};
  let tripRuntime = storage.get('trip-runtime', null);
  let day1Complete = tripRuntime ? tripRuntime.currentStepIndex >= 4 : new Date() >= new Date('2026-08-15T21:00:00+09:00');
  document.body.classList.toggle('toddler-app', isToddlerUser());
  document.body.classList.toggle('admin-mode', isAdminUser());
  document.body.classList.toggle('non-admin-mode', !isAdminUser());
  document.body.classList.toggle('stage-day2', day1Complete);

  let toastTimer;
  function toast(message) {
    const el = document.getElementById('toast');
    clearTimeout(toastTimer); el.textContent = message; el.classList.add('show');
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function celebrateMissionLevel(){const ring=document.getElementById('missionRing');ring?.classList.remove('level-up');requestAnimationFrame(()=>ring?.classList.add('level-up'));setTimeout(()=>ring?.classList.remove('level-up'),1200);}

  // Screen navigation and subviews
  const screens = [...document.querySelectorAll('.screen')];
  const navButtons = [...document.querySelectorAll('.nav-btn')];
  const scrollPositions = new Map();
  let guideReturnScreen = 'home';
  function activeScreen() { return document.querySelector('.screen.active')?.id || 'home'; }
  function showSubview(id) {
    document.querySelectorAll('#more .subview').forEach((view) => {
      const active = view.id === id; view.classList.toggle('active', active); view.setAttribute('aria-hidden', String(!active));
    });
    window.scrollTo(0, 0);
  }
  function showScreen(id, subview) {
    if (id === 'shoot' && !canUseShooting()) id = 'mission';
    if (subview === 'budgetView' && !isAdminUser()) subview = 'moreTop';
    if (!document.getElementById(id)) return;
    const previous = activeScreen();
    if (previous === id && !subview) { window.scrollTo({top:0, behavior:'smooth'}); return; }
    scrollPositions.set(previous, window.scrollY);
    screens.forEach((screen) => { const active = screen.id === id; screen.classList.toggle('active', active); screen.setAttribute('aria-hidden', String(!active)); });
    const navId = id === 'guide' ? 'home' : id === 'shopping' ? 'more' : id;
    navButtons.forEach((button) => { const active = button.dataset.screen === navId; button.classList.toggle('active', active); button.setAttribute('aria-current', active ? 'page' : 'false'); });
    if (id === 'more') showSubview(subview || 'moreTop');
    else requestAnimationFrame(() => window.scrollTo(0, scrollPositions.get(id) || 0));
  }
  navButtons.forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.screen)));
  document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => { if (button.dataset.go === 'guide') guideReturnScreen = activeScreen(); showScreen(button.dataset.go, button.dataset.subview); }));
  document.querySelectorAll('[data-subview]:not([data-go])').forEach((button) => button.addEventListener('click', () => showSubview(button.dataset.subview)));
  document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showSubview('moreTop')));

  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 560), {passive:true});
  backToTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

  // Destination guide navigation and filtering
  function filterGuide(day = 'all') {
    document.querySelectorAll('[data-guide-filter]').forEach((button) => button.classList.toggle('active', button.dataset.guideFilter === day));
    document.querySelectorAll('.destination-card').forEach((card) => { card.hidden = (day1Complete && card.dataset.guideDay === 'day1') || (day !== 'all' && card.dataset.guideDay !== day); });
  }
  document.querySelectorAll('[data-guide-filter]').forEach((button) => button.addEventListener('click', () => filterGuide(button.dataset.guideFilter)));
  document.getElementById('guideBack')?.addEventListener('click', () => showScreen(guideReturnScreen));
  document.querySelectorAll('[data-guide-target]').forEach((button) => button.addEventListener('click', () => {
    guideReturnScreen = activeScreen(); filterGuide('all'); showScreen('guide');
    requestAnimationFrame(() => { const target = document.getElementById(`destination-${button.dataset.guideTarget}`); target?.scrollIntoView({block:'start'}); target?.classList.add('spotlight'); setTimeout(() => target?.classList.remove('spotlight'), 1300); });
  }));

  // Itinerary folding and automatic day selection
  function setDay(section, open) {
    const button = section.querySelector('.day-inline-toggle'); const panel = section.querySelector('.day-content');
    button.setAttribute('aria-expanded', String(open)); button.querySelector('i').textContent = open ? '⌃' : '⌄';
    button.setAttribute('aria-label', isToddlerUser() ? `${section.dataset.tripDay === '2' ? 'ふつかめ' : 'いちにちめ'}を ${open ? 'とじる' : 'ひらく'}` : `${section.dataset.tripDay}日目を${open ? '閉じる' : '開く'}`);
    panel.hidden = !open; section.classList.toggle('open', open);
  }
  document.querySelectorAll('.trip-day-section').forEach((section) => {
    section.querySelector('.day-inline-toggle').addEventListener('click', () => setDay(section, section.querySelector('.day-content').hidden));
  });
  const todayTokyo = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  if (todayTokyo === '2026-08-16') document.querySelectorAll('.trip-day-section').forEach((section) => setDay(section, section.dataset.tripDay === '2'));
  if (day1Complete) {
    document.querySelector('[data-trip-day="1"]')?.setAttribute('hidden', ''); document.querySelector('[data-stage-day="day1"]')?.setAttribute('hidden', '');
    const dayTwo = document.querySelector('[data-trip-day="2"]'); if (dayTwo) setDay(dayTwo, true);
    document.querySelector('[data-guide-filter="day1"]')?.setAttribute('hidden', ''); filterGuide('all');
  }

  // Home next action
  const schedule = [
    ['2026-08-15T14:00:00+09:00','8/15 14:00','自宅（天下茶屋）を出発','忘れ物を確認して、まずは生玉霊園へ。','生玉霊園'],
    ['2026-08-15T14:20:00+09:00','8/15 14:20','生玉霊園でお墓参り','静かに手を合わせ、終わったら生駒山上へ。','生玉霊園'],
    ['2026-08-15T15:30:00+09:00','8/15 15:30','生駒山上遊園地','本当に乗りたいものを選び、夜景まで楽しむ。','生駒山上遊園地'],
    ['2026-08-15T20:30:00+09:00','8/15 夜','自宅へ帰って冷凍うどん','外食せず手早く食べ、海の荷物を最終確認。','天下茶屋'],
    ['2026-08-16T06:30:00+09:00','8/16 06:30','若狭へ出発','弁当・飲み物・氷・海グッズを積み込む。','若狭和田ビーチ'],
    ['2026-08-16T08:30:00+09:00','8/16 08:30','若狭和田ビーチ到着','日除けと荷物基地を作って、海へ。','若狭和田ビーチ'],
    ['2026-08-16T12:00:00+09:00','8/16 12:00','弁当で昼休憩','日陰で水分・塩分を補給して休む。','若狭和田ビーチ'],
    ['2026-08-16T15:00:00+09:00','8/16 〜15:00','体力を見て海を終了','着替え、忘れ物、ゴミを確認して天下茶屋へ直帰。','天下茶屋'],
    ['2026-08-16T18:30:00+09:00','8/16 夕方','自宅（天下茶屋）へ帰宅','ラストサマー完走。撮った写真をみんなで見よう。','天下茶屋']
  ];
  const toddlerSchedule = [
    ['2026-08-15T14:00:00+09:00','8/15 14:00','おうちを でる','わすれものを みて、おはかへ いこう。','生玉霊園'],
    ['2026-08-15T14:20:00+09:00','8/15 14:20','おはかで てを あわせる','おわったら、やまの ゆうえんちへ いこう。','生玉霊園'],
    ['2026-08-15T15:30:00+09:00','8/15 15:30','やまの ゆうえんち','のりたいものを ひとつ えらぼう。','生駒山上遊園地'],
    ['2026-08-15T20:30:00+09:00','8/15 よる','おうちで うどん','たべたら、うみの じゅんびを しよう。','天下茶屋'],
    ['2026-08-16T06:30:00+09:00','8/16 06:30','うみへ しゅっぱつ','おべんとうと のみものを くるまに のせよう。','若狭和田ビーチ'],
    ['2026-08-16T08:30:00+09:00','8/16 08:30','うみに つく','おとなと いっしょに じゅんびしよう。','若狭和田ビーチ'],
    ['2026-08-16T12:00:00+09:00','8/16 12:00','おべんとう','かげで やすんで、おみずを のもう。','若狭和田ビーチ'],
    ['2026-08-16T15:00:00+09:00','8/16 15:00ごろ','うみを おわる','つかれたら はやめに おわろう。','天下茶屋'],
    ['2026-08-16T18:30:00+09:00','8/16 ゆうがた','おうちに つく','たのしかったことを はなそう。','天下茶屋']
  ];
  if (!tripRuntime) { const inferred=schedule.findIndex((item)=>new Date(item[0])>new Date()); tripRuntime={currentStepIndex:inferred<0?schedule.length-1:inferred,delayMinutes:0}; }
  function updateNextAction() {
    const now = new Date(); const activeSchedule = isToddlerUser() ? toddlerSchedule : schedule;
    const runtimeIndex = tripRuntime ? Math.max(0,Math.min(activeSchedule.length - 1,Number(tripRuntime.currentStepIndex || 0))) : -1;
    let next = runtimeIndex >= 0 ? activeSchedule[runtimeIndex] : activeSchedule.find((item) => new Date(item[0]) > now);
    if (!next) {
      document.getElementById('nextStatus').textContent = isToddlerUser() ? 'おしまい' : 'COMPLETE'; document.getElementById('nextCountdown').textContent = isToddlerUser() ? 'できた！' : '完走';
      document.getElementById('nextTime').textContent = '8/15—16'; document.getElementById('nextTitle').textContent = isToddlerUser() ? 'なつを たのしんだよ。' : 'ラストサマー、完走。';
      document.getElementById('nextDescription').textContent = isToddlerUser() ? 'たのしかったことを みんなで はなそう。' : '家族7人の夏の記録をゆっくり振り返ろう。'; document.getElementById('nextMap').hidden = true; return;
    }
    const adjustedTime = new Date(new Date(next[0]).getTime() + Number(tripRuntime?.delayMinutes || 0) * 60000);
    const diff = adjustedTime - now; const hours = Math.max(0,Math.floor(diff / 3600000)); const mins = Math.max(0, Math.floor((Math.max(0,diff) % 3600000) / 60000));
    document.getElementById('nextStatus').textContent = isToddlerUser() ? 'つぎ' : 'NEXT ACTION';
    document.getElementById('nextCountdown').textContent = diff <= 0 ? (isToddlerUser() ? 'いま やること' : '進行中') : isToddlerUser() ? (diff < 86400000 ? (hours ? `あと${hours}じかん${mins}ふん` : `あと${mins}ふん`) : `あと${Math.ceil(diff / 86400000)}にち`) : (diff < 86400000 ? (hours ? `あと${hours}時間${mins}分` : `あと${mins}分`) : `${Math.ceil(diff / 86400000)}日後`);
    document.getElementById('nextTime').textContent = next[1]; document.getElementById('nextTitle').textContent = next[2]; document.getElementById('nextDescription').textContent = next[3];
    const map = document.getElementById('nextMap'); map.hidden = false; map.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(next[4])}`;
  }
  updateNextAction(); setInterval(updateNextAction, 60000);

  function saveTripRuntime(nextRuntime) {
    const previousDay1Complete = day1Complete;
    tripRuntime = {currentStepIndex:Math.max(0,Math.min(schedule.length - 1,Number(nextRuntime.currentStepIndex || 0))),delayMinutes:Math.max(-180,Math.min(720,Number(nextRuntime.delayMinutes || 0)))};
    storage.set('trip-runtime',tripRuntime); day1Complete = tripRuntime.currentStepIndex >= 4;
    familySync?.saveRuntime(tripRuntime.currentStepIndex,tripRuntime.delayMinutes);
    updateNextAction(); renderRuntimeControls();renderCompletedRoutes();
    if (previousDay1Complete !== day1Complete) window.location.reload();
  }
  function renderRuntimeControls() {
    const controls=document.getElementById('runtimeControls'); if (!controls) return; controls.hidden=!isAdminUser();
    const runtime=tripRuntime || {currentStepIndex:Math.max(0,schedule.findIndex((item)=>new Date(item[0])>new Date())),delayMinutes:0};
    document.getElementById('runtimePrevious').disabled=runtime.currentStepIndex<=0; document.getElementById('runtimeNext').disabled=runtime.currentStepIndex>=schedule.length-1;
    document.getElementById('runtimeDelay').textContent=runtime.delayMinutes ? `${runtime.delayMinutes>0?'+':''}${runtime.delayMinutes}分` : '予定どおり';
  }
  document.getElementById('runtimePrevious')?.addEventListener('click',()=>saveTripRuntime({...tripRuntime,currentStepIndex:Number(tripRuntime?.currentStepIndex || 0)-1}));
  document.getElementById('runtimeNext')?.addEventListener('click',()=>saveTripRuntime({...tripRuntime,currentStepIndex:Number(tripRuntime?.currentStepIndex || 0)+1}));
  document.querySelectorAll('[data-delay-change]').forEach((button)=>button.addEventListener('click',()=>saveTripRuntime({...tripRuntime,currentStepIndex:Number(tripRuntime?.currentStepIndex || 0),delayMinutes:Number(tripRuntime?.delayMinutes || 0)+Number(button.dataset.delayChange)})));
  document.getElementById('runtimeDelayReset')?.addEventListener('click',()=>saveTripRuntime({...tripRuntime,currentStepIndex:Number(tripRuntime?.currentStepIndex || 0),delayMinutes:0}));
  let showCompletedRoutes=false;
  function renderCompletedRoutes(){const current=Number(tripRuntime?.currentStepIndex||0);const routes=[...document.querySelectorAll('[data-trip-day="1"] .route-item'),...document.querySelectorAll('[data-trip-day="2"] .route-item')];let hiddenCount=0;routes.forEach((route,index)=>{const section=route.closest('.trip-day-section');const completed=index<current;const eligible=completed&&!section?.hidden;route.hidden=eligible&&!showCompletedRoutes;if(eligible)hiddenCount+=1;route.classList.toggle('completed-route',completed);});const toggle=document.getElementById('toggleCompletedRoutes');toggle.hidden=!hiddenCount;toggle.textContent=showCompletedRoutes?(isToddlerUser()?'おわった よていを かくす':'完了した予定を隠す'):(isToddlerUser()?`おわった よてい ${hiddenCount}こ`:`完了した予定 ${hiddenCount}件を表示`);}
  document.getElementById('toggleCompletedRoutes')?.addEventListener('click',()=>{showCompletedRoutes=!showCompletedRoutes;renderCompletedRoutes();});
  renderRuntimeControls();
  renderCompletedRoutes();

  // Shopping checklist
  const shoppingDefaults = [
    ['udon','day1','冷凍うどん','7人分'],['udon-topping','day1','うどん用具材','ねぎ・卵・天かす等'],['day1-drink','day1','DAY1の飲み物','必要な場合のみ'],
    ['rice','bento','弁当用のごはん','7人分'],['bento-main','bento','弁当のおかず','傷みにくいもの'],['bento-side','bento','塩分補給できる副菜','梅・塩気を意識'],['fruit','bento','果物・デザート','保冷できる分だけ'],
    ['water','drink','水・お茶','多め'],['sports','drink','スポーツドリンク','熱中症対策'],['ice','drink','氷・保冷剤','クーラーボックス用'],
    ['snacks','snack','お菓子','車内・海休憩用'],['salt','snack','塩分タブレット','予備'],['bags','snack','ゴミ袋','濡れ物にも使う']
  ].map(([id,category,name,qty]) => ({id,category,name,qty,custom:false}));
  const shoppingLabels = {day1:'DAY1 · 帰宅後ごはん',bento:'DAY2 · 弁当',drink:'飲み物・冷却',snack:'お菓子・その他'};
  const toddlerShoppingLabels = {day1:'よるの ごはん',bento:'おべんとう',drink:'のみもの',snack:'おかしと ふくろ'};
  const toddlerShoppingCopy = {
    rice:['おべんとうの ごはん','7にんぶん'],'bento-main':['おべんとうの おかず','わるくなりにくいもの'],'bento-side':['しおあじの おかず','うめぼし など'],'fruit':['くだもの','ひやせるぶんだけ'],
    water:['おみずと おちゃ','おおめ'],'sports':['すぽーつどりんく','あつさの ため'],'ice':['こおり','くーらーぼっくすへ'],'snacks':['おかし','くるまと うみで'],'salt':['しおの たぶれっと','よび'],'bags':['ごみぶくろ','ぬれたものにも']
  };
  let shoppingItems = storage.get('shopping-items', shoppingDefaults);
  let shoppingDone = storage.get('shopping-done', {});
  let shoppingMeta=storage.get('shopping-meta',{});
  function renderShopping() {
    const root = document.getElementById('shoppingList'); root.innerHTML = '';
    Object.entries(isToddlerUser() ? toddlerShoppingLabels : shoppingLabels).forEach(([key,label]) => {
      if (day1Complete && key === 'day1') return;
      const items = shoppingItems.filter((item) => item.category === key); if (!items.length) return;
      const section = document.createElement('section'); section.className = 'simple-check-group';
      section.innerHTML = `<h2>${escapeHTML(label)}</h2><div class="simple-check-list">${items.map((item) => { const copy = isToddlerUser() && toddlerShoppingCopy[item.id]; const name = copy?.[0] || item.name; const qty = copy?.[1] || item.qty || (isToddlerUser() ? 'かずは まだ' : '数量未設定'); const owner=appUsers.find((user)=>user.id===item.assignedProfile)?.label;const meta=updateMetaCopy(shoppingMeta[item.id]); return `<div class="simple-check-row ${shoppingDone[item.id] ? 'done' : ''}"><input type="checkbox" data-shopping-check="${escapeHTML(item.id)}" ${shoppingDone[item.id] ? 'checked' : ''} aria-label="${escapeHTML(name)}"><div><b>${escapeHTML(name)}</b><small>${escapeHTML(qty)}${owner?` · ${escapeHTML(owner)}担当`:''}${meta?` · 更新 ${escapeHTML(meta)}`:''}</small></div><div class="row-actions">${isAdminUser()?`<select data-shopping-assignee="${escapeHTML(item.id)}"><option value="">担当なし</option>${appUsers.map((user)=>`<option value="${user.id}" ${item.assignedProfile===user.id?'selected':''}>${escapeHTML(user.label)}</option>`).join('')}</select>`:''}${item.custom&&isAdminUser() ? `<button type="button" class="danger" data-shopping-delete="${escapeHTML(item.id)}">削除</button>` : ''}</div></div>`; }).join('')}</div>`;
      root.appendChild(section);
    });
    root.querySelectorAll('[data-shopping-check]').forEach((input) => input.addEventListener('change', () => { const item=shoppingItems.find((entry)=>entry.id===input.dataset.shoppingCheck); shoppingDone[input.dataset.shoppingCheck] = input.checked;shoppingMeta[input.dataset.shoppingCheck]={actor:currentUser.id,updatedAt:new Date().toISOString()}; storage.set('shopping-done', shoppingDone);storage.set('shopping-meta',shoppingMeta); if(item) familySync?.saveShopping(item,input.checked,false,item.assignedProfile); renderShopping(); }));
    root.querySelectorAll('[data-shopping-delete]').forEach((button) => button.addEventListener('click', () => { const item=shoppingItems.find((entry)=>entry.id===button.dataset.shoppingDelete);if(!item||!window.confirm(`「${item.name}」を削除しますか？`))return; shoppingItems = shoppingItems.filter((entry) => entry.id !== button.dataset.shoppingDelete); delete shoppingDone[button.dataset.shoppingDelete];delete shoppingMeta[button.dataset.shoppingDelete]; storage.set('shopping-items', shoppingItems); storage.set('shopping-done', shoppingDone);storage.set('shopping-meta',shoppingMeta); familySync?.saveShopping(item,false,true,item.assignedProfile); renderShopping(); toast('項目を削除しました'); }));
    root.querySelectorAll('[data-shopping-assignee]').forEach((select)=>select.addEventListener('change',()=>{const item=shoppingItems.find((entry)=>entry.id===select.dataset.shoppingAssignee);if(!item)return;item.assignedProfile=select.value;storage.set('shopping-items',shoppingItems);familySync?.saveShopping(item,Boolean(shoppingDone[item.id]),false,item.assignedProfile);renderShopping();}));
    const activeShoppingItems = shoppingItems.filter((item) => !(day1Complete && item.category === 'day1')); const completed = activeShoppingItems.filter((item) => shoppingDone[item.id]).length; const total = activeShoppingItems.length; const percentage = total ? completed / total * 100 : 0;
    document.getElementById('shoppingProgressLabel').textContent = `${completed} / ${total}`; document.getElementById('shoppingProgressBar').style.width = `${percentage}%`; document.getElementById('moreShoppingProgress').textContent = `${completed} / ${total}`;
  }
  document.getElementById('addShoppingForm').addEventListener('submit', (event) => {
    event.preventDefault(); const name = document.getElementById('shoppingName').value.trim(); if (!name) return;
    const item={id:crypto.randomUUID?.() || `custom-${Date.now()}`,category:document.getElementById('shoppingCategory').value,name,qty:document.getElementById('shoppingQty').value.trim(),custom:true}; shoppingItems.push(item);
    storage.set('shopping-items', shoppingItems); familySync?.saveShopping(item,false); event.target.reset(); renderShopping(); toast('買い出し項目を追加しました');
  });

  // Shooting checklist
  const shotItems = [
    ['car-day1','day1','M','墓参りへ向かう車内','助手席側から横向き。窓の景色を1/3入れ、会話中の横顔を追う。','横動画 · 10秒 · 自然な会話',true],
    ['memorial','day1','C','墓参りの前後','参拝そのものは控えめに。花・手元・歩き出す後ろ姿を静かに寄って撮る。','横動画 · 5秒 · 周囲最優先',false],
    ['ikoma-arrival','day1','W','生駒山上到着','入口や看板を左1/3、家族を右1/3へ。場所と全員が一枚で分かる画角。','横写真＋横動画 · 5秒',true],
    ['mountain-view','day1','W','山上からの景色','地平線を上1/3に置き、景色を広く。手すりや家族を手前に少し入れる。','横動画 · 固定10秒',true],
    ['sunset','day1','W','夕暮れの変化','同じ場所・同じ画角で明るいうちと日没後を1本ずつ。カメラを振らない。','横動画 · 各10秒',true],
    ['mountain-sound','day1','S','山上の音','遊具が見える場所でスマホを固定。風と歓声を、家族が話さず10秒録る。','横動画 · 固定10秒 · 無言',false],
    ['ride','day1','M','アトラクション','乗る前の顔→動く遊具→降りた直後の顔。進行方向に余白を残す。','横動画 · 3カット',true],
    ['night-view','day1','V','夜景と家族','夜景を背景に人物を左右1/3へ。顔は近くの照明で明るくし、露出を下げすぎない。','縦動画＋写真 · 5秒',true],
    ['udon','day1','C','帰宅後の冷凍うどん','湯気・箸・最初の一口へ寄る。テーブル全景は最初に1カットだけ。','横動画 · 5秒',false],
    ['early-start','day2','C','朝の出発','時計→積み込んだ荷物→眠い顔の順。短い寄りを3つつなぐ。','横動画 · 各3秒',true],
    ['sea-first-look','day2','M','海が見えた瞬間','先に子どもの顔を撮り、反応のあと窓の海へゆっくり向ける。','横動画 · 10秒',true],
    ['wada-arrival','day2','W','若狭和田到着','白い砂浜・青葉山・家族が一緒に入る広い画角。水平線はまっすぐ。','横写真＋横動画 · 5秒',true],
    ['run-to-sea','day2','M','海へ走る子ども','後ろから低い目線で追う。走る先の海側に広く余白を残す。','横動画 · 10秒 · 60fps推奨',true],
    ['water','day2','C','水中・波打ち際','水面ぎりぎりまで低く。足・しぶき・笑顔を別々の短いカットで。','横動画 · 各5秒 · 防水優先',true],
    ['wave-sound','day2','S','波の音','波打ち際を斜めに入れて固定。会話を止め、波が寄せて返す音を残す。','横動画 · 固定10秒 · 無言',false],
    ['bento','day2','C','みんなで弁当','食べる前に真上から全体、その後は箸と最初の一口へ寄る。','横写真＋横動画',false],
    ['sand-art','day2','V','砂浜の作品','作品を手前、作者を奥に置いて縦で。最後に作者と作品を同時に撮る。','縦写真 · 低い目線',false],
    ['family-photo','day2','W','海で家族写真','海と青葉山を背景に全員を中央より少し下へ。連写して目つぶりを防ぐ。','横写真 · 3秒タイマー＋連写',true],
    ['tired-car','day2','C','帰りの疲れた車内','眠っている手元や足元へ静かに寄る。顔を無理に撮らず起こさない。','横動画 · 5秒 · 無言',false],
    ['ending','day2','V','帰宅のひと言','玄関前で胸から上。目線をレンズに合わせ、一番楽しかったことを一言。','縦動画 · 10秒以内',true]
  ].map(([id,day,frame,name,composition,format,must]) => ({id,day,frame,name,composition,format,must}));
  const toddlerShotCopy = {
    'early-start':['🎒','にもつを ゆびさす','じゅんび できた！と いおう'],'sea-first-look':['👀','うみを みつける','うみ！と いちばんに おしえよう'],'wada-arrival':['👋','うみに あいさつ','うみに こんにちはを しよう'],
    'run-to-sea':['🚶','うみまで あるく','おとなと いっしょに ゆっくり いこう'],'water':['🌊','なみに さわる','おとなの そばで あしを つけよう'],'wave-sound':['👂','なみの おとを きく','しずかに じゅう かぞえよう'],
    'bento':['🍱','おべんとうを みせる','いただきますを いおう'],'sand-art':['🏖️','すなで つくる','できたものを みんなに みせよう'],'family-photo':['😊','みんなで にっこり','おとなが とるときに えがおを みせよう'],
    'tired-car':['😴','くるまで やすむ','つかれたら ゆっくり しよう'],'ending':['🙌','たのしかったと いう','いちばん たのしかったことを いおう']
  };
  const captureMissionLinks = {
    'car-song':{shotId:'early-start',target:'車内で歌っている自然な表情',toddler:'くるまで うたっているかお'},
    'best-memory':{shotId:'ending',target:'一番楽しかったことを話す短い動画',toddler:'たのしかったことを いうところ'},
    'sea-first-look':{shotId:'sea-first-look',target:'海を見つけた瞬間のリアクション',toddler:'うみを みつけた かお'},
    'first':{shotId:'run-to-sea',target:'海へ向かう後ろ姿',toddler:'うみへ いくところ'},
    'wave-jump':{shotId:'water',target:'波に触れる瞬間と表情',toddler:'なみに さわるところ'},
    'shell':{shotId:'water',target:'見つけた貝殻を手に持ったアップ',toddler:'みつけた かいがら'},
    'art':{shotId:'sand-art',target:'砂の作品と作った本人',toddler:'すなで つくったものと いっしょ'},
    'sand-message':{shotId:'sand-art',target:'砂に描いた文字や絵と手元',toddler:'すなに かいたもの'},
    'bento-help':{shotId:'bento',target:'弁当を配るお手伝いの手元',toddler:'おべんとうの おてつだい'},
    'family-line':{shotId:'family-photo',target:'海を背景に家族7人が並んだ写真',toddler:'みんなで にっこり'},
    'final-look':{shotId:'ending',target:'海に手を振る後ろ姿',toddler:'うみに ばいばい'},
    'laugh':{shotId:'family-photo',target:'変顔やおどけた顔のアップ',toddler:'おもしろい かお'},
    'parent-photo':{shotId:'family-photo',target:'親子二人の自然な笑顔',toddler:'おやと にっこり'},
    'sibling-photo':{shotId:'family-photo',target:'きょうだいが並んだ写真',toddler:'きょうだいと ならぶ'},
    'high-five':{shotId:'family-photo',target:'きょうだいのハイタッチの瞬間',toddler:'きょうだいと はいたっち'},
    'family-joke':{shotId:'family-photo',target:'家族が笑った瞬間',toddler:'みんなが わらった しゅんかん'},
    'team-name':{shotId:'family-photo',target:'チーム名を言ってポーズ',toddler:'みんなで えいえいおー'},
    'summer-promise':{shotId:'ending',target:'来年の夏にしたいことを話す一言',toddler:'また うみに いこうと いう'}
  };
  const toddlerProfileNames = {'優典':'ゆうすけ','綾菜':'あやな','慶典':'けいすけ','杏菜':'あんな','波瑠菜':'はるな'};
  const profileDisplayName = (profile) => isToddlerUser() ? (toddlerProfileNames[profile] || profile) : (appUsers.find((user) => user.mission === profile)?.label || profile);
  const captureRequestKey = (profile, missionId) => `${profile}::${missionId}`;
  let captureRequests = storage.get('capture-requests', {});
  let shotDone = storage.get('shots', {}); let shotStatus = storage.get('shot-status', {}); let shotAssignees = storage.get('shot-assignees', {}); let shotMeta=storage.get('shot-meta',{}); let shotFilter = 'all';
  Object.keys(shotStatus).forEach((id)=>{if(shotStatus[id]!=='done')shotStatus[id]='open';});storage.set('shot-status',shotStatus);
  let familySync = null;

  function syncCaptureRequest(key, request, status, photographed = false) {
    if (!familySync) return;
    familySync.saveCapture({
      requestKey:key,
      requesterProfile:userIdForMissionProfile(request.profile),
      missionId:request.missionId,
      status,
      photographed,
      requestedAt:request.requestedAt ? new Date(request.requestedAt).toISOString() : new Date().toISOString()
    });
  }

  function syncMissionProgress(profile, missionId, status) {
    if (!familySync) return;
    familySync.saveMission(userIdForMissionProfile(profile), missionId, status);
  }

  function syncShotProgress(shotId, status) {
    if (!familySync || !canUseShooting()) return;
    familySync.saveShot(shotId, status, shotAssignees[shotId] || null);
  }

  function applyRemoteCapture(row, initial = false) {
    if (!row?.request_key || !row?.requester_profile || !row?.mission_id) return;
    const key = row.request_key; const requesterProfile = missionProfileForUserId(row.requester_profile) || row.requester_profile;
    if (row.status === 'requested') {
      captureRequests[key] = {profile:requesterProfile,missionId:row.mission_id,requestedAt:Date.parse(row.requested_at) || Date.now(),cloud:true};
      missionActivity[requesterProfile] ||= {};missionActivity[requesterProfile][row.mission_id]={submittedAt:row.requested_at||row.updated_at,updatedAt:row.updated_at,actor:row.actor_profile};
    } else {
      delete captureRequests[key];
      if (row.status === 'completed') {
        if (!missionDone[requesterProfile]) missionDone[requesterProfile] = {};
        missionDone[requesterProfile][row.mission_id] = true; missionStatus[requesterProfile] ||= {}; missionStatus[requesterProfile][row.mission_id]='approved';
        if (row.photographed) {
          const shotId = captureMissionLinks[row.mission_id]?.shotId;
          if (shotId) {shotDone[shotId] = true;shotStatus[shotId]='done';}
        }
      }
    }
    storage.set('capture-requests', captureRequests); storage.set('mission-activity',missionActivity); storage.set('missions', missionDone); storage.set('mission-status',missionStatus); storage.set('shots', shotDone); storage.set('shot-status',shotStatus);
    renderShots(); renderMissions();
    if (!initial && row.actor_profile !== currentUser.id) {
      const name = profileDisplayName(requesterProfile);
      if (row.status === 'requested' && isAdminUser()) toast(`${name}から撮影依頼が届きました`);
      else if (row.status !== 'requested' && (isAdminUser() || currentUser.mission === requesterProfile)) toast(isToddlerUser() ? `${name} できた！` : `${name}の撮影依頼が更新されました`);
    }
  }

  function applyRemoteMission(row, initial = false) {
    const profile = missionProfileForUserId(row?.profile_id); if (!profile || !row?.mission_id) return;
    if (!missionDone[profile]) missionDone[profile] = {};
    missionStatus[profile] ||= {}; missionStatus[profile][row.mission_id] = row.status || (row.completed ? 'approved' : 'rejected');
    missionDone[profile][row.mission_id] = missionStatus[profile][row.mission_id] === 'approved';
    missionActivity[profile] ||= {}; missionActivity[profile][row.mission_id]={updatedAt:row.updated_at,submittedAt:row.submitted_at||row.updated_at,actor:row.actor_profile};
    storage.set('mission-activity',missionActivity); storage.set('mission-status',missionStatus); storage.set('missions', missionDone); renderMissions();
    if (!initial && isAdminUser() && row.actor_profile !== currentUser.id) toast(`${profileDisplayName(profile)}のミッション進捗を更新しました`);
  }

  function applyRemoteShot(row, initial = false) {
    if (!row?.shot_id) return;
    shotStatus[row.shot_id] = row.status === 'done' || row.completed ? 'done' : 'open'; shotDone[row.shot_id] = shotStatus[row.shot_id] === 'done'; shotAssignees[row.shot_id] = row.assigned_profile || '';
    shotMeta[row.shot_id]={actor:row.actor_profile,updatedAt:row.updated_at};
    storage.set('shot-status',shotStatus); storage.set('shot-assignees',shotAssignees); storage.set('shot-meta',shotMeta); storage.set('shots', shotDone); renderShots();
    if (!initial && canUseShooting() && row.actor_profile !== currentUser.id) toast('撮影リストが更新されました');
  }

  function applyRemoteExpense(row,initial=false){if(!isAdminUser()||!row?.expense_id)return;const item={id:row.expense_id,name:row.name,amount:Number(row.amount),category:row.category};expenses=expenses.filter((entry)=>entry.id!==item.id);if(!row.deleted)expenses.push(item);storage.set('expenses',expenses);renderExpenses();if(!initial&&row.actor_profile!==currentUser.id)toast('予算・実費を同期しました');}
  function applyRemoteRuntime(row,initial=false){if(!row)return;const previous=day1Complete;tripRuntime={currentStepIndex:Number(row.current_step_index||0),delayMinutes:Number(row.delay_minutes||0)};storage.set('trip-runtime',tripRuntime);day1Complete=tripRuntime.currentStepIndex>=4;updateNextAction();renderRuntimeControls();renderCompletedRoutes();if(!initial&&previous!==day1Complete)window.location.reload();}
  function applyRemoteShopping(row,initial=false){if(!row?.item_id)return;shoppingItems=shoppingItems.filter((item)=>item.id!==row.item_id);if(!row.deleted)shoppingItems.push({id:row.item_id,category:row.category,name:row.name,qty:row.qty,custom:Boolean(row.custom),assignedProfile:row.assigned_profile||''});shoppingDone[row.item_id]=Boolean(row.completed);shoppingMeta[row.item_id]={actor:row.actor_profile,updatedAt:row.updated_at};if(row.deleted){delete shoppingDone[row.item_id];delete shoppingMeta[row.item_id];}storage.set('shopping-items',shoppingItems);storage.set('shopping-done',shoppingDone);storage.set('shopping-meta',shoppingMeta);renderShopping();if(!initial&&row.actor_profile!==currentUser.id)toast('買い出しを同期しました');}
  function applyRemotePacking(row,initial=false){if(!row?.item_id)return;packingDone[row.item_id]=Boolean(row.completed);packingMeta[row.item_id]={actor:row.actor_profile,updatedAt:row.updated_at};storage.set('packing',packingDone);storage.set('packing-meta',packingMeta);renderPacking();if(!initial&&row.actor_profile!==currentUser.id)toast('持ち物を同期しました');}
  function applyRemoteMeal(row,initial=false){if(!row?.item_id)return;mealDone[row.item_id]=Boolean(row.completed);mealMeta[row.item_id]={actor:row.actor_profile,updatedAt:row.updated_at};storage.set('meal-progress',mealDone);storage.set('meal-meta',mealMeta);renderMeal();if(!initial&&row.actor_profile!==currentUser.id)toast('弁当準備を同期しました');}

  let currentSyncState='local'; let currentSyncDetail={pendingCount:0,lastSyncAt:null};
  function setFamilySyncStatus(state,detail={}) {
    currentSyncState=state;currentSyncDetail=detail||{};
    const element = document.getElementById('familySyncState'); if (!element) return;
    const labels = isToddlerUser()
      ? {local:'この すまほだけ',connecting:'つないでる',online:'みんなと つながった',pending:'おくるもの あり',offline:'あとで つなぐ',error:'あとで つなぐ','join-required':'こーどを いれてね'}
      : {local:'この端末だけ',connecting:'家族と接続中',online:'家族と同期中',pending:'タップして送信',offline:'圏外・送信保留',error:'同期保留','join-required':'家族コードが必要'};
    element.className = `family-sync-state ${state}`;
    element.querySelector('em').textContent = labels[state] || labels.local;
    const label=document.getElementById('syncCenterLabel');const more=document.getElementById('moreSyncStatus');const description=document.getElementById('syncCenterDetail');
    if(label)label.textContent=labels[state]||labels.local;if(more)more.textContent=labels[state]||labels.local;
    if(description){const pending=Number(detail?.pendingCount||0);description.textContent=isToddlerUser()?(pending?`${pending}こ あとで おくるよ`:detail?.lastSyncAt?`${new Date(detail.lastSyncAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}に おくったよ`:state==='join-required'?'かぞくの こーどを いれてね':'ぼたんを おした ときに おくるよ'):(pending?`${pending}件を端末に保留中`:detail?.lastSyncAt?`最終同期 ${new Date(detail.lastSyncAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`:state==='join-required'?'家族コードで接続してください':'操作した時だけ通信します');}
  }

  function renderCaptureQueue() {
    const root = document.getElementById('captureRequestList');
    if (!isAdminUser()) { root.innerHTML = ''; document.getElementById('captureQueueCount').textContent = '0件'; return; }
    const requests = Object.entries(captureRequests).filter(([,request]) => captureMissionLinks[request.missionId] && !missionDone?.[request.profile]?.[request.missionId]);
    document.getElementById('captureQueueKicker').textContent = isToddlerUser() ? 'みっしょん と しゃしん' : 'MISSION × SHOT';
    document.getElementById('captureQueueTitle').textContent = isToddlerUser() ? 'とって ほしいもの' : '撮ってほしいもの';
    document.getElementById('captureQueueCount').textContent = isToddlerUser() ? `${requests.length}こ` : `${requests.length}件`;
    root.innerHTML = requests.length ? requests.map(([key,request]) => {
      const item = missionItems.find((mission) => mission.id === request.missionId); const link = captureMissionLinks[request.missionId];
      const mission = item ? (isToddlerUser() ? {...item,title:preschoolMissionTitles[item.id] || item.title} : missionForProfile(item, request.profile)) : null; const name = profileDisplayName(request.profile);
      return `<article class="capture-request-card"><div class="capture-request-meta"><span>${escapeHTML(name)}</span><em>📷 ${isToddlerUser() ? 'とってね' : '撮影待ち'}</em></div><b>${escapeHTML(mission?.title || request.missionId)}</b><p>${escapeHTML(isToddlerUser() ? link.toddler : link.target)}</p><div class="capture-request-actions"><button type="button" class="capture-complete" data-capture-complete="${escapeHTML(key)}">${isToddlerUser() ? 'とれた！' : '撮れた！'}</button><button type="button" data-capture-witness="${escapeHTML(key)}">${isToddlerUser() ? 'みてもらった' : '見届けたのでクリア'}</button></div></article>`;
    }).join('') : `<p class="capture-queue-empty">${isToddlerUser() ? 'とって ほしいものは まだ ないよ。' : 'ミッションから「撮影をお願い」すると、ここに並びます。'}</p>`;
    root.querySelectorAll('[data-capture-complete]').forEach((button) => button.addEventListener('click', () => completeCaptureRequest(button.dataset.captureComplete, true)));
    root.querySelectorAll('[data-capture-witness]').forEach((button) => button.addEventListener('click', () => completeCaptureRequest(button.dataset.captureWitness, false)));
  }

  function completeCaptureRequest(key, photographed) {
    if (!isAdminUser()) return;
    const request = captureRequests[key]; if (!request) return;
    if (!missionDone[request.profile]) missionDone[request.profile] = {}; missionDone[request.profile][request.missionId] = true; storage.set('missions', missionDone);
    if (photographed) { const shotId = captureMissionLinks[request.missionId]?.shotId; if (shotId) { shotDone[shotId] = true;shotStatus[shotId]='done';shotMeta[shotId]={actor:currentUser.id,updatedAt:new Date().toISOString()};storage.set('shots', shotDone);storage.set('shot-status',shotStatus);storage.set('shot-meta',shotMeta); } }
    syncCaptureRequest(key, request, 'completed', photographed);
    missionStatus[request.profile] ||= {}; missionActivity[request.profile] ||= {};missionStatus[request.profile][request.missionId]='approved';missionActivity[request.profile][request.missionId]={...(missionActivity[request.profile][request.missionId]||{}),updatedAt:new Date().toISOString(),actor:currentUser.id};storage.set('mission-activity',missionActivity); storage.set('mission-status',missionStatus);
    syncMissionProgress(request.profile, request.missionId, 'approved');
    if (photographed) { const shotId = captureMissionLinks[request.missionId]?.shotId; if (shotId) syncShotProgress(shotId, 'done'); }
    delete captureRequests[key]; storage.set('capture-requests', captureRequests); renderShots(); renderMissions();
    toast(isToddlerUser() ? `${profileDisplayName(request.profile)} できた！` : photographed ? '撮影とミッションを完了しました' : 'ミッションを完了しました');
  }

  function renderShots() {
    renderCaptureQueue();
    const root = document.getElementById('shotList'); root.innerHTML = '';
    [['day1','DAY 1 · 墓参りとナイター'],['day2',isToddlerUser() ? 'うみで やってみよう' : 'DAY 2 · 若狭和田ビーチ']].forEach(([day,label]) => {
      if (day1Complete && day === 'day1') return;
      const items = shotItems.filter((item) => item.day === day && (shotFilter === 'all' || (shotFilter === 'mine' && shotAssignees[item.id] === currentUser.id) || (shotFilter === 'must' && item.must) || (shotFilter === 'open' && !shotDone[item.id]))); if (!items.length) return;
      const section = document.createElement('section'); section.className = 'shot-category';
      section.innerHTML = `<div class="shot-category-head"><div><p class="kicker dark">${isToddlerUser() ? 'あした' : day.toUpperCase()}</p><h2>${label}</h2></div><span>${items.filter((item) => shotDone[item.id]).length} / ${items.length}</span></div><div class="shot-category-body">${items.map((item) => { const copy = isToddlerUser() ? toddlerShotCopy[item.id] : null; const frame = copy?.[0] || item.frame; const name = copy?.[1] || item.name; const direction = copy?.[2] || item.composition; const format = isToddlerUser() ? 'おとなと いっしょ' : item.format; const assignee=shotAssignees[item.id] || '';const meta=updateMetaCopy(shotMeta[item.id]); return `<article class="shot-card ${shotDone[item.id] ? 'checked' : ''}"><label class="shot-check-main"><span class="shot-frame">${frame}</span><span class="shot-copy"><span class="shot-badges"><em class="${item.must ? 'priority-must' : 'priority-bonus'}">${item.must ? 'MUST' : 'BONUS'}</em>${assignee?`<em class="priority-owner">${escapeHTML(appUsers.find((user)=>user.id===assignee)?.label || assignee)}担当</em>`:''}</span><b>${escapeHTML(name)}</b><p>${escapeHTML(direction)}</p><small>${escapeHTML(format)}${meta?` · 更新 ${escapeHTML(meta)}`:''}</small>${isAdminUser()?`<span class="shot-admin-tools"><select data-shot-assignee="${item.id}" aria-label="撮影担当"><option value="">担当なし</option><option value="parent" ${assignee==='parent'?'selected':''}>管理者</option><option value="yusuke" ${assignee==='yusuke'?'selected':''}>優典</option><option value="ayana" ${assignee==='ayana'?'selected':''}>綾菜</option></select></span>`:''}</span><input type="checkbox" data-shot-id="${item.id}" ${shotDone[item.id] ? 'checked' : ''} aria-label="${escapeHTML(name)}"></label></article>`; }).join('')}</div>`; root.appendChild(section);
    });
    root.querySelectorAll('[data-shot-id]').forEach((input) => input.addEventListener('change', () => { shotDone[input.dataset.shotId] = input.checked; shotStatus[input.dataset.shotId]=input.checked?'done':'open';shotMeta[input.dataset.shotId]={actor:currentUser.id,updatedAt:new Date().toISOString()}; storage.set('shots',shotDone); storage.set('shot-status',shotStatus);storage.set('shot-meta',shotMeta); syncShotProgress(input.dataset.shotId,shotStatus[input.dataset.shotId]); renderShots(); }));
    root.querySelectorAll('[data-shot-assignee]').forEach((select)=>select.addEventListener('click',(event)=>event.stopPropagation()));
    root.querySelectorAll('[data-shot-assignee]').forEach((select)=>select.addEventListener('change',()=>{shotAssignees[select.dataset.shotAssignee]=select.value;shotMeta[select.dataset.shotAssignee]={actor:currentUser.id,updatedAt:new Date().toISOString()};storage.set('shot-assignees',shotAssignees);storage.set('shot-meta',shotMeta);syncShotProgress(select.dataset.shotAssignee,shotStatus[select.dataset.shotAssignee] || (shotDone[select.dataset.shotAssignee]?'done':'open'));renderShots();}));
    const activeShotItems = shotItems.filter((item) => !(day1Complete && item.day === 'day1'));
    const completed = activeShotItems.filter((item) => shotDone[item.id]).length; const total = activeShotItems.length;
    document.getElementById('shootProgress').textContent = `${completed} / ${total}`; document.getElementById('shootProgressBar').style.width = `${completed / total * 100}%`;
  }
  document.querySelectorAll('[data-shot-filter]').forEach((button) => button.addEventListener('click', () => { shotFilter = button.dataset.shotFilter; document.querySelectorAll('[data-shot-filter]').forEach((item) => item.classList.toggle('active', item === button)); renderShots(); }));

  // Child missions: 75 missions in five categories, with age-aware wording
  const missionProfiles = {
    '優典':{grade:'中学2年'},'綾菜':{grade:'小学6年'},'慶典':{grade:'小学3年'},
    '杏菜':{grade:'年長',young:true},'波瑠菜':{grade:'年少',young:true}
  };
  const missionCategories = {
    common:'どこでも',day1:'DAY 1',day2:'DAY 2',family:'家族',creator:'撮影'
  };
  const missionItems = [
    ['seatbelt','common','✅','シートベルトを確認する','出発前に自分からチェック。'],
    ['own-drink','common','🥤','自分の飲み物を管理する','降りるときも忘れずに。'],
    ['own-bag','common','🎒','自分の荷物を自分で持つ','必要なものを一つ確認。'],
    ['thank-driver','common','🚙','運転ありがとうを伝える','到着したら言葉にする。'],
    ['car-song','common','🎵','車内でみんなと一曲歌う','眠気を吹き飛ばそう。'],
    ['window-find','common','👀','車窓の発見を一つ話す','見つけた景色を共有。'],
    ['rest-stretch','common','🙆','休憩で体を伸ばす','肩と足をゆっくり動かす。'],
    ['next-plan','common','🗓️','次の予定を覚える','次に行く場所を答える。'],
    ['keep-clean','common','🧹','車内をきれいに保つ','ゴミを一つ拾う。'],
    ['kind-word','common','🕊️','きょうだいに優しい言葉','一度、自分から声をかける。'],
    ['help','common','🤲','困っている人を手伝う','できることを一つ探す。'],
    ['greeting','common','😊','自分から笑顔であいさつ','元気な声で伝える。'],
    ['timekeeper','common','⏰','集合時刻を一度知らせる','時計を見て家族に共有。'],
    ['weather-watch','common','☀️','空の変化を見つける','雲・風・光から一つ。'],
    ['best-memory','common','🏆','今日の一番を発表する','帰りの車で理由も話す。'],

    ['respect','day1','🙏','お墓で静かに手を合わせる','気持ちを整えて過ごす。'],
    ['quiet-minute','day1','🤫','静かに1分過ごす','周りの人にも配慮する。'],
    ['family-memory','day1','💭','家族の思い出を一つ聞く','分からないことを質問。'],
    ['grave-help','day1','🧤','墓参りの手伝いをする','安全にできる役を一つ。'],
    ['day1-departure','day1','🚗','DAY1の出発を盛り上げる','元気なひと言でスタート。'],
    ['choice','day1','🎡','乗りたいものを自分で決める','本当に乗りたい一つを選ぶ。'],
    ['budget-choice','day1','💴','予算を考えて選ぶ','使う金額を家族と確認。'],
    ['ikoma-sign','day1','🎠','遊園地の看板を見つける','到着の目印を探す。'],
    ['ride-reaction','day1','😆','最高のリアクションをする','乗る前か後に気持ちを話す。'],
    ['sunset','day1','🌇','夕暮れの色を3つ見つける','空をよく見て言葉にする。'],
    ['night','day1','🌃','最高の夜景ポイントを発見','家族にも場所を教える。'],
    ['light-count','day1','✨','夜景の光を5種類探す','色や形の違いを見つける。'],
    ['mountain-air','day1','⛰️','山上の風を感じる','暑さや涼しさを一言で。'],
    ['family-ride','day1','🙌','誰かの挑戦を応援する','乗らなくても拍手で参加。'],
    ['udon-help','day1','🍜','冷凍うどん作りを手伝う','配膳か片付けを一つ。'],

    ['early-wake','day2','⏰','朝早く起きる','6:30出発に間に合わせる。'],
    ['load-car','day2','📦','海の荷物を一つ運ぶ','無理のない重さを選ぶ。'],
    ['sea-first-look','day2','🌊','海が見えたら一番に発見','見えた方向をみんなに伝える。'],
    ['first','day2','🏃','元気よく海へ向かう','安全な場所では走らない。'],
    ['sea','day2','🛟','海の安全ルールを守る','大人から離れすぎない。'],
    ['sunscreen','day2','🧴','日焼け止めを塗る','塗り直しも忘れずに。'],
    ['lifejacket','day2','🦺','安全装備を自分で確認','ひもや留め具をチェック。'],
    ['wave-jump','day2','🌊','波を上手に一回ジャンプ','周りを見ながら挑戦。'],
    ['shell','day2','🐚','一番きれいな貝殻を探す','色や形を家族に見せる。'],
    ['sea-color','day2','🎨','海の色に名前をつける','自分だけの名前でOK。'],
    ['art','day2','🏖️','砂浜で作品を作る','作品に名前もつける。'],
    ['sand-message','day2','✍️','砂に夏の言葉を書く','写真を撮って残す。'],
    ['bento-help','day2','🍱','弁当の準備を手伝う','配る・片付けるから一つ。'],
    ['hydrate','day2','💧','自分から水分補給する','のどが渇く前に飲む。'],
    ['safety-check','day2','👁️','家族の体調を気にかける','寒さや疲れを一度聞く。'],
    ['beach-support','day2','🤝','海で誰かをサポートする','浮き輪や荷物を手伝う。'],
    ['beach-clean','day2','🗑️','砂浜のゴミを一つ拾う','安全なゴミだけ大人と回収。'],
    ['family-line','day2','👨‍👩‍👧‍👦','海で7人そろって並ぶ','家族写真に全員集合。'],
    ['cold-check','day2','🥶','寒くなる前に休憩する','体の変化を大人に伝える。'],
    ['final-look','day2','👋','海に最後のあいさつ','帰る前にもう一度振り返る。'],

    ['support','family','🤝','年下を一回サポートする','声かけや荷物を手伝う。'],
    ['laugh','family','😄','家族の誰かを笑わせる','楽しい空気を作る。'],
    ['photo','family','📸','家族のベスト写真を撮る','全員か主役が伝わる一枚。'],
    ['parent-photo','family','💐','親とツーショットを撮る','自然な表情で一枚。'],
    ['sibling-photo','family','👧','きょうだいで写真に入る','声をかけたら集まる。'],
    ['compliment','family','✨','家族の良いところを伝える','具体的に一つ話す。'],
    ['thank-you','family','💬','家族にありがとうを言う','してもらったことを伝える。'],
    ['high-five','family','🙌','きょうだい全員とハイタッチ','DAY2終了までに達成。'],
    ['cheer','family','📣','誰かの挑戦を応援する','大きな拍手か声援で。'],
    ['share-snack','family','🍪','お菓子を分け合う','自分からどうぞと言う。'],
    ['listen','family','👂','家族の話を最後まで聞く','途中でさえぎらず聞く。'],
    ['wait-family','family','🚶','遅れている家族を待つ','みんなで動くことを優先。'],
    ['family-joke','family','🤣','家族だけの面白話を作る','旅のあとも思い出せる話。'],
    ['team-name','family','🏷️','今日の家族チーム名を決める','みんなで一案を選ぶ。'],
    ['summer-promise','family','🌻','来年の夏にしたいことを話す','一人ひとつ発表する。'],

    ['opening-shot','creator','🎬','旅のオープニングを撮る','日付と行き先が伝わる一言。'],
    ['road-audio','creator','🎙️','車内の会話を10秒残す','自然な声を横動画で。'],
    ['arrival-talk','creator','📍','到着の第一声を撮る','背景に場所が分かるものを。'],
    ['sunset-movie','creator','🌅','夕暮れを固定で10秒撮る','手ぶれを抑えて待つ。'],
    ['ride-movie','creator','🎢','アトラクションの反応を撮る','安全な場所から撮影。'],
    ['night-wide','creator','🌃','夜景を横長で撮る','最初と最後を3秒止める。'],
    ['sea-reveal','creator','🏝️','海が見えた瞬間を撮る','景色と声を一緒に残す。'],
    ['wave-slow','creator','💦','波打ち際を低い目線で撮る','スマホを濡らさない。'],
    ['lunch-top','creator','🍱','弁当を真上から撮る','食べる前に一枚だけ。'],
    ['ending-shot','creator','🏁','旅の締めコメントを撮る','一番楽しかったことを一言。']
  ].map(([id,category,emoji,title,note]) => ({id,category,emoji,title,note}));
  const profileTitleOverrides = {
    '優典':{support:'年下の安全と荷物をサポートする',safetyCheck:'家族の体調を確認する'},
    '綾菜':{photo:'海のベストショットを撮る',sunset:'夕暮れの色を写真に残す'},
    '慶典':{night:'夜景で光る場所を3つ見つける',art:'砂浜の作品に名前をつける'},
    '杏菜':{respect:'おはかで しずかに てをあわせる',choice:'のりたいものを ひとつえらぶ',night:'きれいな ひかりを みつける',sea:'うみでは おとなのそばにいる',shell:'すきな かいがらを みつける',art:'すなで なにかを つくる'},
    '波瑠菜':{respect:'おはかで てをあわせる',choice:'のりたいものを ゆびさす',night:'ぴかぴかを みつける',sea:'うみに こんにちはする',shell:'すきな いろを みつける',laugh:'だれかを にこにこにする'}
  };
  const preschoolMissionTitles = {
    'seatbelt':'しーとべるとを かくにんする','own-drink':'じぶんの のみものを もつ','own-bag':'じぶんの かばんを もつ','thank-driver':'うんてん ありがとうを いう','car-song':'くるまで みんなと うたう',
    'window-find':'まどから みつけたものを はなす','rest-stretch':'きゅうけいで からだを のばす','next-plan':'つぎは どこ？と きく','keep-clean':'ごみを ひとつ ふくろに いれる','kind-word':'きょうだいに やさしく いう',
    'help':'おてつだい する？と きく','greeting':'えがおで あいさつする','timekeeper':'いま なんじ？と きく','weather-watch':'そらを みる','best-memory':'すきだったものを いう',
    'respect':'おはかで しずかに てを あわせる','quiet-minute':'しずかに いっぷん すごす','family-memory':'かぞくの おもいでを ひとつ きく','grave-help':'おはかまいりを てつだう','day1-departure':'いちにちめの しゅっぱつを もりあげる',
    'choice':'のりたいものを じぶんで えらぶ','budget-choice':'おかねを かんがえて えらぶ','ikoma-sign':'ゆうえんちの かんばんを みつける','ride-reaction':'のりものの きもちを はなす','sunset':'ゆうやけの いろを みっつ みつける',
    'night':'きれいな よぞらを みつける','light-count':'よるの ひかりを いつつ さがす','mountain-air':'やまの かぜを かんじる','family-ride':'だれかの ちょうせんを おうえんする','udon-help':'うどんづくりを てつだう',
    'early-wake':'おはようを いう','load-car':'かるい にもつを ひとつ はこぶ','sea-first-look':'うみが みえたら おしえる','first':'おとなと いっしょに うみへ いく','sea':'おとなの そばに いる',
    'sunscreen':'ひやけどめを ぬってもらう','lifejacket':'あんぜんの どうぐを つけてもらう','wave-jump':'おとなと なみに さわる','shell':'すきな かいがらを みつける','sea-color':'すきな いろを みつける',
    'art':'すなで なにかを つくる','sand-message':'すなに まるを かく','bento-help':'おはしを くばる','hydrate':'おみずを のむ','safety-check':'つかれたら おとなに いう',
    'beach-support':'どうぞと いう','beach-clean':'おとなと ごみを ひろう','family-line':'みんなで にっこりする','cold-check':'さむいと いえる','final-look':'うみに ばいばいする',
    'support':'ちいさいこに だいじょうぶ？と きく','laugh':'おもしろい かおを する','photo':'しゃしんで にっこりする','parent-photo':'おやと にっこりする','sibling-photo':'きょうだいと ならぶ',
    'compliment':'だいすきと いう','thank-you':'ありがとうを いう','high-five':'きょうだいと はいたっち','cheer':'がんばれ！と いう','share-snack':'おかしを どうぞする',
    'listen':'おはなしを きく','wait-family':'みんなを まつ','family-joke':'おもしろい かおを する','team-name':'みんなで えいえいおーを する','summer-promise':'また うみに いこうと いう',
    'opening-shot':'はじまりに ぴーすする','road-audio':'くるまで おしゃべりする','arrival-talk':'ついたら やったーと いう','sunset-movie':'ゆうやけを みる','ride-movie':'のりものの かおを みせる',
    'night-wide':'よるの ひかりを みつける','sea-reveal':'うみが みえたら おしえる','wave-slow':'なみに こんにちはする','lunch-top':'おべんとうを みせる','ending-shot':'たのしかったと いう'
  };
  const missionRanks = ['ラストサマー・ルーキー','発見ハンター','お手伝いスター','山上チャレンジャー','夜景ハンター','サマー・プレイヤー','海の探検員','波乗りチャレンジャー','砂浜クリエイター','家族のムードメーカー','撮影クルー','思いやりリーダー','夏の冒険エース','ラストサマー隊長','関家サマーマスター','完全燃焼マスター'];
  const preschoolMissionRanks = ['はじめての なつやすみ','はっけん るーきー','おてつだい すたー','やまの ちょうせんたい','よぞらの はんたー','なつの あそびにん','うみの たんけんたい','なみの ちょうせんたい','すなはま くりえいたー','かぞくの にんきもの','さつえい くるー','おもいやり りーだー','なつの ぼうけん えーす','らすとさまー たいちょう','せきけの なつめいじん','なつの だいめいじん'];
  let activeProfile = currentUser.mission || '優典'; let missionDone = storage.get('missions', {}); let missionStatus = storage.get('mission-status', {}); let missionActivity=storage.get('mission-activity',{});
  let activeMissionCategory = 'all';
  function profileState(name) { if (!missionDone[name]) missionDone[name] = {}; return missionDone[name]; }
  function missionForProfile(item, profile = activeProfile) {
    const young = missionProfiles[profile]?.young;
    const title = profileTitleOverrides[profile]?.[item.id] || (young ? preschoolMissionTitles[item.id] : item.title);
    return {...item,title,note:young ? `おとなと いっしょに。${item.note}` : item.note};
  }
  function missionXp(item) { return item.category === 'common' ? 10 : item.category === 'creator' ? 15 : 20; }
  function missionStats(profile){const state=profileState(profile);const statuses=missionStatus[profile]||{};const approved=missionItems.filter((item)=>state[item.id]);const pending=missionItems.filter((item)=>!state[item.id]&&(statuses[item.id]==='pending'||captureRequests[captureRequestKey(profile,item.id)]));const confirmedXp=approved.reduce((sum,item)=>sum+missionXp(item),0);const pendingXp=pending.reduce((sum,item)=>sum+missionXp(item),0);const projectedCount=approved.length+pending.length;const rankIndex=Math.min(Math.floor(projectedCount/5),missionRanks.length-1);const activity=Object.values(missionActivity[profile]||{}).map((entry)=>Date.parse(entry.submittedAt||entry.updatedAt)||0);const captureTimes=Object.values(captureRequests).filter((entry)=>entry.profile===profile).map((entry)=>Number(entry.requestedAt)||0);return {approved,pending,confirmedXp,pendingXp,projectedXp:confirmedXp+pendingXp,projectedCount,rankIndex,lastAt:Math.max(0,...activity,...captureTimes)};}
  function relativeActivity(timestamp){if(!timestamp)return 'まだ申告なし';const minutes=Math.max(0,Math.floor((Date.now()-timestamp)/60000));if(minutes<1)return 'たった今';if(minutes<60)return `${minutes}分前`;const hours=Math.floor(minutes/60);return hours<24?`${hours}時間前`:`${Math.floor(hours/24)}日前`;}
  function renderAdminMissionProgress() {
    const profiles = appUsers.filter((user) => user.mission);
    if (!profiles.some((user) => user.mission === activeProfile)) activeProfile = profiles[0].mission;
    const allStats=profiles.map((user)=>({user,stats:missionStats(user.mission)}));const topScore=Math.max(0,...allStats.map(({stats})=>stats.projectedXp));const latest=Math.max(0,...allStats.map(({stats})=>stats.lastAt));
    const board=document.getElementById('missionFamilyBoard');board.hidden=false;board.innerHTML=`<div class="family-board-head"><div><p class="kicker dark">FAMILY STATUS</p><h2>みんなの今</h2></div><small>確認待ちも仮ポイントに加算</small></div><div class="family-score-grid">${allStats.map(({user,stats})=>{const next=5-(stats.projectedCount%5||5);const prompt=stats.pending.length?`確認待ち ${stats.pending.length}件`:!stats.lastAt?'最初の1個を声かけ':next===1?'あと1個でレベルアップ':'次の挑戦を声かけ';return `<button type="button" class="family-score-card ${activeProfile===user.mission?'active':''}" data-admin-profile="${escapeHTML(user.mission)}"><span class="family-score-name"><b>${escapeHTML(user.label)}</b>${stats.projectedXp===topScore&&topScore?'<em>現在トップ</em>':''}${stats.lastAt===latest&&latest?'<em class="active-now">最近活動</em>':''}</span><strong>${stats.projectedXp}<small>pt</small>${stats.pendingXp?`<i>確定 ${stats.confirmedXp}・仮 ${stats.pendingXp}</i>`:''}</strong><span class="family-score-progress"><i style="width:${Math.min(100,stats.projectedCount/missionItems.length*100)}%"></i></span><span>${stats.approved.length}達成・${stats.pending.length}確認待ち</span><small>${relativeActivity(stats.lastAt)} · ${prompt}</small></button>`;}).join('')}</div>`;
    board.querySelectorAll('[data-admin-profile]').forEach((button)=>button.addEventListener('click',()=>{activeProfile=button.dataset.adminProfile;renderMissions();}));
    const tabs = document.getElementById('missionProfiles'); tabs.hidden = true;
    tabs.innerHTML = profiles.map((user) => `<button type="button" class="${activeProfile === user.mission ? 'active' : ''}" data-admin-profile="${escapeHTML(user.mission)}">${escapeHTML(user.label)}</button>`).join('');
    tabs.querySelectorAll('[data-admin-profile]').forEach((button) => button.addEventListener('click', () => { activeProfile = button.dataset.adminProfile; renderMissions(); }));
    const categoryLabels = {all:'すべて',...missionCategories};
    if (day1Complete && activeMissionCategory === 'day1') activeMissionCategory = 'all';
    const categoryKeys = Object.keys(missionCategories).filter((key) => !(day1Complete && key === 'day1'));
    const categoryTabs = document.getElementById('missionCategories');
    categoryTabs.innerHTML = `<button type="button" class="${activeMissionCategory === 'all' ? 'active' : ''}" data-mission-category="all">すべて</button>${categoryKeys.map((key) => `<button type="button" class="${activeMissionCategory === key ? 'active' : ''}" data-mission-category="${key}">${categoryLabels[key]}</button>`).join('')}`;
    categoryTabs.querySelectorAll('[data-mission-category]').forEach((button) => button.addEventListener('click', () => { activeMissionCategory = button.dataset.missionCategory; renderMissions(); }));
    const pastMissionIds = new Set(['opening-shot','sunset-movie','ride-movie','night-wide']);
    const availableItems = missionItems.filter((item) => !(day1Complete && (item.category === 'day1' || pastMissionIds.has(item.id))));
    const visibleItems = availableItems.filter((item) => activeMissionCategory === 'all' || item.category === activeMissionCategory).map((item) => missionForProfile(item,activeProfile));
    const state = profileState(activeProfile); const stats=missionStats(activeProfile);
    document.getElementById('mission').classList.remove('toddler-mode');
    document.getElementById('missionKicker').textContent = 'FAMILY PROGRESS';
    document.getElementById('missionHeroTitle').innerHTML = 'みんなの進捗を<br>見守る。';
    document.getElementById('missionHeroDescription').textContent = '家族全員の達成状況と撮影待ちを確認できます。';
    document.getElementById('missionRankKicker').textContent = 'MISSION STATUS'; document.getElementById('kidsXpLabel').textContent = 'XP';
    document.getElementById('missionModeBadge').textContent = '管理者確認'; document.getElementById('missionPlayerName').textContent = profileDisplayName(activeProfile);
    document.getElementById('missionRank').textContent = `${stats.approved.length}個達成${stats.pending.length?`・${stats.pending.length}個待ち`:''}`;
    document.getElementById('missionProgressText').textContent = `確定 ${stats.confirmedXp} XP${stats.pendingXp?` ＋ 確認待ち ${stats.pendingXp} XP`:''}`;
    document.getElementById('missionNextRank').textContent = `累計 ${stats.projectedCount} / ${missionItems.length} ミッション`;
    document.getElementById('kidsXp').textContent = stats.projectedXp;
    document.getElementById('missionRing').style.setProperty('--mission-progress', `${missionItems.length ? stats.projectedCount / missionItems.length * 360 : 0}deg`);
    document.getElementById('toggleMissionResult').hidden = true; document.getElementById('missionResult').hidden = true; document.getElementById('resetMissions').hidden = true;
    const pendingCount=visibleItems.filter((item)=>missionStatus?.[activeProfile]?.[item.id]==='pending').length;
    document.getElementById('missionList').innerHTML = `${pendingCount?`<button type="button" class="solid-button mission-approve-all" id="approveAllMissions">確認待ち${pendingCount}件をまとめて承認</button>`:''}`+visibleItems.map((item) => {
      const requestKey = captureRequestKey(activeProfile,item.id); const requested = Boolean(captureRequests[requestKey]); const completed = Boolean(state[item.id]); const pending=missionStatus?.[activeProfile]?.[item.id]==='pending';
      const status = completed ? '✓ 達成' : pending ? '確認待ち' : requested ? '📷 撮影依頼中' : '未達成';
      const actions=pending?`<span class="mission-admin-actions"><button type="button" data-mission-approve="${item.id}">承認</button><button type="button" data-mission-reject="${item.id}">戻す</button></span>`:completed?`<span class="mission-admin-actions"><button type="button" data-mission-reject="${item.id}">取り消す</button></span>`:`<span class="mission-admin-actions"><button type="button" data-mission-admin-complete="${item.id}">達成にする</button></span>`;
      return `<article class="mission-card admin-progress-card ${completed ? 'completed' : ''} ${requested ? 'requested' : ''} ${pending?'pending':''}"><span class="mission-emoji">${item.emoji}</span><b>${escapeHTML(item.title)}</b><small>${status} · +${missionXp(item)} XP</small>${actions}</article>`;
    }).join('');
    document.querySelectorAll('[data-mission-approve]').forEach((button)=>button.addEventListener('click',()=>setMissionApproval(activeProfile,button.dataset.missionApprove,'approved')));
    document.querySelectorAll('[data-mission-reject]').forEach((button)=>button.addEventListener('click',()=>setMissionApproval(activeProfile,button.dataset.missionReject,'rejected')));
    document.querySelectorAll('[data-mission-admin-complete]').forEach((button)=>button.addEventListener('click',()=>setMissionApproval(activeProfile,button.dataset.missionAdminComplete,'approved')));
    document.getElementById('approveAllMissions')?.addEventListener('click',()=>{if(!window.confirm(`${pendingCount}件をまとめて承認しますか？`))return;visibleItems.filter((item)=>missionStatus?.[activeProfile]?.[item.id]==='pending').forEach((item)=>{missionStatus[activeProfile][item.id]='approved';profileState(activeProfile)[item.id]=true;syncMissionProgress(activeProfile,item.id,'approved');});storage.set('mission-status',missionStatus);storage.set('missions',missionDone);renderMissions();toast('確認待ちをまとめて承認しました');});
    document.getElementById('missionStorageNote').textContent = familySync?.joined ? '家族の端末から届いた進捗をリアルタイムで表示しています。' : '家族同期へ接続すると全員の進捗を確認できます。';
  }
  function renderMissions() {
    if (isAdminUser()) { renderAdminMissionProgress(); return; }
    document.getElementById('missionFamilyBoard').hidden=true;
    document.getElementById('missionProfiles').hidden = true; document.getElementById('toggleMissionResult').hidden = false; document.getElementById('resetMissions').hidden = isAssistedUser();
    const preschool = isToddlerUser(); const assisted = isAssistedUser(); const displayName = currentUser.label;
    const tabs = document.getElementById('missionProfiles'); tabs.innerHTML = '';
    const categoryLabels = preschool ? {all:'すべて',common:'どこでも',day1:'いちにちめ',day2:'ふつかめ',family:'かぞく',creator:'おたのしみ'} : {all:'すべて',...missionCategories};
    if (day1Complete && activeMissionCategory === 'day1') activeMissionCategory = 'all';
    const categoryKeys = Object.keys(missionCategories).filter((key) => !(day1Complete && key === 'day1'));
    const categoryTabs = document.getElementById('missionCategories'); categoryTabs.innerHTML = `<button type="button" class="${activeMissionCategory === 'all' ? 'active' : ''}" data-mission-category="all">${categoryLabels.all}</button>${categoryKeys.map((key) => `<button type="button" class="${activeMissionCategory === key ? 'active' : ''}" data-mission-category="${key}">${categoryLabels[key]}</button>`).join('')}`;
    categoryTabs.querySelectorAll('[data-mission-category]').forEach((button) => button.addEventListener('click', () => { activeMissionCategory = button.dataset.missionCategory; renderMissions(); }));
    const pastMissionIds = new Set(['opening-shot','sunset-movie','ride-movie','night-wide']);
    const state = profileState(activeProfile); const availableItems = missionItems.filter((item) => !(day1Complete && (item.category === 'day1' || pastMissionIds.has(item.id)))); const visibleItems = availableItems.filter((item) => activeMissionCategory === 'all' || item.category === activeMissionCategory).map((item) => missionForProfile(item));
    document.getElementById('mission').classList.toggle('toddler-mode', preschool);
    document.getElementById('missionKicker').textContent = preschool ? 'こども みっしょん' : 'KIDS QUEST';
    document.getElementById('missionHeroTitle').innerHTML = preschool ? 'たびを あそびに<br>かえよう。' : '旅を遊びに<br>変えよう。';
    document.getElementById('missionHeroDescription').textContent = assisted ? 'みつけたら おとなに おしえてね。' : preschool ? 'できそうなものを えらんでね。' : `今からできる${availableItems.length}ミッション。`;
    document.getElementById('missionRankKicker').textContent = preschool ? 'いまの らんく' : 'YOUR RANK'; document.getElementById('kidsXpLabel').textContent = preschool ? 'ぽいんと' : 'XP';
    document.getElementById('missionModeBadge').textContent = assisted ? 'おとなと いっしょ' : preschool ? 'じぶんの きろく' : '記録中';
    document.getElementById('missionResultKicker').textContent = preschool ? 'けっか' : 'RESULT';
    document.getElementById('missionList').innerHTML = visibleItems.map((item) => {
      const captureLink = captureMissionLinks[item.id]; const requestKey = captureRequestKey(activeProfile, item.id); const requested = Boolean(captureRequests[requestKey]);
      const pending=missionStatus?.[activeProfile]?.[item.id]==='pending';
      if (!captureLink&&pending) return `<article class="mission-card pending"><span class="mission-emoji">${item.emoji}</span><b>${escapeHTML(item.title)}</b><small>${preschool?'かくにんまちでも ぽいんと げっと！':'確認待ち · 仮ポイント加算中'}</small><button type="button" class="mission-capture-button requested" data-mission-cancel="${item.id}">${preschool?'やっぱり まだ':'申告を取り消す'}</button></article>`;
      if (!captureLink) return `<label class="mission-card ${state[item.id] ? 'completed' : ''}"><input type="checkbox" data-mission-id="${item.id}" ${state[item.id] ? 'checked' : ''} ${assisted?'disabled':''}><span class="mission-emoji">${item.emoji}</span><b>${escapeHTML(item.title)}</b><small>${assisted ? 'おとなに みせよう' : `+${missionXp(item)} ${preschool ? 'ぽいんと' : 'XP'}`}</small></label>`;
      const captureStatus = state[item.id] ? (preschool ? '📷 とれた！' : '📷 撮影完了') : preschool ? '📷 とって もらったら できた' : `📷 撮ってもらったらクリア · +${missionXp(item)} XP`;
      const action = state[item.id] || assisted ? '' : requested ? `<button type="button" class="mission-capture-button requested" data-capture-cancel="${escapeHTML(requestKey)}">${preschool ? 'おねがいしたよ · やめる' : '撮影待ち · 取り消す'}</button>` : `<button type="button" class="mission-capture-button" data-capture-request="${item.id}">${preschool ? 'おとなに とってもらう' : '撮影をお願い'}</button>`;
      return `<article class="mission-card capture-mission ${state[item.id] ? 'completed' : ''} ${requested ? 'requested' : ''}"><span class="mission-emoji">${item.emoji}</span><b>${escapeHTML(item.title)}</b><small>${captureStatus}</small>${action}</article>`;
    }).join('');
    document.querySelectorAll('[data-mission-id]').forEach((input) => input.addEventListener('change', () => { if(isAssistedUser()) return;const beforeRank=missionStats(activeProfile).rankIndex; missionStatus[activeProfile] ||= {}; missionActivity[activeProfile] ||= {}; missionStatus[activeProfile][input.dataset.missionId]=input.checked?'pending':'rejected';missionActivity[activeProfile][input.dataset.missionId]={submittedAt:new Date().toISOString(),actor:currentUser.id}; state[input.dataset.missionId]=false; storage.set('missions',missionDone);storage.set('mission-status',missionStatus);storage.set('mission-activity',missionActivity);syncMissionProgress(activeProfile,input.dataset.missionId,missionStatus[activeProfile][input.dataset.missionId]);const leveled=input.checked&&missionStats(activeProfile).rankIndex>beforeRank;renderMissions();if(leveled)celebrateMissionLevel();toast(leveled?(preschool?'らんくあっぷ！ かくにんまちでも すすむよ':'LEVEL UP！ 確認待ちでもランクアップ'):(input.checked?(preschool?'かくにんまちでも ぽいんと げっと！':'仮ポイント獲得！ 管理者へ確認を送りました'):'取り消しました')); }));
    document.querySelectorAll('[data-mission-cancel]').forEach((button)=>button.addEventListener('click',()=>{missionStatus[activeProfile] ||= {};missionStatus[activeProfile][button.dataset.missionCancel]='rejected';storage.set('mission-status',missionStatus);syncMissionProgress(activeProfile,button.dataset.missionCancel,'rejected');renderMissions();toast(preschool?'とりけしたよ':'申告を取り消しました');}));
    document.querySelectorAll('[data-capture-request]').forEach((button) => button.addEventListener('click', () => { const beforeRank=missionStats(activeProfile).rankIndex;const missionId = button.dataset.captureRequest; const key = captureRequestKey(activeProfile, missionId); captureRequests[key] = {profile:activeProfile,missionId,requestedAt:Date.now()}; storage.set('capture-requests', captureRequests); syncCaptureRequest(key, captureRequests[key], 'requested');const leveled=missionStats(activeProfile).rankIndex>beforeRank; renderMissions(); renderShots();if(leveled)celebrateMissionLevel(); toast(leveled?(preschool?'らんくあっぷ！ しゃしんを おねがいしたよ':'LEVEL UP！ 撮影依頼の仮ポイントでランクアップ'):(preschool ? 'おねがいしたよ。ぽいんと げっと！' : '撮影依頼を追加し、仮ポイントを獲得しました')); }));
    document.querySelectorAll('[data-capture-cancel]').forEach((button) => button.addEventListener('click', () => { const key = button.dataset.captureCancel; const request = captureRequests[key]; if (request) syncCaptureRequest(key, request, 'cancelled'); delete captureRequests[key]; storage.set('capture-requests', captureRequests); renderMissions(); renderShots(); toast(preschool ? 'おねがいを やめたよ' : '撮影依頼を取り消しました'); }));
    const stats=missionStats(activeProfile);const nextAt=Math.min(missionItems.length,(stats.rankIndex+1)*5);const completedItems=stats.approved;const rankName=(preschool?preschoolMissionRanks:missionRanks)[stats.rankIndex];
    document.getElementById('kidsXp').textContent = stats.projectedXp; document.getElementById('missionPlayerName').textContent = displayName;
    document.getElementById('missionRank').textContent = rankName; document.getElementById('missionProgressText').textContent = preschool ? `${stats.approved.length} できた・${stats.pending.length} まってる` : `${stats.approved.length} 達成 ＋ ${stats.pending.length} 確認待ち`;
    document.getElementById('missionNextRank').textContent = stats.projectedCount === missionItems.length ? (preschool ? 'ぜんぶ できた！' : '全ミッションクリア！') : preschool ? `あと${nextAt-stats.projectedCount}こで らんくあっぷ` : `あと${nextAt-stats.projectedCount}個でランクアップ${stats.pendingXp?` · ${stats.pendingXp} XP確認待ち`:''}`;
    document.getElementById('missionRing').style.setProperty('--mission-progress', `${(stats.projectedCount % 5) / 5 * 360}deg`);
    document.getElementById('missionResultTitle').textContent = preschool ? `${displayName}の きろく` : `${displayName}の記録`; document.getElementById('missionResultScore').textContent = preschool ? `${stats.projectedCount} すすんだ` : `${stats.projectedCount} PROGRESS`; document.getElementById('missionResultSummary').textContent = preschool ? `${rankName} · ${stats.projectedXp} ぽいんと` : `${rankName} · ${stats.confirmedXp} XP${stats.pendingXp?` ＋ ${stats.pendingXp}待ち`:''}`;
    document.getElementById('missionResultList').innerHTML = completedItems.length||stats.pending.length ? `${completedItems.map((item)=>`<span>${item.emoji} ${escapeHTML(missionForProfile(item).title)}</span>`).join('')}${stats.pending.map((item)=>`<span class="pending">⏳ ${escapeHTML(missionForProfile(item).title)}</span>`).join('')}` : `<p>${preschool ? 'まだ できたものは ないよ。' : 'まだ達成したミッションはありません。'}</p>`;
    document.getElementById('missionResultNote').textContent = assisted ? 'できたら おとなと いっしょに ちぇっくしよう。' : preschool ? 'この がめんを おうちのひとに みせよう。' : 'この端末内に保存された記録です。';
    document.getElementById('toggleMissionResult').querySelector('span').textContent = missionResult.hidden ? (preschool ? 'できたものを みる' : '達成状況を確認') : (preschool ? 'できたものを とじる' : '達成状況を閉じる');
    document.getElementById('resetMissions').textContent = preschool ? `${displayName}の みっしょんを やりなおす` : '自分のミッションをリセット';
    document.getElementById('missionStorageNote').textContent = familySync?.joined ? (preschool ? 'できたことと しゃしんの おねがいは、おうちの ひとに とどくよ。' : 'ミッション進捗は管理者と同期され、撮影依頼は管理者だけに届きます。') : preschool ? 'つながるまで、この すまほに のこるよ。' : '家族同期に接続するまでは、この端末内に保存されます。';
  }
  const missionResult = document.getElementById('missionResult');
  document.getElementById('toggleMissionResult').addEventListener('click', (event) => { missionResult.hidden = !missionResult.hidden; event.currentTarget.setAttribute('aria-expanded', String(!missionResult.hidden)); const preschool = isToddlerUser(); event.currentTarget.querySelector('span').textContent = missionResult.hidden ? (preschool ? 'できたものを みる' : '達成状況を確認') : (preschool ? 'できたものを とじる' : '達成状況を閉じる'); });
  function setMissionApproval(profile,missionId,status){missionStatus[profile] ||= {};missionActivity[profile] ||= {};missionStatus[profile][missionId]=status;profileState(profile)[missionId]=status==='approved';missionActivity[profile][missionId]={...(missionActivity[profile][missionId]||{}),updatedAt:new Date().toISOString(),actor:currentUser.id};storage.set('mission-activity',missionActivity);storage.set('mission-status',missionStatus);storage.set('missions',missionDone);syncMissionProgress(profile,missionId,status);renderMissions();toast(status==='approved'?'ミッションを承認しました':'ミッションを戻しました');}
  document.getElementById('resetMissions').addEventListener('click', () => { if (isAdminUser()) return; const preschool = isToddlerUser(); if (!window.confirm(preschool ? `${currentUser.label}の みっしょんを ぜんぶ やりなおす？` : `${currentUser.label}のミッションをすべてリセットしますか？`)) return; const ids=new Set([...Object.keys(profileState(activeProfile)),...Object.keys(missionStatus[activeProfile]||{})]); ids.forEach((id) => syncMissionProgress(activeProfile,id,'rejected')); missionDone[activeProfile] = {}; missionStatus[activeProfile]={}; Object.keys(captureRequests).filter((key) => captureRequests[key].profile === activeProfile).forEach((key) => { syncCaptureRequest(key, captureRequests[key], 'cancelled'); delete captureRequests[key]; }); storage.set('missions', missionDone); storage.set('mission-status',missionStatus); storage.set('capture-requests', captureRequests); renderMissions(); renderShots(); toast(preschool ? 'みっしょんを やりなおしたよ' : 'ミッションをリセットしました'); });

  // Packing checklist
  const packingItems = {
    day1:['スマホ・モバイルバッテリー','飲み物','汗拭きタオル','虫よけ','薄手の羽織り・山上の冷え対策','墓参りに必要なもの'],
    day2:['水着','着替え','タオル','浮き輪','空気入れ','ライフジャケット','マリンシューズ','テント・日除け','レジャーシート','クーラーボックス','弁当','飲み物','氷・保冷剤','日焼け止め','帽子','ゴミ袋','濡れ物用袋','救急セット','スマホ防水ケース','現金・駐車料金用小銭']
  };
  const toddlerPackingItems = ['みずぎ','きがえ','たおる','うきわ','くうきを いれるもの','らいふじゃけっと','うみの くつ','ひよけ','しーと','つめたい はこ','おべんとう','のみもの','こおり','ひやけどめ','ぼうし','ごみぶくろ','ぬれたものの ふくろ','けがの くすり','すまほの ふくろ','おかね'];
  let packingDay = day1Complete ? 'day2' : 'day1'; let packingDone = storage.get('packing', {});let packingMeta=storage.get('packing-meta',{});
  function packingId(day, index) { return `${day}-${index}`; }
  function renderPacking() {
    const originalItems = packingItems[packingDay]; const items = isToddlerUser() && packingDay === 'day2' ? toddlerPackingItems : originalItems; document.getElementById('packingList').innerHTML = `<p class="packing-note">${isToddlerUser() ? 'くるまに のせたら ちぇっくしよう。' : packingDay === 'day2' ? '海グッズは購入済み。ここでは「持っているか」ではなく「車に積んだか」を確認。' : '山上は日没後に涼しくなる可能性あり。水分と羽織りを忘れずに。'}</p><section class="simple-check-group"><div class="simple-check-list">${items.map((name,index) => {const id=packingId(packingDay,index);const meta=updateMetaCopy(packingMeta[id]);return `<label class="simple-check-row ${packingDone[id] ? 'done' : ''}"><input type="checkbox" data-packing-id="${id}" ${packingDone[id] ? 'checked' : ''}><div><b>${escapeHTML(name)}</b>${meta?`<small>${isToddlerUser()?'やったひと':'更新'} ${escapeHTML(meta)}</small>`:''}</div><span class="row-badge">${isToddlerUser() ? 'あした' : packingDay.toUpperCase()}</span></label>`;}).join('')}</div></section>`;
    document.querySelectorAll('[data-packing-id]').forEach((input) => input.addEventListener('change', () => { packingDone[input.dataset.packingId] = input.checked;packingMeta[input.dataset.packingId]={actor:currentUser.id,updatedAt:new Date().toISOString()}; storage.set('packing', packingDone);storage.set('packing-meta',packingMeta); familySync?.savePacking(input.dataset.packingId,input.checked); renderPacking(); }));
    const activeDays = day1Complete ? ['day2'] : ['day1','day2']; const total = activeDays.flatMap((day) => packingItems[day]).length; const completed = activeDays.reduce((sum,day) => sum + packingItems[day].filter((_,index) => packingDone[packingId(day,index)]).length, 0); const dayComplete = items.filter((_,index) => packingDone[packingId(packingDay,index)]).length;
    document.getElementById('packingProgress').textContent = `${dayComplete} / ${items.length}`; document.getElementById('packingProgressBar').style.width = `${dayComplete / items.length * 100}%`;
    document.getElementById('morePackingProgress').textContent = isToddlerUser() ? `${completed} / ${total} できた` : `${completed} / ${total} 完了`;
  }
  document.querySelectorAll('[data-packing-day]').forEach((button) => button.addEventListener('click', () => { packingDay = button.dataset.packingDay; document.querySelectorAll('[data-packing-day]').forEach((item) => item.classList.toggle('active', item === button)); renderPacking(); }));
  if (day1Complete) { document.querySelector('[data-packing-day="day1"]')?.setAttribute('hidden', ''); const day2Button = document.querySelector('[data-packing-day="day2"]'); day2Button?.classList.add('active'); }

  // Bento preparation workflow
  const mealItems=[['rice','ごはんを用意する'],['cook','おかずを作る'],['cool','よく冷ます'],['pack','弁当箱に詰める'],['cold','飲み物・氷・保冷剤を用意'],['load','クーラーボックスを車へ積む']];
  let mealDone=storage.get('meal-progress',{});let mealMeta=storage.get('meal-meta',{});
  function renderMeal(){const completed=mealItems.filter(([id])=>mealDone[id]).length;document.getElementById('mealList').innerHTML=`<section class="simple-check-group"><div class="simple-check-list">${mealItems.map(([id,name])=>{const meta=updateMetaCopy(mealMeta[id]);return `<label class="simple-check-row ${mealDone[id]?'done':''}"><input type="checkbox" data-meal-id="${id}" ${mealDone[id]?'checked':''}><div><b>${escapeHTML(isToddlerUser()?({'rice':'ごはん','cook':'おかず','cool':'さます','pack':'おべんとうばこへ','cold':'のみものと こおり','load':'くるまに のせる'}[id]):name)}</b>${meta?`<small>${isToddlerUser()?'やったひと':'更新'} ${escapeHTML(meta)}</small>`:''}</div></label>`;}).join('')}</div></section>`;document.querySelectorAll('[data-meal-id]').forEach((input)=>input.addEventListener('change',()=>{mealDone[input.dataset.mealId]=input.checked;mealMeta[input.dataset.mealId]={actor:currentUser.id,updatedAt:new Date().toISOString()};storage.set('meal-progress',mealDone);storage.set('meal-meta',mealMeta);familySync?.saveMeal(input.dataset.mealId,input.checked);renderMeal();}));document.getElementById('mealProgress').textContent=`${completed} / ${mealItems.length}`;document.getElementById('mealProgressBar').style.width=`${completed/mealItems.length*100}%`;document.getElementById('moreMealProgress').textContent=`${completed} / ${mealItems.length}`;}

  // Budget and editable actual expenses
  const plannedBudget = [['アトラクション','4,000円'],['DAY1 食費・飲み物','2,000円'],['DAY2 弁当・飲み物・氷','3,000円'],['燃料','6,000円'],['高速・有料道路','6,000円'],['駐車・海水浴場設備','3,000円'],['予備費','1,000円']];
  document.getElementById('plannedBudgetList').innerHTML = plannedBudget.map(([name,amount]) => `<div class="planned-budget-row"><span>${name}</span><b>${amount}</b></div>`).join('');
  let expenses = storage.get('expenses', []);
  function updateChallenge(total) {
    const remaining = BUDGET - total; const percentage = Math.min(100, total / BUDGET * 100); const over = total > BUDGET;
    const money = (value) => isToddlerUser() ? `${Number(value || 0).toLocaleString('ja-JP')}えん` : yen(value);
    document.getElementById('actualTotal').textContent = money(total); document.getElementById('budgetRemaining').textContent = `${over ? '−' : ''}${money(Math.abs(remaining))}`;
    document.getElementById('challengeRemaining').textContent = isToddlerUser() ? (over ? `${money(total - BUDGET)} おおいよ` : `のこり ${money(remaining)}`) : over ? `${yen(total - BUDGET)} オーバー` : `残り ${yen(remaining)}`;
    document.getElementById('challengePercent').textContent = `${Math.round(total / BUDGET * 100)}%`; document.getElementById('challengeRing').style.setProperty('--progress', `${percentage}%`); document.getElementById('budgetTrack').style.width = `${percentage}%`;
    const status = isToddlerUser() ? 'おかねは おとなが みるよ。' : over ? `基準予算を ${yen(total - BUDGET)} 超過` : `実費 ${yen(total)} / 基準 ${yen(BUDGET)}`;
    document.getElementById('budgetStatusText').textContent = status; document.getElementById('challengeMessage').textContent = status;
  }
  function resetExpenseForm() {
    document.getElementById('expenseForm').reset(); document.getElementById('expenseId').value = ''; document.getElementById('expenseFormKicker').textContent = 'ADD EXPENSE'; document.getElementById('expenseFormTitle').textContent = '実費を追加'; document.getElementById('expenseSubmit').textContent = '追加する'; document.getElementById('expenseCancel').hidden = true;
  }
  function editExpense(id) {
    const item = expenses.find((expense) => expense.id === id); if (!item) return;
    document.getElementById('expenseId').value = item.id; document.getElementById('expenseName').value = item.name; document.getElementById('expenseAmount').value = item.amount; document.getElementById('expenseCategory').value = item.category;
    document.getElementById('expenseFormKicker').textContent = 'EDIT EXPENSE'; document.getElementById('expenseFormTitle').textContent = '実費を編集'; document.getElementById('expenseSubmit').textContent = '変更を保存'; document.getElementById('expenseCancel').hidden = false; document.getElementById('expenseForm').scrollIntoView({behavior:'smooth', block:'start'});
  }
  function renderExpenses() {
    const root = document.getElementById('expenseList');
    root.innerHTML = expenses.length ? expenses.map((item) => `<div class="expense-row"><div><b>${escapeHTML(item.name)}</b><small>${escapeHTML(item.category)}</small></div><strong>${yen(item.amount)}</strong><div class="row-actions"><button type="button" data-expense-edit="${item.id}">編集</button><button type="button" class="danger" data-expense-delete="${item.id}">削除</button></div></div>`).join('') : '<div class="expense-empty">まだ実費はありません。使ったらその場で追加できます。</div>';
    root.querySelectorAll('[data-expense-edit]').forEach((button) => button.addEventListener('click', () => editExpense(button.dataset.expenseEdit)));
    root.querySelectorAll('[data-expense-delete]').forEach((button) => button.addEventListener('click', () => { const item=expenses.find((entry)=>entry.id===button.dataset.expenseDelete);if(!item||!window.confirm(`「${item.name}」${yen(item.amount)}を削除しますか？`))return; expenses = expenses.filter((entry) => entry.id !== button.dataset.expenseDelete); storage.set('expenses', expenses); familySync?.saveExpense(item,true); renderExpenses(); resetExpenseForm(); toast('実費を削除しました'); }));
    updateChallenge(expenses.reduce((sum,item) => sum + Number(item.amount), 0));
  }
  document.getElementById('expenseForm').addEventListener('submit', (event) => {
    event.preventDefault(); const id = document.getElementById('expenseId').value; const item = {id:id || crypto.randomUUID?.() || `expense-${Date.now()}`,name:document.getElementById('expenseName').value.trim(),amount:Number(document.getElementById('expenseAmount').value),category:document.getElementById('expenseCategory').value};
    if (!item.name || !Number.isFinite(item.amount) || item.amount < 0) return;
    if (id) expenses = expenses.map((expense) => expense.id === id ? item : expense); else expenses.push(item);
    storage.set('expenses', expenses); familySync?.saveExpense(item,false); renderExpenses(); resetExpenseForm(); toast(id ? '実費を更新しました' : '実費を追加しました');
  });
  document.getElementById('expenseCancel').addEventListener('click', resetExpenseForm);

  // Preschool-wide copy: short, hiragana-first, and focused only on the remaining day.
  function applyToddlerStaticCopy() {
    if (!isToddlerUser()) return;
    const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
    const setHTML = (selector, value) => { const element = document.querySelector(selector); if (element) element.innerHTML = value; };
    const setTexts = (selector, values) => document.querySelectorAll(selector).forEach((element,index) => { if (values[index] !== undefined) element.textContent = values[index]; });

    setText('.wordmark','せきけの なつやすみ'); setText('.trip-date','8がつ15にち・16にち');
    setText('.hero-copy .kicker','らすと さまー'); setHTML('.hero-copy h1','なつを、<br>たのしもう。'); setHTML('.hero-lead','あしたは、<br>うみへ いこう。');
    setText('.hero-plan span','7にんで くるま'); setText('.hero-plan strong','おうち → わかさわだの うみ');
    setTexts('.next-action-links > *',['よていを みる →','ちず ↗']);
    setText('.challenge-copy p','25,000えん ちゃれんじ'); setText('.challenge-card > button','おかねを みる →');
    setText('.editorial-head .kicker','あしたの おたのしみ'); setText('.editorial-head h2','うみへ いこう。');
    setText('[data-stage-day="day2"] .feature-index','ふつかめ'); setText('[data-stage-day="day2"] .feature-copy b','わかさわだの うみ'); setText('[data-stage-day="day2"] .feature-copy small','つかれたら やすもう。');
    setText('.last-guide-story .kicker','いくところ'); setHTML('.last-guide-story h2','うみのことを<br>みてみよう。'); setText('.last-guide-story button','うみの しょうかい →'); setText('.home-motto','8がつ15にち・16にち。7にん。');
    document.querySelectorAll('#home img').forEach((image) => { image.alt = 'わかさわだの うみ'; });

    setText('#plan .screen-hero .kicker','あした'); setText('#plan .screen-hero h1','あしたの よてい'); setText('#plan .screen-hero p:last-child','つかれたら やすもう。');
    const day2 = document.querySelector('[data-trip-day="2"]'); if (day2) {
      setText('[data-trip-day="2"] .day-heading > span','ふつかめ'); setText('[data-trip-day="2"] .day-heading h2','うみで あそぼう'); setText('[data-trip-day="2"] .day-heading p','8がつ16にち');
      const routeCopy = [
        ['あさ','おうちを でる','おべんとうと のみものを のせよう。','🚗 くるまで 2じかんくらい'],
        ['うみ','わかさわだの うみに つく','おとなと いっしょに じゅんびしてから あそぼう。',''],
        ['おひる','おべんとう','かげで やすんで、おみずを のもう。',''],
        ['あそぶ','つかれたら やすむ','3じごろまで。さむい、つかれた、と おもったら おとなに いう。','あんぜんが いちばん'],
        ['かえる','おうちへ かえる','わすれものと ごみを みて、まっすぐ かえろう。','🚗 くるまで 2じかんくらい']
      ];
      day2.querySelectorAll('.route-item').forEach((item,index) => { const copy = routeCopy[index]; if (!copy) return; item.querySelector('.route-type').textContent = copy[0]; item.querySelector('h3').textContent = copy[1]; item.querySelector('h3 + p').textContent = copy[2]; const address = item.querySelector('address'); if (address) address.hidden = true; const meta = item.querySelector('.route-meta span'); if (meta && copy[3]) meta.textContent = copy[3]; });
      const returnTime = day2.querySelector('.route-item:nth-child(5) time'); if (returnTime) returnTime.textContent = 'ひるすぎ';
      setTexts('[data-trip-day="2"] .route-actions > *',['ちず ↗','うみの しょうかい →','もっている どうぐを つかう']);
    }
    setText('.safety-callout strong','つかれたら おしまい'); setText('.safety-callout p','3じまで あそばなくても だいじょうぶ。さむい、つかれた、こわい、と おもったら すぐ おとなに いおう。');

    setText('#shopping .screen-hero .kicker','かいもの'); setText('#shopping .screen-hero h1','かいもの'); setText('#shopping .screen-hero p:last-child','あした もっていくもの。'); setText('#shopping .progress-panel .kicker','できた かず');
    setText('#shoot .screen-hero .kicker','おてつだい'); setHTML('#shoot .screen-hero h1','うみで<br>やってみよう。'); setText('#shoot .screen-hero p:last-child','しゃしんは おとなに おまかせ。'); setText('#shoot .progress-panel .kicker','できた かず'); setTexts('.shoot-filter-bar button',['すべて','じぶん','だいじ','まだ']); document.querySelector('.shoot-filter-bar')?.setAttribute('aria-label','えらぶ');

    setText('#guide .screen-hero .kicker','いくところ'); setText('#guide .screen-hero h1','うみの しょうかい'); setText('#guide .screen-hero p:last-child','あした いく うみだよ。'); setText('#guideBack','← おうちへ');
    const guideFilter = document.querySelector('.guide-filter'); if (guideFilter) guideFilter.hidden = true;
    const wada = document.getElementById('destination-wada'); if (wada) { wada.querySelector('img').alt = 'わかさわだの うみ'; wada.querySelector('small').textContent = 'あしたの うみ'; wada.querySelector('h2').textContent = 'わかさわだの うみ'; wada.querySelector('.destination-copy > p').textContent = 'すなが しろくて、あさい うみだよ。おとなの そばで あそぼう。つかれたら すぐ やすもう。'; setTexts('#destination-wada .destination-facts span',['おとなの そば','おみずを のむ','つかれたら やすむ']); setTexts('#destination-wada .destination-actions a',['くわしく みる ↗','ちず ↗']); }
    setText('#guide .source-note','うみの ようすは、おとなに みてもらおう。');

    setText('#more .screen-hero .kicker','どうぐ'); setText('#more .screen-hero h1','どうぐ'); setText('#more .screen-hero p:last-child','かいものと もちもの。');
    setTexts('#moreTop .more-menu button > span',['👤','🛒','💰','✓','🍱','↻']); setTexts('#moreTop .more-menu b',['つかう ひと','かいもの','おかね','もちもの','おべんとう','みんなと つなぐ']); setText('#moreTop [data-subview="budgetView"] small','つかった おかねを みる');
    setText('#budgetView [data-back]','← どうぐへ'); setText('#budgetView .budget-summary .kicker','25,000えん ちゃれんじ'); setText('#budgetView .budget-total span','ぜんぶの おかね'); setText('#budgetView .budget-total strong','25,000えん'); setTexts('#budgetView .budget-actual span',['つかった おかね','のこり']);
    setText('#packingView [data-back]','← どうぐへ'); setText('#packingView .progress-panel .kicker','できた かず'); setText('[data-packing-day="day2"]','あした');
    setText('#mealView [data-back]','← どうぐへ');setText('#mealView .progress-panel .kicker','おべんとう');setText('#mealView .packing-note','さましてから つめよう。さいごに くるまへ。');
    setText('#syncView [data-back]','← どうぐへ');setText('#syncView .sync-center-card .kicker','みんなと つなぐ');setText('#syncView .sync-center-card h2','みんなと つなぐ');setText('#syncNow','あたらしくする・おくる');setText('#syncView .sync-center-card>p:last-child','じぶんで ぼたんを おした ときに、おくるよ。');
    ['⌂|おうち','☷|よてい','◉|おてつだい','★|あそび','•••|どうぐ'].forEach((copy,index) => { const [icon,label] = copy.split('|'); const button = document.querySelectorAll('.bottom-nav .nav-btn')[index]; if (button) button.innerHTML = `<span>${icon}</span>${label}`; }); document.querySelector('.bottom-nav')?.setAttribute('aria-label','したの ぼたん'); document.getElementById('missionCategories')?.setAttribute('aria-label','えらぶ'); setHTML('#backToTop','<span>↑</span>うえ'); document.getElementById('backToTop')?.setAttribute('aria-label','うえへ');
    setText('#userLoginModal .kicker','つかう ひと'); setTexts('[data-login-user] b',['おうちの ひと','ゆうすけ','あやな','けいすけ','あんな','はるな']); setTexts('[data-login-user] small',['おかねと しゃしん','ちゅうがくせい','しょうがくせい','しょうがくせい','ようちえん','おとなと いっしょ']);
    setText('#familySyncKicker','みんなと つなぐ'); setText('#familySyncTitle','みんなの すまほと つなぐ'); setText('#familySyncDescription','できたことは おうちの ひとへ。しゃしんの おねがいも おうちの ひとだけに とどくよ。'); setText('#familySyncCodeLabel','かぞくの こーど'); setText('#familySyncSubmit','つなぐ'); setText('#familySyncLater','あとで');
  }

  function applyRoleVisibility() {
    const admin = isAdminUser(); const shooting = canUseShooting();
    const adminOnly = [
      document.querySelector('.challenge-card'),
      document.querySelector('#moreTop [data-subview="budgetView"]'),
      document.getElementById('budgetView')
    ];
    adminOnly.forEach((element) => { if (element) element.hidden = !admin; });
    const shoppingForm=document.getElementById('addShoppingForm');if(shoppingForm)shoppingForm.hidden=!admin;
    const exportCard=document.getElementById('exportCard');if(exportCard)exportCard.hidden=!admin;
    const shootNav = document.querySelector('.bottom-nav [data-screen="shoot"]');
    const missionNav = document.querySelector('.bottom-nav [data-screen="mission"]');
    if (shootNav) { shootNav.hidden = !shooting; if (admin) shootNav.innerHTML = '<span>◉</span>撮影依頼'; }
    if (missionNav) { missionNav.hidden = false; if (admin) missionNav.innerHTML = '<span>★</span>進捗'; }
    document.getElementById('captureQueue').hidden = !admin;
    ['#shoot .progress-panel','#shoot .composition-guide','#shoot .shoot-legend','#shoot .shoot-filter-bar','#shotList'].forEach((selector) => { const element = document.querySelector(selector); if (element) element.hidden = !shooting; });
    const shootTitle = document.querySelector('#shoot .screen-hero h1'); const shootDescription = document.querySelector('#shoot .screen-hero p:last-child');
    if (admin && shootTitle) shootTitle.innerHTML = '子どもの依頼を<br>撮り逃さない。';
    if (admin && shootDescription) shootDescription.textContent = '撮影依頼を確認しながら、家族の撮影進捗も管理。';
    const bottomNav = document.querySelector('.bottom-nav'); const visibleNavCount = [...document.querySelectorAll('.bottom-nav .nav-btn')].filter((button) => !button.hidden).length;
    if (bottomNav) bottomNav.style.gridTemplateColumns = `repeat(${visibleNavCount},1fr)`;
    const moreDescription = document.querySelector('#more .screen-hero p:last-child');
    if (moreDescription) moreDescription.textContent = admin ? '買い出し、予算、実費、持ち物を一か所に。' : isToddlerUser() ? 'かいものと もちもの。' : '買い出しと持ち物を一か所に。';
  }

  // Login-time user selection. The chosen user controls language and mission state.
  const userLoginModal = document.getElementById('userLoginModal');
  function openUserLogin(required = false) { userLoginModal.dataset.required = String(required); userLoginModal.classList.add('open'); userLoginModal.setAttribute('aria-hidden','false'); }
  document.getElementById('changeUser').addEventListener('click', () => openUserLogin(false));
  document.querySelectorAll('[data-login-user]').forEach((button) => button.addEventListener('click', () => { storage.set('current-user', button.dataset.loginUser); window.location.reload(); }));
  document.getElementById('currentUserLabel').textContent = currentUser.label;
  document.getElementById('adminPinField').hidden=!isAdminUser(); document.getElementById('familyAdminPin').required=isAdminUser();
  applyToddlerStaticCopy();
  applyRoleVisibility();

  // Family sync: anonymous device auth, one-time family code, realtime capture updates.
  const familySyncModal = document.getElementById('familySyncModal');
  const familySyncForm = document.getElementById('familySyncForm');
  const familySyncError = document.getElementById('familySyncError');
  function seedLocalProgress() {
    const seedKey=`progress-sync-seeded-v18-${currentUser.id}`; if (!familySync?.joined || storage.get(seedKey, false)) return;
    if(currentUser.mission)Object.entries(profileState(currentUser.mission)).filter(([,done])=>done).forEach(([missionId])=>syncMissionProgress(currentUser.mission,missionId,missionStatus?.[currentUser.mission]?.[missionId]||'pending'));
    if(isAdminUser())Object.entries(missionDone).forEach(([profile,state])=>Object.entries(state).filter(([,done])=>done).forEach(([missionId])=>syncMissionProgress(profile,missionId,'approved')));
    if(canUseShooting())Object.entries(shotDone).filter(([,done])=>done).forEach(([shotId])=>syncShotProgress(shotId,shotStatus[shotId]||'done'));
    shoppingItems.forEach((item)=>familySync.saveShopping(item,Boolean(shoppingDone[item.id]),false,item.assignedProfile));Object.entries(packingDone).forEach(([id,done])=>familySync.savePacking(id,done));Object.entries(mealDone).forEach(([id,done])=>familySync.saveMeal(id,done));
    if(isAdminUser()){expenses.forEach((item)=>familySync.saveExpense(item,false));if(tripRuntime)familySync.saveRuntime(tripRuntime.currentStepIndex,tripRuntime.delayMinutes);}
    storage.set(seedKey, true);
  }
  function openFamilySync() { familySyncModal.classList.add('open'); familySyncModal.setAttribute('aria-hidden','false'); setTimeout(() => document.getElementById('familySyncCode').focus(), 50); }
  function closeFamilySync() { familySyncModal.classList.remove('open'); familySyncModal.setAttribute('aria-hidden','true'); }
  document.getElementById('familySyncState')?.addEventListener('click', async () => {
    if (!familySync?.joined) { openFamilySync(); return; }
    try{await familySync.flush();await familySync.refresh(false);toast(familySync.pending.length?(isToddlerUser()?'まだ おくれてないものが あるよ':'送信保留が残っています'):(isToddlerUser()?'あたらしく なったよ！':'最新データを受信・送信しました'));}catch{toast(isToddlerUser()?'あとで もういちど':'同期できませんでした。後でもう一度お試しください');}
  });
  document.getElementById('syncNow')?.addEventListener('click',async()=>{if(!familySync?.joined){openFamilySync();return;}try{await familySync.flush();await familySync.refresh(false);toast(familySync.pending.length?(isToddlerUser()?'まだ おくれてないものが あるよ':'送信保留が残っています'):(isToddlerUser()?'あたらしく なったよ！':'最新データを受信・送信しました'));}catch{toast(isToddlerUser()?'あとで もういちど':'同期できませんでした。後でもう一度お試しください');}});
  function downloadText(filename,content,type='text/plain'){const blob=new Blob([content],{type:`${type};charset=utf-8`});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  document.getElementById('exportTripSummary')?.addEventListener('click',()=>{if(!isAdminUser())return;const total=expenses.reduce((sum,item)=>sum+Number(item.amount),0);const lines=['関家 ラストサマー2026 旅行記録',`出力：${new Date().toLocaleString('ja-JP')}`,'',`実費合計：${yen(total)} / 予算 ${yen(BUDGET)}`,'','ミッション'];appUsers.filter((user)=>user.mission).forEach((user)=>{const stats=missionStats(user.mission);lines.push(`${user.label}：確定 ${stats.confirmedXp} XP・確認待ち ${stats.pendingXp} XP・${stats.approved.length}達成`);});lines.push('','撮影',`完了：${shotItems.filter((item)=>shotDone[item.id]).length} / ${shotItems.length}`,'','買い出し',...shoppingItems.map((item)=>`${shoppingDone[item.id]?'✓':'□'} ${item.name}${item.qty?`（${item.qty}）`:''}`),'','持ち物',...Object.entries(packingItems).flatMap(([day,items])=>items.map((name,index)=>`${packingDone[packingId(day,index)]?'✓':'□'} ${day.toUpperCase()} ${name}`)),'','弁当準備',...mealItems.map(([id,name])=>`${mealDone[id]?'✓':'□'} ${name}`));downloadText(`family-last-summer-2026-${new Date().toISOString().slice(0,10)}.txt`,lines.join('\n'));toast('読みやすい旅行記録を保存しました');});
  document.getElementById('exportTripRecord')?.addEventListener('click',()=>{if(!isAdminUser())return;const record={exportedAt:new Date().toISOString(),trip:'関家 ラストサマー2026',runtime:tripRuntime,expenses,missions:missionDone,missionStatus,missionActivity,shots:{done:shotDone,status:shotStatus,assignees:shotAssignees,meta:shotMeta},shopping:{items:shoppingItems,completed:shoppingDone,meta:shoppingMeta},packing:{completed:packingDone,meta:packingMeta},bento:{completed:mealDone,meta:mealMeta}};downloadText(`family-last-summer-2026-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(record,null,2),'application/json');toast('全データをJSONで保存しました');});
  document.getElementById('familySyncLater').addEventListener('click', closeFamilySync);
  familySyncForm.addEventListener('submit', async (event) => {
    event.preventDefault(); familySyncError.hidden = true;
    const submit = document.getElementById('familySyncSubmit'); submit.disabled = true; submit.textContent = isToddlerUser() ? 'つないでる…' : '接続中…';
    try {
      await familySync.join(document.getElementById('familySyncCode').value,document.getElementById('familyAdminPin').value);
      closeFamilySync(); setFamilySyncStatus('online'); renderMissions();
      for (const [key,request] of Object.entries(captureRequests)) syncCaptureRequest(key,request,'requested');
      seedLocalProgress();
      toast(isToddlerUser() ? 'みんなと つながったよ！' : '家族の端末と同期しました');
    } catch (error) {
      familySyncError.textContent = isToddlerUser() ? 'こーどが ちがうみたい。おうちの ひとに きいてね。' : isAdminUser() ? '家族コードまたは管理者PINを確認してください。' : '家族コードを確認してください。'; familySyncError.hidden = false;
    } finally {
      submit.disabled = false; submit.textContent = isToddlerUser() ? 'つなぐ' : 'つなぐ';
    }
  });

  async function setupFamilySync() {
    if (!window.LastSummerSync?.configured || !appUsers.some((user) => user.id === selectedUserId)) { setFamilySyncStatus('local'); return; }
    familySync = window.LastSummerSync.create({profileId:currentUser.id,onCaptureRow:applyRemoteCapture,onMissionRow:applyRemoteMission,onShotRow:applyRemoteShot,onExpenseRow:applyRemoteExpense,onRuntimeRow:applyRemoteRuntime,onShoppingRow:applyRemoteShopping,onPackingRow:applyRemotePacking,onMealRow:applyRemoteMeal,onStatus:setFamilySyncStatus});
    const result = await familySync.init();
    if (result.joined) {
      setFamilySyncStatus('online'); renderMissions();
      for (const [key,request] of Object.entries(captureRequests)) if (!request.cloud) syncCaptureRequest(key,request,'requested');
      seedLocalProgress();
    } else if (!result.error) openFamilySync();
  }

  // PWA / connectivity status
  const connectivity = document.getElementById('connectivityStatus');
  function updateConnectivity() { const online = navigator.onLine; connectivity.classList.toggle('offline', !online); connectivity.querySelector('span').textContent = isToddlerUser() ? (online ? 'じゅんび できてるよ' : 'でんぱが なくても つかえるよ') : online ? 'オンライン · オフライン用データを準備済み' : 'オフライン · 保存済みデータで利用中'; }
  window.addEventListener('online', updateConnectivity); window.addEventListener('offline', updateConnectivity); updateConnectivity();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js', {scope:'./'}).then(() => connectivity.classList.add('ready')).catch(() => connectivity.querySelector('span').textContent = isToddlerUser() ? 'じゅんびが できなかったよ' : 'オフライン準備に失敗しました');

  renderShopping(); renderShots(); renderMissions(); renderPacking(); renderMeal(); renderExpenses();
  if (!appUsers.some((user) => user.id === selectedUserId)) openUserLogin(true);
  else setupFamilySync();
});
