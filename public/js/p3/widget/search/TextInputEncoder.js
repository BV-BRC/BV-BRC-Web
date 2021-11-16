define([], function () {

  return function TextInputEncoder(str) {
    const encoded = encodeURIComponent(str.trim());
    // console.log(`input: ${str}, output: ${encoded}`)
    return encoded;
  }
});
