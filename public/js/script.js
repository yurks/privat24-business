(function($, window) {

    var App = window.App = {

        form: {
            submitting: false,
            button: Ladda.create($('#request')[0]).stop(),

            $datepicker: $('#datepicker').datepicker({
                format: 'dd.mm.yyyy',
                startView: 1,
                todayBtn: 'linked',
                autoclose: true

            }).on('changeDate', function() {
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
                    success:function(responce) {
                        if (responce && responce.data && responce.status === 200) {
                            App.table.show(responce.data.rows || [], responce.data.accounts || []);
                        } else {
                            App.alert.error(responce);
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

        table: {
            $container: $('#table'),
            $filter: $('#table-filter'),
            entity: null,
            show: function(rows, accounts) {

                if (rows.length) {
                    this.$filter.html('<span class="input-group-addon"><span class="glyphicon glyphicon-filter"></span></span>');

                    $('<input type="text" class="form-control" placeholder="quick search">')
                        .on('keyup', function() {
                            App.table.entity && App.table.entity.search(this.value).draw()
                        })
                        .appendTo(this.$filter);


                    $('<select class="form-control" data-value=""><option value="">account</option>' + accounts.map(function(acc) {
                        return '<option value="' + acc.id + '" ' + (acc.disabled ? 'disabled="disabled"' : '') + '>' + acc.id + ' ' + acc.name + '</option>';
                    }).join('') + '</select>')
                        .on('change', function() {
                            this.setAttribute('data-value', this.value || '');
                            App.table.entity && App.table.entity.column(8).search(this.value).draw();
                        })
                        .appendTo(this.$filter);
                }

                var entity = this.entity = this.$container.DataTable({
                    data: rows,
                    paging:   false,
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
                        // column #8 is for filtering by account
                        {title: '', visible: false, render: function(data, type, row ) {
                            if (type === 'filter') {
                                return [row[5][2], row[6][2]];
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
                this.entity && this.entity.destroy() && this.$container.html('');
                this.entity = null;
                this.$filter.html('');
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

