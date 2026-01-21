(function () {
    'use strict';

    var Porntrex = {
        name: 'Porntrex',
        main_url: 'https://www.porntrex.com',
        
        // Метод поиска
        search: function (query, page, callback) {
            var network = new Lampa.Reguest();
            // Используем прокси для обхода блокировок
            var url = 'https://cors.lampa.stream/' + this.main_url + '/search/' + encodeURIComponent(query) + '/?p=' + page;

            network.silent(url, function (html) {
                var items = [];
                // Парсим HTML ответ
                var containers = $(html).find('.item-video, .video-item'); 
                
                containers.each(function () {
                    var $this = $(this);
                    var link = $this.find('a').attr('href');
                    var title = $this.find('a').attr('title') || $this.find('.title').text();
                    var img = $this.find('img').attr('data-src') || $this.find('img').attr('src');
                    var time = $this.find('.duration, .time').text();

                    if (link && title) {
                        items.push({
                            title: title.trim(),
                            url: link.startsWith('http') ? link : 'https://www.porntrex.com' + link,
                            img: img,
                            quality: 'HD',
                            time: time.trim()
                        });
                    }
                });

                callback(items);
            }, function () {
                callback([]); // Ошибка сети
            });
        },

        // Метод получения ссылки на видео файл
        getVideo: function (video_url, callback) {
            var network = new Lampa.Reguest();
            network.silent('https://cors.lampa.stream/' + video_url, function (html) {
                // Ищем скрипты, содержащие flashvars или ссылки на видео
                var video_match = html.match(/video_url:\s*'(.*?)'/i) || 
                                 html.match(/"file":\s*"(.*?)"/i) ||
                                 html.match(/source\s*src="(.*?)"/i);

                if (video_match && video_match[1]) {
                    var raw_url = video_match[1].replace(/\\/g, '');
                    callback({
                        path: raw_url,
                        type: 'video/mp4'
                    });
                } else {
                    callback(false);
                }
            }, function () {
                callback(false);
            });
        }
    };

    // Интеграция в Lampa (пример вызова)
    // Lampa.Component.add('porntrex_parser', Porntrex);
})();