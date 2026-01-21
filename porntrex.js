(function () {
    'use strict';

    window.Porntrex = function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-full__body"></div>');
        var host = 'https://www.porntrex.com';
        var proxy = 'https://corsproxy.io/?';

        var sort_filters = [
            { title: 'Новое', path: '/videos/' },
            { title: 'Популярное', path: '/most-popular/' },
            { title: 'Топ дня', path: '/top-rated/today/' }
        ];

        var categories = [
            { title: 'Anal', path: '/categories/anal/' },
            { title: 'Asian', path: '/categories/asian/' },
            { title: 'Milf', path: '/categories/milf/' },
            { title: 'Ebony', path: '/categories/ebony/' },
            { title: 'Group', path: '/categories/group-sex/' }
        ];

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);
            return html;
        };

        this.start = function () {
            var _this = this;
            
            // Добавляем кнопку поиска/фильтров в правую панель
            this.activity.loader(true);
            this.activity.onRender = function() {
                Lampa.Component.add('porntrex_filter', _this.renderFilter.bind(_this));
            };

            this.load();
        };

        // Рендер правой панели (вызывается кнопкой поиска в Lampa)
        this.renderFilter = function() {
            var _this = this;
            var items = [
                {
                    title: 'Поиск',
                    subtitle: object.query || 'Найти видео...',
                    search: true
                }
            ];

            sort_filters.forEach(function(f, i) {
                items.push({
                    title: f.title,
                    selected: (object.filter == i && !object.category),
                    filter_id: i
                });
            });

            categories.forEach(function(c, i) {
                items.push({
                    title: c.title,
                    selected: (object.category == i),
                    category_id: i
                });
            });

            Lampa.Select.show({
                title: 'Фильтры и Поиск',
                items: items,
                onSelect: function(item) {
                    if (item.search) {
                        Lampa.Input.edit({ value: '', free: true }, function(val) {
                            if (val) {
                                object.query = val;
                                object.page = 1;
                                Lampa.Activity.replace(object);
                            }
                        });
                    } else if (item.filter_id !== undefined) {
                        object.filter = item.filter_id;
                        object.category = null;
                        object.query = '';
                        object.page = 1;
                        Lampa.Activity.replace(object);
                    } else if (item.category_id !== undefined) {
                        object.category = item.category_id;
                        object.filter = 0;
                        object.query = '';
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
            var path = object.query ? '/search/' + encodeURIComponent(object.query) + '/' : 
                       (object.category !== null ? categories[object.category].path : sort_filters[object.filter].path);
            
            var url = proxy + host + path + '?p=' + (object.page || 1);

            // Используем прямой запрос текста через аякс Lampa
            $.ajax({
                url: url,
                method: 'GET',
                dataType: 'text',
                timeout: 15000,
                success: function (str) {
                    _this.activity.loader(false);
                    if (str && str.indexOf('<html') !== -1) {
                        _this.parse(str);
                    } else {
                        _this.empty('Сайт не ответил. Попробуйте другой фильтр.');
                    }
                },
                error: function () {
                    _this.activity.loader(false);
                    _this.empty('Ошибка сети или CORS прокси.');
                }
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
                var img = img_el.attr('data-src') || img_el.attr('src');
                var title = link.attr('title') || $this.find('.title, .name').text();

                if (link.attr('href') && title.trim()) {
                    found++;
                    var card_data = {
                        title: title.trim(),
                        url: host + link.attr('href'),
                        img: img
                    };

                    var card = Lampa.Template.get('card', {title: card_data.title});
                    card.addClass('card--collection');
                    if (card_data.img) {
                        if (card_data.img.startsWith('//')) card_data.img = 'https:' + card_data.img;
                        card.find('.card__img').attr('src', card_data.img);
                    }
                    
                    card.on('hover:enter', function () {
                        _this.play(card_data);
                    });

                    body.append(card);
                    items.push(card);
                }
            });

            if (found > 0) {
                var next = $('<div class="category-full__next selector"><span>Показать еще</span></div>');
                next.on('hover:enter', function() {
                    object.page++;
                    Lampa.Activity.replace(object);
                });
                body.append(next);
                Lampa.Controller.enable('content');
            } else {
                this.empty('Ничего не найдено.');
            }
        };

        this.play = function (data) {
            Lampa.Noty.show('Поиск потока...');
            $.get(proxy + data.url, function(html) {
                var match = html.match(/"video_url":"(.*?)"/) || html.match(/video_url:\s*'(.*?)'/) || html.match(/source\s*src="(.*?)"/);
                var video_url = match ? match[1].replace(/\\/g, '') : '';
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
            Lampa.Activity.push({ title: 'Porntrex', component: 'porntrex', page: 1, filter: 0, category: null });
        });
        $('.menu .menu__list').first().append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();