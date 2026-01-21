(function () {
    'use strict';

    function rating_kp_imdb(card) {
        // ИСПРАВЛЕНО: Было Reguest, стало Request
        var network = new Lampa.Request(); 
        var clean_title = kpCleanTitle(card.title);
        var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
        var search_year = parseInt((search_date + '').slice(0, 4));
        var orig = card.original_title || card.original_name;
        
        // ИСПРАВЛЕНО: Добавлен прокси для работы в браузере
        var kp_prox = 'https://cors.lampa.stream/'; 
        
        var params = {
            id: card.id,
            url: kp_prox + 'https://kinopoiskapiunofficial.tech/',
            rating_url: kp_prox + 'https://rating.kinopoisk.ru/',
            headers: {
                'X-API-KEY': '2a4a0808-81a3-40ae-b0d3-e11335ede616'
            },
            cache_time: 60 * 60 * 24 * 1000 
        };

        getRating();

        function getRating() {
            var movieRating = _getCache(params.id);
            if (movieRating) {
                return _showRating(movieRating[params.id]);
            } else {
                searchFilm();
            }
        }

        function searchFilm() {
            var url = params.url;
            var url_by_title = Lampa.Utils.addUrlComponent(url + 'api/v2.1/films/search-by-keyword', 'keyword=' + encodeURIComponent(clean_title));
            
            if (card.imdb_id) url = Lampa.Utils.addUrlComponent(url + 'api/v2.2/films', 'imdbId=' + encodeURIComponent(card.imdb_id));
            else url = url_by_title;

            network.clear();
            network.timeout(15000);
            network.silent(url, function (json) {
                if (json.items && json.items.length) chooseFilm(json.items);
                else if (json.films && json.films.length) chooseFilm(json.films);
                else if (url !== url_by_title) {
                    network.clear();
                    network.silent(url_by_title, function (json) {
                        if (json.items && json.items.length) chooseFilm(json.items);
                        else if (json.films && json.films.length) chooseFilm(json.films);
                        else chooseFilm([]);
                    }, function (a, c) {
                        showError(network.errorDecode(a, c));
                    }, false, { headers: params.headers });
                } else chooseFilm([]);
            }, function (a, c) {
                showError(network.errorDecode(a, c));
            }, false, { headers: params.headers });
        }

        function chooseFilm(items) {
            if (items && items.length) {
                var is_sure = false;
                var id = items[0].kp_id || items[0].kinopoisk_id || items[0].kinopoiskId || items[0].filmId;
                
                // Упрощенная логика: берем первый найденный результат
                if (id) {
                    fetchFinalRating(id);
                }
            }
        }

        function fetchFinalRating(id) {
            network.clear();
            network.timeout(15000);
            network.silent(params.url + 'api/v2.2/films/' + id, function (data) {
                var movieRating = _setCache(params.id, {
                    kp: data.ratingKinopoisk,
                    imdb: data.ratingImdb,
                    timestamp: new Date().getTime()
                });
                _showRating(movieRating);
            }, function (a, c) {
                showError(network.errorDecode(a, c));
            }, false, { headers: params.headers });
        }

        // Вспомогательные функции очистки заголовков
        function cleanTitle(str){ return str.replace(/[\s.,:;’'`!?]+/g, ' ').trim(); }
        function kpCleanTitle(str){ return cleanTitle(str).replace(/^[ \/\\]+/, '').replace(/[ \/\\]+$/, '').replace(/\+( *[+\/\\])+/g, '+'); }

        function _getCache(movie) {
            var cache = Lampa.Storage.cache('kp_rating', 500, {});
            if (cache[movie]) {
                if ((new Date().getTime() - cache[movie].timestamp) > params.cache_time) return false;
                return cache;
            }
            return false;
        }

        function _setCache(movie, data) {
            var cache = Lampa.Storage.cache('kp_rating', 500, {});
            cache[movie] = data;
            Lampa.Storage.set('kp_rating', cache);
            return data;
        }

        function _showRating(data) {
            if (data) {
                var kp_rating = data.kp || '0.0';
                var imdb_rating = data.imdb || '0.0';
                var render = Lampa.Activity.active().activity.render();
                $('.wait_rating', render).remove();
                
                // Ищем или создаем контейнеры рейтинга
                var info = $('.info__rate', render);
                if (!$('.rate--kp', render).length) {
                    info.append('<div class="rate--kp"><span>КП</span><div>' + kp_rating + '</div></div>');
                    info.append('<div class="rate--imdb"><span>IMDb</span><div>' + imdb_rating + '</div></div>');
                } else {
                    $('.rate--kp', render).removeClass('hide').find('> div').text(kp_rating);
                    $('.rate--imdb', render).removeClass('hide').find('> div').text(imdb_rating);
                }
            }
        }
        
        function showError(error) {
            console.log('Rating Error:', error);
        }
    }

    function startPlugin() {
        window.rating_plugin = true;
        Lampa.Listener.follow('full', function (e) {
            // ИСПРАВЛЕНО: Было complite, стало complete
            if (e.type == 'complete') { 
                var render = e.object.activity.render();
                if (!$('.wait_rating', render).length) {
                    $('.info__rate', render).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div><div>');
                    rating_kp_imdb(e.data.movie);
                }
            }
        });
    }

    if (!window.rating_plugin) startPlugin();
})();