(function () {
    'use strict';

    var PorntrexApi = {
        host: 'https://www.porntrex.com',
        proxy: 'https://api.allorigins.win/get?url=',
        
        // Метод загрузки данных (адаптировано из сетевой логики sena.js)
        getHtml: function(url, success, error) {
            var net = new Lampa.Reguest();
            var encodedUrl = this.proxy + encodeURIComponent(url);
            
            net.silent(encodedUrl, function(json) {
                if (json && json.contents) success(json.contents);
                else error();
            }, error);
        }
    };

    window.Porntrex = function (object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-full__body"></div>');

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            return html;
        };

        this.start = function () {
            var _this = this;
            Lampa.Loading.start();
            
            // Добавляем плитку меню как в sena.js (использование Template)
            var menu_card = Lampa.Template.get('card', {title: 'МЕНЮ И ПОИСК'});
            menu_card.addClass('card--collection');
            menu_card.find('.card__img').css('background', '#2c2c2c');
            menu_card.on('hover:enter', function() { _this.showFilter(); });
            body.append(menu_card);

            this.load();
        };

        this.showFilter = function() {
            var _this = this;
            var filters = [
                {title: '🔍 Поиск', search: true},
                {title: '🔥 Новое', url: '/videos/'},
                {title: '⭐ Популярное', url: '/most-popular/'},
                {title: '💎 Топ дня', url: '/top-rated/today/'},
                {title: '📁 Anal', url: '/categories/anal/'},
                {title: '📁 Asian', url: '/categories/asian/'},
                {title: '📁 Milf', url: '/categories/milf/'}
            ];

            Lampa.Select.show({
                title: 'Porntrex',
                items: filters,
                onSelect: function(item) {
                    if (item.search) {
                        Lampa.Input.edit({title: 'Поиск', value: '', free: true}, function(val) {
                            if (val) {
                                object.url = '/search/' + encodeURIComponent(val) + '/';
                                Lampa.Activity.replace(object);
                            }
                        });
                    } else {
                        object.url = item.url;
                        Lampa.Activity.replace(object);
                    }
                },
                onBack: function() { Lampa.Controller.toggle('content'); }
            });
        };

        this.load = function () {
            var _this = this;
            var path = object.url || '/videos/';
            var fullUrl = PorntrexApi.host + path + '?p=' + (object.page || 1);

            PorntrexApi.getHtml(fullUrl, function(str) {
                Lampa.Loading.stop();
                _this.parse(str);
            }, function() {
                Lampa.Loading.stop();
                Lampa.Noty.show('Ошибка загрузки контента');
            });
        };

        this.parse = function (str) {
            var _this = this;
            var dom = $($.parseHTML(str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")));
            var cards = dom.find('.video-item, .item-video, .thumb-block');

            cards.each(function () {
                var $this = $(this);
                var a = $this.find('a[href*="/video/"]').first();
                var img = $this.find('img').attr('data-src') || $this.find('img').attr('src');
                var title = a.attr('title') || $this.find('.title').text();

                if (a.attr('href') && title) {
                    var card_data = {
                        title: title.trim(),
                        url: PorntrexApi.host + a.attr('href'),
                        img: img
                    };
                    var card = Lampa.Template.get('card', {title: card_data.title});
                    card.addClass('card--collection');
                    if (card_data.img) card.find('.card__img').attr('src', card_data.img.startsWith('//') ? 'https:' + card_data.img : card_data.img);
                    
                    card.on('hover:enter', function () { _this.play(card_data); });
                    body.append(card);
                }
            });

            Lampa.Controller.enable('content');
        };

        this.play = function (data) {
            Lampa.Noty.show('Извлечение ссылки...');
            PorntrexApi.getHtml(data.url, function(html) {
                var match = html.match(/"video_url":"(.*?)"/) || html.match(/source\s*src="(.*?)"/);
                var stream = match ? match[1].replace(/\\/g, '') : '';
                
                if (stream) {
                    Lampa.Player.play({
                        url: stream.startsWith('//') ? 'https:' + stream : stream,
                        title: data.title
                    });
                } else {
                    Lampa.Noty.show('Видео недоступно');
                }
            }, function() { Lampa.Noty.show('Ошибка соединения'); });
        };

        this.render = function () { return html; };
        this.destroy = function () { scroll.destroy(); html.remove(); };
    };

    function init() {
        Lampa.Component.add('porntrex', window.Porntrex);
        
        // Кнопка в главное меню Lampa (стиль sena.js)
        var btn = $('<li class="menu__item selector" data-action="porntrex">' +
            '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M10 16.5V7.5L16 12L10 16.5ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"/></svg></div>' +
            '<div class="menu__text">Porntrex</div>' +
            '</li>');

        btn.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'Porntrex',
                component: 'porntrex',
                page: 1
            });
        });

        $('.menu .menu__list').first().append(btn);
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();