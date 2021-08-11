function Transaction(data, opts) {
  if (data === void 0) { data = {}; }
  if (opts === void 0) { opts = {}; }
  // instantiate Common class instance based on passed options
  if (opts.common) {
      if (opts.chain || opts.hardfork) {
          throw new Error('Instantiation with both opts.common, and opts.chain and opts.hardfork parameter not allowed!');
      }
      this._common = opts.common;
  }
  else {
      var chain = opts.chain ? opts.chain : 'mainnet';
      var hardfork = opts.hardfork ? opts.hardfork : 'petersburg';
      this._common = new ethereumjs_common_1.default(chain, hardfork);
  }
  // Define Properties
  var fields = [
      {
          name: 'nonce',
          length: 32,
          allowLess: true,
          default: new buffer_1.Buffer([]),
      },
      {
          name: 'gasPrice',
          length: 32,
          allowLess: true,
          default: new buffer_1.Buffer([]),
      },
      {
          name: 'gasLimit',
          alias: 'gas',
          length: 32,
          allowLess: true,
          default: new buffer_1.Buffer([]),
      },
      {
          name: 'to',
          allowZero: true,
          length: 20,
          default: new buffer_1.Buffer([]),
      },
      {
          name: 'value',
          length: 32,
          allowLess: true,
          default: new buffer_1.Buffer([]),
      },
      {
          name: 'data',
          alias: 'input',
          allowZero: true,
          default: new buffer_1.Buffer([]),
      },
      {
          name: 'v',
          allowZero: true,
          default: new buffer_1.Buffer([]),
      },
      {
          name: 'r',
          length: 32,
          allowZero: true,
          allowLess: true,
          default: new buffer_1.Buffer([]),
      },
      {
          name: 's',
          length: 32,
          allowZero: true,
          allowLess: true,
          default: new buffer_1.Buffer([]),
      },
  ];
  // attached serialize
  ethereumjs_util_1.defineProperties(this, fields, data);
  /**
   * @property {Buffer} from (read only) sender address of this transaction, mathematically derived from other parameters.
   * @name from
   * @memberof Transaction
   */
  Object.defineProperty(this, 'from', {
      enumerable: true,
      configurable: true,
      get: this.getSenderAddress.bind(this),
  });
  this._validateV(this.v);
  this._overrideVSetterWithValidation();
}