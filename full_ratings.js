(function() {
    'use strict';
    
    // Добавляем переводы
    Lampa.Lang.add({
        source_kp: { ru: 'Кинопоиск', en: 'Kinopoisk' },
        source_imdb: { ru: 'IMDb', en: 'IMDb' },
        source_rt: { ru: 'Rotten Tomatoes', en: 'Rotten Tomatoes' },
        source_mc: { ru: 'Metacritic', en: 'Metacritic' }
    });

    // Стили плашек
    var style = "<style id=\"maxsm_omdb_rating\">" +
        ".full-start-new__rate-line { visibility: hidden; flex-wrap: wrap; gap: 0.4em 0; }" +
        ".full-start-new__rate-line > * { margin-left: 0 !important; margin-right: 0.6em !important; }" +
        ".rate--kp { color: #f50 !important; font-weight: bold; }" + 
        "</style>";
    
    $('body').append(style);
    
    var KP_API_KEY = '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4';
    var OMDB_API_KEY = '12c9249c';

    function fetchAdditionalRatings(card) {
        var render = Lampa.Activity.active().activity.render();
        if (!render) return;

        var rateLine = $('.full-start-new__rate-line', render);
        rateLine.css('visibility', 'hidden');
        
        // Скрываем стандартный TMDB, так как заменяем его на КП
        $('.rate--tmdb', render).hide();

        var title = card.title || card.name;
        var year = (card.release_date || card.first_air_date || '0000').slice(0, 4);
        var network = new Lampa.Reguest();
        
        // 1. Поиск фильма на Кинопоиске
        var kp_search = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);
        
        network.silent(kp_search, function(json) {
            var film = (json.films || []).find(function(f) {
                return Math.abs(parseInt(f.year) - parseInt(year)) <= 1;
            }) || (json.films || [])[0];

            if (film && (film.filmId || film.kinopoiskId)) {
                var id = film.filmId || film.kinopoiskId;
                var kp_detail = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.2/films/' + id;
                
                // 2. Получение данных о рейтингах КП и IMDb ID
                network.silent(kp_detail, function(data) {
                    var results = {
                        kp: data.ratingKinopoisk || 0,
                        imdb: data.ratingImdb || 0
                    };
                    
                    // 3. Запрос к OMDB для Rotten Tomatoes и Metacritic
                    fetchOmdb(card.imdb_id || data.imdbId, function(omdb) {
                        renderRatings(render, results, omdb);
                    });
                }, function(){ renderRatings(render, {kp:0}); }, false, { headers: { 'X-API-KEY': KP_API_KEY } });
            } else {
                renderRatings(render, {kp:0});
            }
        }, function(){ renderRatings(render, {kp:0}); }, false, { headers: { 'X-API-KEY': KP_API_KEY } });
    }

    function fetchOmdb(imdb_id, callback) {
        if (!imdb_id) return callback(null);
        var url = 'https://www.omdbapi.com/?apikey=' + OMDB_API_KEY + '&i=' + imdb_id;
        new Lampa.Reguest().silent(url, function(data) {
            if (data && data.Response === 'True') {
                var rt = (data.Ratings || []).find(function(i){ return i.Source === 'Rotten Tomatoes' });
                var mc = (data.Ratings || []).find(function(i){ return i.Source === 'Metacritic' });
                callback({
                    rt: rt ? parseFloat(rt.Value) / 10 : 0,
                    mc: mc ? parseFloat(mc.Value.split('/')[0]) / 10 : 0
                });
            } else callback(null);
        }, function(){ callback(null); });
    }

    function renderRatings(render, kp_data, omdb_data) {
        var rateLine = $('.full-start-new__rate-line', render);
        
        // Кинопоиск
        if (kp_data.kp > 0 && !$('.rate--kp', rateLine).length) {
            rateLine.append('<div class="full-start__rate rate--kp"><div>' + parseFloat(kp_data.kp).toFixed(1) + '</div><div class="source--name">Кинопоиск</div></div>');
        }

        // Данные из OMDB (RT и Metacritic)
        if (omdb_data) {
            if (omdb_data.rt > 0 && !$('.rate--rt', rateLine).length) {
                rateLine.append('<div class="full-start__rate rate--rt"><div>' + omdb_data.rt.toFixed(1) + '</div><div class="source--name">Rotten Tomatoes</div></div>');
            }
            if (omdb_data.mc > 0 && !$('.rate--mc', rateLine).length) {
                rateLine.append('<div class="full-start__rate rate--mc"><div>' + omdb_data.mc.toFixed(1) + '</div><div class="source--name">Metacritic</div></div>');
            }
        }

        rateLine.css('visibility', 'visible');
    }

    function startPlugin() {
        window.combined_kp_ratings_no_avg = true;
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite') {
                setTimeout(function() {
                    fetchAdditionalRatings(e.data.movie);
                }, 400);
            }
        });
    }

    if (!window.combined_kp_ratings_no_avg) startPlugin();
})();