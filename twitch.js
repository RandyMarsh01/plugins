(function () {
    'use strict';

    // Публичный ключ веб-клиента Twitch
    var CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

    function TwitchComponent(object) {
        var comp = new Lampa.InteractionCategory(object);

        // 1. ОТРИСОВКА КАТАЛОГА (ТОП СТРИМОВ)
        comp.create = function () {
            var _this = this;
            this.activity.loader(true);

            // GQL запрос для получения 24 популярных стримов
            var query = 'query { streams(first: 24) { edges { node { title viewersCount previewImageURL(width: 400, height: 225) broadcaster { login displayName } } } } }';

            $.ajax({
                url: 'https://gql.twitch.tv/gql',
                type: 'POST',
                headers: { 'Client-ID': CLIENT_ID },
                data: JSON.stringify({ query: query }),
                success: function (res) {
                    if (res.data && res.data.streams && res.data.streams.edges) {
                        var results = [];
                        res.data.streams.edges.forEach(function (edge) {
                            var node = edge.node;
                            var bc = node.broadcaster;

                            results.push({
                                title: '🔴 ' + node.viewersCount + ' зрителей',
                                name: bc.displayName + ' - ' + node.title,
                                img: node.previewImageURL,
                                poster: node.previewImageURL,
                                background_image: node.previewImageURL,
                                login: bc.login // Сохраняем логин стримера для запуска видео
                            });
                        });

                        _this.build({ results: results });
                        comp.render().find('.category-full').addClass('mapping--grid cols--6');
                    } else {
                        _this.empty();
                    }
                },
                error: function () {
                    _this.empty();
                }
            });
        };

        // 2. ЗАПУСК ВИДЕО (ИЗВЛЕЧЕНИЕ ПРЯМОЙ ССЫЛКИ M3U8)
        comp.cardRender = function (object, element, card) {
            card.onEnter = function () {
                Lampa.Loading.start();

                // Шаг А: Запрашиваем токен и подпись для конкретного канала
                var tokenQuery = 'query { streamPlaybackAccessToken(channelName: "' + element.login + '", params: {platform: "web", playerBackend: "mediaplayer", playerType: "site"}) { value signature } }';

                $.ajax({
                    url: 'https://gql.twitch.tv/gql',
                    type: 'POST',
                    headers: { 'Client-ID': CLIENT_ID },
                    data: JSON.stringify({ query: tokenQuery }),
                    success: function (res) {
                        if (res.data && res.data.streamPlaybackAccessToken) {
                            var token = res.data.streamPlaybackAccessToken.value;
                            var sig = res.data.streamPlaybackAccessToken.signature;

                            // Шаг Б: Собираем финальную прямую ссылку на трансляцию
                            var m3u8_url = 'https://usher.ttvnw.net/api/channel/hls/' + element.login + '.m3u8' +
                                '?client_id=' + CLIENT_ID +
                                '&token=' + encodeURIComponent(token) +
                                '&sig=' + sig +
                                '&allow_source=true&allow_audio_only=true';

                            Lampa.Loading.stop();

                            // Передаем ссылку в плеер Лампы
                            var video = { title: element.name, url: m3u8_url };
                            Lampa.Player.play(video);
                            Lampa.Player.playlist([video]);
                        } else {
                            Lampa.Loading.stop();
                            Lampa.Noty.show('Стрим оффлайн или недоступен');
                        }
                    },
                    error: function () {
                        Lampa.Loading.stop();
                        Lampa.Noty.show('Ошибка получения ключа Twitch');
                    }
                });
            };
        };
        return comp;
    }

    // ИНИЦИАЛИЗАЦИЯ ПЛАГИНА И КНОПКИ В МЕНЮ
    function startPlugin() {
        window.plugin_twitch_ready = true;
        Lampa.Component.add('twitch', TwitchComponent);

        var icon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>';
        var button = $('<li class="menu__item selector" data-action="twitch"><div class="menu__ico">' + icon + '</div><div class="menu__text">Twitch</div></li>');

        button.on('hover:enter', function () {
            Lampa.Activity.push({ url: '', title: 'Twitch', component: 'twitch', page: 1 });
        });

        $('.menu .menu__list').eq(0).append(button);
    }

    if (!window.plugin_twitch_ready) {
        if (window.appready) startPlugin();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') startPlugin();
            });
        }
    }
})();