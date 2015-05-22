'use strict';
/* global GaiaGrid */
/* global GridIconRenderer */
/* global MozActivity */
/* global IconsHelper */
/* jshint nonew: false */

(function(exports) {

  const TYPE = 'bookmark';
  const ICON_SIZE = 128;

  /**
   * Represents a single bookmark icon on the homepage.
   */
  function Bookmark(record, features) {
    this.detail = record;
    this.features = features || {};
    this.detail.type = TYPE;
  }

  Bookmark.prototype = {

    __proto__: GaiaGrid.GridItem.prototype,

    /**
     * Bookmarks use a custom icon renderer because they are likely much
     * smaller than a standard icon.
     */
    renderer: GridIconRenderer.TYPE.FAVICON,

    /**
     * Returns the height in pixels of each icon.
     */
    get pixelHeight() {
      return this.grid.layout.gridItemHeight;
    },

    /**
     * Width in grid units for each icon.
     */
    gridWidth: 1,

    get name() {
      return this.detail.name;
    },

    get icon() {
      return this.detail.icon || this.defaultIcon;
    },

    get identifier() {
      return this.detail.id;
    },

    update: GaiaGrid.GridItem.prototype.updateFromDatastore,

    /**
     * Bookmarks are always editable unless noted otherwise in features.
     */
    isEditable: function() {
      return this.features && this.features.isEditable !== false;
    },

    /**
     * Bookmarks are always removable unless noted otherwise in features.
     */
    isRemovable: function() {
      return this.features && this.features.isRemovable !== false;
    },

    /**
     * Bookmarks are always draggable unless noted otherwise in features.
     */
    isDraggable: function() {
      return this.features && this.features.isDraggable !== false;
    },

    getBestIcon: function() {
      return new Promise((function(resolve, reject) {
        var placeObj = {
          'url': this.detail.pinnedFrom,
          'icons': this.detail.pinnedFromIcons
        };
        IconsHelper.getIcon(this.detail.url, ICON_SIZE,
          placeObj, this.detail).then((function(icon) {
            this.detail.icon = URL.createObjectURL(icon.blob);
            resolve();
        }).bind(this)).catch(function(error) {
          console.error('Failed to get best icon for site ' + error);
          reject();
        });
      }).bind(this));
    },

    /**
     * This method overrides the GridItem.render function.
     */
    render: function() {
      this.getBestIcon().then((function() {
        GaiaGrid.GridItem.prototype.render.call(this);
        this.element.classList.add('bookmark');
        if (this.isEditable()) {
          this.element.classList.add('editable');
        }
      }).bind(this), function(error) {
        console.error('Failed to get site icon to render ' + error);
      });
    },

    /**
     * Launches the bookmark in a browser window.
     */
    launch: function() {
      var features = {
        name: this.name,
        icon: this.icon,
        remote: true
      };

      var url = this.detail.url;
      if (this.features.search) {
        features.searchName = this.name;
        features.searchUrl = url;
      }

      window.open(url, '_blank', Object.keys(features)
        .map(function eachFeature(key) {
        return encodeURIComponent(key) + '=' +
          encodeURIComponent(features[key]);
      }).join(','));
    },

    /**
     * Opens a web activity to edit the bookmark.
     */
    edit: function() {
      new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: this.detail.id
        }
      });
    }
  };

  exports.GaiaGrid.Bookmark = Bookmark;

}(window));
