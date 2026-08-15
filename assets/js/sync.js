(function () {
  'use strict';

  const PENDING_KEY = 'seki-last-summer-2026:sync-pending';
  const config = window.LAST_SUMMER_SYNC_CONFIG || {};
  const PROFILE_IDS = {'優典':'yusuke','綾菜':'ayana','慶典':'keisuke','杏菜':'anna','波瑠菜':'haruna'};

  function readPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); }
    catch { return []; }
  }

  function writePending(items) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(items)); }
    catch { /* Local fallback remains available even when storage is full. */ }
  }

  class FamilyTripSync {
    constructor(options) {
      this.profileId = options.profileId;
      this.onCaptureRow = options.onCaptureRow;
      this.onMissionRow = options.onMissionRow;
      this.onShotRow = options.onShotRow;
      this.onStatus = options.onStatus;
      this.client = null;
      this.userId = null;
      this.joined = false;
      this.channel = null;
      this.pending = readPending();
      this.flushing = false;
      this.handleOnline = () => this.status(this.pending.length ? 'pending' : 'connecting');
    }

    get configured() {
      return Boolean(config.enabled && config.supabaseUrl && config.supabaseAnonKey && config.tripId && window.supabase?.createClient);
    }

    status(state, detail = '') {
      if (typeof this.onStatus === 'function') this.onStatus(state, detail);
    }

    async init() {
      if (!this.configured) { this.status('local'); return {configured:false,joined:false}; }
      this.status(navigator.onLine ? 'connecting' : 'offline');
      this.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'seki-last-summer-2026:cloud-auth'}
      });
      try {
        let {data:{session}} = await this.client.auth.getSession();
        if (!session) {
          const result = await this.client.auth.signInAnonymously();
          if (result.error) throw result.error;
          session = result.data.session;
        }
        this.userId = session.user.id;
        const membership = await this.client.from('trip_members').select('trip_id').eq('trip_id', config.tripId).eq('user_id', this.userId).maybeSingle();
        if (membership.error) throw membership.error;
        if (!membership.data) { this.status('join-required'); return {configured:true,joined:false}; }
        await this.updateProfile();
        await this.connect();
        return {configured:true,joined:true};
      } catch (error) {
        this.status(navigator.onLine ? 'error' : 'offline', error?.message || 'sync init failed');
        return {configured:true,joined:false,error};
      }
    }

    async join(code) {
      if (!this.client || !this.userId) throw new Error('同期サービスへ接続できませんでした。');
      const normalized = String(code || '').trim().toUpperCase();
      if (!normalized) throw new Error('家族コードを入力してください。');
      const result = await this.client.rpc('join_family_trip', {p_trip_id:config.tripId,p_join_code:normalized,p_profile_id:this.profileId});
      if (result.error) throw result.error;
      await this.connect();
      return true;
    }

    async updateProfile() {
      const result = await this.client.from('trip_members').update({profile_id:this.profileId,last_seen_at:new Date().toISOString()}).eq('trip_id',config.tripId).eq('user_id',this.userId);
      if (result.error) throw result.error;
    }

    async connect() {
      this.joined = true;
      const [captures,missions,shots] = await Promise.all([
        this.client.from('capture_requests').select('*').eq('trip_id',config.tripId).order('updated_at',{ascending:true}),
        this.client.from('mission_progress').select('*').eq('trip_id',config.tripId).order('updated_at',{ascending:true}),
        this.client.from('shot_progress').select('*').eq('trip_id',config.tripId).order('updated_at',{ascending:true})
      ]);
      if (captures.error) throw captures.error;
      if (missions.error) throw missions.error;
      if (shots.error) throw shots.error;
      captures.data.forEach((row) => this.onCaptureRow?.(row, true));
      missions.data.forEach((row) => this.onMissionRow?.(row, true));
      shots.data.forEach((row) => this.onShotRow?.(row, true));
      if (this.channel) await this.client.removeChannel(this.channel);
      this.channel = this.client.channel(`capture-${config.tripId}`)
        .on('postgres_changes',{event:'*',schema:'public',table:'capture_requests',filter:`trip_id=eq.${config.tripId}`},(payload) => {
          if (payload.new) this.onCaptureRow?.(payload.new, false);
        })
        .on('postgres_changes',{event:'*',schema:'public',table:'mission_progress',filter:`trip_id=eq.${config.tripId}`},(payload) => {
          if (payload.new) this.onMissionRow?.(payload.new, false);
        })
        .on('postgres_changes',{event:'*',schema:'public',table:'shot_progress',filter:`trip_id=eq.${config.tripId}`},(payload) => {
          if (payload.new) this.onShotRow?.(payload.new, false);
        })
        .subscribe((state) => {
          if (state === 'SUBSCRIBED') this.status(this.pending.length ? 'pending' : 'online');
          else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') this.status(navigator.onLine ? 'error' : 'offline');
        });
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', () => this.status('offline'), {passive:true});
      // Opening the app or joining the family is a user action, so pending writes may be sent here.
      await this.flush();
    }

    targetForOperation(operation) {
      if (operation.type === 'mission') return {
        table:'mission_progress', conflict:'trip_id,profile_id,mission_id', row:{
          trip_id:config.tripId,profile_id:operation.profileId,mission_id:operation.missionId,
          completed:Boolean(operation.completed),actor_profile:this.profileId,updated_by:this.userId,updated_at:new Date().toISOString()
        }
      };
      if (operation.type === 'shot') return {
        table:'shot_progress', conflict:'trip_id,shot_id', row:{
          trip_id:config.tripId,shot_id:operation.shotId,completed:Boolean(operation.completed),
          actor_profile:this.profileId,updated_by:this.userId,updated_at:new Date().toISOString()
        }
      };
      return {table:'capture_requests',conflict:'trip_id,request_key',row:{
        trip_id: config.tripId,
        request_key: operation.requestKey,
        requester_profile: PROFILE_IDS[operation.requesterProfile] || operation.requesterProfile,
        mission_id: operation.missionId,
        status: operation.status,
        photographed: Boolean(operation.photographed),
        actor_profile: this.profileId,
        updated_by: this.userId,
        requested_at: operation.requestedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }};
    }

    async saveCapture(operation) {
      return this.saveOperation({...operation,type:'capture'});
    }

    async saveMission(profileId, missionId, completed) {
      return this.saveOperation({type:'mission',profileId,missionId,completed});
    }

    async saveShot(shotId, completed) {
      return this.saveOperation({type:'shot',shotId,completed});
    }

    async saveOperation(operation) {
      const item = {...operation,queuedAt:Date.now()};
      if (!this.joined || !navigator.onLine) {
        this.queue(item);
        this.status(this.joined ? 'offline' : 'join-required');
        return false;
      }
      // A new user action also acts as the explicit trigger for older queued writes.
      await this.flush();
      const target = this.targetForOperation(item);
      const result = await this.client.from(target.table).upsert(target.row, {onConflict:target.conflict});
      if (result.error) {
        this.queue(item);
        this.status(navigator.onLine ? 'error' : 'offline', result.error.message);
        return false;
      }
      return true;
    }

    queue(operation) {
      const key = operation.type === 'mission' ? `${operation.profileId}:${operation.missionId}` : operation.type === 'shot' ? operation.shotId : operation.requestKey;
      this.pending = this.pending.filter((item) => {
        const itemType = item.type || 'capture';
        const itemKey = itemType === 'mission' ? `${item.profileId}:${item.missionId}` : itemType === 'shot' ? item.shotId : item.requestKey;
        return itemType !== (operation.type || 'capture') || itemKey !== key;
      });
      this.pending.push(operation);
      writePending(this.pending);
    }

    async flush() {
      if (!this.joined || !navigator.onLine || this.flushing || !this.pending.length) return;
      this.flushing = true;
      const waiting = [...this.pending];
      this.pending = [];
      writePending(this.pending);
      for (const operation of waiting) {
        const target = this.targetForOperation({...operation,type:operation.type || 'capture'});
        const result = await this.client.from(target.table).upsert(target.row, {onConflict:target.conflict});
        if (result.error) this.queue(operation);
      }
      this.flushing = false;
      this.status(this.pending.length ? 'error' : 'online');
    }
  }

  window.LastSummerSync = {
    configured: Boolean(config.enabled && config.supabaseUrl && config.supabaseAnonKey && config.tripId),
    create(options) { return new FamilyTripSync(options); }
  };
})();
