define([
  'dojo/store/Memory'
], function (
  Memory
) {

  return new Memory({
    data: [
      {name: 'Dengue virus', id: 12637},
      {name: 'Influenza A virus', id: 11320},
      {name: 'Monkeypox virus', id: 10244}
    ]
  });
});
