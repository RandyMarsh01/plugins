(function () {
    'use strict';

    var PorntrexApi = {
        host: 'https://www.porntrex.com',
        
        getHtml: function(url, success, error) {
            var net = new Lampa.Reguest();
            
            // Добавляем заголовки как в sena.js для обхода защиты
            var options = {
                dataType: 'text',
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    'Referer': 'https://www.porntrex.com/',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
                }
            };

            // Используем native запрос
            net.native(url, function(str) {
                if (str && str.length > 500) success(str); // Проверка, что пришел HTML, а не пустая строка
                else error();
            }, error, false, options);
        }
    };

    window.Porntrex = function (object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
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
            
            // Кнопка Меню
            var menu_card = Lampa.Template.get('card', {title: 'МЕНЮ / ПОИСК'});
            menu_card.addClass('card--collection');
            menu_card.find('.card__img').css('background', '#c41c1c').attr('src', ''); 
            menu_card.on('hover:enter', function() { _this.showFilter(); });
            body.append(menu_card);

            this.load();
        };

        this.showFilter = function() {
            var _this = this;
            Lampa.Select.show({
                title: 'Разделы Porntrex',
                items: [
                    {title: '🔍 Поиск видео', search: true},
                    {title: '🆕 Свежее', url: '/videos/'},
                    {title: '📈 Популярное', url: '/most-popular/'},
                    {title: '🏠 Домашнее', url: '/categories/homemade/'},
                    {title: '👩 Milf', url: '/categories/milf/'},
                    {title: '🔞 Anal', url: '/categories/anal/'}
                ],
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
                Lampa.Noty.show('Блокировка провайдером. Включите VPN или прокси в Лампе.');
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
                    if (card_data.img) {
                        var thumb = card_data.img.startsWith('//') ? 'https:' + card_data.img : card_data.img;
                        card.find('.card__img').attr('src', thumb);
                    }
                    
                    card.on('hover:enter', function () { _this.play(card_data); });
                    body.append(card);
                }
            });

            if (cards.length > 0) {
                var next = $('<div class="category-full__next selector"><span>Загрузить еще</span></div>');
                next.on('hover:enter', function() {
                    object.page = (object.page || 1) + 1;
                    Lampa.Activity.replace(object);
                });
                body.append(next);
            }
            Lampa.Controller.enable('content');
        };

        this.play = function (data) {
            Lampa.Noty.show('Стриминг...');
            PorntrexApi.getHtml(data.url, function(html) {
                // Извлекаем прямую ссылку на MP4
                var match = html.match(/"video_url":"(.*?)"/) || html.match(/source\s*src="(.*?)"/);
                var stream = match ? match[1].replace(/\\/g, '') : '';
                
                if (stream) {
                    Lampa.Player.play({
                        url: stream.startsWith('//') ? 'https:' + stream : stream,
                        title: data.title
                    });
                } else {
                    Lampa.Noty.show('Не удалось найти видео-поток');
                }
            }, function() { Lampa.Noty.show('Ошибка парсинга'); });
        };

        this.render = function () { return html; };
        this.destroy = function () { scroll.destroy(); html.remove(); };
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