(function () {
  'use strict';

  const PENDING_KEY = 'seki-last-summer-2026:sync-pending';
  const config = window.LAST_SUMMER_SYNC_CONFIG || {};
  const PROFILE_IDS = {'優典':'yusuke','綾菜':'ayana','慶典':'keisuke','杏菜':'anna','波瑠菜':'haruna'};
  const now = () => new Date().toISOString();
  const readPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; } };
  const writePending = (items) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(items)); } catch {} };

  class FamilyTripSync {
    constructor(options) {
      Object.assign(this, options);
      this.client = null; this.userId = null; this.joined = false; this.channel = null;
      this.pending = readPending(); this.flushing = false; this.lastSyncAt = null;
      this.handleOnline = () => this.status(this.pending.length ? 'pending' : 'online');
    }
    get configured() { return Boolean(config.enabled && config.supabaseUrl && config.supabaseAnonKey && config.tripId && window.supabase?.createClient); }
    status(state, message = '') { this.onStatus?.(state, {message,pendingCount:this.pending.length,lastSyncAt:this.lastSyncAt}); }
    async init() {
      if (!this.configured) { this.status('local'); return {configured:false,joined:false}; }
      this.status(navigator.onLine ? 'connecting' : 'offline');
      this.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'seki-last-summer-2026:cloud-auth'}});
      try {
        let {data:{session}} = await this.client.auth.getSession();
        if (!session) { const result = await this.client.auth.signInAnonymously(); if (result.error) throw result.error; session = result.data.session; }
        this.userId = session.user.id;
        const membership = await this.client.from('trip_members').select('trip_id,profile_id').eq('trip_id',config.tripId).eq('user_id',this.userId).maybeSingle();
        if (membership.error) throw membership.error;
        if (!membership.data || membership.data.profile_id !== this.profileId) { this.status('join-required'); return {configured:true,joined:false}; }
        await this.connect(); return {configured:true,joined:true};
      } catch (error) { this.status(navigator.onLine ? 'error' : 'offline', error?.message || 'sync init failed'); return {configured:true,joined:false,error}; }
    }
    async join(code, adminPin = '') {
      if (!this.client || !this.userId) throw new Error('同期サービスへ接続できませんでした。');
      const normalized = String(code || '').trim().toUpperCase(); if (!normalized) throw new Error('家族コードを入力してください。');
      const result = await this.client.rpc('join_family_trip',{p_trip_id:config.tripId,p_join_code:normalized,p_profile_id:this.profileId,p_admin_pin:String(adminPin || '').trim()});
      if (result.error) throw result.error; await this.connect(); return true;
    }
    async connect() {
      this.joined = true;
      const sources = [
        ['capture_requests','onCaptureRow'],['mission_progress','onMissionRow'],['shot_progress','onShotRow'],['expenses','onExpenseRow'],
        ['trip_runtime','onRuntimeRow'],['shopping_items','onShoppingRow'],['packing_progress','onPackingRow'],['meal_progress','onMealRow']
      ];
      const results = await Promise.all(sources.map(([table]) => this.client.from(table).select('*').eq('trip_id',config.tripId).order('updated_at',{ascending:true})));
      for (let index=0; index<sources.length; index+=1) { if (results[index].error) throw results[index].error; results[index].data.forEach((row) => this[sources[index][1]]?.(row,true)); }
      if (this.channel) await this.client.removeChannel(this.channel);
      this.channel = this.client.channel(`family-v18-${config.tripId}`);
      sources.forEach(([table,callback]) => this.channel.on('postgres_changes',{event:'*',schema:'public',table,filter:`trip_id=eq.${config.tripId}`},(payload) => { if (payload.new) this[callback]?.(payload.new,false); }));
      this.channel.subscribe((state) => {
        if (state === 'SUBSCRIBED') { this.lastSyncAt = now(); this.status(this.pending.length ? 'pending' : 'online'); }
        else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') this.status(navigator.onLine ? 'error' : 'offline');
      });
      window.addEventListener('online',this.handleOnline); window.addEventListener('offline',() => this.status('offline'),{passive:true});
      await this.flush();
    }
    operationKey(operation) {
      if (operation.type === 'capture') return operation.requestKey;
      if (operation.type === 'mission') return `${operation.profileId}:${operation.missionId}`;
      return operation.id || operation.shotId || operation.itemId || 'runtime';
    }
    targetForOperation(operation) {
      const base = {trip_id:config.tripId,actor_profile:this.profileId,updated_by:this.userId,updated_at:now()};
      if (operation.type === 'mission') { const status = operation.status || (operation.completed ? (this.profileId === 'parent' ? 'approved' : 'pending') : 'rejected'); return {table:'mission_progress',conflict:'trip_id,profile_id,mission_id',row:{...base,profile_id:operation.profileId,mission_id:operation.missionId,status,completed:status === 'approved'}}; }
      if (operation.type === 'shot') { const status = operation.status || (operation.completed ? 'done' : 'open'); return {table:'shot_progress',conflict:'trip_id,shot_id',row:{...base,shot_id:operation.shotId,status,completed:status === 'done',assigned_profile:operation.assignedProfile || null}}; }
      if (operation.type === 'expense') return {table:'expenses',conflict:'trip_id,expense_id',row:{...base,expense_id:operation.id,name:operation.name,amount:operation.amount,category:operation.category,deleted:Boolean(operation.deleted)}};
      if (operation.type === 'runtime') return {table:'trip_runtime',conflict:'trip_id',row:{...base,current_step_index:operation.currentStepIndex,delay_minutes:operation.delayMinutes}};
      if (operation.type === 'shopping') return {table:'shopping_items',conflict:'trip_id,item_id',row:{...base,item_id:operation.item.id,category:operation.item.category,name:operation.item.name,qty:operation.item.qty || '',completed:Boolean(operation.completed),assigned_profile:operation.assignedProfile || null,custom:Boolean(operation.item.custom),deleted:Boolean(operation.deleted)}};
      if (operation.type === 'packing') return {table:'packing_progress',conflict:'trip_id,item_id',row:{...base,item_id:operation.itemId,completed:Boolean(operation.completed),assigned_profile:operation.assignedProfile || null}};
      if (operation.type === 'meal') return {table:'meal_progress',conflict:'trip_id,item_id',row:{...base,item_id:operation.itemId,completed:Boolean(operation.completed)}};
      return {table:'capture_requests',conflict:'trip_id,request_key',row:{...base,request_key:operation.requestKey,requester_profile:PROFILE_IDS[operation.requesterProfile] || operation.requesterProfile,mission_id:operation.missionId,status:operation.status,photographed:Boolean(operation.photographed),requested_at:operation.requestedAt || now()}};
    }
    saveCapture(data) { return this.saveOperation({...data,type:'capture'}); }
    saveMission(profileId,missionId,status) { return this.saveOperation({type:'mission',profileId,missionId,status}); }
    saveShot(shotId,status,assignedProfile=null) { return this.saveOperation({type:'shot',shotId,status,assignedProfile}); }
    saveExpense(expense,deleted=false) { return this.saveOperation({type:'expense',...expense,deleted}); }
    saveRuntime(currentStepIndex,delayMinutes) { return this.saveOperation({type:'runtime',currentStepIndex,delayMinutes,id:'runtime'}); }
    saveShopping(item,completed,deleted=false,assignedProfile=null) { return this.saveOperation({type:'shopping',item,completed,deleted,assignedProfile,id:item.id}); }
    savePacking(itemId,completed,assignedProfile=null) { return this.saveOperation({type:'packing',itemId,completed,assignedProfile,id:itemId}); }
    saveMeal(itemId,completed) { return this.saveOperation({type:'meal',itemId,completed,id:itemId}); }
    async saveOperation(operation) {
      const item = {...operation,queuedAt:Date.now()};
      if (!this.joined || !navigator.onLine) { this.queue(item); this.status(this.joined ? 'offline' : 'join-required'); return false; }
      await this.flush(); const target = this.targetForOperation(item); const result = await this.client.from(target.table).upsert(target.row,{onConflict:target.conflict});
      if (result.error) { this.queue(item); this.status(navigator.onLine ? 'error' : 'offline',result.error.message); return false; }
      this.lastSyncAt = now(); this.status('online'); return true;
    }
    queue(operation) {
      const type = operation.type || 'capture'; const key = this.operationKey(operation);
      this.pending = this.pending.filter((item) => (item.type || 'capture') !== type || this.operationKey(item) !== key);
      this.pending.push(operation); writePending(this.pending);
    }
    async flush() {
      if (!this.joined || !navigator.onLine || this.flushing || !this.pending.length) { this.status(this.joined ? (navigator.onLine ? 'online' : 'offline') : 'join-required'); return; }
      this.flushing = true; const waiting = [...this.pending]; this.pending=[]; writePending(this.pending);
      for (const operation of waiting) { const target=this.targetForOperation({...operation,type:operation.type || 'capture'}); const result=await this.client.from(target.table).upsert(target.row,{onConflict:target.conflict}); if (result.error) this.queue(operation); }
      this.flushing=false; if (!this.pending.length) this.lastSyncAt=now(); this.status(this.pending.length ? 'error' : 'online');
    }
  }
  window.LastSummerSync={configured:Boolean(config.enabled && config.supabaseUrl && config.supabaseAnonKey && config.tripId),create(options){return new FamilyTripSync(options);}};
})();
