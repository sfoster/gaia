'use strict';

(function(exports) {
  function PowerButton(){}

  PowerButton.prototype =  {
    SHUTDOWN_THRESHOLD: 5000,
    start: function() {
      console.log('PowerButton start');
      window.addEventListener('mozbrowserbeforekeydown', this);
      window.addEventListener('mozbrowserbeforekeyup', this);
      window.addEventListener('mozbrowserafterkeydown', this);
      window.addEventListener('mozbrowserafterkeyup', this);
      window.addEventListener('keydown', this);
      window.addEventListener('keyup', this);
    },
    handleEvent: function(event) {
      console.log('PowerButton event: ', event.type, event.key, event);
      if (event.key !== 'Power') {
        return true;
      }
      if (event.type === 'keyup') {
        this.endButtonPress();
      }
      if (event.type === 'keydown') {
        this.startButtonPress();
      }
    },
    startKeyTimer: function() {
      this.stopKeyTimer();
      this._startTime = Date.now();
      this._lastTickTime = this._startTime;
      this._keyTimerItv = setInterval(() => {
        var now = Date.now();
        this.onKeyTimerTick(Date.now() - this._lastTickTime,
                            now - this._startTime);
        this._lastTickTime = now;
      }, 1000/30);
    },
    stopKeyTimer: function() {
      clearInterval(this._keyTimerItv);
      this._startTime = 0;
      this._lastTickTime = 0;
      this._startTime = Date.now();
    },
    onKeyTimerTick: function(deltaMs, elapsedMs) {
      if (elapsedMs > this.SHUTDOWN_THRESHOLD) {
        console.log('SHUTDOWN_THRESHOLD exceeded, triggering shutdown');
        this.endButtonPress();
      }
    },
    startButtonPress: function() {
      this.startKeyTimer();
    },
    endButtonPress: function() {
      var now = Date.now();
      var elapsed = now - this._startTime;
      this.stopKeyTimer();
      console.log('PowerButton: was pressed for '+ elapsed + 'ms');
      if (elapsed >= this.SHUTDOWN_THRESHOLD) {
        document.body.classList.add('shutdown');
        navigator.mozPower.powerOff();
      }
    },
  };
  exports.PowerButton = PowerButton;
})(window);

