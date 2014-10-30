'use strict';

// mozIcc.cardState values for a locked SIM
var lockStates = ['pinRequired', 'pukRequired', 'networkLocked',
                 'corporateLocked', 'serviceProviderLocked', 'network1Locked',
                 'network2Locked', 'hrpdNetworkLocked', 'ruimCorporateLocked',
                 'ruimServiceProviderLocked'];

function MockMozIcc(options = {}) {
  options = options || {};
  for(var i in options) {
    this[i] = options[i];
  }
}

MockMozIcc.lockStates = lockStates;

MockMozIcc.prototype = {
  cardState: '',
  mLockRetryCount: 0,
  getCardLockRetryCount: function() {
    return this.mLockRetryCount || 0;
  },
};
