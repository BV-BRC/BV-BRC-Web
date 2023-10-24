/**
 * generateLinkedInFeed: separate iframes in linkedin.txt into Bacteria or Virus feed
 */

define([], function () {
  return function (value) {
    dojo.xhrGet({
      url: '/public/linkedin.txt',
      load: function (data) {
        let isSection = false;

        const lines = data.split('\n');
        let index = 0;
        for (let line of lines) {
          if (line.startsWith('[')) {
            isSection = line.includes(value);
          } else if (isSection) {
            try {
              const $iframe = $(line);
              $iframe.width('100%');

              $('.linkedin-feed').append(
                $('<div/>', {'id': 'linkedin-' + index++}).append(
                  $('<div/>', {'class': 'linkedin-html-embed'}).append(
                    $iframe
                  )
                )
              );
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    });
  };
});
