(function () {
    'use strict';

    window.Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-full__body"></div>');
        var host = 'https://www.porntrex.com';
        
        // Используем AllOrigins как основной, так как он прошел проверку CORS
        var proxy = 'https://api.allorigins.win/get?url=';

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            return html;
        };

        this.start = function () {
            var _this = this;
            setTimeout(function() {
                if (_this.activity && _this.activity.loader) _this.activity.loader(true);
                _this.load();
            }, 200);
        };

        this.load = function () {
            var _this = this;
            // Для AllOrigins используем главную или /videos/
            var path = object.query ? '/search/' + encodeURIComponent(object.query) + '/' : '/videos/';
            var url = proxy + encodeURIComponent(host + path + '?p=' + (object.page || 1));

            network.silent(url, function (json) {
                if (_this.activity && _this.activity.loader) _this.activity.loader(false);
                
                // AllOrigins всегда возвращает JSON объект с полем contents
                var str = (json && json.contents) ? json.contents : '';

                if (str && str.indexOf('<html') !== -1) {
                    _this.parse(str);
                } else {
                    _this.empty('Сайт вернул пустой контент через прокси.');
                }
            }, function () {
                if (_this.activity && _this.activity.loader) _this.activity.loader(false);
                _this.empty('Прокси-сервер не отвечает.');
            });
        };

        this.empty = function(msg) {
            body.empty().append('<div class="empty">' + msg + '</div>');
        };

        this.parse = function (str) {
            var _this = this;
            var found = 0;
            
            // Упрощаем HTML для парсинга
            var clean_html = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
            var dom = $($.parseHTML(clean_html));
            
            // Расширенный поиск по всем возможным классам плиток Porntrex
            var cards = dom.find('.video-item, .item-video, .thumb-block, .p-v-thumb, .v-thumb, [class*="thumb"]');

            cards.each(function () {
                var $this = $(this);
                // Ищем ссылку, которая ведет на страницу видео
                var link = $this.find('a[href*="/video/"]').first();
                var img_el = $this.find('img').first();
                var img = img_el.attr('data-src') || img_el.attr('src') || img_el.attr('data-original');
                var title = link.attr('title') || $this.find('.title, .name, [class*="title"]').text();
                var time = $this.find('.duration, .time, .t-length').text().trim();

                if (link.attr('href') && title.trim()) {
                    found++;
                    var card_data = {
                        title: title.trim(),
                        url: host + link.attr('href'),
                        img: img,
                        time: time
                    };

                    var card = Lampa.Template.get('card', {title: card_data.title});
                    card.addClass('card--collection');
                    
                    if (card_data.img) {
                        if (card_data.img.startsWith('//')) card_data.img = 'https:' + card_data.img;
                        card.find('.card__img').attr('src', card_data.img);
                    }
                    
                    if (card_data.time) {
                        card.find('.card__view').after('<div class="card__age">' + card_data.time + '</div>');
                    }
                    
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
                this.empty('Видео не найдены. Попробуйте поиск.');
            }
        };

        this.play = function (data) {
            var _this = this;
            Lampa.Noty.show('Получение видео...');
            
            var url = proxy + encodeURIComponent(data.url);
            network.silent(url, function(json) {
                var html = (json && json.contents) ? json.contents : '';
                var video_url = '';
                
                // Ищем прямую ссылку на mp4/m3u8 в коде страницы
                var match = html.match(/"video_url":"(.*?)"/) || 
                            html.match(/video_url:\s*'(.*?)'/) ||
                            html.match(/source\s*src="(.*?)"/);

                if (match) video_url = match[1].replace(/\\/g, '');

                if (video_url) {
                    if (video_url.startsWith('//')) video_url = 'https:' + video_url;
                    
                    Lampa.Player.play({
                        url: video_url,
                        title: data.title
                    });
                    Lampa.Player.callback(function () {
                        Lampa.Controller.toggle('content');
                    });
                } else {
                    Lampa.Noty.show('Не удалось найти поток. Возможно, видео удалено.');
                }
            });
        };

        this.render = function () { return html; };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
        };
    };

    function startPlugin() {
        Lampa.Component.add('porntrex', window.Porntrex);
        var menu_item = $('<li class="menu__item selector" data-action="porntrex"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 16.5V7.5L16 12L10 16.5ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/></svg></div><div class="menu__text">Porntrex</div></li>');
        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'Porntrex', component: 'porntrex', page: 1 });
        });
        var list = $('.menu .menu__list').first();
        if (list.length) {
            list.find('[data-action="porntrex"]').remove();
            list.append(menu_item);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();