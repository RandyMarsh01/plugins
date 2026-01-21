(function () {
    'use strict';

    function Porntrex(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="category-full"></div>');
        var info;
        var last;
        var wait;

        // Настройки адресов
        var host = 'https://www.porntrex.com';
        var proxy = 'https://cors.lampa.stream/';

        this.create = function () {
            var _this = this;
            
            // Создаем экран ожидания
            wait = Lampa.Template.get('loader');
            html.append(wait);
            html.append(scroll.render());
            scroll.append(body);

            // Обработка фокуса на плитке (показ названия)
            scroll.onWheel = function () {
                Lampa.Focus.set(body);
            };

            return html;
        };

        this.start = function () {
            this.load();
        };

        this.load = function () {
            var _this = this;
            var url = proxy + host + (object.query ? '/search/' + encodeURIComponent(object.query) + '/' : '/most-recent/') + '?p=' + object.page;

            network.silent(url, function (str) {
                wait.remove();
                _this.parse(str);
            }, function () {
                Lampa.Noty.show('Ошибка загрузки Porntrex');
            });
        };

        this.parse = function (str) {
            var _this = this;
            var cards = $(str).find('.item-video, .video-item, .thumb-block');

            if (cards.length > 0) {
                cards.each(function () {
                    var $this = $(this);
                    var link = $this.find('a').first();
                    var img = $this.find('img').attr('data-src') || $this.find('img').attr('src');
                    var time = $this.find('.duration, .time').text().trim();

                    if (link.attr('href')) {
                        var card_data = {
                            title: link.attr('title') || $this.find('.title').text().trim(),
                            url: host + link.attr('href'),
                            img: img,
                            time: time
                        };

                        // Создаем визуальную плитку в стиле Lampa
                        var card = Lampa.Template.get('card', {title: card_data.title});
                        card.addClass('card--collection');
                        card.find('.card__img').attr('src', card_data.img);
                        card.find('.card__age').text(card_data.time);

                        card.on('hover:focus', function () {
                            last = card[0];
                        });

                        card.on('hover:enter', function () {
                            _this.play(card_data);
                        });

                        body.append(card);
                        items.push(card);
                    }
                });

                Lampa.Controller.enable('content');
            } else {
                body.append('<div class="empty">Ничего не найдено</div>');
            }
        };

        this.play = function (data) {
            Lampa.Noty.show('Извлекаю видео...');
            network.silent(proxy + data.url, function (html) {
                var video_url = '';
                var config = html.match(/flashvars\s*=\s*({.*?});/i);
                if (config) {
                    try {
                        var parsed = JSON.parse(config[1]);
                        video_url = parsed.video_url || parsed.url;
                    } catch (e) {}
                }

                if (video_url) {
                    // Запуск плеера Lampa
                    Lampa.Player.play({
                        url: video_url,
                        title: data.title
                    });
                    Lampa.Player.callback(function () {
                        Lampa.Controller.toggle('content');
                    });
                } else {
                    Lampa.Noty.show('Не удалось найти видео-поток');
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
    }

    // Регистрация в меню Lampa
    function init() {
        // Добавляем пункт в боковое меню
        var menu_item = $('<li class="menu__item selector" data-action="porntrex">' +
            '<div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="white"/></svg></div>' +
            '<div class="menu__text">Porntrex</div>' +
        '</li>');

        $('.menu .menu__list').append(menu_item);

        // Обработка клика по меню
        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'Porntrex',
                component: 'porntrex',
                page: 1
            });
        });

        // Регистрируем компонент в системе
        Lampa.Component.add('porntrex', Porntrex);
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') init();
    });

})();