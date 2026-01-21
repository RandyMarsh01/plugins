(function () {
    'use strict';

    // ЭТО ДОЛЖНО ПОЯВИТЬСЯ В КОНСОЛИ СРАЗУ
    console.log('KP Rating: Script file loaded and executing...');

    function startPlugin() {
        if (window.rating_kp_plugin_loaded) return;
        window.rating_kp_plugin_loaded = true;

        console.log('KP Rating: Plugin successfully started');

        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complete') {
                console.log('KP Rating: Card opened -', e.data.movie.title || e.data.movie.name);
                var card = e.data.movie;
                var render = e.object.activity.render();
                var container = $('.info__rate', render);

                if (!container.length) container = render.find('.full-start__items');

                if (container.length && !container.find('.kp-rating-custom').length) {
                    var loader = $('<span class="kp-rating-custom" style="margin-left: 10px; opacity: 0.5;">КП: ..</span>');
                    container.append(loader);

                    var network = new Lampa.Request();
                    var title = card.title || card.name;
                    var url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

                    network.silent(url, function (json) {
                        var film = (json.films || [])[0];
                        if (film && film.rating && film.rating !== 'null') {
                            loader.text('КП: ' + film.rating).css({
                                'background': '#f50', 'color': '#fff', 'padding': '2px 6px', 'border-radius': '4px', 'font-weight': 'bold', 'opacity': '1'
                            });
                        } else {
                            loader.remove();
                        }
                    }, function () {
                        loader.remove();
                    }, false, {
                        headers: { 'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' }
                    });
                }
            }
        });
    }

    // Запускаем немедленно и на всякий случай вешаем на события
    startPlugin();
    
    if (!window.appready) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();