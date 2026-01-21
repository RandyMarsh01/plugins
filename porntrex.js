(function () {
    'use strict';

    var Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-full__body"></div>');
        
        // Переключаемся на максимально стабильный прокси для обхода CORS
        var proxy = 'https://api.allorigins.win/get?url=';
        var host = 'https://www.porntrex.com';

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            return html;
        };

        this.start = function () {
            var _this = this;
            
            // Создаем первую карточку-кнопку для вызова поиска/категорий
            var menu_card = Lampa.Template.get('card', {title: '🔍 ВЫБОР КАТЕГОРИИ / ПОИСК'});
            menu_card.addClass('card--collection');
            menu_card.find('.card__img').css('background', '#ff1a1a');
            menu_card.on('hover:enter', function() {
                _this.showMenu();
            });
            body.append(menu_card);

            Lampa.Loading.start();
            this.load();
        };

        this.showMenu = function() {
            var _this = this;
            var list = [
                {title: '🔍 Поиск видео', search: true},
                {title: '🆕 Новинки', url: '/videos/'},
                {title: '🔥 Популярные', url: '/most-popular/'},
                {title: '👩 Milf', url: '/categories/milf/'},
                {title: '🔞 Anal', url: '/categories/anal/'}
            ];

            Lampa.Select.show({
                title: 'Porntrex Меню',
                items: list,
                onSelect: function(item) {
                    if (item.search) {
                        Lampa.Input.edit({title: 'Поиск', value: '', free: true}, function(val) {
                            if (val) {
                                object.url = '/search/' + encodeURIComponent(val) + '/';
                                object.page = 1;
                                Lampa.Activity.replace(object);
                            }
                        });
                    } else {
                        object.url = item.url;
                        object.page = 1;
                        Lampa.Activity.replace(object);
                    }
                },
                onBack: function() {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        this.load = function () {
            var _this = this;
            var path = object.url || '/videos/';
            var target = host + path + '?p=' + (object.page || 1);
            
            // Запрос через silent + encode для обхода CORS
            network.silent(proxy + encodeURIComponent(target), function (json) {
                Lampa.Loading.stop();
                if (json && json.contents) {
                    _this.parse(json.contents);
                } else {
                    _this.empty('Сайт не ответил. Попробуйте нажать кнопку МЕНЮ.');
                }
            }, function () {
                Lampa.Loading.stop();
                _this.empty('Ошибка сети. Проверьте VPN или смените категорию.');
            });
        };

        this.parse = function (str) {
            var _this = this;
            var clean = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
            var dom = $($.parseHTML(clean));
            var cards = dom.find('.video-item, .item-video, .thumb-block, .p-v-thumb');

            cards.each(function () {
                var $this = $(this);
                var a = $this.find('a[href*="/video/"]').first();
                var img = $this.find('img').attr('data-src') || $this.find('img').attr('src');
                var title = a.attr('title') || $this.find('.title, .name').text();

                if (a.attr('href') && title) {
                    var card_data = {
                        title: title.trim(),
                        url: host + a.attr('href'),
                        img: img
                    };
                    var card = Lampa.Template.get('card', {title: card_data.title});
                    card.addClass('card--collection');
                    
                    if (card_data.img) {
                        var thumb = card_data.img.startsWith('//') ? 'https:' + card_data.img : card_data.img;
                        card.find('.card__img').attr('src', thumb);
                    }

                    card.on('hover:enter', function () {
                        _this.play(card_data);
                    });

                    body.append(card);
                    items.push(card);
                }
            });

            if (cards.length > 0) {
                var next = $('<div class="category-full__next selector"><span>Показать еще</span></div>');
                next.on('hover:enter', function() {
                    object.page = (object.page || 1) + 1;
                    Lampa.Activity.replace(object);
                });
                body.append(next);
            }
            Lampa.Controller.enable('content');
        };

        this.play = function (data) {
            Lampa.Noty.show('Загрузка потока...');
            network.silent(proxy + encodeURIComponent(data.url), function(json) {
                var html = json.contents || '';
                var match = html.match(/"video_url":"(.*?)"/) || html.match(/source\s*src="(.*?)"/);
                var stream = match ? match[1].replace(/\\/g, '') : '';
                if (stream) {
                    Lampa.Player.play({
                        url: stream.startsWith('//') ? 'https:' + stream : stream,
                        title: data.title
                    });
                    Lampa.Player.callback(function() { Lampa.Controller.toggle('content'); });
                } else {
                    Lampa.Noty.show('Видео не найдено');
                }
            });
        };

        this.empty = function(m) {
            body.append('<div class="empty">'+m+'</div>');
        };

        this.render = function () { return html; };
        this.destroy = function () { 
            network.clear();
            scroll.destroy(); 
            html.remove(); 
        };
    };

    function init() {
        Lampa.Component.add('porntrex', Porntrex);
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