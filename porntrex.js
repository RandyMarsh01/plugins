(function () {
    'use strict';

    window.Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-full__body"></div>');
        
        var host = 'https://www.porntrex.com';
        
        // Расширенный список прокси
        var proxies = [
            'https://cors.lampa.stream/',
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        var currentProxyIndex = 0;

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            return html;
        };

        this.start = function () {
            var _this = this;
            // ИСПОРАВЛЕНИЕ: Добавляем таймаут, чтобы Lampa успела создать Activity
            setTimeout(function() {
                if (_this.activity && _this.activity.loader) _this.activity.loader(true);
                _this.load();
            }, 100);
        };

        this.load = function () {
            var _this = this;
            var path = object.query ? '/search/' + encodeURIComponent(object.query) + '/' : '/videos/';
            var proxy = proxies[currentProxyIndex];
            var url = proxy + host + path + '?p=' + (object.page || 1);

            // Используем нативный метод, чтобы избежать проблем с JSON
            $.ajax({
                url: url,
                method: 'GET',
                dataType: 'text',
                timeout: 10000,
                success: function (str) {
                    if (_this.activity && _this.activity.loader) _this.activity.loader(false);
                    
                    if (str && str.indexOf('<html') !== -1) {
                        _this.parse(str);
                    } else {
                        console.log('Porntrex: Proxy ' + currentProxyIndex + ' returned bad data');
                        _this.nextProxy();
                    }
                },
                error: function () {
                    console.log('Porntrex: Proxy ' + currentProxyIndex + ' failed');
                    _this.nextProxy();
                }
            });
        };

        this.nextProxy = function() {
            currentProxyIndex++;
            if (currentProxyIndex < proxies.length) {
                this.load();
            } else {
                if (this.activity && this.activity.loader) this.activity.loader(false);
                this.empty('Сайт Porntrex недоступен через все прокси. Попробуйте позже.');
            }
        };

        this.empty = function(msg) {
            body.empty().append('<div class="empty">' + msg + '</div>');
        };

        this.parse = function (str) {
            var _this = this;
            var found = 0;
            // Убираем скрипты и стили для облегчения парсинга
            var clean_html = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
            
            var dom = $($.parseHTML(clean_html));
            var cards = dom.find('.item-video, .video-item, .thumb-block, .p-v-thumb');

            cards.each(function () {
                var $this = $(this);
                var link = $this.find('a[href*="/video/"]').first();
                var img = $this.find('img').attr('data-src') || $this.find('img').attr('src');
                var title = link.attr('title') || $this.find('.title, .name').text();

                if (link.attr('href') && title) {
                    found++;
                    var card_data = {
                        title: title.trim(),
                        url: host + link.attr('href'),
                        img: img
                    };

                    var card = Lampa.Template.get('card', {title: card_data.title});
                    card.addClass('card--collection');
                    card.find('.card__img').attr('src', card_data.img);
                    
                    card.on('hover:enter', function () {
                        _this.play(card_data);
                    });

                    body.append(card);
                    items.push(card);
                }
            });

            if (found > 0) {
                Lampa.Controller.enable('content');
            } else {
                this.empty('Видео не найдены. Возможно, сайт под защитой Cloudflare.');
            }
        };

        this.play = function (data) {
            var _this = this;
            Lampa.Noty.show('Поиск потока...');
            
            $.ajax({
                url: proxies[currentProxyIndex] + data.url,
                method: 'GET',
                dataType: 'text',
                success: function(html) {
                    var video_url = '';
                    var match = html.match(/"video_url":"(.*?)"/) || 
                                html.match(/video_url:\s*'(.*?)'/) ||
                                html.match(/source\s*src="(.*?)"/);

                    if (match) video_url = match[1].replace(/\\/g, '');

                    if (video_url) {
                        if (video_url.startsWith('//')) video_url = 'https:' + video_url;
                        Lampa.Player.play({ url: video_url, title: data.title });
                        Lampa.Player.callback(function () { Lampa.Controller.toggle('content'); });
                    } else {
                        Lampa.Noty.show('Ссылка не найдена.');
                    }
                },
                error: function() {
                    Lampa.Noty.show('Ошибка загрузки страницы видео.');
                }
            });
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
        };
    };

    function startPlugin() {
        Lampa.Component.add('porntrex', window.Porntrex);

        var menu_item = $('<li class="menu__item selector" data-action="porntrex">' +
            '<div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 16.5V7.5L16 12L10 16.5ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/></svg></div>' +
            '<div class="menu__text">Porntrex</div>' +
        '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'Porntrex',
                component: 'porntrex',
                page: 1
            });
        });

        var list = $('.menu .menu__list').first();
        if (list.length) {
            list.find('[data-action="porntrex"]').remove();
            list.append(menu_item);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') startPlugin();
    });
})();