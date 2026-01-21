(function () {
    'use strict';

    // Генерируем ID устройства как в sena.js
    var luid = Lampa.Storage.get('lampac_unic_id', '');
    if (!luid) {
        luid = Lampa.Utils.uid(8).toLowerCase();
        Lampa.Storage.set('lampac_unic_id', luid);
    }

    var Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var body = $('<div class="category-full__body"></div>');
        var html = $('<div class="category-full"></div>');
        
        // Используем защищенный прокси, который реже блокируется Cloudflare
        var proxy = 'https://api.codetabs.com/v1/proxy?quest=';
        var host = 'https://www.porntrex.com';

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            return html;
        };

        this.start = function () {
            var _this = this;
            
            // Первая плитка для вызова меню (чтобы не было пустых экранов)
            var menu_card = Lampa.Template.get('card', {title: '🔍 МЕНЮ / ПОИСК'});
            menu_card.addClass('card--collection');
            menu_card.find('.card__img').css('background', '#333');
            menu_card.on('hover:enter', function() { _this.showMenu(); });
            body.append(menu_card);

            Lampa.Loading.start();
            this.load();
        };

        this.showMenu = function() {
            var _this = this;
            Lampa.Select.show({
                title: 'Разделы Porntrex',
                items: [
                    {title: '🔍 Поиск', search: true},
                    {title: '🆕 Новинки', url: '/videos/'},
                    {title: '🔥 Популярные', url: '/most-popular/'},
                    {title: '📁 Milf', url: '/categories/milf/'},
                    {title: '📁 Anal', url: '/categories/anal/'}
                ],
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
            var target = host + (object.url || '/videos/') + '?p=' + (object.page || 1);
            
            // Используем эмуляцию браузера в заголовках
            network.silent(proxy + encodeURIComponent(target), function (str) {
                Lampa.Loading.stop();
                if (str && str.indexOf('<html') !== -1) {
                    _this.parse(str);
                } else {
                    _this.empty('Сайт заблокировал запрос. Попробуйте сменить VPN.');
                }
            }, function () {
                Lampa.Loading.stop();
                _this.empty('Прокси-сервер перегружен. Нажмите МЕНЮ для смены раздела.');
            }, false, {
                dataType: 'text',
                headers: { 'User-Agent': 'Mozilla/5.0 Lampa/' + luid }
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
                        url: host + a.attr('href'),
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
            Lampa.Noty.show('Загрузка...');
            network.silent(proxy + encodeURIComponent(data.url), function(html) {
                var match = html.match(/"video_url":"(.*?)"/) || html.match(/source\s*src="(.*?)"/);
                var stream = match ? match[1].replace(/\\/g, '') : '';
                if (stream) {
                    Lampa.Player.play({ url: stream.startsWith('//') ? 'https:' + stream : stream, title: data.title });
                } else {
                    Lampa.Noty.show('Видео не найдено');
                }
            });
        };

        this.empty = function(m) { body.append('<div class="empty">'+m+'</div>'); };
        this.render = function () { return html; };
        this.destroy = function () { network.clear(); scroll.destroy(); html.remove(); };
    };

    function init() {
        Lampa.Component.add('porntrex', Porntrex);
        var btn = $('<li class="menu__item selector" data-action="porntrex"><div class="menu__ico"><svg viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M10 16.5V7.5L16 12L10 16.5ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"/></svg></div><div class="menu__text">Porntrex</div></li>');
        btn.on('hover:enter', function () { Lampa.Activity.push({ title: 'Porntrex', component: 'porntrex', page: 1 }); });
        $('.menu .menu__list').first().append(btn);
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();