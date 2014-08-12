/* global ModalDialog, MozActivity,
   taskManager
*/

'use strict';

(function(exports) {
  var DEBUG = true;
  var _id = 0;
  var _ = navigator.mozL10n.get;

  /**
   * The cards-view UI of the AppWindow.
   *
   * @class AppCardView
   * @param {AppWindow} app The app window instance this chrome belongs to.
   * @extends BaseUI
   */
  var AppCardView = function AppCardView(app) {
    this.app = app;
    this.instanceID = _id++;
    this.containerElement = app.element;
    // ....
    this.render();
  };

  AppCardView.prototype = Object.create(window.BaseUI.prototype);

  AppCardView.prototype.CLASS_NAME = 'AppCardView';

  AppCardView.prototype.EVENT_PREFIX = 'appcard';

  AppCardView.prototype._DEBUG = false;

  AppCardView.prototype.view = function an_view() {
    return '<div class="card-view-controls" id="' +
      this.CLASS_NAME + this.instanceID + '">' +
      '<button class="close-button" data-button-action="close"' +
      '   role="button"></button>' +
      '<button class="favorite-button" ' +
      '    data-button-action="favorite"' +
      '   role="button"></button>' +
      '</div>';
  };

  AppCardView.prototype._fetchElements = function acv__fetchElements() {
    this.element = this.containerElement.querySelector('.card-view-controls');
    this.closeButton = this.element.querySelector('.close-button');
    this.favoriteButton = this.element.querySelector('.favorite-button');
  };

  AppCardView.prototype.handleEvent = function acv_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (this.closeButton === evt.target) {
          evt.stopPropagation();
          this.publish('close');
        } else if (this.favoriteButton === evt.target) {
          evt.stopPropagation();
          this.publish('favorite');
        }
        break;
    }
  };

  AppCardView.prototype._registerEvents = function acv__registerEvents() {
    this.closeButton.addEventListener('click', this);
    this.favoriteButton.addEventListener('click', this);
    this.app.identificationIcon.addEventListener('click', this);
  };

  AppCardView.prototype._unregisterEvents = function acv__unregisterEvents() {
    this.closeButton.removeEventListener('click', this);
    this.favoriteButton.removeEventListener('click', this);
    if (this.app) {
      this.app.identificationIcon.removeEventListener('click', this);
      this.app = null;
    } else {
      this.debug('hide: this.app not defined');
    }
  };

  AppCardView.prototype.render = function() {
    this.publish('willrender');

    var view = this.view();
    if (this.app.identificationOverlay) {
      this.app.identificationOverlay.insertAdjacentHTML('afterend', view);
      this._fetchElements();
    }

    this.publish('rendered');
  };

  AppCardView.prototype.show = function acv_enter(evt) {
    if (!this.app) {
      this.debug('show: this.app not defined');
      return;
    }
    this._registerEvents();
    // Enable/disable the favorite
    if (this.favoriteButton) {
      // toggle disabled if app is currently favoritable
    }
    if (this.closeButton) {
     // toggle disabled if app is currently closable
    }
  };

  AppCardView.prototype.hide = function acv_enter(evt) {
    this._unregisterEvents();
  };

  AppCardView.prototype.onCloseButton = function acv_onFavoriteButton(evt) {
    evt && evt.stopPropagation();
    // TODO: make it so
  };

  AppCardView.prototype.onFavoriteButton = function acv_onFavoriteButton(evt) {
    evt && evt.stopPropagation();
    // TODO: make it so
  };

  AppCardView.prototype.debug = function aw_debug(msg) {
    if (DEBUG || this._DEBUG) {
      console.log('[Dump: ' + this.CLASS_NAME + ']' +
        '[' + (this.name || this.origin) + ']' +
        '[' + this.instanceID + ']' +
        '[' + self.System.currentTime() + ']' +
        Array.slice(arguments).concat());
    }
  };

  exports.AppCardView = AppCardView;
}(window));
