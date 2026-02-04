(function () {
    'use strict';

    // Настройки API сервера (оставляем оригинальные, так как это источник данных)
    var Defined = {
      use_api: 'http',
      localhost: 'https://vi.sisi.am',
      vip_site: 'http://sisi.am',
      framework: ''
    };

    var network = new Lampa.Reguest();
    var preview_timer, preview_video;

    // --- Вспомогательные функции ---

    function sourceTitle(title) {
      return Lampa.Utils.capitalizeFirstLetter(title.split('.')[0]);
    }

    function isVIP(element) {
      return /vip.mp4/.test(element.video);
    }

    function modal() {
      var id = Lampa.Storage.get('sisi_unic_id', '').toLowerCase();
      var controller = Lampa.Controller.enabled().name;
      var content = '<div class="about"><div>Это видео доступно с VIP подпиской на сервисе источнике.</div><div class="about__contacts"><div><small>Сайт</small><br>' + Defined.vip_site + '</div><div><small>Ваш ID</small><br>' + id + '</div></div></div>';
      Lampa.Modal.open({
        title: 'VIP Контент',
        html: $(content),
        size: 'medium',
        onBack: function onBack() {
          Lampa.Modal.close();
          Lampa.Controller.toggle(controller);
        }
      });
    }

    function qualityDefault(qualitys) {
      var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
      var url;
      if (qualitys) {
        for (var q in qualitys) {
          if (q.indexOf(preferably) == 0) url = qualitys[q];
        }
        if (!url) url = qualitys[Lampa.Arrays.getKeys(qualitys)[0]];
      }
      return url;
    }

    // --- Логика воспроизведения ---

    function play(element) {
      var controller_enabled = Lampa.Controller.enabled().name;

      if (isVIP(element)) {
        return modal();
      }

      if (element.json) {
        Lampa.Loading.start(function () {
          network.clear();
          Lampa.Loading.stop();
        });
        Api.account(element.video + '&json=true');
        Api.qualitys(element.video, function (data) {
          if (data.error || data.kakogohyia) {
            Lampa.Noty.show(data.kakogohyia === 'IsNotValidUser' ? 'Аккаунт заблокирован' : Lampa.Lang.translate('torrent_parser_nofiles'));
            Lampa.Loading.stop();
            return;
          }
          var qualitys = data.qualitys || data;
          var recomends = data.recomends || [];
          Lampa.Loading.stop();

          for (var i in qualitys) {
            qualitys[i] = Api.account(qualitys[i], true);
          }

          var video = {
            title: element.name,
            url: Api.account(qualityDefault(qualitys), true),
            url_reserve: data.qualitys_proxy ? Api.account(qualityDefault(data.qualitys_proxy), true) : false,
            quality: qualitys
          };
          Lampa.Player.play(video);

          if (recomends.length) {
             Lampa.Player.playlist(recomends.map(function(a){
                 a.title = Lampa.Utils.shortText(a.name, 50);
                 a.url = a.video; 
                 return a;
             }));
          } else {
            Lampa.Player.playlist([video]);
          }

          Lampa.Player.callback(function () {
            Lampa.Controller.toggle(controller_enabled);
          });
        }, function () {
          Lampa.Noty.show(Lampa.Lang.translate('torrent_parser_nofiles'));
          Lampa.Loading.stop();
        });
      } else {
        // Простая ссылка (редкий кейс для этого API)
        var video = {
          title: element.name,
          url: Api.account(qualityDefault(element.qualitys) || element.video, true),
          quality: element.qualitys
        };
        Lampa.Player.play(video);
        Lampa.Player.playlist([video]);
        Lampa.Player.callback(function () {
          Lampa.Controller.toggle(controller_enabled);
        });
      }
    }

    // --- UI функции ---

    function fixCards(json) {
      json.forEach(function (m) {
        m.background_image = m.picture;
        m.poster = m.picture;
        m.img = m.picture;
        m.name = Lampa.Utils.capitalizeFirstLetter(m.name).replace(/\&(.*?);/g, '');
      });
    }

    function hidePreview() {
      clearTimeout(preview_timer);
      if (preview_video) {
        var vid = preview_video.find('video');
        try { vid.pause(); } catch (e) {}
        preview_video.addClass('hide');
        preview_video = false;
      }
    }

    function preview(target, element) {
      hidePreview();
      preview_timer = setTimeout(function() {
        if (!element.preview || !Lampa.Storage.field('sisi_preview')) return;
        var video = target.find('video');
        var container = target.find('.sisi-video-preview');

        if (!video) {
          // Создаем элемент превью
          container = $('<div class="sisi-video-preview" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;border-radius:1em;"></div>');
          video = $('<video style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" muted></video>');
          video[0].src = element.preview;
          video.on('ended', function() { container.addClass('hide'); });
          container.append(video);
          target.find('.card__view').append(container);
        }
        preview_video = container;
        try { video[0].play(); } catch(e) {}
        container.removeClass('hide');
      }, 1500);
    }

    function fixList(list) {
      list.forEach(function (a) {
        if (!a.quality && a.time) a.quality = a.time;
      });
      return list;
    }

    function menuAction(target, card_data) {
      if (!card_data.bookmark) return;
      var cm = [{ title: !card_data.bookmark.uid ? 'В закладки' : 'Удалить из закладок' }];
      if (card_data.related) cm.push({ title: 'Похожие', related: true });
      
      Lampa.Select.show({
        title: 'Меню',
        items: cm,
        onSelect: function onSelect(m) {
          if (m.related) {
            Lampa.Activity.push({
              url: card_data.video + '&related=true',
              title: 'Похожие - ' + card_data.title,
              component: 'sisi_view_' + Defined.use_api,
              page: 1
            });
          } else {
            Api.bookmark(card_data, !card_data.bookmark.uid, function (status) {
              Lampa.Noty.show('Успешно');
            });
            Lampa.Controller.toggle('content');
          }
        },
        onBack: function onBack() {
          Lampa.Controller.toggle('content');
        }
      });
    }

    var Utils = {
      sourceTitle: sourceTitle,
      play: play,
      fixCards: fixCards,
      isVIP: isVIP,
      preview: preview,
      hidePreview: hidePreview,
      fixList: fixList,
      menu: menuAction
    };

    // --- API Class (HTTP) ---
    // Это основная часть, где мы будем фильтровать контент
    var menu;

    function ApiHttp() {
      var _this = this;
      var network = new Lampa.Reguest();

      this.menu = function (success, error) {
        if (menu) return success(menu);
        
        // Запрос к серверу за списком каналов
        network.silent(this.account(Defined.localhost), function (data) {
          if (data.channels) {
            // !!!!!!! ГЛАВНОЕ ИЗМЕНЕНИЕ: ФИЛЬТРАЦИЯ !!!!!!!
            // Оставляем только то, где есть 'porntrex' в названии или URL
            menu = data.channels.filter(function(item){
                return (item.title && item.title.toLowerCase().indexOf('porntrex') !== -1) || 
                       (item.playlist_url && item.playlist_url.toLowerCase().indexOf('porntrex') !== -1);
            });
            
            if(menu.length === 0) {
                 Lampa.Noty.show('Источник Porntrex не найден в API');
            }
            
            success(menu);
          } else {
            error(data.msg);
          }
        }, error);
      };

      this.view = function (params, success, error) {
        var u = Lampa.Utils.addUrlComponent(params.url, 'pg=' + (params.page || 1));
        network.silent(this.account(u), function (json) {
          if (json.list) {
            json.results = Utils.fixList(json.list);
            json.collection = true;
            json.total_pages = json.total_pages || 30;
            Utils.fixCards(json.results);
            delete json.list;
            success(json);
          } else {
            error();
          }
        }, error);
      };

      this.bookmark = function (element, add, call) {
        var u = Defined.localhost + '/bookmark/' + (add ? 'add' : 'remove?uid=' + element.bookmark.uid);
        network.silent(this.account(u), function (e) { call(true); }, function () { call(false); }, JSON.stringify(element), { headers: { 'Content-Type': 'application/json' } });
      };

      this.account = function (u) {
        if (u.indexOf(Defined.localhost) == -1 && window.location.hostname !== 'localhost') return u;
        var unic_id = Lampa.Storage.get('sisi_unic_id', '');
        var email = Lampa.Storage.get('account', {}).email;
        if (u.indexOf('box_mac=') == -1) u = Lampa.Utils.addUrlComponent(u, 'box_mac=' + unic_id);
        else u = u.replace(/box_mac=[^&]+/, 'box_mac=' + unic_id);
        if (email) {
          if (u.indexOf('account_email=') == -1) u = Lampa.Utils.addUrlComponent(u, 'account_email=' + encodeURIComponent(email));
          else u = u.replace(/account_email=[^&]+/, 'account_email=' + encodeURIComponent(email));
        }
        return u;
      };

      this.playlist = function (add_url_query, oncomplite, error) {
        var load = function load() {
          var status = new Lampa.Status(menu.length);
          status.onComplite = function (data) {
            var items = [];
            menu.forEach(function (m) {
              if (data[m.playlist_url] && data[m.playlist_url].results.length) items.push(data[m.playlist_url]);
            });
            if (items.length) oncomplite(items); else error();
          };

          menu.forEach(function (m) {
            network.silent(_this.account(m.playlist_url + add_url_query), function (json) {
              if (json.list) {
                json.title = Utils.sourceTitle(m.title);
                json.results = Utils.fixList(json.list);
                json.url = m.playlist_url;
                json.collection = true;
                json.line_type = 'none';
                json.card_events = {
                  onMenu: Utils.menu,
                  onEnter: function onEnter(card, element) {
                    Utils.hidePreview();
                    Utils.play(element);
                  }
                };
                Utils.fixCards(json.results);
                delete json.list;
                status.append(m.playlist_url, json);
              } else {
                status.error();
              }
            }, status.error.bind(status));
          });
        };
        if (menu) load(); else _this.menu(load, error);
      };

      this.main = function (params, oncomplite, error) {
        this.playlist('', oncomplite, error);
      };

      this.qualitys = function (video_url, oncomplite, error) {
        network.silent(this.account(video_url + '&json=true'), oncomplite, error);
      };

      this.clear = function () { network.clear(); };
    }

    var Api = new ApiHttp(); // Используем только Http версию для простоты

    // --- Компоненты Lampa ---

    function Sisi(object) {
      var comp = new Lampa.InteractionMain(object);
      comp.create = function () {
        this.activity.loader(true);
        Api.main(object, this.build.bind(this), this.empty.bind(this));
        return this.render();
      };
      comp.empty = function (er) {
        var _this = this;
        var empty = new Lampa.Empty({ descr: typeof er == 'string' ? er : Lampa.Lang.translate('empty_text_two') });
        Lampa.Activity.all().forEach(function (active) {
            if (_this.activity == active.activity) active.activity.render().find('.activity__body > div')[0].appendChild(empty.render(true));
        });
        this.start = empty.start.bind(empty);
        this.activity.loader(false);
        this.activity.toggle();
      };
      comp.onMore = function (data) {
        Lampa.Activity.push({
          url: data.url,
          title: data.title,
          component: 'sisi_view_' + Defined.use_api,
          page: 2
        });
      };
      comp.onAppend = function (line, element) {
        line.onAppend = function (card) {
          var origFocus = card.onFocus;
          card.onFocus = function (target, card_data) {
            origFocus(target, card_data);
            Utils.preview(target, card_data);
          };
        };
      };
      return comp;
    }

    function View(object) {
      var comp = new Lampa.InteractionCategory(object);
      
      comp.create = function () {
        var _this = this;
        this.activity.loader(true);
        Api.view(object, function (data) {
          _this.build(data);
          comp.render().find('.category-full').addClass('mapping--grid cols--3');
        }, this.empty.bind(this));
      };
      
      comp.nextPageReuest = function (object, resolve, reject) {
        Api.view(object, resolve.bind(this), reject.bind(this));
      };
      
      comp.cardRender = function (object, element, card) {
        card.onMenu = function (target, card_data) { return Utils.menu(target, card_data); };
        card.onEnter = function () { Utils.hidePreview(); Utils.play(element); };
        var origFocus = card.onFocus;
        card.onFocus = function (target, card_data) {
          origFocus(target, card_data);
          Utils.preview(target, element);
        };
      };
      return comp;
    }

    // --- Инициализация ---

    function startPlugin() {
      window['plugin_sisi_porntrex_ready'] = true;
      var unic_id = Lampa.Storage.get('sisi_unic_id', '');
      if (!unic_id) {
        unic_id = Lampa.Utils.uid(8).toLowerCase();
        Lampa.Storage.set('sisi_unic_id', unic_id);
      }

      Lampa.Component.add('sisi_' + Defined.use_api, Sisi);
      Lampa.Component.add('sisi_view_' + Defined.use_api, View);

      function addSettings() {
        if (window.sisi_porntrex_param_ready) return;
        window.sisi_porntrex_param_ready = true;
        Lampa.SettingsApi.addComponent({
          component: 'sisi_porntrex',
          name: 'Porntrex',
          icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke-width="2"/><path d="M2 17L12 22L22 17" stroke-width="2"/><path d="M2 12L12 17L22 12" stroke-width="2"/></svg>'
        });
        Lampa.SettingsApi.addParam({
          component: 'sisi_porntrex',
          param: {
            name: 'sisi_preview',
            type: 'trigger',
            values: '',
            "default": true
          },
          field: {
            name: 'Предпросмотр',
            description: 'Показывать предпросмотр при наведение на карточку'
          }
        });
      }

      function addMenu() {
        var button = $('<li class="menu__item selector"><div class="menu__ico"><svg viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve" fill="currentColor"><path d="M406,336c-30.9,0-56,25.1-56,56s25.1,56,56,56s56-25.1,56-56S436.9,336,406,336z M106,120c-30.9,0-56,25.1-56,56s25.1,56,56,56s56-25.1,56-56S136.9,120,106,120z M356,120c-30.9,0-56,25.1-56,56s25.1,56,56,56s56-25.1,56-56S386.9,120,356,120z"/></svg></div><div class="menu__text">Porntrex</div></li>');

        button.on('hover:enter', function () {
            // При клике открываем поиск источников, но там останется только отфильтрованный Porntrex
            Api.menu(function (data) {
                if (data.length === 1) {
                    // Если только один источник, сразу открываем его
                    Lampa.Activity.push({
                        url: data[0].playlist_url,
                        title: data[0].title,
                        component: 'sisi_view_' + Defined.use_api,
                        page: 1
                    });
                } else {
                    // Фолбек, если фильтр не сработал или источников больше
                    var items = data;
                    Lampa.Select.show({
                        title: 'Источник',
                        items: items,
                        onSelect: function onSelect(a) {
                            Lampa.Activity.push({
                                url: a.playlist_url,
                                title: a.title,
                                component: 'sisi_view_' + Defined.use_api,
                                page: 1
                            });
                        },
                        onBack: function onBack() {
                            Lampa.Controller.toggle('menu');
                        }
                    });
                }
            }, function() {
                Lampa.Noty.show('Ошибка загрузки API');
            });
        });

        $('.menu .menu__list').eq(0).append(button);
        addSettings();
      }

      if (window.appready) addMenu();
      else {
        Lampa.Listener.follow('app', function (e) {
          if (e.type == 'ready') addMenu();
        });
      }
    }

    if (!window['plugin_sisi_porntrex_ready']) {
      startPlugin();
    }

})();
