define([
  'dojo/store/Memory'
], function (
  Memory
) {

  return new Memory({
    data: [
      {name: 'Chikungunya virus', id: 37124, sfIdPrefixes: ['Chikungunya virus']},
      {name: 'Dengue virus', id: 12637, sfIdPrefixes: ['Dengue virus 1', 'Dengue virus 2', 'Dengue virus 3', 'Dengue virus 4']},
      {name: 'Ebola virus', id: 3044781, sfIdPrefixes: ['Orthoebolavirus']},
      {name: 'Influenza A virus', id: 11320, sfIdPrefixes: ['Influenza A']},
      {name: 'Influenza A virus', id: 2955291, sfIdPrefixes: []},
      {name: 'Measles virus', id: 11234, sfIdPrefixes: ['Measles Virus']},
      {name: 'Monkeypox virus', id: 10244, sfIdPrefixes: ['Monkeypox']}
    ]
  });
});
