(function () {
    'use strict';

    var Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-full__body"></div>');
        
        // Используем более мощный прокси-агрегатор
        var proxy = 'https://cors-proxy.htmldriven.com/?url=';
        var host = 'https://www.porntrex.com';

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            return html;
        };

        this.start = function () {
            var _this = this;
            
            // Кнопка поиска теперь всегда доступна в шапке (справа)
            this.renderHeader();

            Lampa.Loading.start();
            this.load();
        };

        this.renderHeader = function() {
            var _this = this;
            // Создаем кнопку поиска/фильтра в стиле Lampa (справа)
            var filter_btn = $('<div class="head__action selector head__filter"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" fill="currentColor"/></svg></div>');
            
            filter_btn.on('click', function() {
                _this.showSidebar();
            });

            Lampa.Head.add(filter_btn);
        };

        this.showSidebar = function() {
            var _this = this;
            var menu_items = [
                {title: '🔍 Поиск видео', search: true},
                {title: '🆕 Новинки', url: '/videos/'},
                {title: '🔥 Популярные', url: '/most-popular/'},
                {title: '📅 Топ месяца', url: '/top-rated/month/'},
                {title: '📁 Категория: Milf', url: '/categories/milf/'},
                {title: '📁 Категория: Anal', url: '/categories/anal/'},
                {title: '📁 Категория: Asian', url: '/categories/asian/'}
            ];

            Lampa.Select.show({
                title: 'Фильтры Porntrex',
                items: menu_items,
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
            
            // Пробуем альтернативный метод загрузки
            $.ajax({
                url: proxy + encodeURIComponent(target),
                method: 'GET',
                success: function (data) {
                    Lampa.Loading.stop();
                    // htmldriven может возвращать JSON или строку
                    var html_content = typeof data === 'string' ? data : (data.content || data.body || '');
                    if (html_content) _this.parse(html_content);
                    else _this.empty('Пустой ответ от прокси.');
                },
                error: function () {
                    Lampa.Loading.stop();
                    _this.empty('Прокси недоступен. Попробуйте сменить регион в VPN.');
                }
            });
        };

        this.parse = function (str) {
            var _this = this;
            body.empty();
            var clean = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
            var dom = $($.parseHTML(clean));
            var cards = dom.find('.video-item, .item-video, .thumb-block');

            cards.each(function () {
                var $this = $(this);
                var a = $this.find('a[href*="/video/"]').first();
                var img = $this.find('img').attr('data-src') || $this.find('img').attr('src');
                var title = a.attr('title') || $this.find('.title').text();

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
            Lampa.Noty.show('Запуск видео...');
            $.get(proxy + encodeURIComponent(data.url), function(html) {
                var match = html.match(/"video_url":"(.*?)"/) || html.match(/source\s*src="(.*?)"/);
                var stream = match ? match[1].replace(/\\/g, '') : '';
                if (stream) {
                    Lampa.Player.play({
                        url: stream.startsWith('//') ? 'https:' + stream : stream,
                        title: data.title
                    });
                } else {
                    Lampa.Noty.show('Видео поток не найден');
                }
            });
        };

        this.empty = function(m) {
            body.append('<div class="empty">'+m+'</div>');
        };

        this.render = function () { return html; };
        this.destroy = function () { 
            Lampa.Head.clear(); 
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