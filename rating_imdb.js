(function () {
    'use strict';

    // Эта строка СРАЗУ покажет нам, что загрузилась НОВАЯ версия
    console.log('!!! KP RATING DEBUG: VERSION 3.0 LOADED !!!');

    function init() {
        if (window.kp_rating_installed) return;
        window.kp_rating_installed = true;

        console.log('KP RATING: Monitoring started...');

        Lampa.Listener.follow('full', function (e) {
            console.log('KP RATING: Detected event ->', e.type);

            if (e.type == 'complete' || e.type == 'complite' || e.type == 'ready') {
                var card = e.data.movie;
                var render = e.object.activity.render();
                
                console.log('KP RATING: Trying to inject rating for:', card.title || card.name);

                // Ищем место для вставки (пробуем 3 разных варианта)
                var container = render.find('.info__rate');
                if (!container.length) container = render.find('.full-start__items');
                if (!container.length) container = render.find('.info__right');

                if (container.length) {
                    if (container.find('.kp-rating-tag').length) return;

                    var tag = $('<span class="kp-rating-tag" style="margin-left:10px; color:#f50; font-weight:bold;">КП: ..</span>');
                    container.append(tag);

                    var network = new Lampa.Request();
                    var title = card.title || card.name;
                    var url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

                    network.silent(url, function (json) {
                        var film = (json.films || [])[0];
                        if (film && film.rating && film.rating !== 'null') {
                            console.log('KP RATING: Success!', film.rating);
                            tag.text('КП: ' + film.rating).css({
                                'background': '#f50',
                                'color': '#fff',
                                'padding': '2px 6px',
                                'border-radius': '4px'
                            });
                        } else {
                            tag.remove();
                        }
                    }, function() {
                        tag.remove();
                    }, false, {
                        headers: { 'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' }
                    });
                } else {
                    console.log('KP RATING: ERROR - Could not find container to show rating');
                }
            }
        });
    }

    // Запуск через 1 секунду, чтобы Lampa успела прогрузить свои компоненты
    setTimeout(init, 1000);
})();