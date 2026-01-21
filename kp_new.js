(function () {
    'use strict';

    // Метка новой версии
    console.log('--- KP RATING: ULTRA VERSION LOADED ---');

    function startPlugin() {
        // Каждые 500мс проверяем, не открыта ли карточка фильма
        setInterval(function() {
            var render = $('.full-start'); // Основной класс открытой карточки в Lampa
            
            if (render.length && !render.find('.kp-rating-tag').length) {
                // Если карточка на экране и рейтинга еще нет - действуем
                injectRating(render);
            }
        }, 500);
    }

    function injectRating(render) {
        // Пытаемся получить данные о фильме из активности Lampa
        var active = Lampa.Activity.active();
        var card = active ? active.card : (active.data ? active.data.movie : null);

        if (!card) return;

        console.log('KP RATING: Found card on screen:', card.title || card.name);

        // Ищем место для вставки
        var container = render.find('.info__rate');
        if (!container.length) container = render.find('.full-start__items');

        if (container.length) {
            var tag = $('<span class="kp-rating-tag" style="margin-left:15px; background:#f50; color:#fff; padding:2px 6px; border-radius:4px; font-weight:bold;">КП: ..</span>');
            container.append(tag);

            var network = new Lampa.Request();
            var title = card.title || card.name;
            var url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

            network.silent(url, function (json) {
                var film = (json.films || [])[0];
                if (film && film.rating && film.rating !== 'null') {
                    tag.text('КП: ' + film.rating);
                } else {
                    tag.remove();
                }
            }, function() {
                tag.remove();
            }, false, {
                headers: { 'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' }
            });
        }
    }

    // Запуск
    startPlugin();
})();