
// module.exports = {
//     plugins: [
//       require('postcss-import'),
//       require('postcss-utilities')({}),
//       require('postcss-nested'),
//       require('postcss-preset-env')({
//         stage: 1,
//         autoprefixer: {
//           grid: true,
//         },
//       }),
//       require('@fullhuman/postcss-purgecss')({
//         content: [
//           // need to check ejs?
//           './src/**/*.html',
//           './src/**/*.js',
//           './src/**/*.jsx',
//           './src/**/*.ts',
//           './src/**/*.tsx',
//         ],
//         defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
//       }),
//       require('cssnano')({
//         preset: 'default',
//       }),
//     ],
//   };

