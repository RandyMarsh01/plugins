(function () {
    'use strict';

    // Настройки и API ключи
    var KP_API_KEY = '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4';
    var OMDB_API_KEY = '12c9249c';

    // Добавляем переводы
    Lampa.Lang.add({
        source_kp: { ru: 'Кинопоиск', en: 'Kinopoisk', uk: 'Кінопошук' },
        source_imdb: { ru: 'IMDb', en: 'IMDb', uk: 'IMDb' },
        source_rt: { ru: 'Rotten Tomatoes', en: 'Rotten Tomatoes', uk: 'Rotten Tomatoes' },
        source_mc: { ru: 'Metacritic', en: 'Metacritic', uk: 'Metacritic' }
    });

    // Стили для красивых плашек
    var style = "<style id=\"super_ratings_plugin\">" +
        ".full-start-new__rate-line { display: flex !important; visibility: visible !important; flex-wrap: wrap; gap: 0.6em; }" +
        ".rate--kp { order: 1; color: #fff !important; background: #f50; }" +
        ".rate--imdb { order: 2; color: #000 !important; background: #f5c518; }" +
        ".rate--rt { order: 3; color: #fff !important; background: #fa320a; }" +
        ".rate--mc { order: 4; color: #fff !important; background: #66cc33; }" +
        ".full-start__rate { display: flex; align-items: center; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.9em; }" +
        ".source--name { margin-left: 6px; opacity: 1; font-weight: normal; font-size: 0.8em; }" +
        "</style>";

    if (!$('#super_ratings_plugin').length) $('body').append(style);

    function fetchAllRatings(card) {
        var render = Lampa.Activity.active().activity.render();
        var rateLine = $('.full-start-new__rate-line', render);

        // 1. Полная очистка контейнера (удаляем TMDB и всё лишнее)
        rateLine.empty();

        var network = new Lampa.Reguest();
        var title = cleanTitle(card.title || card.name);
        var original_title = card.original_title || card.original_name;
        var year = parseInt((card.release_date || card.first_air_date || '0000').slice(0, 4));

        // --- ШАГ 1: Поиск по Кинопоиску ---
        var kp_search_url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

        network.silent(kp_search_url, function (json) {
            var film = null;
            var items = json.films || json.items || [];

            // Логика выбора правильного фильма (из ratings.js)
            if (items.length) {
                // Фильтр по году (плюс-минус 1 год)
                var year_match = items.filter(function (f) {
                    var f_year = parseInt(f.year || f.start_date || '0000');
                    return f_year >= year - 1 && f_year <= year + 1;
                });
                
                // Если есть совпадение по году, ищем точное совпадение по названию
                if (year_match.length) {
                    film = year_match[0]; // Берем первый подходящий по году
                    // Можно улучшить проверку названия, если нужно, но по году обычно достаточно
                } else {
                    film = items[0]; // Если год не совпал, берем просто первый результат (рискованно, но лучше чем ничего)
                }
            }

            // Если фильм найден на КП
            if (film) {
                var kp_id = film.filmId || film.kinopoiskId;
                
                // Сразу рисуем рейтинг из поиска (быстро)
                if (film.rating && film.rating !== 'null') {
                    drawRating(rateLine, 'kp', film.rating, 'source_kp');
                }

                // Запрашиваем детали КП для получения точного рейтинга и IMDb ID
                var kp_detail_url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id;
                
                network.silent(kp_detail_url, function (data) {
                    // Обновляем КП рейтинг на более точный
                    if (data.ratingKinopoisk) drawRating(rateLine, 'kp', data.ratingKinopoisk, 'source_kp');
                    
                    // Если у нас есть IMDb рейтинг от КП - рисуем
                    if (data.ratingImdb) drawRating(rateLine, 'imdb', data.ratingImdb, 'source_imdb');

                    // --- ШАГ 2: Запрос к OMDB (для RT и Metacritic) ---
                    // Берем ID либо из карточки Лампы, либо из ответа КП
                    var imdb_id = card.imdb_id || data.imdbId;
                    
                    if (imdb_id) {
                        fetchOmdb(imdb_id, rateLine);
                    }
                }, function(){
                    // Если детали КП не загрузились, пробуем OMDB если есть ID в карточке
                    if(card.imdb_id) fetchOmdb(card.imdb_id, rateLine);
                }, false, { headers: { 'X-API-KEY': KP_API_KEY } });

            } else {
                // Если на КП не нашли, но в карточке есть IMDb ID - пробуем хотя бы OMDB
                if (card.imdb_id) fetchOmdb(card.imdb_id, rateLine);
            }

        }, function () {
            // Ошибка сети КП
             if (card.imdb_id) fetchOmdb(card.imdb_id, rateLine);
        }, false, { headers: { 'X-API-KEY': KP_API_KEY } });
    }

    // Запрос к OMDB
    function fetchOmdb(imdb_id, rateLine) {
        var url = 'https://www.omdbapi.com/?apikey=' + OMDB_API_KEY + '&i=' + imdb_id;
        
        new Lampa.Reguest().silent(url, function (data) {
            if (data && data.Response === 'True') {
                // IMDb (обновляем/рисуем, если есть)
                if (data.imdbRating && data.imdbRating !== 'N/A') {
                    drawRating(rateLine, 'imdb', data.imdbRating, 'source_imdb');
                }

                // Rotten Tomatoes
                var rt = (data.Ratings || []).find(function (i) { return i.Source === 'Rotten Tomatoes'; });
                if (rt) {
                    // Убираем знак процента для чистоты числа
                    drawRating(rateLine, 'rt', rt.Value, 'source_rt');
                }

                // Metacritic
                var mc = (data.Ratings || []).find(function (i) { return i.Source === 'Metacritic'; });
                if (mc) {
                    var mcVal = mc.Value.split('/')[0]; // Берем "85" из "85/100"
                    drawRating(rateLine, 'mc', mcVal, 'source_mc');
                }
            }
        });
    }

    // Функция отрисовки плашки
    function drawRating(container, type, value, langKey) {
        if (!value || value == 'null' || value == '0') return;

        // Форматируем значение (если это число, оставляем 1 знак, если строка типа "98%" - оставляем как есть)
        var displayValue = value;
        if (!isNaN(parseFloat(value)) && type !== 'rt') {
             displayValue = parseFloat(value).toFixed(1);
        }

        // Проверяем, есть ли уже такая плашка (чтобы обновить, а не дублировать)
        var existing = container.find('.rate--' + type);
        if (existing.length) {
            existing.find('div:first-child').text(displayValue);
        } else {
            var el = $('<div class="full-start__rate rate--' + type + '"><div>' + displayValue + '</div><div class="source--name">' + Lampa.Lang.translate(langKey) + '</div></div>');
            container.append(el);
        }
    }

    // Вспомогательная функция очистки названия
    function cleanTitle(str) {
        return str.replace(/[\s.,:;’'`!?]+/g, ' ').trim();
    }

    // Запуск плагина
    function startPlugin() {
        window.super_ratings_plugin = true;
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                // Небольшая задержка для корректной отрисовки
                setTimeout(function () {
                    fetchAllRatings(e.data.movie);
                }, 300);
            }
        });
    }

    if (!window.super_ratings_plugin) startPlugin();
})();