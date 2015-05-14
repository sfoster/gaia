'use strict';
/* global
  PinCard,
  PlacesIdbStore,
  SyncDataStore */

(function(exports) {

  var STORE_NAME = 'places';
  var MAX_RESULTS = 10;
  var container = document.getElementById('pages-container');

  function Places() {}

  Places.prototype = {

    init: function() {
      console.log('init called');
      this.persistStore = new PlacesIdbStore();

      console.log('calling persistStore.init');
      this.persistStore.init().then(() => {
        console.log('inside persistStore.init');
        this.syncStore =
          new SyncDataStore(STORE_NAME, this.persistStore, 'url');
        console.log('got a sync datastore');

        this.syncStore.filter = function(place) {
          return place.url.startsWith('app://') ||
            place.url === 'about:blank';
        };
        this.syncStore.onChange = function() {
          showPages();
        };
        // Make init return a promise, so we know when
        // we did the sync. Used right now for testing
        // porpoises.
        var rev = this.persistStore.latestRevision || 0;
        console.log('got the rev', rev);
        return this.syncStore.sync(rev).then(() => {
          console.log('got the sync');
          return new Promise(resolve => {
            showPages();
            resolve();
          });
        }, err => {
          console.log('Got rejection', err);
        });
      });
    }
  };

  function showPages() {
    console.log('Showing pages.');
    var store = places.persistStore;

    store.read('frecency', MAX_RESULTS, function(results) {
      var docFragment = document.createDocumentFragment();
      results.forEach(function(x) {
        var card = new PinCard(x);
        docFragment.appendChild(card.element);
      });
      container.innerHTML = '';
      container.appendChild(docFragment);
    });
  }

  var places = new Places();
  places.init();

}(window));
