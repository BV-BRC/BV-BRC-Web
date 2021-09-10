define([
  'dojo/store/Memory'
], function (
  Memory
) {
  return new Memory({
    data: [
      { name: '', id: '' },
      { name: 'Human', id: 'Human' },
      { name: 'Non-human Mammal', id: 'Non-human Mammal' },
      { name: 'Avian', id: 'Avian' },
      { name: 'Insect', id: 'Insect' },
      { name: 'Fish', id: 'Fish' },
      { name: 'Plant', id: 'Plant' },
      { name: 'Environment', id: 'Environment' },
      { name: 'Sea Mammal', id: 'Sea Mammal' },
      { name: 'Crustaceans', id: 'Crustaceans' },
      { name: 'Lab host', id: 'Lab host' },
      { name: 'Amphibian', id: 'Amphibian' },
    ]
  })
})
