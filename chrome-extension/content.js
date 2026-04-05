// PEP Bridge - Content Script
// Auto-injects the bridge on PEP pages

console.log('[PEP Bridge] Extension loaded on PEP page');

// Wait for page to be fully ready
function waitForPEP() {
  const app = document.querySelector('#app');
  const vueApp = app?.__vue_app__;
  
  if (!vueApp || !localStorage.getItem('hk_token')) {
    console.log('[PEP Bridge] Waiting for PEP to initialize...');
    setTimeout(waitForPEP, 1000);
    return;
  }

  console.log('[PEP Bridge] PEP detected, starting bridge...');
  initBridge();
}

function initBridge() {
  // Get configuration from extension storage
  chrome.storage.sync.get(['webhookUrl', 'pollInterval', 'enabled'], (config) => {
    const WEBHOOK_URL = config.webhookUrl || 'http://localhost:3001/api/pep-sync';
    const POLL_INTERVAL = config.pollInterval || 60000;
    const ENABLED = config.enabled !== false;

    if (!ENABLED) {
      console.log('[PEP Bridge] Bridge is disabled in settings');
      return;
    }

    // Inject the bridge script
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        if (window.__PEP_BRIDGE__) {
          clearInterval(window.__PEP_BRIDGE__.intervalId);
        }

        const CONFIG = {
          WEBHOOK_URL: '${WEBHOOK_URL}',
          POLL_INTERVAL_MS: ${POLL_INTERVAL},
          DEBUG: true
        };

        function getHttp() { return document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$http; }
        function getStore() { return document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$store; }
        function getPropId() { return localStorage.getItem('hk_logged_property_id'); }
        function getPropName() { return localStorage.getItem('hk_logged_property_name'); }
        function getPropCode() { return localStorage.getItem('hk_logged_property_code'); }
        function getRegion() { return localStorage.getItem('hk_region_url'); }
        function getBusinessDate() {
          const store = getStore();
          const raw = store?.state?.current_business_day?.date;
          return raw ? raw.split('T')[0] : new Date().toISOString().split('T')[0];
        }

        function log(...args) {
          if (CONFIG.DEBUG) console.log('%c[PEP Bridge]', 'color:#00bcd4;font-weight:bold', ...args);
        }

        async function pepGet(path) {
          const http = getHttp();
          if (!http) throw new Error('Vue $http not available');
          return (await http.get(getRegion() + path)).data;
        }

        function summarize(r) {
          return {
            id: r.id,
            confirmation_no: r.confirmation_no,
            status: r.status,
            check_in_date: r.check_in_date,
            check_out_date: r.check_out_date,
            checked_in_date: r.checked_in_date || null,
            room_number: r.room_number || null,
            room_type_name: r.room_type?.name || null,
            adults: r.adults,
            children: r.children,
            no_of_nights: r.no_of_nights,
            guaranteed: r.guaranteed,
            is_digital_checkin: r.digital || false,
            vip: r.vip || null,
            total_for_stay: r.total_for_stay,
            group_block: r.group_block?.name || null,
            loyalty_number: r.loyalty_number || null,
            guest: r.primary_guest ? {
              first_name: r.primary_guest.first_name,
              last_name: r.primary_guest.last_name,
              email: r.primary_guest.email,
              phone: r.primary_guest.phone
            } : null,
            preferences: (r.preferences || []).map(p => p.name || p.preference_name || p),
            remarks: r.remarks || null
          };
        }

        async function pollOnce() {
          const propId = getPropId();
          const date = getBusinessDate();
          log('Polling', getPropName(), '/', date);

          const results = {}, errors = [];
          await Promise.all([
            pepGet('v4/hotelbrand/properties/'+propId+'/dashboard/fd?cbd='+date+'&auto_sync=true')
              .then(d => results.dashboard = d)
              .catch(e => errors.push({type:'dashboard',msg:e.message})),
            pepGet('v4/hotelbrand/properties/'+propId+'/reservations?type=arrivals&date='+date+'&per_page=250')
              .then(r => results.arrivals = Object.values(r || {}))
              .catch(e => errors.push({type:'arrivals',msg:e.message})),
            pepGet('v4/hotelbrand/properties/'+propId+'/reservations?type=in_house&date='+date+'&per_page=250')
              .then(r => results.in_house = Object.values(r || {}))
              .catch(e => errors.push({type:'in_house',msg:e.message}))
          ]);

          const d = results.dashboard || {};
          const payload = {
            meta: {
              version: '1.1.0',
              fetched_at: new Date().toISOString(),
              business_date: date,
              property: { id: propId, name: getPropName(), code: getPropCode() },
              errors: errors.length ? errors : null
            },
            dashboard: results.dashboard ? {
              total_inventory: d.total_inventory,
              in_house: d.in_house,
              available: d.available,
              out_of_order: d.out_of_order,
              occupancy_pct: d.occupancy,
              arrivals_expected: d.arrival,
              arrivals_guaranteed: d.guaranteed_arrivals,
              departures_expected: d.departure,
              departures_completed: d.completed_departures,
              no_shows: d.no_show,
              dirty: d.dirty,
              clean: d.clean,
              unassigned_dirty: d.unassigned_dirty_rooms,
              verified: d.verified_rooms,
              room_revenue: d.room_revenue,
              adr: d.adr,
              rev_par: d.rev_par,
              group_count: d.group_count,
              maintenance_issues: d.maintenance_issues,
              booked_today: d.booked_today,
              cancelled_today: d.cancelled_today
            } : null,
            arrivals: (results.arrivals || []).map(summarize),
            in_house: (results.in_house || []).map(summarize)
          };

          window.__PEP_BRIDGE__.lastPayload = payload;
          window.__PEP_BRIDGE__.pollCount++;
          window.__PEP_BRIDGE__.lastPollAt = payload.meta.fetched_at;

          if (CONFIG.WEBHOOK_URL) {
            try {
              await fetch(CONFIG.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-PEP-Bridge': '1.1' },
                body: JSON.stringify(payload)
              });
              log('Sent to server. Poll #' + window.__PEP_BRIDGE__.pollCount);
            } catch (e) {
              log('Webhook failed:', e.message);
            }
          }
          return payload;
        }

        window.__PEP_BRIDGE__ = {
          version: '1.1.0',
          pollCount: 0,
          lastPollAt: null,
          lastPayload: null,
          pollNow: () => pollOnce(),
          stop: () => {
            clearInterval(window.__PEP_BRIDGE__.intervalId);
            log('Stopped.');
          },
          getStatus: () => ({
            running: true,
            pollCount: window.__PEP_BRIDGE__.pollCount,
            lastPollAt: window.__PEP_BRIDGE__.lastPollAt,
            webhook: CONFIG.WEBHOOK_URL
          })
        };

        pollOnce().then(() => {
          window.__PEP_BRIDGE__.intervalId = setInterval(pollOnce, CONFIG.POLL_INTERVAL_MS);
          log('Bridge running - polls every', CONFIG.POLL_INTERVAL_MS / 1000, 'seconds');
        });
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();

    console.log('[PEP Bridge] Bridge injected successfully');
  });
}

// Start waiting for PEP to load
waitForPEP();
