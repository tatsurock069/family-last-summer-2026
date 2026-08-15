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

  let toastTimer;
  function toast(message) {
    const el = document.getElementById('toast');
    clearTimeout(toastTimer); el.textContent = message; el.classList.add('show');
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // Screen navigation and subviews
  const screens = [...document.querySelectorAll('.screen')];
  const navButtons = [...document.querySelectorAll('.nav-btn')];
  const scrollPositions = new Map();
  function activeScreen() { return document.querySelector('.screen.active')?.id || 'home'; }
  function showSubview(id) {
    document.querySelectorAll('#more .subview').forEach((view) => {
      const active = view.id === id; view.classList.toggle('active', active); view.setAttribute('aria-hidden', String(!active));
    });
    window.scrollTo(0, 0);
  }
  function showScreen(id, subview) {
    if (!document.getElementById(id)) return;
    const previous = activeScreen();
    if (previous === id && !subview) { window.scrollTo({top:0, behavior:'smooth'}); return; }
    scrollPositions.set(previous, window.scrollY);
    screens.forEach((screen) => { const active = screen.id === id; screen.classList.toggle('active', active); screen.setAttribute('aria-hidden', String(!active)); });
    navButtons.forEach((button) => { const active = button.dataset.screen === id; button.classList.toggle('active', active); button.setAttribute('aria-current', active ? 'page' : 'false'); });
    if (id === 'more') showSubview(subview || 'moreTop');
    else requestAnimationFrame(() => window.scrollTo(0, scrollPositions.get(id) || 0));
  }
  navButtons.forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.screen)));
  document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.go, button.dataset.subview)));
  document.querySelectorAll('[data-subview]:not([data-go])').forEach((button) => button.addEventListener('click', () => showSubview(button.dataset.subview)));
  document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showSubview('moreTop')));

  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 560), {passive:true});
  backToTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

  // Itinerary folding and automatic day selection
  function setDay(section, open) {
    const button = section.querySelector('.day-inline-toggle'); const panel = section.querySelector('.day-content');
    button.setAttribute('aria-expanded', String(open)); button.querySelector('i').textContent = open ? '⌃' : '⌄';
    button.setAttribute('aria-label', `${section.dataset.tripDay}日目を${open ? '閉じる' : '開く'}`);
    panel.hidden = !open; section.classList.toggle('open', open);
  }
  document.querySelectorAll('.trip-day-section').forEach((section) => {
    section.querySelector('.day-inline-toggle').addEventListener('click', () => setDay(section, section.querySelector('.day-content').hidden));
  });
  const todayTokyo = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  if (todayTokyo === '2026-08-16') document.querySelectorAll('.trip-day-section').forEach((section) => setDay(section, section.dataset.tripDay === '2'));

  // Home next action
  const schedule = [
    ['2026-08-15T14:00:00+09:00','8/15 14:00','湊町を出発','忘れ物を確認して、まずはお墓参りへ。','四天王寺前夕陽ヶ丘駅'],
    ['2026-08-15T14:20:00+09:00','8/15 14:20','お墓参り','静かに手を合わせ、終わったら生駒山上へ。','四天王寺前夕陽ヶ丘駅'],
    ['2026-08-15T15:30:00+09:00','8/15 15:30','生駒山上遊園地','本当に乗りたいものを選び、夜景まで楽しむ。','生駒山上遊園地'],
    ['2026-08-15T20:30:00+09:00','8/15 夜','帰宅して冷凍うどん','外食せず手早く食べ、海の荷物を最終確認。','大阪市浪速区湊町'],
    ['2026-08-16T06:30:00+09:00','8/16 06:30','若狭へ出発','弁当・飲み物・氷・海グッズを積み込む。','若狭和田ビーチ'],
    ['2026-08-16T08:30:00+09:00','8/16 08:30','若狭和田ビーチ到着','日除けと荷物基地を作って、海へ。','若狭和田ビーチ'],
    ['2026-08-16T12:00:00+09:00','8/16 12:00','弁当で昼休憩','日陰で水分・塩分を補給して休む。','若狭和田ビーチ'],
    ['2026-08-16T15:00:00+09:00','8/16 〜15:00','体力を見て海を終了','着替え、忘れ物、ゴミを確認して大阪へ直帰。','大阪市浪速区湊町'],
    ['2026-08-16T18:30:00+09:00','8/16 夕方','湊町へ帰宅','ラストサマー完走。撮った写真をみんなで見よう。','大阪市浪速区湊町']
  ];
  function updateNextAction() {
    const now = new Date(); let next = schedule.find((item) => new Date(item[0]) > now);
    if (!next) {
      document.getElementById('nextStatus').textContent = 'COMPLETE'; document.getElementById('nextCountdown').textContent = '完走';
      document.getElementById('nextTime').textContent = 'AUG 15—16'; document.getElementById('nextTitle').textContent = 'ラストサマー、完走。';
      document.getElementById('nextDescription').textContent = '家族7人の夏の記録をゆっくり振り返ろう。'; document.getElementById('nextMap').hidden = true; return;
    }
    const diff = new Date(next[0]) - now; const hours = Math.floor(diff / 3600000); const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));
    document.getElementById('nextStatus').textContent = 'NEXT ACTION';
    document.getElementById('nextCountdown').textContent = diff < 86400000 ? (hours ? `あと${hours}時間${mins}分` : `あと${mins}分`) : `${Math.ceil(diff / 86400000)}日後`;
    document.getElementById('nextTime').textContent = next[1]; document.getElementById('nextTitle').textContent = next[2]; document.getElementById('nextDescription').textContent = next[3];
    const map = document.getElementById('nextMap'); map.hidden = false; map.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(next[4])}`;
  }
  updateNextAction(); setInterval(updateNextAction, 60000);

  // Shopping checklist
  const shoppingDefaults = [
    ['udon','day1','冷凍うどん','7人分'],['udon-topping','day1','うどん用具材','ねぎ・卵・天かす等'],['day1-drink','day1','DAY1の飲み物','必要な場合のみ'],
    ['rice','bento','弁当用のごはん','7人分'],['bento-main','bento','弁当のおかず','傷みにくいもの'],['bento-side','bento','塩分補給できる副菜','梅・塩気を意識'],['fruit','bento','果物・デザート','保冷できる分だけ'],
    ['water','drink','水・お茶','多め'],['sports','drink','スポーツドリンク','熱中症対策'],['ice','drink','氷・保冷剤','クーラーボックス用'],
    ['snacks','snack','お菓子','車内・海休憩用'],['salt','snack','塩分タブレット','予備'],['bags','snack','ゴミ袋','濡れ物にも使う']
  ].map(([id,category,name,qty]) => ({id,category,name,qty,custom:false}));
  const shoppingLabels = {day1:'DAY1 · 帰宅後ごはん',bento:'DAY2 · 弁当',drink:'飲み物・冷却',snack:'お菓子・その他'};
  let shoppingItems = storage.get('shopping-items', shoppingDefaults);
  let shoppingDone = storage.get('shopping-done', {});
  function renderShopping() {
    const root = document.getElementById('shoppingList'); root.innerHTML = '';
    Object.entries(shoppingLabels).forEach(([key,label]) => {
      const items = shoppingItems.filter((item) => item.category === key); if (!items.length) return;
      const section = document.createElement('section'); section.className = 'simple-check-group';
      section.innerHTML = `<h2>${escapeHTML(label)}</h2><div class="simple-check-list">${items.map((item) => `<div class="simple-check-row ${shoppingDone[item.id] ? 'done' : ''}"><input type="checkbox" data-shopping-check="${escapeHTML(item.id)}" ${shoppingDone[item.id] ? 'checked' : ''} aria-label="${escapeHTML(item.name)}"><div><b>${escapeHTML(item.name)}</b><small>${escapeHTML(item.qty || '数量未設定')}</small></div><div class="row-actions">${item.custom ? `<button type="button" class="danger" data-shopping-delete="${escapeHTML(item.id)}">削除</button>` : ''}</div></div>`).join('')}</div>`;
      root.appendChild(section);
    });
    root.querySelectorAll('[data-shopping-check]').forEach((input) => input.addEventListener('change', () => { shoppingDone[input.dataset.shoppingCheck] = input.checked; storage.set('shopping-done', shoppingDone); renderShopping(); }));
    root.querySelectorAll('[data-shopping-delete]').forEach((button) => button.addEventListener('click', () => { shoppingItems = shoppingItems.filter((item) => item.id !== button.dataset.shoppingDelete); delete shoppingDone[button.dataset.shoppingDelete]; storage.set('shopping-items', shoppingItems); storage.set('shopping-done', shoppingDone); renderShopping(); toast('項目を削除しました'); }));
    const completed = shoppingItems.filter((item) => shoppingDone[item.id]).length; const total = shoppingItems.length; const percentage = total ? completed / total * 100 : 0;
    document.getElementById('shoppingProgressLabel').textContent = `${completed} / ${total}`; document.getElementById('shoppingProgressBar').style.width = `${percentage}%`; document.getElementById('homeShoppingProgress').textContent = `${completed} / ${total}`;
  }
  document.getElementById('addShoppingForm').addEventListener('submit', (event) => {
    event.preventDefault(); const name = document.getElementById('shoppingName').value.trim(); if (!name) return;
    shoppingItems.push({id:`custom-${Date.now()}`,category:document.getElementById('shoppingCategory').value,name,qty:document.getElementById('shoppingQty').value.trim(),custom:true});
    storage.set('shopping-items', shoppingItems); event.target.reset(); renderShopping(); toast('買い出し項目を追加しました');
  });

  // Shooting checklist
  const shotItems = [
    ['car-day1','day1','墓参りへ向かう車内','横動画 · 会話を自然に',true],['memorial','day1','墓参りの前後','場所と周囲に配慮して撮影',false],['ikoma-arrival','day1','生駒山上到着','看板＋家族',true],['mountain-view','day1','山上からの景色','ゆっくり横振り',true],['sunset','day1','夕暮れの変化','同じ構図で2カット',true],['ride','day1','アトラクション','乗る前後のリアクション',true],['night-view','day1','夜景と家族','顔と光の両方を残す',true],['udon','day1','帰宅後の冷凍うどん','締めの短い1カット',false],
    ['early-start','day2','朝の出発','時計・荷物・眠い顔',true],['sea-first-look','day2','海が見えた瞬間','車内のリアクション',true],['wada-arrival','day2','若狭和田到着','地名が分かるカット',true],['run-to-sea','day2','海へ走る子ども','後ろ姿を横動画で',true],['water','day2','水中・波打ち際','低い目線で安全に',true],['bento','day2','みんなで弁当','真上＋食べる表情',false],['sand-art','day2','砂浜の作品','作者と一緒に',false],['family-photo','day2','海で家族写真','今回のベストショット',true],['tired-car','day2','帰りの疲れた車内','起こさず静かに',false],['ending','day2','帰宅のひと言','夏の締めコメント',true]
  ].map(([id,day,name,note,must]) => ({id,day,name,note,must}));
  let shotDone = storage.get('shots', {}); let shotFilter = 'all';
  function renderShots() {
    const root = document.getElementById('shotList'); root.innerHTML = '';
    [['day1','DAY 1 · 墓参りとナイター'],['day2','DAY 2 · 若狭和田ビーチ']].forEach(([day,label]) => {
      const items = shotItems.filter((item) => item.day === day && (shotFilter === 'all' || (shotFilter === 'must' && item.must) || (shotFilter === 'open' && !shotDone[item.id]))); if (!items.length) return;
      const section = document.createElement('section'); section.className = 'simple-check-group';
      section.innerHTML = `<h2>${label}</h2><div class="simple-check-list">${items.map((item) => `<label class="simple-check-row ${shotDone[item.id] ? 'done' : ''}"><input type="checkbox" data-shot-id="${item.id}" ${shotDone[item.id] ? 'checked' : ''}><div><b>${escapeHTML(item.name)}</b><small>${escapeHTML(item.note)}</small></div>${item.must ? '<span class="row-badge">MUST</span>' : '<span class="row-badge">BONUS</span>'}</label>`).join('')}</div>`; root.appendChild(section);
    });
    root.querySelectorAll('[data-shot-id]').forEach((input) => input.addEventListener('change', () => { shotDone[input.dataset.shotId] = input.checked; storage.set('shots', shotDone); renderShots(); }));
    const completed = shotItems.filter((item) => shotDone[item.id]).length; const total = shotItems.length;
    document.getElementById('shootProgress').textContent = `${completed} / ${total}`; document.getElementById('shootProgressBar').style.width = `${completed / total * 100}%`; document.getElementById('homeShotProgress').textContent = `${completed} / ${total}`;
  }
  document.querySelectorAll('[data-shot-filter]').forEach((button) => button.addEventListener('click', () => { shotFilter = button.dataset.shotFilter; document.querySelectorAll('[data-shot-filter]').forEach((item) => item.classList.toggle('active', item === button)); renderShots(); }));

  // Child missions: six meaningful missions per child, adjusted by age
  const missionProfiles = {
    '優典':[['respect','🙏','お墓で静かに手を合わせる','家族のお手本になる'],['choice','🎡','乗りたいものを自分で決める','予算も考えて選ぶ'],['support','🤝','年下を1回サポートする','声かけや荷物の手伝い'],['night','🌃','最高の夜景ポイントを見つける','家族にも教える'],['sea','🌊','海の安全係を1回する','体調や波を気にかける'],['photo','📸','家族のベスト写真を撮る','全員が入る構図にする']],
    '綾菜':[['respect','🙏','お墓で静かに手を合わせる','気持ちを整える'],['choice','🎠','一番乗りたいものを決める','理由も家族に話す'],['sunset','🌇','夕暮れの色を3つ見つける','写真にも残す'],['laugh','😄','家族の誰かを笑わせる','自然なリアクションを狙う'],['shell','🐚','一番きれいな貝殻を見つける','持ち帰りルールは現地優先'],['photo','📸','海のベストショットを撮る','低い目線にも挑戦']],
    '慶典':[['respect','🙏','お墓で静かに手を合わせる','最後まで落ち着いて'],['choice','🎢','乗りたいものを自分で決める','一つを本気で選ぶ'],['night','🔭','夜景で光る場所を3つ見つける','家族に説明する'],['first','🌊','元気よく海へ向かう','走るのは安全な場所だけ'],['art','🏖️','砂浜で作品を作る','名前もつける'],['help','🧊','片付けを1回手伝う','自分から声をかける']],
    '杏菜':[['respect','🙏','おはかで しずかに てをあわせる','おとなといっしょに'],['choice','🎡','のりたいものを ひとつえらぶ','じぶんで きめよう'],['night','✨','きれいな ひかりを みつける','みんなに おしえる'],['sea','🌊','うみに はいるとき えがおになる','あんぜんに ゆっくり'],['shell','🐚','すきな かいがらを みつける','みせて おしえる'],['art','🏖️','すなで なにかを つくる','おとなといっしょでもOK']],
    '波瑠菜':[['respect','🙏','おはかで てをあわせる','おとなといっしょに'],['choice','🎠','のりたいものを ゆびさす','みるだけでもOK'],['night','✨','ぴかぴかを みつける','みつけたら おしえる'],['sea','🌊','うみに こんにちはする','おとなと てをつなぐ'],['shell','🐚','すきな いろを みつける','かいがらや すなで'],['laugh','😄','だれかを にこにこにする','いっしょに わらおう']]
  };
  let activeProfile = storage.get('mission-profile', '優典'); let missionDone = storage.get('missions', {});
  function profileState(name) { if (!missionDone[name]) missionDone[name] = {}; return missionDone[name]; }
  function renderMissions() {
    const tabs = document.getElementById('missionProfiles'); tabs.innerHTML = Object.keys(missionProfiles).map((name) => `<button type="button" class="${name === activeProfile ? 'active' : ''}" data-profile="${name}">${name}</button>`).join('');
    tabs.querySelectorAll('[data-profile]').forEach((button) => button.addEventListener('click', () => { activeProfile = button.dataset.profile; storage.set('mission-profile', activeProfile); renderMissions(); }));
    const state = profileState(activeProfile); const items = missionProfiles[activeProfile];
    document.getElementById('missionList').innerHTML = items.map(([id,emoji,name,note]) => `<label class="mission-card ${state[id] ? 'done' : ''}"><span class="mission-emoji">${emoji}</span><span><b>${escapeHTML(name)}</b><small>${escapeHTML(note)}</small></span><input type="checkbox" data-mission-id="${id}" ${state[id] ? 'checked' : ''}></label>`).join('');
    document.querySelectorAll('[data-mission-id]').forEach((input) => input.addEventListener('change', () => { state[input.dataset.missionId] = input.checked; storage.set('missions', missionDone); renderMissions(); if (input.checked) toast('ミッションクリア！'); }));
    const cleared = items.filter(([id]) => state[id]).length; document.getElementById('missionCleared').textContent = cleared; document.getElementById('missionPlayerName').textContent = activeProfile;
    document.getElementById('missionRank').textContent = cleared === 6 ? 'ラストサマー・マスター' : cleared >= 4 ? '夏の冒険リーダー' : cleared >= 2 ? 'サマー・チャレンジャー' : 'ラストサマー・ルーキー';
    document.querySelector('.mission-ring').style.setProperty('--progress', `${cleared / 6 * 100}%`); document.getElementById('homeMissionProgress').textContent = `${cleared} / 6 CLEAR`;
  }

  // Packing checklist
  const packingItems = {
    day1:['スマホ・モバイルバッテリー','飲み物','汗拭きタオル','虫よけ','薄手の羽織り・山上の冷え対策','墓参りに必要なもの'],
    day2:['水着','着替え','タオル','浮き輪','空気入れ','ライフジャケット','マリンシューズ','テント・日除け','レジャーシート','クーラーボックス','弁当','飲み物','氷・保冷剤','日焼け止め','帽子','ゴミ袋','濡れ物用袋','救急セット','スマホ防水ケース','現金・駐車料金用小銭']
  };
  let packingDay = 'day1'; let packingDone = storage.get('packing', {});
  function packingId(day, index) { return `${day}-${index}`; }
  function renderPacking() {
    const items = packingItems[packingDay]; document.getElementById('packingList').innerHTML = `<p class="packing-note">${packingDay === 'day2' ? '海グッズは購入済み。ここでは「持っているか」ではなく「車に積んだか」を確認。' : '山上は日没後に涼しくなる可能性あり。水分と羽織りを忘れずに。'}</p><section class="simple-check-group"><div class="simple-check-list">${items.map((name,index) => `<label class="simple-check-row ${packingDone[packingId(packingDay,index)] ? 'done' : ''}"><input type="checkbox" data-packing-id="${packingId(packingDay,index)}" ${packingDone[packingId(packingDay,index)] ? 'checked' : ''}><div><b>${escapeHTML(name)}</b></div><span class="row-badge">${packingDay.toUpperCase()}</span></label>`).join('')}</div></section>`;
    document.querySelectorAll('[data-packing-id]').forEach((input) => input.addEventListener('change', () => { packingDone[input.dataset.packingId] = input.checked; storage.set('packing', packingDone); renderPacking(); }));
    const total = Object.values(packingItems).flat().length; const completed = Object.keys(packingDone).filter((key) => packingDone[key]).length; const dayComplete = items.filter((_,index) => packingDone[packingId(packingDay,index)]).length;
    document.getElementById('packingProgress').textContent = `${dayComplete} / ${items.length}`; document.getElementById('packingProgressBar').style.width = `${dayComplete / items.length * 100}%`;
    document.getElementById('homePackingProgress').textContent = `${completed} / ${total}`; document.getElementById('morePackingProgress').textContent = `${completed} / ${total} 完了`;
  }
  document.querySelectorAll('[data-packing-day]').forEach((button) => button.addEventListener('click', () => { packingDay = button.dataset.packingDay; document.querySelectorAll('[data-packing-day]').forEach((item) => item.classList.toggle('active', item === button)); renderPacking(); }));

  // Budget and editable actual expenses
  const plannedBudget = [['アトラクション','4,000円'],['DAY1 食費・飲み物','2,000円'],['DAY2 弁当・飲み物・氷','3,000円'],['燃料','6,000円'],['高速・有料道路','6,000円'],['駐車・海水浴場設備','3,000円'],['予備費','1,000円']];
  document.getElementById('plannedBudgetList').innerHTML = plannedBudget.map(([name,amount]) => `<div class="planned-budget-row"><span>${name}</span><b>${amount}</b></div>`).join('');
  let expenses = storage.get('expenses', []);
  function updateChallenge(total) {
    const remaining = BUDGET - total; const percentage = Math.min(100, total / BUDGET * 100); const over = total > BUDGET;
    document.getElementById('actualTotal').textContent = yen(total); document.getElementById('budgetRemaining').textContent = `${over ? '−' : ''}${yen(Math.abs(remaining))}`;
    document.getElementById('challengeRemaining').textContent = over ? `${yen(total - BUDGET)} オーバー` : `残り ${yen(remaining)}`;
    document.getElementById('challengePercent').textContent = `${Math.round(total / BUDGET * 100)}%`; document.getElementById('challengeRing').style.setProperty('--progress', `${percentage}%`); document.getElementById('budgetTrack').style.width = `${percentage}%`;
    const status = over ? '基準予算を超過。内容を確認しよう。' : total >= 20000 ? 'ゴール目前。残額を意識して使おう。' : total >= 10000 ? 'いいペース。体験予算は守れている？' : 'いいスタート。体験予算を守ろう。';
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
    root.querySelectorAll('[data-expense-delete]').forEach((button) => button.addEventListener('click', () => { expenses = expenses.filter((item) => item.id !== button.dataset.expenseDelete); storage.set('expenses', expenses); renderExpenses(); resetExpenseForm(); toast('実費を削除しました'); }));
    updateChallenge(expenses.reduce((sum,item) => sum + Number(item.amount), 0));
  }
  document.getElementById('expenseForm').addEventListener('submit', (event) => {
    event.preventDefault(); const id = document.getElementById('expenseId').value; const item = {id:id || `expense-${Date.now()}`,name:document.getElementById('expenseName').value.trim(),amount:Number(document.getElementById('expenseAmount').value),category:document.getElementById('expenseCategory').value};
    if (!item.name || !Number.isFinite(item.amount) || item.amount < 0) return;
    if (id) expenses = expenses.map((expense) => expense.id === id ? item : expense); else expenses.push(item);
    storage.set('expenses', expenses); renderExpenses(); resetExpenseForm(); toast(id ? '実費を更新しました' : '実費を追加しました');
  });
  document.getElementById('expenseCancel').addEventListener('click', resetExpenseForm);

  // PWA / connectivity status
  const connectivity = document.getElementById('connectivityStatus');
  function updateConnectivity() { const online = navigator.onLine; connectivity.classList.toggle('offline', !online); connectivity.querySelector('span').textContent = online ? 'オンライン · オフライン用データを準備済み' : 'オフライン · 保存済みデータで利用中'; }
  window.addEventListener('online', updateConnectivity); window.addEventListener('offline', updateConnectivity); updateConnectivity();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js', {scope:'./'}).then(() => connectivity.classList.add('ready')).catch(() => connectivity.querySelector('span').textContent = 'オフライン準備に失敗しました');

  renderShopping(); renderShots(); renderMissions(); renderPacking(); renderExpenses();
});
