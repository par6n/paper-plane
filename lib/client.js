'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var uuid = require('uuid/v4'),
    EventEmitter = require('events'),
    ffi = require('ffi-napi'),
    ref = require('ref-napi'),
    path = require('path');

var Client = function (_EventEmitter) {
    _inherits(Client, _EventEmitter);

    function Client(binaryPath) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, Client);

        var _this = _possibleConstructorReturn(this, (Client.__proto__ || Object.getPrototypeOf(Client)).call(this));

        var defaultOptions = {
            'use_message_database': true,
            'use_secret_chats': false,
            'system_language_code': 'en',
            'application_version': '0.0.0',
            'device_model': 'Paper',
            'system_version': 'Plane',
            'enable_storage_optimizer': true,
            'database_directory': path.resolve(process.cwd(), '.td_db'),
            'files_directory': path.resolve(process.cwd(), '.td_files'),
            'api_id': '',
            'api_hash': ''
        };
        _this.options = _extends({}, defaultOptions, options);

        _this.td = ffi.Library(binaryPath, {
            'td_json_client_create': [ref.refType('void'), []],
            'td_json_client_send': [ref.types.void, [ref.refType('void'), ref.types.CString]],
            'td_json_client_receive': [ref.types.CString, [ref.refType('void'), ref.types.double]],
            'td_json_client_execute': [ref.types.CString, [ref.refType('void'), ref.types.CString]],
            'td_json_client_destroy': [ref.types.void, [ref.refType('void')]],
            'td_set_log_verbosity_level': [ref.types.void, [ref.types.int]]
        });

        _this.connect = function () {
            return new Promise(function (resolve, reject) {
                _this.resolver = resolve;
                _this.rejector = reject;
            });
        };

        _this.fetching = {};
        _this.init();
        return _this;
    }

    _createClass(Client, [{
        key: 'init',
        value: function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.prev = 0;

                                this.td.td_set_log_verbosity_level(this.options.verbosityLevel);
                                _context.next = 4;
                                return this._create();

                            case 4:
                                this.client = _context.sent;

                                this.loop();
                                _context.next = 11;
                                break;

                            case 8:
                                _context.prev = 8;
                                _context.t0 = _context['catch'](0);

                                this.rejector('Error while creating client: ' + _context.t0);

                            case 11:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[0, 8]]);
            }));

            function init() {
                return _ref.apply(this, arguments);
            }

            return init;
        }()
    }, {
        key: 'loop',
        value: function () {
            var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
                var update;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this._receive();

                            case 2:
                                update = _context2.sent;

                                if (update) {
                                    _context2.next = 5;
                                    break;
                                }

                                return _context2.abrupt('return', this.loop());

                            case 5:
                                _context2.t0 = update['@type'];
                                _context2.next = _context2.t0 === 'updateAuthorizationState' ? 8 : _context2.t0 === 'error' ? 12 : 13;
                                break;

                            case 8:
                                _context2.next = 10;
                                return this._handleAuth(update);

                            case 10:
                                this.emit('authStateUpdate', update);
                                return _context2.abrupt('break', 16);

                            case 12:
                                this.emit('error', update);
                                // console.error( update )

                            case 13:
                                _context2.next = 15;
                                return this._handleUpdate(update);

                            case 15:
                                return _context2.abrupt('break', 16);

                            case 16:

                                this.loop();

                            case 17:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function loop() {
                return _ref2.apply(this, arguments);
            }

            return loop;
        }()
    }, {
        key: '_handleAuth',
        value: function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(update) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.t0 = update['authorization_state']['@type'];
                                _context3.next = _context3.t0 === 'authorizationStateWaitTdlibParameters' ? 3 : _context3.t0 === 'authorizationStateWaitEncryptionKey' ? 6 : _context3.t0 === 'authorizationStateReady' ? 8 : 10;
                                break;

                            case 3:
                                _context3.next = 5;
                                return this.send({
                                    '@type': 'setTdlibParameters',
                                    'parameters': _extends({}, this.options, {
                                        '@type': 'tdlibParameters'
                                    })
                                });

                            case 5:
                                return _context3.abrupt('break', 10);

                            case 6:
                                _context3.next = 8;
                                return this.send({
                                    '@type': 'checkDatabaseEncryptionKey'
                                });

                            case 8:
                                this.resolver();
                                return _context3.abrupt('break', 10);

                            case 10:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function _handleAuth(_x2) {
                return _ref3.apply(this, arguments);
            }

            return _handleAuth;
        }()
    }, {
        key: '_handleUpdate',
        value: function () {
            var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(update) {
                var id;
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                id = update['@extra'];

                                if (id && this.fetching[id]) {
                                    delete update['@extra'];
                                    this.fetching[id](update);
                                    delete this.fetching[id];
                                } else {
                                    this.emit('update', update);
                                }

                            case 2:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function _handleUpdate(_x3) {
                return _ref4.apply(this, arguments);
            }

            return _handleUpdate;
        }()
    }, {
        key: 'fetch',
        value: function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(query) {
                var _this2 = this;

                var id, receiver, result;
                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                id = uuid();

                                query['@extra'] = id;
                                receiver = new Promise(function (resolve, reject) {
                                    _this2.fetching[id] = resolve;

                                    setTimeout(function () {
                                        delete _this2.fetching[id];
                                        reject('Query timed out');
                                    }, 1000 * 10);
                                });
                                _context5.next = 5;
                                return this.send(query);

                            case 5:
                                _context5.next = 7;
                                return receiver;

                            case 7:
                                result = _context5.sent;
                                return _context5.abrupt('return', result);

                            case 9:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function fetch(_x4) {
                return _ref5.apply(this, arguments);
            }

            return fetch;
        }()
    }, {
        key: '_create',
        value: function _create() {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                _this3.td.td_json_client_create.async(function (err, client) {
                    if (err) return reject(err);else return resolve(client);
                });
            });
        }
    }, {
        key: 'send',
        value: function send(query) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
                _this4.td.td_json_client_send.async(_this4.client, _this4._buildQuery(query), function (err, resp) {
                    if (err) return reject(err);
                    if (!resp) return resolve(null);
                    resolve(JSON.parse(resp));
                });
            });
        }
    }, {
        key: '_receive',
        value: function _receive() {
            var _this5 = this;

            var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

            return new Promise(function (resolve, reject) {
                _this5.td.td_json_client_receive.async(_this5.client, timeout, function (err, resp) {
                    if (err) return reject(err);
                    if (!resp) return resolve(null);
                    resolve(JSON.parse(resp));
                });
            });
        }
    }, {
        key: 'execute',
        value: function execute(query) {
            var _this6 = this;

            return new Promise(function (resolve, reject) {
                try {
                    var resp = _this6.td.td_json_client_execute(_this6.client, _this6._buildQuery(query));
                    if (!resp) return resolve(null);
                    resolve(JSON.parse(resp));
                } catch (err) {
                    reject(err);
                }
            });
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.td.td_json_client_destroy(this.client);
            this.client = null;
            return true;
        }
    }, {
        key: '_buildQuery',
        value: function _buildQuery(query) {
            var buffer = Buffer.from(JSON.stringify(query) + '\0', 'utf-8');
            buffer.type = ref.types.CString;
            return buffer;
        }
    }]);

    return Client;
}(EventEmitter);

module.exports = Client;