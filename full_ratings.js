(function () {
    'use strict';

    // 1. Настройки
    var KP_API_KEY = '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4';
    var OMDB_API_KEY = '12c9249c';

    // 2. Переводы
    Lampa.Lang.add({
        source_kp: { ru: 'Кинопоиск', en: 'Kinopoisk', uk: 'Кінопошук' },
        source_imdb: { ru: 'IMDb', en: 'IMDb', uk: 'IMDb' },
        source_rt: { ru: 'Rotten Tomatoes', en: 'Rotten Tomatoes', uk: 'Rotten Tomatoes' },
        source_mc: { ru: 'Metacritic', en: 'Metacritic', uk: 'Metacritic' }
    });

    // 3. Стили (Forced Visibility)
    var css = `
        <style id="super_ratings_style">
            .super-rate-line { 
                display: flex !important; 
                flex-wrap: wrap; 
                gap: 8px; 
                margin-top: 10px; 
                margin-bottom: 10px; 
                visibility: visible !important;
                min-height: 26px; /* Чтобы блок не схлопывался */
            }
            .rate-badge {
                display: flex;
                align-items: center;
                padding: 3px 8px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 0.9em;
                color: #fff;
                white-space: nowrap;
            }
            .rate-badge span { opacity: 0.8; font-weight: normal; margin-left: 6px; font-size: 0.8em; }
            
            /* Цвета и порядок */
            .rate--kp { background: #f50; order: 1; }
            .rate--imdb { background: #f5c518; color: #000 !important; order: 2; }
            .rate--rt { background: #fa320a; order: 3; }
            .rate--mc { background: #66cc33; order: 4; }
            
            .rate-loader { opacity: 0.5; font-size: 0.8em; order: 99; }
        </style>
    `;

    if (!$('#super_ratings_style').length) $('body').append(css);

    // 4. Основная логика
    function fetchAllRatings(card, container) {
        var network = new Lampa.Reguest();
        var title = (card.title || card.name).trim();
        var year = parseInt((card.release_date || card.first_air_date || '0000').slice(0, 4));

        // Индикатор загрузки
        var loader = $('<div class="rate-loader">...</div>');
        container.append(loader);

        // --- ШАГ 1: Кинопоиск ---
        var kp_url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

        network.silent(kp_url, function (json) {
            var film = null;
            var items = json.films || json.items || [];

            // Простая фильтрация по году
            if (items.length) {
                film = items.find(function(f) {
                    var fy = parseInt(f.year || f.start_date || '0000');
                    return Math.abs(fy - year) <= 1;
                }) || items[0];
            }

            if (film) {
                var kp_id = film.filmId || film.kinopoiskId;
                
                // Рисуем быстрый рейтинг из поиска
                if (film.rating && film.rating !== 'null') {
                    drawBadge(container, 'kp', film.rating, 'source_kp');
                }

                // Детали (чтобы получить точный КП и IMDb ID)
                var details_url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.2/films/' + kp_id;
                
                network.silent(details_url, function (data) {
                    // Обновляем КП (если в деталях он точнее)
                    if (data.ratingKinopoisk) drawBadge(container, 'kp', data.ratingKinopoisk, 'source_kp');
                    
                    // Если у КП есть данные об IMDB - рисуем
                    if (data.ratingImdb) drawBadge(container, 'imdb', data.ratingImdb, 'source_imdb');

                    // Запускаем OMDB (используем ID от КП или из Лампы)
                    var imdb_id = data.imdbId || card.imdb_id;
                    if (imdb_id) fetchOmdb(imdb_id, container);
                    
                    loader.remove(); // Убираем загрузку
                }, function() {
                    // Ошибка деталей КП - пробуем OMDB по данным карты
                    if (card.imdb_id) fetchOmdb(card.imdb_id, container);
                    loader.remove();
                }, false, { headers: { 'X-API-KEY': KP_API_KEY } });
            } else {
                // Фильм на КП не найден - пробуем OMDB напрямую
                if (card.imdb_id) fetchOmdb(card.imdb_id, container);
                loader.remove();
            }
        }, function () {
            // Ошибка поиска КП
            if (card.imdb_id) fetchOmdb(card.imdb_id, container);
            loader.remove();
        }, false, { headers: { 'X-API-KEY': KP_API_KEY } });
    }

    // --- ШАГ 2: OMDB (RT + Metacritic) ---
    function fetchOmdb(imdb_id, container) {
        if (!imdb_id) return;
        var url = 'https://www.omdbapi.com/?apikey=' + OMDB_API_KEY + '&i=' + imdb_id;

        new Lampa.Reguest().silent(url, function (data) {
            if (data && data.Response === 'True') {
                // IMDb (если еще не нарисовали или обновить)
                if (data.imdbRating && data.imdbRating !== 'N/A') {
                    drawBadge(container, 'imdb', data.imdbRating, 'source_imdb');
                }

                // Rotten Tomatoes
                var rt = (data.Ratings || []).find(function(i) { return i.Source === 'Rotten Tomatoes'; });
                if (rt) drawBadge(container, 'rt', rt.Value, 'source_rt');

                // Metacritic
                var mc = (data.Ratings || []).find(function(i) { return i.Source === 'Metacritic'; });
                if (mc) drawBadge(container, 'mc', mc.Value.split('/')[0], 'source_mc');
            }
        });
    }

    // Рисовалка плашек
    function drawBadge(container, type, value, lang_key) {
        if (!value || value == 'null' || value == 'N/A') return;

        // Удаляем старый, если есть (чтобы обновить значение)
        container.find('.rate--' + type).remove();

        var text = value;
        // Если это число (КП/IMDb), округляем. Если процент (RT) - оставляем.
        if (!isNaN(parseFloat(value)) && value.indexOf('%') === -1) {
            text = parseFloat(value).toFixed(1);
        }

        var html = `
            <div class="rate-badge rate--${type}">
                ${text} <span>${Lampa.Lang.translate(lang_key)}</span>
            </div>
        `;
        container.append(html);
    }

    // Инициализация
    function startPlugin() {
        window.super_ratings_plugin_v2 = true;

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var render = e.object.activity.render();

                // --- ПОИСК КОНТЕЙНЕРА (Самое важное!) ---
                // Пробуем найти стандартные места, куда Лампа сует рейтинги
                var container = $('.full-start-new__rate-line', render); // Новые темы
                if (!container.length) container = $('.info__rate', render); // Старые темы
                if (!container.length) container = $('.full-start__rate-line', render); // Другие варианты
                
                // Если вообще ничего не нашли, создаем свой контейнер после названия
                if (!container.length) {
                    container = $('<div class="super-rate-line"></div>');
                    $('.full-start__title', render).after(container);
                }

                // Применяем наш класс для стилей и очищаем от мусора (TMDB)
                container.addClass('super-rate-line').empty();

                // Запускаем процесс
                fetchAllRatings(e.data.movie, container);
            }
        });
    }

    if (!window.super_ratings_plugin_v2) startPlugin();
})();