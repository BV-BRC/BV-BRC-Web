define([
  'dojo/store/Memory'
], function (
  Memory
) {

  return new Memory({
    data: [
      {name: 'Chikungunya virus', id: 37124},
      {name: 'Dengue virus', id: 12637},
      {name: 'Influenza A virus', id: 11320},
      {name: 'Measles virus', id: 11234},
      {name: 'Monkeypox virus', id: 10244}
    ]
  });
});
