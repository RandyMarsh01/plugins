(function() {
    'use strict';
    
    Lampa.Lang.add({
        source_kp: { ru: 'Кинопоиск', en: 'Kinopoisk' },
        source_imdb: { ru: 'IMDb', en: 'IMDb' },
        source_rt: { ru: 'Rotten Tomatoes', en: 'Rotten Tomatoes' },
        source_mc: { ru: 'Metacritic', en: 'Metacritic' }
    });

    var style = "<style id=\"maxsm_omdb_rating\">" +
        ".full-start-new__rate-line { display: flex !important; visibility: visible !important; flex-wrap: wrap; gap: 0.6em; }" +
        ".rate--kp { color: #f50 !important; font-weight: bold; order: 1; }" + 
        ".rate--imdb { color: #f3ce13 !important; order: 2; }" +
        ".rate--rt { order: 3; }" +
        ".rate--mc { order: 4; }" +
        ".full-start__rate { display: flex; align-items: center; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; }" +
        ".source--name { margin-left: 5px; opacity: 0.6; font-size: 0.8em; }" +
        "</style>";
    
    if (!$('#maxsm_omdb_rating').length) $('body').append(style);
    
    var KP_API_KEY = '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4';
    var OMDB_API_KEY = '12c9249c';

    function fetchAdditionalRatings(card) {
        var render = Lampa.Activity.active().activity.render();
        var rateLine = $('.full-start-new__rate-line', render);
        
        // ПОЛНОСТЬЮ ОЧИЩАЕМ КОНТЕЙНЕР (удаляем TMDB и всё остальное)
        rateLine.empty();

        var title = card.title || card.name;
        var year = (card.release_date || card.first_air_date || '0000').slice(0, 4);
        var network = new Lampa.Reguest();
        
        // Запрос к Кинопоиску
        var kp_search = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);
        
        network.silent(kp_search, function(json) {
            var film = (json.films || []).find(function(f) {
                return Math.abs(parseInt(f.year) - parseInt(year)) <= 1;
            }) || (json.films || [])[0];

            if (film) {
                var kp_id = film.filmId || film.kinopoiskId;
                
                // КП из поиска
                updateRateElement(rateLine, 'kp', film.rating, 'Кинопоиск');

                // Уточняем через детали для IMDb ID
                var kp_detail = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id;
                network.silent(kp_detail, function(data) {
                    if (data.ratingKinopoisk) updateRateElement(rateLine, 'kp', data.ratingKinopoisk, 'Кинопоиск');
                    if (data.ratingImdb) updateRateElement(rateLine, 'imdb', data.ratingImdb, 'IMDb');
                    
                    var imdb_id = card.imdb_id || data.imdbId;
                    if (imdb_id) fetchOmdb(imdb_id, rateLine);
                }, false, { headers: { 'X-API-KEY': KP_API_KEY } });
            }
        }, false, { headers: { 'X-API-KEY': KP_API_KEY } });
    }

    function fetchOmdb(imdb_id, rateLine) {
        var url = 'https://www.omdbapi.com/?apikey=' + OMDB_API_KEY + '&i=' + imdb_id;
        new Lampa.Reguest().silent(url, function(data) {
            if (data && data.Response === 'True') {
                var rt = (data.Ratings || []).find(function(i){ return i.Source === 'Rotten Tomatoes' });
                var mc = (data.Ratings || []).find(function(i){ return i.Source === 'Metacritic' });
                
                if (data.imdbRating && data.imdbRating !== 'N/A') updateRateElement(rateLine, 'imdb', data.imdbRating, 'IMDb');
                if (rt) updateRateElement(rateLine, 'rt', parseFloat(rt.Value) / 10, 'Rotten Tomatoes');
                if (mc) updateRateElement(rateLine, 'mc', parseFloat(mc.Value.split('/')[0]) / 10, 'Metacritic');
            }
        });
    }

    function updateRateElement(container, type, value, name) {
        if (!value || value == '0' || value == 'null' || value == 'N/A') return;
        
        var val = parseFloat(value).toFixed(1);
        var existing = container.find('.rate--' + type);
        
        if (existing.length) {
            existing.find('> div:first-child').text(val);
        } else {
            // Создаем плашку в строгом соответствии со стилем Lampa
            var el = $('<div class="full-start__rate rate--' + type + '"><div>' + val + '</div><div class="source--name">' + name + '</div></div>');
            container.append(el);
        }
    }

    function startPlugin() {
        window.kp_rating_clean = true;
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite' || e.type === 'complete') {
                setTimeout(function() {
                    fetchAdditionalRatings(e.data.movie);
                }, 400);
            }
        });
    }

    if (!window.kp_rating_clean) startPlugin();
})();