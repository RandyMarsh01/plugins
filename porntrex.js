(function () {
    'use strict';

    // Используем прокси-сервер, который работает как мост (Bridge)
    // Он забирает данные на стороне сервера и отдает их нам без CORS ограничений
    var Proxy = {
        api: 'https://api.allorigins.win/get?url=',
        host: 'https://www.porntrex.com'
    };

    window.Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var body = $('<div class="category-full__body"></div>');
        var html = $('<div class="category-full"></div>');

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            return html;
        };

        this.start = function () {
            var _this = this;
            Lampa.Background.immediately('');
            
            // Плитка меню (всегда первая)
            var menu_card = Lampa.Template.get('card', {title: 'МЕНЮ И ПОИСК'});
            menu_card.addClass('card--collection');
            menu_card.find('.card__img').css('background', '#e60000');
            menu_card.on('hover:enter', function() { _this.showFilter(); });
            body.append(menu_card);

            this.load();
        };

        this.showFilter = function() {
            var _this = this;
            Lampa.Select.show({
                title: 'Разделы',
                items: [
                    {title: '🔍 Поиск', search: true},
                    {title: '🔥 Новинки', url: '/videos/'},
                    {title: '⭐ Популярные', url: '/most-popular/'},
                    {title: '👩 Категории', categories: true}
                ],
                onSelect: function(item) {
                    if (item.search) {
                        Lampa.Input.edit({title: 'Поиск', value: '', free: true}, function(val) {
                            if (val) {
                                object.url = '/search/' + encodeURIComponent(val) + '/';
                                Lampa.Activity.replace(object);
                            }
                        });
                    } else if (item.categories) {
                        _this.showCategories();
                    } else {
                        object.url = item.url;
                        Lampa.Activity.replace(object);
                    }
                },
                onBack: function() { Lampa.Controller.toggle('content'); }
            });
        };

        this.showCategories = function() {
            Lampa.Select.show({
                title: 'Категории',
                items: [
                    {title: 'Anal', url: '/categories/anal/'},
                    {title: 'Asian', url: '/categories/asian/'},
                    {title: 'Milf', url: '/categories/milf/'},
                    {title: 'Ebony', url: '/categories/ebony/'},
                    {title: 'Homemade', url: '/categories/homemade/'}
                ],
                onSelect: function(item) {
                    object.url = item.url;
                    Lampa.Activity.replace(object);
                }
            });
        };

        this.load = function () {
            var _this = this;
            Lampa.Loading.start();
            
            var path = object.url || '/videos/';
            var targetUrl = Proxy.host + path + '?p=' + (object.page || 1);
            
            // Делаем запрос через AllOrigins с принудительным JSON обертыванием
            // Это гарантированно обходит CORS браузера
            network.silent(Proxy.api + encodeURIComponent(targetUrl), function(json) {
                Lampa.Loading.stop();
                if (json && json.contents) {
                    _this.parse(json.contents);
                } else {
                    _this.empty('Сервер прокси не вернул данные.');
                }
            }, function() {
                Lampa.Loading.stop();
                _this.empty('Сетевая ошибка прокси. Попробуйте без VPN.');
            });
        };

        this.parse = function (str) {
            var _this = this;
            // Убираем скрипты и мусор перед парсингом
            var clean = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
            var dom = $($.parseHTML(clean));
            var cards = dom.find('.video-item, .item-video, .thumb-block');

            cards.each(function () {
                var $this = $(this);
                var a = $this.find('a[href*="/video/"]').first();
                var img = $this.find('img').attr('data-src') || $this.find('img').attr('src');
                var title = a.attr('title') || $this.find('.title, .name').text();

                if (a.attr('href') && title) {
                    var card_data = {
                        title: title.trim(),
                        url: Proxy.host + a.attr('href'),
                        img: img
                    };
                    var card = Lampa.Template.get('card', {title: card_data.title});
                    card.addClass('card--collection');
                    if (card_data.img) {
                        var thumb = card_data.img.startsWith('//') ? 'https:' + card_data.img : card_data.img;
                        card.find('.card__img').attr('src', thumb);
                    }
                    card.on('hover:enter', function () { _this.play(card_data); });
                    body.append(card);
                }
            });

            if (cards.length > 0) {
                var next = $('<div class="category-full__next selector"><span>Показать еще</span></div>');
                next.on('hover:enter', function() {
                    object.page = (object.page || 1) + 1;
                    Lampa.Activity.replace(object);
                });
                body.append(next);
            } else if (body.children().length <= 1) {
                this.empty('На этой странице видео не найдены.');
            }
            Lampa.Controller.enable('content');
        };

        this.play = function (data) {
            Lampa.Noty.show('Загрузка потока...');
            network.silent(Proxy.api + encodeURIComponent(data.url), function(json) {
                if (json && json.contents) {
                    var match = json.contents.match(/"video_url":"(.*?)"/) || json.contents.match(/source\s*src="(.*?)"/);
                    var stream = match ? match[1].replace(/\\/g, '') : '';
                    if (stream) {
                        Lampa.Player.play({
                            url: stream.startsWith('//') ? 'https:' + stream : stream,
                            title: data.title
                        });
                    } else {
                        Lampa.Noty.show('Ссылка на видео не найдена');
                    }
                }
            });
        };

        this.empty = function(m) {
            body.append('<div class="empty">'+m+'</div>');
        };

        this.render = function () { return html; };
        this.destroy = function () { scroll.destroy(); html.remove(); network.clear(); };
    };

    function init() {
        Lampa.Component.add('porntrex', window.Porntrex);
        var btn = $('<li class="menu__item selector" data-action="porntrex">' +
            '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M10 16.5V7.5L16 12L10 16.5ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"/></svg></div>' +
            '<div class="menu__text">Porntrex</div>' +
            '</li>');

        btn.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'Porntrex', component: 'porntrex', page: 1 });
        });
        $('.menu .menu__list').first().append(btn);
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();