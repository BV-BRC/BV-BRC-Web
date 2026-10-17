
class NotFound extends Error {
    constructor(message) {
      super(message);
      this.name = 'NotFound';
    }
}
module.exports.NotFound=NotFound

class InvalidDataType extends Error {
    constructor(message) {
      super(message);
      this.name = 'InvalidDataType';
    }
}
module.exports.InvalidDataType=InvalidDataType

class InvalidQueryLanguage extends Error {
    constructor(message) {
      super(message);
      this.name = 'InvalidQueryLanguage';
    }
}
module.exports.InvalidQueryLanguage=InvalidQueryLanguage

class ClientNotInitialized extends Error {
    constructor(message) {
      super(message);
      this.name = 'ClientNotInitialized';
    }
}
module.exports.ClientNotInitialized=ClientNotInitialized
