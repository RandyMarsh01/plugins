(function () {
    'use strict';

    function startPlugin() {
        if (window.rating_kp_plugin_loaded) return;
        window.rating_kp_plugin_loaded = true;

        console.log('KP Rating: Plugin initialized and watching for cards');

        Lampa.Listener.follow('full', function (e) {
            // Событие 'complete' срабатывает, когда карточка полностью отрисована
            if (e.type == 'complete') {
                console.log('KP Rating: Card opened -', e.data.movie.title || e.data.movie.name);
                
                var card = e.data.movie;
                var render = e.object.activity.render();
                var container = $('.info__rate', render);

                if (!container.length) {
                    // Если стандартный контейнер не найден, пробуем найти по другому селектору
                    container = render.find('.full-start__items');
                }

                if (container.length && !container.find('.kp-rating-custom').length) {
                    fetchRating(card, container);
                }
            }
        });
    }

    function fetchRating(card, container) {
        var network = new Lampa.Request();
        var title = card.title || card.name;
        var year = card.release_date || card.first_air_date || '';
        year = year.slice(0, 4);

        // Показываем временный статус загрузки
        var loader = $('<span class="kp-rating-custom" style="margin-left: 10px; opacity: 0.5;">КП: ..</span>');
        container.append(loader);

        var url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

        network.silent(url, function (json) {
            var items = json.films || [];
            var film = items[0];

            // Если результатов много, пытаемся найти совпадение по году
            if (items.length > 1 && year) {
                var found = items.find(function(f) { return f.year == year; });
                if (found) film = found;
            }

            if (film && (film.rating && film.rating !== 'null')) {
                console.log('KP Rating: Found rating for ' + title + ' is ' + film.rating);
                loader.text('КП: ' + film.rating).css({
                    'background': '#f50',
                    'color': '#fff',
                    'padding': '2px 6px',
                    'border-radius': '4px',
                    'font-weight': 'bold',
                    'opacity': '1'
                });
            } else {
                console.log('KP Rating: No rating found for ' + title);
                loader.remove();
            }
        }, function (a, c) {
            console.log('KP Rating: Network error', a, c);
            loader.remove();
        }, false, {
            headers: { 'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' }
        });
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();