(function () {
    'use strict';

    function rating_kp_imdb(card) {
        var network = new Lampa.Reguest();
        var clean_title = kpCleanTitle(card.title);
        var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
        var search_year = parseInt((search_date + '').slice(0, 4));
        
        // Используем прокси для стабильности и обхода CORS
        var kp_prox = 'https://cors.lampa.stream/'; 
        
        var params = {
            id: card.id,
            url: kp_prox + 'https://kinopoiskapiunofficial.tech/',
            headers: {
                'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' // Твой личный ключ
            },
            cache_time: 86400000 // Кэшируем на 24 часа
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
            var url = params.url + 'api/v2.2/films';
            
            // Если в карточке Lampa есть IMDB ID, ищем по нему (самый точный способ)
            if (card.imdb_id) {
                url = Lampa.Utils.addUrlComponent(url, 'imdbId=' + encodeURIComponent(card.imdb_id));
            } else {
                // Иначе ищем по названию
                url = params.url + 'api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(clean_title);
            }

            network.clear();
            network.timeout(10000);
            network.silent(url, function (json) {
                var items = json.items || json.films || [];
                if (items.length) {
                    chooseFilm(items);
                } else {
                    _showRating({kp: 0, imdb: 0});
                }
            }, function (a, c) {
                _showRating({kp: 0, imdb: 0});
                console.log('Rating error:', network.errorDecode(a, c));
            }, false, {
                headers: params.headers
            });
        }

        function chooseFilm(items) {
            // Выбираем результат, подходящий по году
            var selected = items[0]; 
            if (items.length > 1 && search_year) {
                var filter = items.filter(function(i) { 
                    var y = i.year || (i.start_date ? i.start_date.slice(0,4) : 0);
                    return y == search_year;
                });
                if (filter.length) selected = filter[0];
            }

            var id = selected.kinopoiskId || selected.filmId;
            
            // Запрашиваем полные данные фильма, где есть все рейтинги
            network.clear();
            network.silent(params.url + 'api/v2.2/films/' + id, function (data) {
                var movieRating = _setCache(params.id, {
                    kp: data.ratingKinopoisk || 0,
                    imdb: data.ratingImdb || 0,
                    timestamp: new Date().getTime()
                });
                _showRating(movieRating);
            }, function () {
                _showRating({kp: 0, imdb: 0});
            }, false, {
                headers: params.headers
            });
        }

        function kpCleanTitle(str){
            return str ? str.replace(/[\s.,:;’'`!?]+/g, ' ').trim() : '';
        }

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
            var render = Lampa.Activity.active().activity.render();
            $('.wait_rating', render).remove();
            
            if (data) {
                var kp = data.kp ? parseFloat(data.kp).toFixed(1) : '0.0';
                var imdb = data.imdb ? parseFloat(data.imdb).toFixed(1) : '0.0';

                var target = $('.info__rate', render);
                if (target.length) {
                    // Создаем блоки, если их нет в шаблоне
                    if (!$('.rate--kp', render).length) {
                        target.append('<div class="rate--kp hide"><div></div><span>Кинопоиск</span></div>');
                    }
                    if (!$('.rate--imdb', render).length) {
                        target.append('<div class="rate--imdb hide"><div></div><span>IMDb</span></div>');
                    }

                    var kp_obj = $('.rate--kp', render);
                    var imdb_obj = $('.rate--imdb', render);

                    if (kp > 0) kp_obj.removeClass('hide').find('> div').text(kp);
                    if (imdb > 0) imdb_obj.removeClass('hide').find('> div').text(imdb);
                }
            }
        }
    }

    function startPlugin() {
        window.rating_plugin = true;
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var render = e.object.activity.render();
                // Проверяем, не добавлен ли уже рейтинг, чтобы не дублировать
                if (!$('.wait_rating', render).length && !$('.rate--kp', render).not('.hide').length) {
                    $('.info__rate', render).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div><div>');
                    rating_kp_imdb(e.data.movie);
                }
            }
        });
    }

    if (!window.rating_plugin) startPlugin();
})();
