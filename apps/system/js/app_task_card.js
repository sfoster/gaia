/* global  */

'use strict';

(function(exports) {

  /**
   * The cards-view UI of the AppWindow.
   *
   * @class AppTaskCard
   * @param {AppWindow} app The app window instance this chrome belongs to.
   * @extends BaseUI
   */
  var AppTaskCard = function AppTaskCard(app) {
    this.app = app;
    this.instanceID = _id++;
    this.containerElement = app.element;
    // ....
    this.render();

    // conditionally display buttons
  };

  AppTaskCard.prototype = Object.create(window.BaseUI.prototype);

  AppTaskCard.prototype.CLASS_NAME = 'AppTaskCard';

  AppTaskCard.prototype.EVENT_PREFIX = 'taskcard';

  AppTaskCard.prototype._DEBUG = false;

  AppTaskCard.prototype.view = function an_view() {
    return '<div class="task-card-controls" id="' +
      this.CLASS_NAME + this.instanceID + '">' +
    + '<button class="close-button" data-button-action="close"' +
    + '   role="button"></button>' +
    + '<button class="favorite-button" ' +
    + '    data-button-action="favorite"' +
    + '   role="button"></button>' +
    + '</div>';
  };

  AppTaskCard.prototype._fetchElements = function ac__fetchElements() {
    this.element = this.containerElement.querySelector('task-card-controls');
    this.closeButton = this.element.querySelector('close-button');
    this.favoriteButton = this.element.querySelector('favorite-button');
  };

  AppTaskCard.prototype.handleEvent = function ac_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (this.closeButton === evt.target) {
          this.onCloseButton(evt);
        } else if (this.favoriteButton === evt.target) {
          this.onFavoriteButton(evt);
        }
        break;
    }
  };

  AppTaskCard.prototype._registerEvents = function ac__registerEvents() {
  };

  AppTaskCard.prototype._unregisterEvents = function ac__unregisterEvents() {
    this.app = null;
  };

  AppTaskCard.prototype.render = function() {
    this.publish('willrender');

    var view = this.view();
    this.app.identificationOverlay.insertAdjacentHTML('afterend', view);

    this._fetchElements();
    this._registerEvents();
    this.publish('rendered');
  };

  AppTaskCard.prototype.onCloseButton = function ac_onCloseBtton(evt) {
    evt && evt.stopPropagation();

  };

  AppTaskCard.prototype.onFavoriteButton = function ac_onCloseBtton(evt) {
    evt && evt.stopPropagation();
  };

  AppTaskCard.prototype.addBookmark = function ac_addBookmark() {
    var dataset = this.app.config;

    var name;
    if (this.isSearch()) {
      name = dataset.searchName;
    } else {
      name = this.title.textContent;
    }
    var url = this._currentURL;

    var activity = new MozActivity({
      name: 'save-bookmark',
      data: {
        type: 'url',
        url: url,
        name: name,
        icon: dataset.icon,
        useAsyncPanZoom: dataset.useAsyncPanZoom,
        iconable: false
      }
    });
    // FIXME: disable the favorite button when done
    if (this.menuButton) {
      activity.onsuccess = function onsuccess() {
        this.menuButton.disabled = true;
      }.bind(this);
    }
  };

  AppTaskCard.prototype.onAddBookmark = function ac_onAddBookmark() {
    var self = this;
    function selected(value) {
      if (value) {
        self.addBookmark();
      }
    }

    var data = {
      title: _('add-to-home-screen'),
      options: []
    };

    if (this.isSearch()) {
      var dataset = this.app.config;
      data.options.push({ id: 'search', text: dataset.searchName });
    } else {
      data.options.push({ id: 'origin', text: this.title.textContent });
    }

    ModalDialog.selectOne(data, selected);
  };

  exports.AppTaskCard = AppTaskCard;
}(window));
