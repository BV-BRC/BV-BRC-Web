define(
  ['dijit/popup', 'dijit/TooltipDialog', 'dojo/on'],

  function (popup, TooltipDialog, on) {

    return function (options) {

      options = options || {};

      var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';

      var downloadTT = new TooltipDialog({
        content: dfc,
        onMouseLeave: function () {
          popup.close(downloadTT);
        }
      });

      return [
        'DownloadTable',
        'fa icon-download fa-2x',
        {
          label: 'DOWNLOAD',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function (selection) {
          console.log('CLICKED');
          on(downloadTT.domNode, 'div:click', function (evt) {
            console.log('DownloadTT: ', evt);
            var rel = evt.target.attributes.rel.value;
            var dataType = options.dataType;
            var currentQuery = options.getQuery();
            console.log('DownloadQuery: ', currentQuery);
            var url = window.App.dataAPI + dataType + '/?' + currentQuery + '&sort(+' + options.primaryKey + ')&limit(' + options.limit + ')&http_accept=' + rel + '&http_download=true';
            if (window.App.authorizationToken) {
              url = url + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken);
            }

            window.open(url);
            popup.close(downloadTT);
          });

          console.log('Popup Open', downloadTT);
          popup.open({
            popup: downloadTT,
            around: options.button,
            orient: ['below']
          });
        },
        true,
        'left'
      ];
    };

  }
);
