(function () {
    'use strict';

    console.log('KP Rating: Script version 2.0 loaded');

    function startPlugin() {
        if (window.rating_kp_plugin_loaded) return;
        window.rating_kp_plugin_loaded = true;

        console.log('KP Rating: Plugin monitoring started');

        // Слушаем ВСЕ события в карточке (full)
        Lampa.Listener.follow('full', function (e) {
            // Логируем тип события, чтобы понять, какое именно у тебя срабатывает
            console.log('KP Rating: Event detected:', e.type);

            // Реагируем на любой вариант названия события завершения загрузки
            if (e.type == 'complete' || e.type == 'complite' || e.type == 'ready') {
                console.log('KP Rating: Card ready, fetching data for:', e.data.movie.title || e.data.movie.name);
                
                var card = e.data.movie;
                var render = e.object.activity.render();
                
                // Пробуем несколько вариантов контейнеров, где может быть рейтинг
                var container = $('.info__rate', render);
                if (!container.length) container = $('.full-start__items', render);
                if (!container.length) container = render.find('.info__right'); 

                if (container.length && !container.find('.kp-rating-custom').length) {
                    drawRating(card, container);
                } else {
                    console.log('KP Rating: Container not found or rating already exists');
                }
            }
        });
    }

    function drawRating(card, container) {
        var network = new Lampa.Request();
        var title = card.title || card.name;
        
        var loader = $('<span class="kp-rating-custom" style="margin-left: 10px; color: #aaa;">КП: ..</span>');
        container.append(loader);

        var url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

        network.silent(url, function (json) {
            var film = (json.films || [])[0];
            if (film && film.rating && film.rating !== 'null') {
                loader.text('КП: ' + film.rating).css({
                    'background': '#f50',
                    'color': '#fff',
                    'padding': '2px 6px',
                    'border-radius': '4px',
                    'font-weight': 'bold',
                    'margin-left': '10px'
                });
            } else {
                console.log('KP Rating: Rating is null or film not found');
                loader.remove();
            }
        }, function () {
            loader.remove();
        }, false, {
            headers: { 'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' }
        });
    }

    startPlugin();
})();