(function () {
    'use strict';

    // Конфигурация
    var Config = {
        main_url: 'https://www.porntrex.com',
        component_name: 'porntrex_direct',
        headers: {
            // Пытаемся притвориться обычным браузером
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    var network = new Lampa.Reguest();

    // --- Логика Парсинга (Scraping) ---

    // 1. Парсим список видео из HTML каталога
    function parseCatalog(html) {
        var items = [];
        var html_clean = html.replace(/[\n\t\r]/g, ''); // Чистим от переносов строк для удобства
        
        // Регулярка для поиска блоков видео. 
        // Ищем блоки с классом video-block (стандартная структура tube сайтов)
        // Это примерная логика, она зависит от верстки сайта
        
        // Простой поиск через DOM парсер (более надежно, чем Regex для HTML)
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");
        var elements = doc.querySelectorAll('.video-block, .item'); // Возможные классы

        elements.forEach(function(el) {
            try {
                var link = el.querySelector('a');
                var img = el.querySelector('img');
                var title = el.querySelector('.title, .video-title');
                var duration = el.querySelector('.duration');

                if (link && img) {
                    var img_src = img.getAttribute('data-src') || img.getAttribute('src');
                    
                    // Фикс относительных путей
                    var href = link.getAttribute('href');
                    if(href.indexOf('http') === -1) href = Config.main_url + href;
                    if(img_src && img_src.indexOf('http') === -1) img_src = Config.main_url + img_src;

                    items.push({
                        url: href,
                        img: img_src,
                        name: title ? title.innerText.trim() : 'Video',
                        time: duration ? duration.innerText.trim() : '',
                        background_image: img_src
                    });
                }
            } catch (e) {
                // Игнорируем ошибки парсинга отдельных элементов
            }
        });

        return items;
    }

    // 2. Парсим прямую ссылку на видео из страницы плеера
    function extractVideoLink(html) {
        // Ищем .mp4 внутри исходного кода
        // Porntrex часто использует video_url: '...' или source src="..."
        
        var match = html.match(/video_url\s*:\s*['"]([^'"]+)['"]/);
        if (match && match[1]) return match[1];

        match = html.match(/source\s+src=['"]([^'"]+\.mp4[^'"]*)['"]/);
        if (match && match[1]) return match[1];

        // Поиск JSON config
        match = html.match(/flashvars\s*=\s*({.*?});/);
        if (match && match[1]) {
            try {
                var json = JSON.parse(match[1]);
                if (json.video_url) return json.video_url;
                if (json.quality_720p) return json.quality_720p;
                if (json.quality_480p) return json.quality_480p;
            } catch(e) {}
        }

        return null;
    }


    // --- Компонент UI (Каталог) ---
    function Component(object) {
        var comp = new Lampa.InteractionCategory(object);

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);

            // Определяем URL (первая страница или пагинация)
            var url = object.url;
            if (object.page > 1) {
                // Логика пагинации Porntrex: /latest-updates/2/
                if(url.indexOf('latest-updates') !== -1) {
                    url = Config.main_url + '/latest-updates/' + object.page + '/';
                } else {
                     url = url + object.page + '/';
                }
            }

            network.native(url, function (str) {
                var items = parseCatalog(str);
                
                if (items.length) {
                    _this.build(items);
                } else {
                    _this.empty('Не удалось получить список видео. Возможно, сработала защита от ботов или CORS.');
                }
                _this.activity.loader(false);
            }, function (a, c) {
                _this.empty('Ошибка сети: ' + network.errorDecode(a, c));
                _this.activity.loader(false);
            }, false, {
                dataType: 'text',
                headers: Config.headers
            });
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            var url = object.url;
             if(url.indexOf('latest-updates') !== -1) {
                url = Config.main_url + '/latest-updates/' + object.page + '/';
            } else {
                 url = url + object.page + '/';
            }

            network.native(url, function (str) {
                var items = parseCatalog(str);
                if (items.length) resolve(items);
                else reject();
            }, reject, false, { dataType: 'text', headers: Config.headers });
        };

        comp.cardRender = function (object, element, card) {
            card.onEnter = function () {
                // При клике открываем плеер
                Lampa.Loading.start(function () {
                    Lampa.Loading.stop();
                });

                network.native(element.url, function (html) {
                    var videoUrl = extractVideoLink(html);
                    Lampa.Loading.stop();

                    if (videoUrl) {
                        var video = {
                            title: element.name,
                            url: videoUrl,
                            url_reserve: videoUrl
                        };
                        Lampa.Player.play(video);
                        Lampa.Player.playlist([video]);
                    } else {
                        Lampa.Noty.show('Не удалось найти ссылку на видео (возможно Premium)');
                    }
                }, function () {
                    Lampa.Loading.stop();
                    Lampa.Noty.show('Ошибка загрузки страницы видео');
                }, false, { dataType: 'text', headers: Config.headers });
            };
        };

        return comp;
    }


    // --- Инициализация ---
    function startPlugin() {
        window.plugin_porntrex_direct_ready = true;

        Lampa.Component.add(Config.component_name, Component);

        // Добавляем кнопку в меню
        var item = $('<li class="menu__item selector"><div class="menu__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon></svg></div><div class="menu__text">Porntrex Direct</div></li>');

        item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: Config.main_url + '/latest-updates/', // Стартовая страница
                title: 'Porntrex (Direct)',
                component: Config.component_name,
                page: 1
            });
        });

        $('.menu .menu__list').eq(0).append(item);
    }

    if (!window.plugin_porntrex_direct_ready) {
        if (window.appready) startPlugin();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') startPlugin();
            });
        }
    }
})();
