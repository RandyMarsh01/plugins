(function () {
    'use strict';

    function startPlugin() {
        console.log('KP Rating: Plugin started');

        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complete') {
                var card = e.data.movie;
                var render = e.object.activity.render();
                var container = $('.info__rate', render);

                // Если уже добавили или нет места куда добавлять - выходим
                if (container.find('.custom-rating').length || !container.length) return;

                // Сразу добавим индикатор загрузки
                var loader = $('<span class="custom-rating">...</span>');
                container.append(loader);

                var network = new Lampa.Request();
                var clean_title = card.title || card.name;
                var url = 'https://cors.lampa.stream/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(clean_title);

                network.silent(url, function (json) {
                    var film = (json.films || [])[0];
                    if (film) {
                        var kp = film.rating || '0';
                        loader.text(' КП: ' + kp).css({
                            'margin-left': '10px',
                            'color': '#ff5c00',
                            'font-weight': 'bold'
                        });
                    } else {
                        loader.remove();
                    }
                }, function () {
                    loader.remove();
                }, false, {
                    headers: { 'X-API-KEY': '653f6b8a-d94a-43c6-93af-6ce67a2cc5c4' }
                });
            }
        });
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();