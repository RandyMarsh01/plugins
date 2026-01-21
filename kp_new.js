(function () {
    'use strict';

    console.log('--- KP PLUGIN: SCRIPT START ---');

    function rating_kp_imdb(card) {
        console.log('--- KP PLUGIN: Searching rating for:', card.title || card.name);
        
        var network = new Lampa.Request(); 
        var clean_title = card.title || card.name;
        var kp_prox = 'https://cors.lampa.stream/'; 
        
        var params = {
            id: card.id,
            url: kp_prox + 'https://kinopoiskapiunofficial.tech/',
            headers: { 'X-API-KEY': '2a4a0808-81a3-40ae-b0d3-e11335ede616' },
            cache_time: 86400000 
        };

        // 1. Пытаемся найти фильм по названию
        var search_url = params.url + 'api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(clean_title);
        
        network.silent(search_url, function (json) {
            var film = (json.films || json.items || [])[0];
            if (film) {
                var kp_id = film.filmId || film.kinopoiskId;
                console.log('--- KP PLUGIN: Found ID:', kp_id);
                
                // 2. Получаем детальный рейтинг
                network.silent(params.url + 'api/v2.2/films/' + kp_id, function (data) {
                    console.log('--- KP PLUGIN: Ratings received:', data.ratingKinopoisk);
                    _showRating({
                        kp: data.ratingKinopoisk,
                        imdb: data.ratingImdb
                    });
                }, function() { console.log('--- KP PLUGIN: Detail request failed'); }, false, { headers: params.headers });
            } else {
                console.log('--- KP PLUGIN: Movie not found on KP');
                $('.wait_rating').remove();
            }
        }, function() { console.log('--- KP PLUGIN: Search request failed'); }, false, { headers: params.headers });

        function _showRating(data) {
            var render = Lampa.Activity.active().activity.render();
            $('.wait_rating', render).remove();
            
            var kp = data.kp || '0.0';
            var imdb = data.imdb || '0.0';

            // Ищем контейнер для вставки
            var container = $('.info__rate', render);
            if(!container.length) container = $('.full-start__items', render);

            console.log('--- KP PLUGIN: Injecting to UI...');
            
            var html = $(`
                <div class="rate--kp" style="margin-right: 15px; background: #f50; border-radius: 4px; padding: 2px 6px;">
                    <span style="font-size: 0.8em; opacity: 0.7;">КП</span>
                    <div style="font-weight: bold;">${kp}</div>
                </div>
                <div class="rate--imdb" style="background: #f3ce13; color: #000; border-radius: 4px; padding: 2px 6px;">
                    <span style="font-size: 0.8em; opacity: 0.7;">IMDb</span>
                    <div style="font-weight: bold;">${imdb}</div>
                </div>
            `);
            
            container.append(html);
        }
    }

    function startPlugin() {
        window.rating_plugin_loaded = true;
        console.log('--- KP PLUGIN: Listener started');

        Lampa.Listener.follow('full', function (e) {
            // Слушаем оба варианта события (с ошибкой и без)
            if (e.type == 'complete' || e.type == 'complite') {
                console.log('--- KP PLUGIN: Full card opened');
                var render = e.object.activity.render();
                
                if (!$('.wait_rating', render).length && !$('.rate--kp', render).length) {
                    $('.info__rate', render).after('<div class="wait_rating" style="margin-left: 10px;">📊</div>');
                    rating_kp_imdb(e.data.movie);
                }
            }
        });
    }

    if (!window.rating_plugin_loaded) startPlugin();
})();