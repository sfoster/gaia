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

      return Promise.all(loadTasks).then(() => {
        return this.started();
      });
    },
    testMode: 'emoji',
    pairNumber: '',
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
        this.testPanel = new exports.CallTest();
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
            this.pairNumber = req.result[key];
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
        this.pairNumber = num;
      });
    },
    updateTestMode: function(testMode) {
      return this._updateSetting('haiku.testmode', testMode).then((res) => {
        if (typeof testMode === 'undefined') {
          console.log('settings get got: ', res);
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
    }
  };

  exports.App = App;
}(window));
