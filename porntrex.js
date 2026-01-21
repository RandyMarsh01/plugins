(function () {
    'use strict';

    window.Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-full__body"></div>');
        var host = 'https://www.porntrex.com';
        var proxy = 'https://api.allorigins.win/get?url=';
        
        // Список фильтров (Сортировка)
        var sort_filters = [
            { title: 'Новое', path: '/videos/' },
            { title: 'Популярное', path: '/most-popular/' },
            { title: 'Топ дня', path: '/top-rated/today/' },
            { title: 'Топ месяца', path: '/top-rated/month/' }
        ];

        // Список категорий
        var categories = [
            { title: 'Все', path: '' },
            { title: 'Anal', path: '/categories/anal/' },
            { title: 'Asian', path: '/categories/asian/' },
            { title: 'Milf', path: '/categories/milf/' },
            { title: 'Ebony', path: '/categories/ebony/' },
            { title: 'Group', path: '/categories/group-sex/' },
            { title: 'Blowjob', path: '/categories/blowjob/' }
        ];

        this.create = function () {
            var _this = this;
            
            // 1. Создаем шапку
            var header = $('<div class="category-full__head" style="flex-direction: column; align-items: flex-start; height: auto; padding: 1em;"></div>');
            
            // Кнопка поиска
            var search_btn = $('<div class="category-full__head-item selector" style="background: #3d3d3d; margin-bottom: 0.5em; width: 100%; text-align: center;">🔍 Поиск по Porntrex</div>');
            search_btn.on('hover:enter', function() {
                Lampa.Input.edit({
                    value: '',
                    free: true,
                    title: 'Поиск на Porntrex'
                }, function (new_value) {
                    if (new_value) {
                        object.query = new_value;
                        object.page = 1;
                        Lampa.Activity.replace(object);
                    }
                });
            });
            header.append(search_btn);

            // Ряд сортировки
            var sort_row = $('<div style="display: flex; margin-bottom: 0.5em;"></div>');
            sort_filters.forEach(function(f, i) {
                var btn = $('<div class="category-full__head-item selector' + (object.filter == i && !object.category ? ' active' : '') + '">' + f.title + '</div>');
                btn.on('hover:enter', function() {
                    object.page = 1;
                    object.filter = i;
                    object.category = null;
                    object.query = '';
                    Lampa.Activity.replace(object);
                });
                sort_row.append(btn);
            });
            header.append(sort_row);

            // Ряд категорий
            var cat_row = $('<div style="display: flex; overflow-x: auto; width: 100%;"></div>');
            categories.forEach(function(c, i) {
                var active = (object.category == i);
                var btn = $('<div class="category-full__head-item selector' + (active ? ' active' : '') + '" style="font-size: 0.8em; opacity: 0.7;">' + c.title + '</div>');
                btn.on('hover:enter', function() {
                    object.page = 1;
                    object.category = i;
                    object.filter = 0; // Сбрасываем фильтр при выборе категории
                    object.query = '';
                    Lampa.Activity.replace(object);
                });
                cat_row.append(btn);
            });
            header.append(cat_row);

            html.append(header);
            html.append(scroll.render());
            scroll.append(body);
            
            return html;
        };

        this.start = function () {
            this.activity.loader(true);
            this.load();
        };

        this.load = function () {
            var _this = this;
            var path = '';
            
            if (object.query) {
                path = '/search/' + encodeURIComponent(object.query) + '/';
            } else if (object.category !== undefined && object.category !== null && object.category > 0) {
                path = categories[object.category].path;
            } else {
                path = sort_filters[object.filter || 0].path;
            }

            var url = proxy + encodeURIComponent(host + path + '?p=' + (object.page || 1));

            network.silent(url, function (json) {
                _this.activity.loader(false);
                var str = (json && json.contents) ? json.contents : '';
                if (str && str.indexOf('<html') !== -1) {
                    _this.parse(str);
                } else {
                    _this.empty('Контент не найден или прокси заблокирован.');
                }
            }, function () {
                _this.activity.loader(false);
                _this.empty('Ошибка сети.');
            });
        };

        this.parse = function (str) {
            var _this = this;
            var found = 0;
            var clean_html = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
            var dom = $($.parseHTML(clean_html));
            var cards = dom.find('.video-item, .item-video, .thumb-block, .p-v-thumb, .v-thumb');

            cards.each(function () {
                var $this = $(this);
                var link = $this.find('a[href*="/video/"]').first();
                var img_el = $this.find('img').first();
                var img = img_el.attr('data-src') || img_el.attr('src') || img_el.attr('data-original');
                var title = link.attr('title') || $this.find('.title, .name').text();
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
                    if (card_data.time) card.find('.card__view').after('<div class="card__age">' + card_data.time + '</div>');

                    card.on('hover:enter', function () {
                        _this.play(card_data);
                    });

                    body.append(card);
                    items.push(card);
                }
            });

            if (found > 0) {
                var next = $('<div class="category-full__next selector"><span>Показать еще (Страница ' + (object.page || 1) + ')</span></div>');
                next.on('hover:enter', function() {
                    object.page = (object.page || 1) + 1;
                    Lampa.Activity.replace(object);
                });
                body.append(next);
                Lampa.Controller.enable('content');
            } else {
                this.empty('Тут пока ничего нет.');
            }
        };

        this.play = function (data) {
            Lampa.Noty.show('Запрос видео...');
            network.silent(proxy + encodeURIComponent(data.url), function(json) {
                var html = json.contents || '';
                var video_url = '';
                var match = html.match(/"video_url":"(.*?)"/) || html.match(/video_url:\s*'(.*?)'/) || html.match(/source\s*src="(.*?)"/);
                if (match) video_url = match[1].replace(/\\/g, '');

                if (video_url) {
                    if (video_url.startsWith('//')) video_url = 'https:' + video_url;
                    Lampa.Player.play({ url: video_url, title: data.title });
                    Lampa.Player.callback(function () { Lampa.Controller.toggle('content'); });
                } else {
                    Lampa.Noty.show('Ссылка не найдена.');
                }
            });
        };

        this.empty = function(m) { body.empty().append('<div class="empty">'+m+'</div>'); };
        this.render = function () { return html; };
        this.destroy = function () { network.clear(); scroll.destroy(); html.remove(); };
    };

    function startPlugin() {
        Lampa.Component.add('porntrex', window.Porntrex);
        var menu_item = $('<li class="menu__item selector" data-action="porntrex"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 16.5V7.5L16 12L10 16.5Z" fill="white"/></svg></div><div class="menu__text">Porntrex</div></li>');
        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'Porntrex', component: 'porntrex', page: 1, filter: 0, category: 0 });
        });
        $('.menu .menu__list').first().append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();