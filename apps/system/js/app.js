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
      return Promise.all(loadTasks).then(() => {
        return this.started();
      });
    },
    started: function() {
      if (this._started) {
        throw new Error('App: bootstrap should not be called twice.');
      }
      this._started = true;

      return new Promise(function(res, rej) {
        document.body.dataset.ready = 'ready';
        console.log('bootstrapped, app is started');
        res(true);
      });
    }
  };

  exports.App = App;
}(window));
