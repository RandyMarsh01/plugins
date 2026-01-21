(function () {
    'use strict';

    window.Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-full__body"></div>');
        var host = 'https://www.porntrex.com';
        var proxy = 'https://cors.lampa.stream/';

        this.create = function () {
            var _this = this;
            if (this.activity && this.activity.loader) this.activity.loader(true);
            html.append(scroll.render());
            scroll.append(body);
            this.load();
            return html;
        };

        this.load = function () {
            var _this = this;
            // ИСПРАВЛЕНИЕ: Новые пути Porntrex. Если нет поиска, используем /videos/
            var path = object.query ? '/search/' + encodeURIComponent(object.query) + '/' : '/videos/';
            var url = proxy + host + path + '?p=' + (object.page || 1);

            network.silent(url, function (str) {
                if (_this.activity && _this.activity.loader) _this.activity.loader(false);
                _this.parse(str);
            }, function () {
                // Если /videos/ выдал 404, пробуем главную
                if (!object.query) {
                    _this.tryAlternative();
                } else {
                    if (_this.activity && _this.activity.loader) _this.activity.loader(false);
                    Lampa.Noty.show('Porntrex недоступен (404)');
                }
            });
        };

        this.tryAlternative = function() {
            var _this = this;
            network.silent(proxy + host + '/?p=' + (object.page || 1), function(str) {
                if (_this.activity && _this.activity.loader) _this.activity.loader(false);
                _this.parse(str);
            });
        };

        this.parse = function (str) {
            var _this = this;
            // Обновленные селекторы: сайт часто использует thumb-block или просто video-item
            var cards = $(str).find('.item-video, .video-item, .thumb-block, .p-v-thumb');

            if (cards.length > 0) {
                cards.each(function () {
                    var $this = $(this);
                    var link = $this.find('a[href*="/video/"]').first();
                    var img = $this.find('img').attr('data-src') || $this.find('img').attr('src');
                    var time = $this.find('.duration, .time, .t-length').text().trim();

                    if (link.attr('href')) {
                        var card_data = {
                            title: link.attr('title') || $this.find('.title, .name').text().trim() || 'Video',
                            url: host + link.attr('href'),
                            img: img,
                            time: time
                        };

                        var card = Lampa.Template.get('card', {title: card_data.title});
                        card.addClass('card--collection');
                        card.find('.card__img').attr('src', card_data.img);
                        
                        if (card_data.time) {
                            var age = card.find('.card__age');
                            if (age.length) age.text(card_data.time);
                            else card.find('.card__view').after('<div class="card__age">' + card_data.time + '</div>');
                        }

                        card.on('hover:enter', function () {
                            _this.play(card_data);
                        });

                        body.append(card);
                        items.push(card);
                    }
                });
                Lampa.Controller.enable('content');
            } else {
                body.append('<div class="empty">Контент не найден. Попробуйте позже.</div>');
            }
        };

        this.play = function (data) {
            Lampa.Noty.show('Получение ссылки...');
            network.silent(proxy + data.url, function (html) {
                var video_url = '';
                
                // Ищем все возможные варианты ссылок в скриптах
                var config = html.match(/flashvars\s*=\s*({.*?});/i);
                if (config) {
                    try {
                        var parsed = JSON.parse(config[1]);
                        video_url = parsed.video_url || parsed.url || parsed.video_alt_url;
                    } catch (e) {}
                }
                
                if (!video_url) {
                    // Резервный поиск через регулярки
                    var match = html.match(/"video_url":"(.*?)"/) || 
                                html.match(/video_url:\s*'(.*?)'/) ||
                                html.match(/source\s*src="(.*?)"/);
                    if (match) video_url = match[1].replace(/\\/g, '');
                }

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
                    Lampa.Noty.show('Не удалось извлечь ссылку на видео');
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
            items = [];
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