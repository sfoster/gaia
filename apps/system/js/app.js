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
  // Telephony object
  var tel = navigator.mozTelephony;

  var App = function() {};
  App.prototype = {
    start: function() {
      return Promise.all(loadTasks).then(() => {
        return this.started();
      });
    },
    testMode: 'emoji',
    started: function() {
      if (this._started) {
        throw new Error('App: bootstrap should not be called twice.');
      }
      this._started = true;

      var startedTasks = [new Promise((res, rej) => {
        document.body.dataset.testmode = this.testMode;
        document.body.dataset.ready = 'ready';
        console.log('bootstrapped, app is started');
        console.log('Telephone object: ', tel);
        res(true);
      })];

      if (this.testMode == 'call') {
        this.testPanel = new exports.CallTest();
      } else if(this.testMode == 'emoji') {
        this.testPanel = new exports.EmojiTest();
      }
      startedTasks.push(this.testPanel.start());
      return ;
    }
  };

  exports.App = App;
}(window));
