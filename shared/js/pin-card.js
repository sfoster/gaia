/* exported ConfirmDialog */
/* global IconsHelper */
'use strict';

(function(exports) {
  var PinCard = function(cardData) {
    var container = document.createElement('div');
    container.classList.add('pin-card');

    var header = document.createElement('header');
    var content = document.createElement('p');
    header.textContent = cardData.title ? cardData.title : '';
    content.textContent = cardData.content ? cardData.content : '';
    var icon = document.createElement('img');

    IconsHelper.getIcon(cardData.url, 32, cardData).then(iconBlob => {
      if (!iconBlob) {
        return;
      }

      var iconUrl = URL.createObjectURL(iconBlob.blob);
      container.dataset.iconUrl = iconUrl;

      icon.style.backgroundImage = 'url(' + iconUrl + ')';
      container.appendChild(icon);
    });

    if (cardData.screenshot || cardData.tile) {
      var img = cardData.screenshot || cardData.tile;
      var imgUrl = (typeof img === 'string') ? img : URL.createObjectURL(img);
      container.style.backgroundImage = 'url(' + imgUrl + ')';
    }

    if (cardData.url) {
      container.dataset.url = cardData.url;
    }

    container.appendChild(header);
    container.appendChild(content);

    return {
      element: container
    };
  };

  exports.PinCard = PinCard;
}(window));
