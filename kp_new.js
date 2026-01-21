(function () {
    'use strict';

    console.log('--- KP RATING: MONITORING ACTIVE ---');

    function startPlugin() {
        setInterval(function() {
            // Ищем любой элемент, который бывает только в открытой карточке
            var render = $('.full-start, .full-movie, .full-person'); 
            
            if (render.length && !render.find('.kp-rating-tag').length) {
                console.log('KP RATING: Card detected on screen!');
                injectRating(render);
            }
        }, 1000);
    }

    function injectRating(render) {
        // Пробуем достать данные всеми возможными способами Lampa
        var active = Lampa.Activity.active();
        var card = (active && active.card) ? active.card : null;
        
        if (!card) {
            // Если через Activity не вышло, пробуем найти данные в самом объекте рендера
            console.log('KP RATING: Waiting for card data...');
            return;
        }

        var title = card.title || card.name;
        console.log('KP RATING: Target movie ->', title);

        // Ищем место для вставки (перебираем все известные варианты)
        var container = render.find('.info__rate, .full-start__items, .full-movie__coins, .info__right');

        if (container.length) {
            console.log('KP RATING: Container found, sending request...');
            
            var tag = $('<span class="kp-rating-tag" style="margin-left:15px; background:#f50; color:#fff; padding:2px 6px; border-radius:4px; font-weight:bold;">КП: ..</span>');
            // Добавляем в начало контейнера, чтобы точно было видно
            container.first().prepend(tag);

            var network = new Lampa.Request();
            var url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

            network.silent(url, function (json) {
                var film = (json.films || [])[0];
                if (film && film.rating && film.rating !== 'null') {
                    console.log('KP RATING: Found rating:', film.rating);
                    tag.text('КП: ' + film.rating);
                } else {
                    console.log('KP RATING: Movie not found in Kinopoisk');
                    tag.remove();
                }
            }, function (err) {
                console.log('KP RATING: API Request failed');
                tag.remove();
            }, false, {
                headers: { 'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' }
            });
        } else {
            console.log('KP RATING: Could not find any container to inject tag');
        }
    }

    startPlugin();
})();