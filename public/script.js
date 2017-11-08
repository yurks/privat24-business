(function($, window) {

    var document = window.document;

    var App = window.App = {

        form: {
            submitting: false,
            button: Ladda.create($('#request')[0]).stop(),

            //_datepicker_range_once: false,

            $datepicker: $('#datepicker').datepicker({
                format: 'dd.mm.yyyy',
                todayBtn: 'linked',

                //format: 'mm/yyyy',
                //defaultViewDate: 'month',
                maxViewMode: 2,
                //minViewMode: 1,
                startView: 0,
                autoclose: true

            }).on('changeDate', function(e) {
                var datepicker = $(this).data('datepicker');
                /*
                multidate: 2,
                multidateSeparator: ' - '
                if (e.dates && e.dates[1]) {
                    if (App.form._datepicker_range_once === true || App.form._datepicker_range_once === null) {
                        App.form._datepicker_range_once = false;
                        App.form.$datepicker.datepicker('setDates', e.date);
                    } else {
                        if (e.dates[1] < e.dates[0]) {
                            App.form.$datepicker.datepicker('setDates', e.dates.slice(0).reverse());
                            App.form._datepicker_range_once = null;
                        } else {
                            App.form._datepicker_range_once = true;
                        }
                    }
                } else {
                    App.form._datepicker_range_once = false;
                }
                */
                var fields = App.form.getFields() || [];
                if (fields.length === fields.filter(function(param) {
                        return !!param.value;
                    }).length) {
                    App.form.$container.submit();
                }

            }),

            $container: $('#form').on('submit', function(e) {
                e.preventDefault();

                if (App.form.submitting) {
                    return;
                }
                App.form.submitting = true;

                App.form.button.start();
                App.alert.hide();
                App.table.hide();

                $.ajax({
                    url : '/',
                    type: 'POST',
                    dataType: 'json',
                    data: JSON.stringify({data: App.form.getFields()}),
                    contentType: 'application/json; charset=utf-8',
                    complete: function() {
                        App.form.button.stop();
                        App.form.submitting = false;
                    },
                    success: function(response) {

                        var data = response && response.data;
                        if (data && response.status === 200) {
                            if (data.rows && data.rows.length) {
                                App.table.show(data.rows, data.accounts, 'Операції за ' + (data.dump.period + ''));
                            }
                            if (data.summary) {
                                App.table.summary.show(data.summary, 'Підсумки за ' + (data.dump.period + ''));
                            }
                            if (data.rests) {
                                App.table.rests.show(data.rests, 'Залишки на ' + data.rests.from + (data.rests.from !== data.rests.to ? ' та ' + data.rests.to : ''));
                            }
                        } else {
                            App.alert.error(response);
                        }
                    },
                    error: function(xhr) {
                        App.alert.error(xhr);
                    }
                });

            }),
            getFields: function() {
                return App.form.$container.serializeArray();
            }
        },

        tabs: {
            $container: $('#tabs'),

            show: function(label, id) {
                var $container = this.$container;

                var $li = $('<li><a href="#">' + label + '</a></li>').on('click', function(e) {
                    e.preventDefault();
                    document.body.setAttribute('tab', id);
                    $container.children().removeClass('active');
                    $li.addClass('active');
                });

                if ($container.is(':empty')) {
                    document.body.setAttribute('tab', id);
                    $li.addClass('active');
                }

                $li.appendTo($container);
            },

            hide: function() {
                document.body.removeAttribute('tab');
                this.$container.html('');
            }
        },

        table: {
            $container: $('#table'),
            $filter: $('#table-filter'),
            entity: null,
            summary: {
                $container: $('#summary'),
                entity: null,
                show: function(summary, caption) {

                    if (!summary || !summary.data || !summary.data.length) {
                        return;
                    }

                    App.tabs.show(caption, this.$container.attr('id'));
                    //this.$container.append('<caption>' + caption + '</caption>')

                    this.entity = this.$container.DataTable({
                        data: summary.data,
                        paging: false,
                        order: [[2, 'asc'], [0, 'asc'] ],
                        dom: 't',

                        columns: summary.header.map(function(col, i) {
                            var out = {};
                            if (!col) {
                                out.title = 'Всі контрагенти<br><b>' + (Object.keys(summary.total || {}).map(function(ccy) {
                                    return (summary.total[ccy].in || 0) + ' '+ (summary.total[ccy].out || 0) + ' = ' + ((summary.total[ccy].in || 0) + (summary.total[ccy].out || 0)).toFixed(2) + ' ' + ccy ;
                                }).join('<br>')) + '</b>';

                                out.render = function(data, type) {
                                    if (type === 'filter') {
                                        return data.id;
                                    }
                                    return data.name + ' :: ' + data.id;
                                };
                            } else if (col.id) {
                                out.title = col.name + '<br>' + col.id + '<br><b>' + col.total + ' ' + col.ccy + '</b>';
                                out.render = function(data, type) {
                                    if (!data) {
                                        return '';
                                    }
                                    return data;
                                };
                            }

                            return out;
                        })
                    });
                }
            },

            rests: {
                $container: $('#rests'),
                entity: null,
                show: function(rests, caption) {

                    if (!rests || !rests.data || !rests.data.length) {
                        return;
                    }

                    App.tabs.show(caption, this.$container.attr('id'));
                    //this.$container.append('<caption>' + caption + '</caption>');

                    this.entity = this.$container.DataTable({
                        data: rests.data,
                        paging: false,
                        //order: [[2, 'asc'], [0, 'asc'] ],
                        dom: 't',

                        columns: rests.header
                    });
                }
            },

            show: function(rows, accounts, caption) {
                if (rows && rows.length) {

                    this.$filter.html('<span class="input-group-addon"><span class="glyphicon glyphicon-filter"></span></span>');

                    $('<input type="text" class="form-control" placeholder="quick search">')
                        .on('keyup', function() {
                            App.table.entity && App.table.entity.search(this.value).draw()
                        })
                        .appendTo(this.$filter);


                    $('<select class="form-control" data-value=""><option value="">отримувач</option>' + accounts.filter(function(acc) { return acc.credit; }).map(function(acc) {
                        return '<option value="' + acc.id + '" ' + (acc.disabled ? 'disabled="disabled"' : '') + '>' + acc.id + ' ' + acc.name + '</option>';
                    }).join('') + '</select>')
                        .on('change', function() {
                            this.setAttribute('data-value', this.value || '');
                            App.table.entity && App.table.entity.column(9).search(this.value).draw();
                        })
                        .appendTo(this.$filter);

                    $('<select class="form-control" data-value=""><option value="">платник</option>' + accounts.filter(function(acc) { return !acc.credit; }).map(function(acc) {
                        return '<option value="' + acc.id + '" ' + (acc.disabled ? 'disabled="disabled"' : '') + '>' + acc.id + ' ' + acc.name + '</option>';
                    }).join('') + '</select>')
                        .on('change', function() {
                            this.setAttribute('data-value', this.value || '');
                            App.table.entity && App.table.entity.column(10).search(this.value).draw();
                        })
                        .appendTo(this.$filter);

                }

                App.tabs.show(caption, this.$container.attr('id'));
                //this.$container.append('<caption>' + caption + '</caption>');

                var entity = this.entity = this.$container.DataTable({
                    data: rows,
                    paging: false,
                    order: [[1, 'desc']],
                    dom: 'l<"pull-right"i>prt',
                    columns: [
                        {title: '#'},
                        {title: 'Дата проводки', width: '50px', render: function(data, type) {
                            if (type === 'sort') {
                                return data[1];
                            }
                            return data[0];
                        }},
                        {title: 'Сума'},
                        {title: ''},
                        {title: 'Призначення платежу'},

                        {title: 'Отримувач', render: function(data) {
                            return data[0] + ' (' + data[1] + ')<br>' + data[2] + '; ' + data[3] + '; ' + data[4] + '; ' + data[5];
                        }},
                        {title: 'Платник', render: function(data) {
                            return data[0] + ' (' + data[1] + ')<br>' + data[2] + '; ' + data[3] + '; ' + data[4] + '; ' + data[5];
                        }},
                        {title: 'Платіж', render: '[; ]'},
                        // column #8-10 is for filtering by account
                        {title: '', visible: false, render: function(data, type, row ) {
                            if (type === 'filter') {
                                return [row[5][2], row[6][2]];
                            }
                            return '';
                        }},
                        {title: '', visible: false, render: function(data, type, row ) {
                            if (type === 'filter') {
                                return row[5][2];
                            }
                            return '';
                        }},
                        {title: '', visible: false, render: function(data, type, row ) {
                            if (type === 'filter') {
                                return row[6][2];
                            }
                            return '';
                        }}
                    ]
                });

                this.$container.children('tbody').on('click', 'tr', function() {
                    if ( $(this).hasClass('selected') ) {
                        $(this).removeClass('selected');
                    }
                    else {
                        entity.$('tr.selected').removeClass('selected');
                        $(this).addClass('selected');
                    }
                } );
            },

            hide: function() {

                if (this.rests.entity) {
                    this.rests.entity.destroy();
                    this.rests.$container.html('');
                }
                this.rests.entity = null;

                if (this.summary.entity) {
                    this.summary.entity.destroy();
                    this.summary.$container.html('');
                }
                this.summary.entity = null;
                this.entity && this.entity.destroy() && this.$container.html('');
                this.entity = null;
                this.$filter.html('');

                App.tabs.hide();
            }
        },

        alert: {
            $container: $('#alert').hide(),
            $intro: $('#alert-intro'),
            $message: $('#alert-message'),
            $close: $('#alert-close').on('click', function() {
                App.alert.hide();
            }),
            show: function(message, intro) {
                this.$container.show();
                message && this.$message.html(message);
                intro && this.$intro.html(intro);
            },
            hide: function() {
                App.alert.$container.hide();
                App.alert.$message.html('');
                App.alert.$intro.html('');
            },
            error: function(res) {
                this.show(res && res.messages && res.messages.join('. ') || res && res.statusText || '', 'Error' + (res && res.status ? ' ' + res.status : '') + ': ')
            }
        }
    };

})(jQuery, window);

