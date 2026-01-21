(function () {
    'use strict';

    function startPlugin() {
        // Проверка, чтобы не запускаться дважды
        if (window.rating_kp_plugin_loaded) return;
        window.rating_kp_plugin_loaded = true;

        console.log('KP Rating: Plugin initialized');

        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complete') {
                var card = e.data.movie;
                var render = e.object.activity.render();
                
                // Ищем контейнер для рейтинга
                var container = $('.info__rate', render);
                if (!container.length) return;
                
                // Убираем старый, если есть
                container.find('.kp-rating-custom').remove();

                var network = new Lampa.Request();
                // Используем поиск по названию для простоты
                var title = card.title || card.name;
                var url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(title);

                network.silent(url, function (json) {
                    if (json.films && json.films.length > 0) {
                        var film = json.films[0];
                        var rating = film.rating || '0';
                        
                        var html = $('<span class="kp-rating-custom" style="margin-left: 10px; background: #f50; color: #fff; padding: 0 5px; border-radius: 4px; font-weight: bold;">КП: ' + rating + '</span>');
                        container.append(html);
                    }
                }, function (a, c) {
                    console.log('KP Rating: Network error', a, c);
                }, false, {
                    headers: { 'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' }
                });
            }
        });
    }

    // Запуск
    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();