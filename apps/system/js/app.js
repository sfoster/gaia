'use strict';

(function(exports) {
  /**
   * The entry point of the whole system app.
   */

  /* TODO: get the phone number we are paired with from settings
   * TODO: hook up telephony to accept incoming calls and messages
   *       from that number only
  */
  var loadTasks = [];

  var App = function() {};
  App.prototype = {
    start: function() {
      loadTasks.push(this.updatePairNumber());
      loadTasks.push(this.updateTestMode());

      // prepare connection in parallel;
      // raise 'connection-ready' event when complete
      this.initConnection().then((conn) => {
        window.dispatchEvent(new CustomEvent('connection-ready'));
      });

      // Listen to the headphoneschange event for monitoring the audio routing.
      var acm = navigator.mozAudioChannelManager;
      if (acm) {
        acm.addEventListener(
          'headphoneschange', this.handleHeadphonesChange.bind(this)
        );
      }
      this.audioRouting = 'speaker';

      this.startUI();

      return Promise.all(loadTasks).then(() => {
        return this.started();
      });
    },
    testMode: 'emoji',
    pairNumber: '',
    startUI: function() {
      this.rebootBtn = document.querySelector('#reboot');
      this.rebootBtn.addEventListener('click', function(evt) {
        console.log('rebooting');
        var power = navigator.mozPower;
        power.reboot();
      });
    },
    started: function() {
      if (this._started) {
        throw new Error('App: bootstrap should not be called twice.');
      }
      this._started = true;

      var startedTasks = [new Promise((res, rej) => {
        document.body.dataset.testmode = this.testMode;
        document.body.dataset.ready = 'ready';
        console.log('bootstrapped, app is started');
        res(true);
      })];

      console.log('starting in testMode: ', this.testMode);
      if (this.testMode == 'call') {
        this.testPanel = new exports.CallPanel();
      } else if(this.testMode == 'emoji') {
        this.testPanel = new exports.EmojiTest();
      } else {
        throw new Error('Unexpected testMode: ' + this.testMode);
      }
      startedTasks.push(this.testPanel.start());
      return ;
    },
    _updateSetting: function(key, value) {
      if (typeof value !== 'undefined') {
        return new Promise((res, rej) => {
          var req = navigator.mozSettings.createLock().set({ key: value });
          req.onsuccess = () => {
            console.log(key + ' updated to:', value);
            res(value);
          };
          req.onerror = () => {
            console.log(key + ' update failed:', req.error);
            rej(false);
          };
        });
      } else {
        return new Promise((res, rej) => {
          var req = navigator.mozSettings.createLock().get(key);
          req.onsuccess = () => {
            res(req.result[key]);
          };
          req.onerror = () => {
            console.log(key + ' get failed:', req.error);
            rej(false);
          };
        });
      }
    },
    updatePairNumber: function(num) {
      return this._updateSetting('haiku.pair.number', num).then((res) => {
        console.log('updatePairNumber with: ', num, res);
        this.pairNumber = res;
      });
    },
    updateTestMode: function(testMode) {
      return this._updateSetting('haiku.testmode', testMode).then((res) => {
        if (typeof testMode === 'undefined') {
          // get, update our setting value doesnt agree with our current state
          if (!res || this.testMode == res) {
            console.log('no testMode change, it remains: ', this.testMode);
            // no change
          } else {
            this.testMode = res;
            console.log('updating testMode to: ', res);
          }
        } else {
          this.testMode = testMode;
        }
      });
    },

    initConnection: function() {
      var conn;
      var networkType;

      var ready = navigator.mozTelephony.ready.then(() => {
        conn = this._conn = navigator.mozMobileConnections[0];
        conn.ondatachange = this.onDataChange.bind(this);
        conn.onvoicechange = this.onVoiceChange.bind(this);
      });
      ready.catch(e => {
        console.warn('error from mozTelephony.ready:', e);
      });

      var enabled = ready.then((res) => {
        console.log('setting radio enabled on connection: ', conn);
        return this.enableRadio();
      });

      enabled.catch(e => {
        console.warn('error from enableRadio:', e);
      });

      var preferedSet = enabled.then(() => {
        console.log('radio enabled: ', conn.radioState);

        networkType = this._getDefaultPreferredNetworkType(
          conn.supportedNetworkTypes
        );
        console.log('setting preferred network type: ', networkType);
        return conn.setPreferredNetworkType(networkType);
      });
      preferedSet.catch(e => {
        console.warn('error from setPreferredNetworkType:', e);
      });

      var networkSelected = preferedSet.then((res) => {
        console.log('selecting network');
        conn.selectNetworkAutomatically();
      });
      networkSelected.catch(e => {
        console.warn('error from selectNetworkAutomatically:', e);
      });
      networkSelected.then(() => {
        console.log('network selected, initConnection ok');
        return conn;
      });

      return networkSelected;
    },

    onDataChange: function(evt) {
      // console.log('datachange event: ', this._conn.voice);
      window.dispatchEvent(new CustomEvent('connection-datachange', {
        detail: {
          connected: this._conn.data.connected,
          signal: this._conn.data.signalStrength || 0
        }
      }));
    },
    onVoiceChange: function(evt) {
      // console.log('voicechange event: ', this._conn.voice);
      window.dispatchEvent(new CustomEvent('connection-voicechange', {
        detail: {
          connected: this._conn.voice.connected,
          signal: this._conn.voice.relSignalStrength || 0
        }
      }));
    },
    /**
     * Returns the default preferred network types based on the hardware
     * supported network types.
     */
    _getDefaultPreferredNetworkType: function(hwSupportedTypes) {
      return ['lte', 'wcdma', 'gsm', 'cdma', 'evdo'].filter(function(type) {
        return (hwSupportedTypes && hwSupportedTypes.indexOf(type) !== -1);
      }).join('/');
    },
    enableRadio: function() {
      return this._waitForRadioState(this._conn, true);
    },
    /*
     * An internal function used to make sure current radioState
     * is ok to do following operations.
     *
     * @param {MozMobileConnection} conn
     * @param {Boolean} enabled
     */
    _waitForRadioState: function(conn, enabled) {
      var stateToSet = enabled;
      if (conn.radioState === enabled) {
        // nothing to do
        console.log('_waitForRadioState, is already : ', enabled);
        return Promise.resolve(enabled);
      }
      return new Promise((res, rej) => {
        var radioStateChangeHandler = function onchange() {
          console.log('radioStateChangeHandler, radioState: ', conn.radioState);
          if ((enabled && conn.radioState === 'enabled') ||
              (!enabled && conn.radioState === 'disabled')) {
              console.log('radioStateChangeHandler, resolving');
              conn.removeEventListener('radiostatechange', onchange);
              return res(enabled);
          }
          if (conn.radioState == 'enabling' ||
              conn.radioState == 'disabling' ||
              conn.radioState == null) {
              console.log('radioStateChangeHandler, waiting');
            // still waiting
            return;
          }
          if (stateToSet) {
            console.log('radioStateChangeHandler, calling setRadioEnabled');
            var req = conn.setRadioEnabled(stateToSet);
            req.onerror = (e) => {
              console.warn(
                'radioStateChangeHandler, setRadioEnabled exception: ', e);
              conn.removeEventListener('radiostatechange', onchange);
              rej(e);
            };
            stateToSet = null;
          }
        };
        conn.addEventListener('radiostatechange', radioStateChangeHandler);
        radioStateChangeHandler();
      });
    },

    handleHeadphonesChange: function mpw_handleHeadphonesChange(event) {
      this.handleAudioRouteChange(event, 'wired');
    },
    // Because currently the mozAudioChannelManager does not provide any api
    // for querying the active headphones/headset(audio routing), we have
    // to monitor aux (wired headphones/external speaker)
    handleAudioRouteChange: function mpw_handleAudioRouteChange(event, reason) {
      var isWiredHeadphonesConnected = false;
      var isBluetoothHeadsetConnected = false;

      if (reason === 'wired') {
        isWiredHeadphonesConnected = event.target.headphones;
      } else {
        isBluetoothHeadsetConnected = event.detail.connected;
      }

      // Save the audio routing when one of the headphones/headset is connected.
      if (isWiredHeadphonesConnected || isBluetoothHeadsetConnected) {
        this.audioRouting = isWiredHeadphonesConnected ? 'wired' : 'bluetooth';
      } else {
        // Check if it's disconnecting the active headphones/headset.
        // If so, then send pause command via IAC to notify the music app.
        if (reason === this.audioRouting) {
          console.log('external speaker/headphones disconnected');
        } else if (reason !== 'wired' && reason !== 'bluetooth') {
          throw Error('Not audio route changed from wired or bluetooth!');
        }

        isWiredHeadphonesConnected = navigator.mozAudioChannelManager &&
          navigator.mozAudioChannelManager.headphones;

        // Save the correct audio routing for next unplugged/disconnected event
        if (isWiredHeadphonesConnected) {
          this.audioRouting = 'wired';
        } else {
          this.audioRouting = 'speaker';
        }
      }
    }
  };

  exports.App = App;
}(window));
