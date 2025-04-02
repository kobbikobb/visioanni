var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// node_modules/postgres/src/query.js
function cachedError(xs) {
  if (originCache.has(xs))
    return originCache.get(xs);
  const x = Error.stackTraceLimit;
  Error.stackTraceLimit = 4;
  originCache.set(xs, new Error);
  Error.stackTraceLimit = x;
  return originCache.get(xs);
}
var originCache, originStackCache, originError, CLOSE, Query;
var init_query = __esm(() => {
  originCache = new Map;
  originStackCache = new Map;
  originError = Symbol("OriginError");
  CLOSE = {};
  Query = class Query extends Promise {
    constructor(strings, args, handler, canceller, options = {}) {
      let resolve, reject;
      super((a, b) => {
        resolve = a;
        reject = b;
      });
      this.tagged = Array.isArray(strings.raw);
      this.strings = strings;
      this.args = args;
      this.handler = handler;
      this.canceller = canceller;
      this.options = options;
      this.state = null;
      this.statement = null;
      this.resolve = (x) => (this.active = false, resolve(x));
      this.reject = (x) => (this.active = false, reject(x));
      this.active = false;
      this.cancelled = null;
      this.executed = false;
      this.signature = "";
      this[originError] = this.handler.debug ? new Error : this.tagged && cachedError(this.strings);
    }
    get origin() {
      return (this.handler.debug ? this[originError].stack : this.tagged && originStackCache.has(this.strings) ? originStackCache.get(this.strings) : originStackCache.set(this.strings, this[originError].stack).get(this.strings)) || "";
    }
    static get [Symbol.species]() {
      return Promise;
    }
    cancel() {
      return this.canceller && (this.canceller(this), this.canceller = null);
    }
    simple() {
      this.options.simple = true;
      this.options.prepare = false;
      return this;
    }
    async readable() {
      this.simple();
      this.streaming = true;
      return this;
    }
    async writable() {
      this.simple();
      this.streaming = true;
      return this;
    }
    cursor(rows = 1, fn) {
      this.options.simple = false;
      if (typeof rows === "function") {
        fn = rows;
        rows = 1;
      }
      this.cursorRows = rows;
      if (typeof fn === "function")
        return this.cursorFn = fn, this;
      let prev;
      return {
        [Symbol.asyncIterator]: () => ({
          next: () => {
            if (this.executed && !this.active)
              return { done: true };
            prev && prev();
            const promise = new Promise((resolve, reject) => {
              this.cursorFn = (value) => {
                resolve({ value, done: false });
                return new Promise((r) => prev = r);
              };
              this.resolve = () => (this.active = false, resolve({ done: true }));
              this.reject = (x) => (this.active = false, reject(x));
            });
            this.execute();
            return promise;
          },
          return() {
            prev && prev(CLOSE);
            return { done: true };
          }
        })
      };
    }
    describe() {
      this.options.simple = false;
      this.onlyDescribe = this.options.prepare = true;
      return this;
    }
    stream() {
      throw new Error(".stream has been renamed to .forEach");
    }
    forEach(fn) {
      this.forEachFn = fn;
      this.handle();
      return this;
    }
    raw() {
      this.isRaw = true;
      return this;
    }
    values() {
      this.isRaw = "values";
      return this;
    }
    async handle() {
      !this.executed && (this.executed = true) && await 1 && this.handler(this);
    }
    execute() {
      this.handle();
      return this;
    }
    then() {
      this.handle();
      return super.then.apply(this, arguments);
    }
    catch() {
      this.handle();
      return super.catch.apply(this, arguments);
    }
    finally() {
      this.handle();
      return super.finally.apply(this, arguments);
    }
  };
});

// node_modules/postgres/src/errors.js
function connection(x, options, socket) {
  const { host, port } = socket || options;
  const error = Object.assign(new Error("write " + x + " " + (options.path || host + ":" + port)), {
    code: x,
    errno: x,
    address: options.path || host
  }, options.path ? {} : { port });
  Error.captureStackTrace(error, connection);
  return error;
}
function postgres(x) {
  const error = new PostgresError(x);
  Error.captureStackTrace(error, postgres);
  return error;
}
function generic(code, message2) {
  const error = Object.assign(new Error(code + ": " + message2), { code });
  Error.captureStackTrace(error, generic);
  return error;
}
function notSupported(x) {
  const error = Object.assign(new Error(x + " (B) is not supported"), {
    code: "MESSAGE_NOT_SUPPORTED",
    name: x
  });
  Error.captureStackTrace(error, notSupported);
  return error;
}
var PostgresError, Errors;
var init_errors = __esm(() => {
  PostgresError = class PostgresError extends Error {
    constructor(x) {
      super(x.message);
      this.name = this.constructor.name;
      Object.assign(this, x);
    }
  };
  Errors = {
    connection,
    postgres,
    generic,
    notSupported
  };
});

// node_modules/postgres/src/types.js
class NotTagged {
  then() {
    notTagged();
  }
  catch() {
    notTagged();
  }
  finally() {
    notTagged();
  }
}
function handleValue(x, parameters, types12, options) {
  let value = x instanceof Parameter ? x.value : x;
  if (value === undefined) {
    x instanceof Parameter ? x.value = options.transform.undefined : value = x = options.transform.undefined;
    if (value === undefined)
      throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
  }
  return "$" + types12.push(x instanceof Parameter ? (parameters.push(x.value), x.array ? x.array[x.type || inferType(x.value)] || x.type || firstIsString(x.value) : x.type) : (parameters.push(x), inferType(x)));
}
function stringify(q, string, value, parameters, types12, options) {
  for (let i = 1;i < q.strings.length; i++) {
    string += stringifyValue(string, value, parameters, types12, options) + q.strings[i];
    value = q.args[i];
  }
  return string;
}
function stringifyValue(string, value, parameters, types12, o) {
  return value instanceof Builder ? value.build(string, parameters, types12, o) : value instanceof Query ? fragment(value, parameters, types12, o) : value instanceof Identifier ? value.value : value && value[0] instanceof Query ? value.reduce((acc, x) => acc + " " + fragment(x, parameters, types12, o), "") : handleValue(value, parameters, types12, o);
}
function fragment(q, parameters, types12, options) {
  q.fragment = true;
  return stringify(q, q.strings[0], q.args[0], parameters, types12, options);
}
function valuesBuilder(first, parameters, types12, columns, options) {
  return first.map((row) => "(" + columns.map((column) => stringifyValue("values", row[column], parameters, types12, options)).join(",") + ")").join(",");
}
function values(first, rest, parameters, types12, options) {
  const multi = Array.isArray(first[0]);
  const columns = rest.length ? rest.flat() : Object.keys(multi ? first[0] : first);
  return valuesBuilder(multi ? first : [first], parameters, types12, columns, options);
}
function select(first, rest, parameters, types12, options) {
  typeof first === "string" && (first = [first].concat(rest));
  if (Array.isArray(first))
    return escapeIdentifiers(first, options);
  let value;
  const columns = rest.length ? rest.flat() : Object.keys(first);
  return columns.map((x) => {
    value = first[x];
    return (value instanceof Query ? fragment(value, parameters, types12, options) : value instanceof Identifier ? value.value : handleValue(value, parameters, types12, options)) + " as " + escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x);
  }).join(",");
}
function notTagged() {
  throw Errors.generic("NOT_TAGGED_CALL", "Query not called as a tagged template literal");
}
function firstIsString(x) {
  if (Array.isArray(x))
    return firstIsString(x[0]);
  return typeof x === "string" ? 1009 : 0;
}
function typeHandlers(types12) {
  return Object.keys(types12).reduce((acc, k) => {
    types12[k].from && [].concat(types12[k].from).forEach((x) => acc.parsers[x] = types12[k].parse);
    if (types12[k].serialize) {
      acc.serializers[types12[k].to] = types12[k].serialize;
      types12[k].from && [].concat(types12[k].from).forEach((x) => acc.serializers[x] = types12[k].serialize);
    }
    return acc;
  }, { parsers: {}, serializers: {} });
}
function escapeIdentifiers(xs, { transform: { column } }) {
  return xs.map((x) => escapeIdentifier(column.to ? column.to(x) : x)).join(",");
}
function arrayEscape(x) {
  return x.replace(escapeBackslash, "\\\\").replace(escapeQuote, "\\\"");
}
function arrayParserLoop(s, x, parser, typarray) {
  const xs = [];
  const delimiter = typarray === 1020 ? ";" : ",";
  for (;s.i < x.length; s.i++) {
    s.char = x[s.i];
    if (s.quoted) {
      if (s.char === "\\") {
        s.str += x[++s.i];
      } else if (s.char === '"') {
        xs.push(parser ? parser(s.str) : s.str);
        s.str = "";
        s.quoted = x[s.i + 1] === '"';
        s.last = s.i + 2;
      } else {
        s.str += s.char;
      }
    } else if (s.char === '"') {
      s.quoted = true;
    } else if (s.char === "{") {
      s.last = ++s.i;
      xs.push(arrayParserLoop(s, x, parser, typarray));
    } else if (s.char === "}") {
      s.quoted = false;
      s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
      break;
    } else if (s.char === delimiter && s.p !== "}" && s.p !== '"') {
      xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
    }
    s.p = s.char;
  }
  s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i + 1)) : x.slice(s.last, s.i + 1));
  return xs;
}
function createJsonTransform(fn) {
  return function jsonTransform(x, column) {
    return typeof x === "object" && x !== null && (column.type === 114 || column.type === 3802) ? Array.isArray(x) ? x.map((x2) => jsonTransform(x2, column)) : Object.entries(x).reduce((acc, [k, v]) => Object.assign(acc, { [fn(k)]: jsonTransform(v, column) }), {}) : x;
  };
}
var types11, Identifier, Parameter, Builder, defaultHandlers, builders, serializers, parsers, mergeUserTypes = function(types12) {
  const user = typeHandlers(types12 || {});
  return {
    serializers: Object.assign({}, serializers, user.serializers),
    parsers: Object.assign({}, parsers, user.parsers)
  };
}, escapeIdentifier = function escape(str) {
  return '"' + str.replace(/"/g, '""').replace(/\./g, '"."') + '"';
}, inferType = function inferType2(x) {
  return x instanceof Parameter ? x.type : x instanceof Date ? 1184 : x instanceof Uint8Array ? 17 : x === true || x === false ? 16 : typeof x === "bigint" ? 20 : Array.isArray(x) ? inferType2(x[0]) : 0;
}, escapeBackslash, escapeQuote, arraySerializer = function arraySerializer2(xs, serializer, options, typarray) {
  if (Array.isArray(xs) === false)
    return xs;
  if (!xs.length)
    return "{}";
  const first = xs[0];
  const delimiter = typarray === 1020 ? ";" : ",";
  if (Array.isArray(first) && !first.type)
    return "{" + xs.map((x) => arraySerializer2(x, serializer, options, typarray)).join(delimiter) + "}";
  return "{" + xs.map((x) => {
    if (x === undefined) {
      x = options.transform.undefined;
      if (x === undefined)
        throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
    }
    return x === null ? "null" : '"' + arrayEscape(serializer ? serializer(x.type ? x.value : x) : "" + x) + '"';
  }).join(delimiter) + "}";
}, arrayParserState, arrayParser = function arrayParser2(x, parser, typarray) {
  arrayParserState.i = arrayParserState.last = 0;
  return arrayParserLoop(arrayParserState, x, parser, typarray);
}, toCamel = (x) => {
  let str = x[0];
  for (let i = 1;i < x.length; i++)
    str += x[i] === "_" ? x[++i].toUpperCase() : x[i];
  return str;
}, toPascal = (x) => {
  let str = x[0].toUpperCase();
  for (let i = 1;i < x.length; i++)
    str += x[i] === "_" ? x[++i].toUpperCase() : x[i];
  return str;
}, toKebab = (x) => x.replace(/_/g, "-"), fromCamel = (x) => x.replace(/([A-Z])/g, "_$1").toLowerCase(), fromPascal = (x) => (x.slice(0, 1) + x.slice(1).replace(/([A-Z])/g, "_$1")).toLowerCase(), fromKebab = (x) => x.replace(/-/g, "_"), camel, pascal, kebab;
var init_types = __esm(() => {
  init_query();
  init_errors();
  types11 = {
    string: {
      to: 25,
      from: null,
      serialize: (x) => "" + x
    },
    number: {
      to: 0,
      from: [21, 23, 26, 700, 701],
      serialize: (x) => "" + x,
      parse: (x) => +x
    },
    json: {
      to: 114,
      from: [114, 3802],
      serialize: (x) => JSON.stringify(x),
      parse: (x) => JSON.parse(x)
    },
    boolean: {
      to: 16,
      from: 16,
      serialize: (x) => x === true ? "t" : "f",
      parse: (x) => x === "t"
    },
    date: {
      to: 1184,
      from: [1082, 1114, 1184],
      serialize: (x) => (x instanceof Date ? x : new Date(x)).toISOString(),
      parse: (x) => new Date(x)
    },
    bytea: {
      to: 17,
      from: 17,
      serialize: (x) => "\\x" + Buffer.from(x).toString("hex"),
      parse: (x) => Buffer.from(x.slice(2), "hex")
    }
  };
  Identifier = class Identifier extends NotTagged {
    constructor(value) {
      super();
      this.value = escapeIdentifier(value);
    }
  };
  Parameter = class Parameter extends NotTagged {
    constructor(value, type, array) {
      super();
      this.value = value;
      this.type = type;
      this.array = array;
    }
  };
  Builder = class Builder extends NotTagged {
    constructor(first, rest) {
      super();
      this.first = first;
      this.rest = rest;
    }
    build(before, parameters, types12, options) {
      const keyword = builders.map(([x, fn]) => ({ fn, i: before.search(x) })).sort((a, b) => a.i - b.i).pop();
      return keyword.i === -1 ? escapeIdentifiers(this.first, options) : keyword.fn(this.first, this.rest, parameters, types12, options);
    }
  };
  defaultHandlers = typeHandlers(types11);
  builders = Object.entries({
    values,
    in: (...xs) => {
      const x = values(...xs);
      return x === "()" ? "(null)" : x;
    },
    select,
    as: select,
    returning: select,
    "\\(": select,
    update(first, rest, parameters, types12, options) {
      return (rest.length ? rest.flat() : Object.keys(first)).map((x) => escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x) + "=" + stringifyValue("values", first[x], parameters, types12, options));
    },
    insert(first, rest, parameters, types12, options) {
      const columns = rest.length ? rest.flat() : Object.keys(Array.isArray(first) ? first[0] : first);
      return "(" + escapeIdentifiers(columns, options) + ")values" + valuesBuilder(Array.isArray(first) ? first : [first], parameters, types12, columns, options);
    }
  }).map(([x, fn]) => [new RegExp("((?:^|[\\s(])" + x + "(?:$|[\\s(]))(?![\\s\\S]*\\1)", "i"), fn]);
  serializers = defaultHandlers.serializers;
  parsers = defaultHandlers.parsers;
  escapeBackslash = /\\/g;
  escapeQuote = /"/g;
  arrayParserState = {
    i: 0,
    char: null,
    str: "",
    quoted: false,
    last: 0
  };
  toCamel.column = { from: toCamel };
  toCamel.value = { from: createJsonTransform(toCamel) };
  fromCamel.column = { to: fromCamel };
  camel = { ...toCamel };
  camel.column.to = fromCamel;
  toPascal.column = { from: toPascal };
  toPascal.value = { from: createJsonTransform(toPascal) };
  fromPascal.column = { to: fromPascal };
  pascal = { ...toPascal };
  pascal.column.to = fromPascal;
  toKebab.column = { from: toKebab };
  toKebab.value = { from: createJsonTransform(toKebab) };
  fromKebab.column = { to: fromKebab };
  kebab = { ...toKebab };
  kebab.column.to = fromKebab;
});

// node_modules/postgres/src/result.js
var Result;
var init_result = __esm(() => {
  Result = class Result extends Array {
    constructor() {
      super();
      Object.defineProperties(this, {
        count: { value: null, writable: true },
        state: { value: null, writable: true },
        command: { value: null, writable: true },
        columns: { value: null, writable: true },
        statement: { value: null, writable: true }
      });
    }
    static get [Symbol.species]() {
      return Array;
    }
  };
});

// node_modules/postgres/src/queue.js
function Queue(initial = []) {
  let xs = initial.slice();
  let index = 0;
  return {
    get length() {
      return xs.length - index;
    },
    remove: (x) => {
      const index2 = xs.indexOf(x);
      return index2 === -1 ? null : (xs.splice(index2, 1), x);
    },
    push: (x) => (xs.push(x), x),
    shift: () => {
      const out = xs[index++];
      if (index === xs.length) {
        index = 0;
        xs = [];
      } else {
        xs[index - 1] = undefined;
      }
      return out;
    }
  };
}
var queue_default;
var init_queue = __esm(() => {
  queue_default = Queue;
});

// node_modules/postgres/src/bytes.js
function fit(x) {
  if (buffer.length - b.i < x) {
    const prev = buffer, length = prev.length;
    buffer = Buffer.allocUnsafe(length + (length >> 1) + x);
    prev.copy(buffer);
  }
}
function reset() {
  b.i = 0;
  return b;
}
var size = 256, buffer, messages, b, bytes_default;
var init_bytes = __esm(() => {
  buffer = Buffer.allocUnsafe(size);
  messages = "BCcDdEFfHPpQSX".split("").reduce((acc, x) => {
    const v = x.charCodeAt(0);
    acc[x] = () => {
      buffer[0] = v;
      b.i = 5;
      return b;
    };
    return acc;
  }, {});
  b = Object.assign(reset, messages, {
    N: String.fromCharCode(0),
    i: 0,
    inc(x) {
      b.i += x;
      return b;
    },
    str(x) {
      const length = Buffer.byteLength(x);
      fit(length);
      b.i += buffer.write(x, b.i, length, "utf8");
      return b;
    },
    i16(x) {
      fit(2);
      buffer.writeUInt16BE(x, b.i);
      b.i += 2;
      return b;
    },
    i32(x, i) {
      if (i || i === 0) {
        buffer.writeUInt32BE(x, i);
        return b;
      }
      fit(4);
      buffer.writeUInt32BE(x, b.i);
      b.i += 4;
      return b;
    },
    z(x) {
      fit(x);
      buffer.fill(0, b.i, b.i + x);
      b.i += x;
      return b;
    },
    raw(x) {
      buffer = Buffer.concat([buffer.subarray(0, b.i), x]);
      b.i = buffer.length;
      return b;
    },
    end(at = 1) {
      buffer.writeUInt32BE(b.i - at, at);
      const out = buffer.subarray(0, b.i);
      b.i = 0;
      buffer = Buffer.allocUnsafe(size);
      return out;
    }
  });
  bytes_default = b;
});

// node_modules/postgres/src/connection.js
import net from "net";
import tls from "tls";
import crypto5 from "crypto";
import Stream from "stream";
import { performance } from "perf_hooks";
function Connection(options, queues = {}, { onopen = noop, onend = noop, onclose = noop } = {}) {
  const {
    ssl,
    max,
    user,
    host,
    port,
    database,
    parsers: parsers2,
    transform,
    onnotice,
    onnotify,
    onparameter,
    max_pipeline,
    keep_alive,
    backoff,
    target_session_attrs
  } = options;
  const sent = queue_default(), id = uid++, backend = { pid: null, secret: null }, idleTimer = timer(end, options.idle_timeout), lifeTimer = timer(end, options.max_lifetime), connectTimer = timer(connectTimedOut, options.connect_timeout);
  let socket = null, cancelMessage, result = new Result, incoming = Buffer.alloc(0), needsTypes = options.fetch_types, backendParameters = {}, statements = {}, statementId = Math.random().toString(36).slice(2), statementCount = 1, closedDate = 0, remaining = 0, hostIndex = 0, retries = 0, length = 0, delay = 0, rows = 0, serverSignature = null, nextWriteTimer = null, terminated = false, incomings = null, results = null, initial = null, ending = null, stream = null, chunk = null, ended = null, nonce = null, query = null, final = null;
  const connection2 = {
    queue: queues.closed,
    idleTimer,
    connect(query2) {
      initial = query2 || true;
      reconnect();
    },
    terminate,
    execute,
    cancel,
    end,
    count: 0,
    id
  };
  queues.closed && queues.closed.push(connection2);
  return connection2;
  async function createSocket() {
    let x;
    try {
      x = options.socket ? await Promise.resolve(options.socket(options)) : new net.Socket;
    } catch (e) {
      error(e);
      return;
    }
    x.on("error", error);
    x.on("close", closed);
    x.on("drain", drain);
    return x;
  }
  async function cancel({ pid, secret }, resolve, reject) {
    try {
      cancelMessage = bytes_default().i32(16).i32(80877102).i32(pid).i32(secret).end(16);
      await connect();
      socket.once("error", reject);
      socket.once("close", resolve);
    } catch (error2) {
      reject(error2);
    }
  }
  function execute(q) {
    if (terminated)
      return queryError(q, Errors.connection("CONNECTION_DESTROYED", options));
    if (q.cancelled)
      return;
    try {
      q.state = backend;
      query ? sent.push(q) : (query = q, query.active = true);
      build(q);
      return write2(toBuffer(q)) && !q.describeFirst && !q.cursorFn && sent.length < max_pipeline && (!q.options.onexecute || q.options.onexecute(connection2));
    } catch (error2) {
      sent.length === 0 && write2(Sync);
      errored(error2);
      return true;
    }
  }
  function toBuffer(q) {
    if (q.parameters.length >= 65534)
      throw Errors.generic("MAX_PARAMETERS_EXCEEDED", "Max number of parameters (65534) exceeded");
    return q.options.simple ? bytes_default().Q().str(q.statement.string + bytes_default.N).end() : q.describeFirst ? Buffer.concat([describe(q), Flush]) : q.prepare ? q.prepared ? prepared(q) : Buffer.concat([describe(q), prepared(q)]) : unnamed(q);
  }
  function describe(q) {
    return Buffer.concat([
      Parse(q.statement.string, q.parameters, q.statement.types, q.statement.name),
      Describe("S", q.statement.name)
    ]);
  }
  function prepared(q) {
    return Buffer.concat([
      Bind(q.parameters, q.statement.types, q.statement.name, q.cursorName),
      q.cursorFn ? Execute("", q.cursorRows) : ExecuteUnnamed
    ]);
  }
  function unnamed(q) {
    return Buffer.concat([
      Parse(q.statement.string, q.parameters, q.statement.types),
      DescribeUnnamed,
      prepared(q)
    ]);
  }
  function build(q) {
    const parameters = [], types12 = [];
    const string = stringify(q, q.strings[0], q.args[0], parameters, types12, options);
    !q.tagged && q.args.forEach((x) => handleValue(x, parameters, types12, options));
    q.prepare = options.prepare && ("prepare" in q.options ? q.options.prepare : true);
    q.string = string;
    q.signature = q.prepare && types12 + string;
    q.onlyDescribe && delete statements[q.signature];
    q.parameters = q.parameters || parameters;
    q.prepared = q.prepare && q.signature in statements;
    q.describeFirst = q.onlyDescribe || parameters.length && !q.prepared;
    q.statement = q.prepared ? statements[q.signature] : { string, types: types12, name: q.prepare ? statementId + statementCount++ : "" };
    typeof options.debug === "function" && options.debug(id, string, parameters, types12);
  }
  function write2(x, fn) {
    chunk = chunk ? Buffer.concat([chunk, x]) : Buffer.from(x);
    if (fn || chunk.length >= 1024)
      return nextWrite(fn);
    nextWriteTimer === null && (nextWriteTimer = setImmediate(nextWrite));
    return true;
  }
  function nextWrite(fn) {
    const x = socket.write(chunk, fn);
    nextWriteTimer !== null && clearImmediate(nextWriteTimer);
    chunk = nextWriteTimer = null;
    return x;
  }
  function connectTimedOut() {
    errored(Errors.connection("CONNECT_TIMEOUT", options, socket));
    socket.destroy();
  }
  async function secure() {
    write2(SSLRequest);
    const canSSL = await new Promise((r) => socket.once("data", (x) => r(x[0] === 83)));
    if (!canSSL && ssl === "prefer")
      return connected();
    socket.removeAllListeners();
    socket = tls.connect({
      socket,
      servername: net.isIP(socket.host) ? undefined : socket.host,
      ...ssl === "require" || ssl === "allow" || ssl === "prefer" ? { rejectUnauthorized: false } : ssl === "verify-full" ? {} : typeof ssl === "object" ? ssl : {}
    });
    socket.on("secureConnect", connected);
    socket.on("error", error);
    socket.on("close", closed);
    socket.on("drain", drain);
  }
  function drain() {
    !query && onopen(connection2);
  }
  function data(x) {
    if (incomings) {
      incomings.push(x);
      remaining -= x.length;
      if (remaining >= 0)
        return;
    }
    incoming = incomings ? Buffer.concat(incomings, length - remaining) : incoming.length === 0 ? x : Buffer.concat([incoming, x], incoming.length + x.length);
    while (incoming.length > 4) {
      length = incoming.readUInt32BE(1);
      if (length >= incoming.length) {
        remaining = length - incoming.length;
        incomings = [incoming];
        break;
      }
      try {
        handle(incoming.subarray(0, length + 1));
      } catch (e) {
        query && (query.cursorFn || query.describeFirst) && write2(Sync);
        errored(e);
      }
      incoming = incoming.subarray(length + 1);
      remaining = 0;
      incomings = null;
    }
  }
  async function connect() {
    terminated = false;
    backendParameters = {};
    socket || (socket = await createSocket());
    if (!socket)
      return;
    connectTimer.start();
    if (options.socket)
      return ssl ? secure() : connected();
    socket.on("connect", ssl ? secure : connected);
    if (options.path)
      return socket.connect(options.path);
    socket.ssl = ssl;
    socket.connect(port[hostIndex], host[hostIndex]);
    socket.host = host[hostIndex];
    socket.port = port[hostIndex];
    hostIndex = (hostIndex + 1) % port.length;
  }
  function reconnect() {
    setTimeout(connect, closedDate ? closedDate + delay - performance.now() : 0);
  }
  function connected() {
    try {
      statements = {};
      needsTypes = options.fetch_types;
      statementId = Math.random().toString(36).slice(2);
      statementCount = 1;
      lifeTimer.start();
      socket.on("data", data);
      keep_alive && socket.setKeepAlive && socket.setKeepAlive(true, 1000 * keep_alive);
      const s = StartupMessage();
      write2(s);
    } catch (err) {
      error(err);
    }
  }
  function error(err) {
    if (connection2.queue === queues.connecting && options.host[retries + 1])
      return;
    errored(err);
    while (sent.length)
      queryError(sent.shift(), err);
  }
  function errored(err) {
    stream && (stream.destroy(err), stream = null);
    query && queryError(query, err);
    initial && (queryError(initial, err), initial = null);
  }
  function queryError(query2, err) {
    "query" in err || "parameters" in err || Object.defineProperties(err, {
      stack: { value: err.stack + query2.origin.replace(/.*\n/, `
`), enumerable: options.debug },
      query: { value: query2.string, enumerable: options.debug },
      parameters: { value: query2.parameters, enumerable: options.debug },
      args: { value: query2.args, enumerable: options.debug },
      types: { value: query2.statement && query2.statement.types, enumerable: options.debug }
    });
    query2.reject(err);
  }
  function end() {
    return ending || (!connection2.reserved && onend(connection2), !connection2.reserved && !initial && !query && sent.length === 0 ? (terminate(), new Promise((r) => socket && socket.readyState !== "closed" ? socket.once("close", r) : r())) : ending = new Promise((r) => ended = r));
  }
  function terminate() {
    terminated = true;
    if (stream || query || initial || sent.length)
      error(Errors.connection("CONNECTION_DESTROYED", options));
    clearImmediate(nextWriteTimer);
    if (socket) {
      socket.removeListener("data", data);
      socket.removeListener("connect", connected);
      socket.readyState === "open" && socket.end(bytes_default().X().end());
    }
    ended && (ended(), ending = ended = null);
  }
  async function closed(hadError) {
    incoming = Buffer.alloc(0);
    remaining = 0;
    incomings = null;
    clearImmediate(nextWriteTimer);
    socket.removeListener("data", data);
    socket.removeListener("connect", connected);
    idleTimer.cancel();
    lifeTimer.cancel();
    connectTimer.cancel();
    socket.removeAllListeners();
    socket = null;
    if (initial)
      return reconnect();
    !hadError && (query || sent.length) && error(Errors.connection("CONNECTION_CLOSED", options, socket));
    closedDate = performance.now();
    hadError && options.shared.retries++;
    delay = (typeof backoff === "function" ? backoff(options.shared.retries) : backoff) * 1000;
    onclose(connection2, Errors.connection("CONNECTION_CLOSED", options, socket));
  }
  function handle(xs, x = xs[0]) {
    (x === 68 ? DataRow : x === 100 ? CopyData : x === 65 ? NotificationResponse : x === 83 ? ParameterStatus : x === 90 ? ReadyForQuery : x === 67 ? CommandComplete : x === 50 ? BindComplete : x === 49 ? ParseComplete : x === 116 ? ParameterDescription : x === 84 ? RowDescription : x === 82 ? Authentication : x === 110 ? NoData : x === 75 ? BackendKeyData : x === 69 ? ErrorResponse2 : x === 115 ? PortalSuspended : x === 51 ? CloseComplete : x === 71 ? CopyInResponse : x === 78 ? NoticeResponse : x === 72 ? CopyOutResponse : x === 99 ? CopyDone : x === 73 ? EmptyQueryResponse : x === 86 ? FunctionCallResponse : x === 118 ? NegotiateProtocolVersion : x === 87 ? CopyBothResponse : UnknownMessage)(xs);
  }
  function DataRow(x) {
    let index = 7;
    let length2;
    let column;
    let value;
    const row = query.isRaw ? new Array(query.statement.columns.length) : {};
    for (let i = 0;i < query.statement.columns.length; i++) {
      column = query.statement.columns[i];
      length2 = x.readInt32BE(index);
      index += 4;
      value = length2 === -1 ? null : query.isRaw === true ? x.subarray(index, index += length2) : column.parser === undefined ? x.toString("utf8", index, index += length2) : column.parser.array === true ? column.parser(x.toString("utf8", index + 1, index += length2)) : column.parser(x.toString("utf8", index, index += length2));
      query.isRaw ? row[i] = query.isRaw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
    }
    query.forEachFn ? query.forEachFn(transform.row.from ? transform.row.from(row) : row, result) : result[rows++] = transform.row.from ? transform.row.from(row) : row;
  }
  function ParameterStatus(x) {
    const [k, v] = x.toString("utf8", 5, x.length - 1).split(bytes_default.N);
    backendParameters[k] = v;
    if (options.parameters[k] !== v) {
      options.parameters[k] = v;
      onparameter && onparameter(k, v);
    }
  }
  function ReadyForQuery(x) {
    query && query.options.simple && query.resolve(results || result);
    query = results = null;
    result = new Result;
    connectTimer.cancel();
    if (initial) {
      if (target_session_attrs) {
        if (!backendParameters.in_hot_standby || !backendParameters.default_transaction_read_only)
          return fetchState();
        else if (tryNext(target_session_attrs, backendParameters))
          return terminate();
      }
      if (needsTypes) {
        initial === true && (initial = null);
        return fetchArrayTypes();
      }
      initial !== true && execute(initial);
      options.shared.retries = retries = 0;
      initial = null;
      return;
    }
    while (sent.length && (query = sent.shift()) && (query.active = true, query.cancelled))
      Connection(options).cancel(query.state, query.cancelled.resolve, query.cancelled.reject);
    if (query)
      return;
    connection2.reserved ? !connection2.reserved.release && x[5] === 73 ? ending ? terminate() : (connection2.reserved = null, onopen(connection2)) : connection2.reserved() : ending ? terminate() : onopen(connection2);
  }
  function CommandComplete(x) {
    rows = 0;
    for (let i = x.length - 1;i > 0; i--) {
      if (x[i] === 32 && x[i + 1] < 58 && result.count === null)
        result.count = +x.toString("utf8", i + 1, x.length - 1);
      if (x[i - 1] >= 65) {
        result.command = x.toString("utf8", 5, i);
        result.state = backend;
        break;
      }
    }
    final && (final(), final = null);
    if (result.command === "BEGIN" && max !== 1 && !connection2.reserved)
      return errored(Errors.generic("UNSAFE_TRANSACTION", "Only use sql.begin, sql.reserved or max: 1"));
    if (query.options.simple)
      return BindComplete();
    if (query.cursorFn) {
      result.count && query.cursorFn(result);
      write2(Sync);
    }
    query.resolve(result);
  }
  function ParseComplete() {
    query.parsing = false;
  }
  function BindComplete() {
    !result.statement && (result.statement = query.statement);
    result.columns = query.statement.columns;
  }
  function ParameterDescription(x) {
    const length2 = x.readUInt16BE(5);
    for (let i = 0;i < length2; ++i)
      !query.statement.types[i] && (query.statement.types[i] = x.readUInt32BE(7 + i * 4));
    query.prepare && (statements[query.signature] = query.statement);
    query.describeFirst && !query.onlyDescribe && (write2(prepared(query)), query.describeFirst = false);
  }
  function RowDescription(x) {
    if (result.command) {
      results = results || [result];
      results.push(result = new Result);
      result.count = null;
      query.statement.columns = null;
    }
    const length2 = x.readUInt16BE(5);
    let index = 7;
    let start;
    query.statement.columns = Array(length2);
    for (let i = 0;i < length2; ++i) {
      start = index;
      while (x[index++] !== 0)
        ;
      const table = x.readUInt32BE(index);
      const number = x.readUInt16BE(index + 4);
      const type = x.readUInt32BE(index + 6);
      query.statement.columns[i] = {
        name: transform.column.from ? transform.column.from(x.toString("utf8", start, index - 1)) : x.toString("utf8", start, index - 1),
        parser: parsers2[type],
        table,
        number,
        type
      };
      index += 18;
    }
    result.statement = query.statement;
    if (query.onlyDescribe)
      return query.resolve(query.statement), write2(Sync);
  }
  async function Authentication(x, type = x.readUInt32BE(5)) {
    (type === 3 ? AuthenticationCleartextPassword : type === 5 ? AuthenticationMD5Password : type === 10 ? SASL : type === 11 ? SASLContinue : type === 12 ? SASLFinal : type !== 0 ? UnknownAuth : noop)(x, type);
  }
  async function AuthenticationCleartextPassword() {
    const payload = await Pass();
    write2(bytes_default().p().str(payload).z(1).end());
  }
  async function AuthenticationMD5Password(x) {
    const payload = "md5" + await md5(Buffer.concat([
      Buffer.from(await md5(await Pass() + user)),
      x.subarray(9)
    ]));
    write2(bytes_default().p().str(payload).z(1).end());
  }
  async function SASL() {
    nonce = (await crypto5.randomBytes(18)).toString("base64");
    bytes_default().p().str("SCRAM-SHA-256" + bytes_default.N);
    const i = bytes_default.i;
    write2(bytes_default.inc(4).str("n,,n=*,r=" + nonce).i32(bytes_default.i - i - 4, i).end());
  }
  async function SASLContinue(x) {
    const res = x.toString("utf8", 9).split(",").reduce((acc, x2) => (acc[x2[0]] = x2.slice(2), acc), {});
    const saltedPassword = await crypto5.pbkdf2Sync(await Pass(), Buffer.from(res.s, "base64"), parseInt(res.i), 32, "sha256");
    const clientKey = await hmac(saltedPassword, "Client Key");
    const auth = "n=*,r=" + nonce + "," + "r=" + res.r + ",s=" + res.s + ",i=" + res.i + ",c=biws,r=" + res.r;
    serverSignature = (await hmac(await hmac(saltedPassword, "Server Key"), auth)).toString("base64");
    const payload = "c=biws,r=" + res.r + ",p=" + xor(clientKey, Buffer.from(await hmac(await sha2563(clientKey), auth))).toString("base64");
    write2(bytes_default().p().str(payload).end());
  }
  function SASLFinal(x) {
    if (x.toString("utf8", 9).split(bytes_default.N, 1)[0].slice(2) === serverSignature)
      return;
    errored(Errors.generic("SASL_SIGNATURE_MISMATCH", "The server did not return the correct signature"));
    socket.destroy();
  }
  function Pass() {
    return Promise.resolve(typeof options.pass === "function" ? options.pass() : options.pass);
  }
  function NoData() {
    result.statement = query.statement;
    result.statement.columns = [];
    if (query.onlyDescribe)
      return query.resolve(query.statement), write2(Sync);
  }
  function BackendKeyData(x) {
    backend.pid = x.readUInt32BE(5);
    backend.secret = x.readUInt32BE(9);
  }
  async function fetchArrayTypes() {
    needsTypes = false;
    const types12 = await new Query([`
      select b.oid, b.typarray
      from pg_catalog.pg_type a
      left join pg_catalog.pg_type b on b.oid = a.typelem
      where a.typcategory = 'A'
      group by b.oid, b.typarray
      order by b.oid
    `], [], execute);
    types12.forEach(({ oid, typarray }) => addArrayType(oid, typarray));
  }
  function addArrayType(oid, typarray) {
    if (!!options.parsers[typarray] && !!options.serializers[typarray])
      return;
    const parser = options.parsers[oid];
    options.shared.typeArrayMap[oid] = typarray;
    options.parsers[typarray] = (xs) => arrayParser(xs, parser, typarray);
    options.parsers[typarray].array = true;
    options.serializers[typarray] = (xs) => arraySerializer(xs, options.serializers[oid], options, typarray);
  }
  function tryNext(x, xs) {
    return x === "read-write" && xs.default_transaction_read_only === "on" || x === "read-only" && xs.default_transaction_read_only === "off" || x === "primary" && xs.in_hot_standby === "on" || x === "standby" && xs.in_hot_standby === "off" || x === "prefer-standby" && xs.in_hot_standby === "off" && options.host[retries];
  }
  function fetchState() {
    const query2 = new Query([`
      show transaction_read_only;
      select pg_catalog.pg_is_in_recovery()
    `], [], execute, null, { simple: true });
    query2.resolve = ([[a], [b2]]) => {
      backendParameters.default_transaction_read_only = a.transaction_read_only;
      backendParameters.in_hot_standby = b2.pg_is_in_recovery ? "on" : "off";
    };
    query2.execute();
  }
  function ErrorResponse2(x) {
    query && (query.cursorFn || query.describeFirst) && write2(Sync);
    const error2 = Errors.postgres(parseError(x));
    query && query.retried ? errored(query.retried) : query && query.prepared && retryRoutines.has(error2.routine) ? retry(query, error2) : errored(error2);
  }
  function retry(q, error2) {
    delete statements[q.signature];
    q.retried = error2;
    execute(q);
  }
  function NotificationResponse(x) {
    if (!onnotify)
      return;
    let index = 9;
    while (x[index++] !== 0)
      ;
    onnotify(x.toString("utf8", 9, index - 1), x.toString("utf8", index, x.length - 1));
  }
  async function PortalSuspended() {
    try {
      const x = await Promise.resolve(query.cursorFn(result));
      rows = 0;
      x === CLOSE ? write2(Close(query.portal)) : (result = new Result, write2(Execute("", query.cursorRows)));
    } catch (err) {
      write2(Sync);
      query.reject(err);
    }
  }
  function CloseComplete() {
    result.count && query.cursorFn(result);
    query.resolve(result);
  }
  function CopyInResponse() {
    stream = new Stream.Writable({
      autoDestroy: true,
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error2, callback) {
        callback(error2);
        socket.write(bytes_default().f().str(error2 + bytes_default.N).end());
        stream = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
      }
    });
    query.resolve(stream);
  }
  function CopyOutResponse() {
    stream = new Stream.Readable({
      read() {
        socket.resume();
      }
    });
    query.resolve(stream);
  }
  function CopyBothResponse() {
    stream = new Stream.Duplex({
      autoDestroy: true,
      read() {
        socket.resume();
      },
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error2, callback) {
        callback(error2);
        socket.write(bytes_default().f().str(error2 + bytes_default.N).end());
        stream = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
      }
    });
    query.resolve(stream);
  }
  function CopyData(x) {
    stream && (stream.push(x.subarray(5)) || socket.pause());
  }
  function CopyDone() {
    stream && stream.push(null);
    stream = null;
  }
  function NoticeResponse(x) {
    onnotice ? onnotice(parseError(x)) : console.log(parseError(x));
  }
  function EmptyQueryResponse() {
  }
  function FunctionCallResponse() {
    errored(Errors.notSupported("FunctionCallResponse"));
  }
  function NegotiateProtocolVersion() {
    errored(Errors.notSupported("NegotiateProtocolVersion"));
  }
  function UnknownMessage(x) {
    console.error("Postgres.js : Unknown Message:", x[0]);
  }
  function UnknownAuth(x, type) {
    console.error("Postgres.js : Unknown Auth:", type);
  }
  function Bind(parameters, types12, statement = "", portal = "") {
    let prev, type;
    bytes_default().B().str(portal + bytes_default.N).str(statement + bytes_default.N).i16(0).i16(parameters.length);
    parameters.forEach((x, i) => {
      if (x === null)
        return bytes_default.i32(4294967295);
      type = types12[i];
      parameters[i] = x = type in options.serializers ? options.serializers[type](x) : "" + x;
      prev = bytes_default.i;
      bytes_default.inc(4).str(x).i32(bytes_default.i - prev - 4, prev);
    });
    bytes_default.i16(0);
    return bytes_default.end();
  }
  function Parse(str, parameters, types12, name = "") {
    bytes_default().P().str(name + bytes_default.N).str(str + bytes_default.N).i16(parameters.length);
    parameters.forEach((x, i) => bytes_default.i32(types12[i] || 0));
    return bytes_default.end();
  }
  function Describe(x, name = "") {
    return bytes_default().D().str(x).str(name + bytes_default.N).end();
  }
  function Execute(portal = "", rows2 = 0) {
    return Buffer.concat([
      bytes_default().E().str(portal + bytes_default.N).i32(rows2).end(),
      Flush
    ]);
  }
  function Close(portal = "") {
    return Buffer.concat([
      bytes_default().C().str("P").str(portal + bytes_default.N).end(),
      bytes_default().S().end()
    ]);
  }
  function StartupMessage() {
    return cancelMessage || bytes_default().inc(4).i16(3).z(2).str(Object.entries(Object.assign({
      user,
      database,
      client_encoding: "UTF8"
    }, options.connection)).filter(([, v]) => v).map(([k, v]) => k + bytes_default.N + v).join(bytes_default.N)).z(2).end(0);
  }
}
function parseError(x) {
  const error = {};
  let start = 5;
  for (let i = 5;i < x.length - 1; i++) {
    if (x[i] === 0) {
      error[errorFields[x[start]]] = x.toString("utf8", start + 1, i);
      start = i + 1;
    }
  }
  return error;
}
function md5(x) {
  return crypto5.createHash("md5").update(x).digest("hex");
}
function hmac(key, x) {
  return crypto5.createHmac("sha256", key).update(x).digest();
}
function sha2563(x) {
  return crypto5.createHash("sha256").update(x).digest();
}
function xor(a, b2) {
  const length = Math.max(a.length, b2.length);
  const buffer2 = Buffer.allocUnsafe(length);
  for (let i = 0;i < length; i++)
    buffer2[i] = a[i] ^ b2[i];
  return buffer2;
}
function timer(fn, seconds) {
  seconds = typeof seconds === "function" ? seconds() : seconds;
  if (!seconds)
    return { cancel: noop, start: noop };
  let timer2;
  return {
    cancel() {
      timer2 && (clearTimeout(timer2), timer2 = null);
    },
    start() {
      timer2 && clearTimeout(timer2);
      timer2 = setTimeout(done, seconds * 1000, arguments);
    }
  };
  function done(args) {
    fn.apply(null, args);
    timer2 = null;
  }
}
var connection_default, uid = 1, Sync, Flush, SSLRequest, ExecuteUnnamed, DescribeUnnamed, noop = () => {
}, retryRoutines, errorFields;
var init_connection = __esm(() => {
  init_types();
  init_errors();
  init_result();
  init_queue();
  init_query();
  init_bytes();
  connection_default = Connection;
  Sync = bytes_default().S().end();
  Flush = bytes_default().H().end();
  SSLRequest = bytes_default().i32(8).i32(80877103).end(8);
  ExecuteUnnamed = Buffer.concat([bytes_default().E().str(bytes_default.N).i32(0).end(), Sync]);
  DescribeUnnamed = bytes_default().D().str("S").str(bytes_default.N).end();
  retryRoutines = new Set([
    "FetchPreparedStatement",
    "RevalidateCachedQuery",
    "transformAssignedExpr"
  ]);
  errorFields = {
    83: "severity_local",
    86: "severity",
    67: "code",
    77: "message",
    68: "detail",
    72: "hint",
    80: "position",
    112: "internal_position",
    113: "internal_query",
    87: "where",
    115: "schema_name",
    116: "table_name",
    99: "column_name",
    100: "data type_name",
    110: "constraint_name",
    70: "file",
    76: "line",
    82: "routine"
  };
});

// node_modules/postgres/src/subscribe.js
function Subscribe(postgres2, options) {
  const subscribers = new Map, slot = "postgresjs_" + Math.random().toString(36).slice(2), state = {};
  let connection2, stream, ended = false;
  const sql = subscribe.sql = postgres2({
    ...options,
    transform: { column: {}, value: {}, row: {} },
    max: 1,
    fetch_types: false,
    idle_timeout: null,
    max_lifetime: null,
    connection: {
      ...options.connection,
      replication: "database"
    },
    onclose: async function() {
      if (ended)
        return;
      stream = null;
      state.pid = state.secret = undefined;
      connected(await init(sql, slot, options.publications));
      subscribers.forEach((event) => event.forEach(({ onsubscribe }) => onsubscribe()));
    },
    no_subscribe: true
  });
  const { end, close } = sql;
  sql.end = async () => {
    ended = true;
    stream && await new Promise((r) => (stream.once("close", r), stream.end()));
    return end();
  };
  sql.close = async () => {
    stream && await new Promise((r) => (stream.once("close", r), stream.end()));
    return close();
  };
  return subscribe;
  async function subscribe(event, fn, onsubscribe = noop2, onerror = noop2) {
    event = parseEvent(event);
    if (!connection2)
      connection2 = init(sql, slot, options.publications);
    const subscriber = { fn, onsubscribe };
    const fns = subscribers.has(event) ? subscribers.get(event).add(subscriber) : subscribers.set(event, new Set([subscriber])).get(event);
    const unsubscribe = () => {
      fns.delete(subscriber);
      fns.size === 0 && subscribers.delete(event);
    };
    return connection2.then((x) => {
      connected(x);
      onsubscribe();
      stream && stream.on("error", onerror);
      return { unsubscribe, state, sql };
    });
  }
  function connected(x) {
    stream = x.stream;
    state.pid = x.state.pid;
    state.secret = x.state.secret;
  }
  async function init(sql2, slot2, publications) {
    if (!publications)
      throw new Error("Missing publication names");
    const xs = await sql2.unsafe(`CREATE_REPLICATION_SLOT ${slot2} TEMPORARY LOGICAL pgoutput NOEXPORT_SNAPSHOT`);
    const [x] = xs;
    const stream2 = await sql2.unsafe(`START_REPLICATION SLOT ${slot2} LOGICAL ${x.consistent_point} (proto_version '1', publication_names '${publications}')`).writable();
    const state2 = {
      lsn: Buffer.concat(x.consistent_point.split("/").map((x2) => Buffer.from(("00000000" + x2).slice(-8), "hex")))
    };
    stream2.on("data", data);
    stream2.on("error", error);
    stream2.on("close", sql2.close);
    return { stream: stream2, state: xs.state };
    function error(e) {
      console.error("Unexpected error during logical streaming - reconnecting", e);
    }
    function data(x2) {
      if (x2[0] === 119) {
        parse3(x2.subarray(25), state2, sql2.options.parsers, handle, options.transform);
      } else if (x2[0] === 107 && x2[17]) {
        state2.lsn = x2.subarray(1, 9);
        pong();
      }
    }
    function handle(a, b2) {
      const path = b2.relation.schema + "." + b2.relation.table;
      call("*", a, b2);
      call("*:" + path, a, b2);
      b2.relation.keys.length && call("*:" + path + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
      call(b2.command, a, b2);
      call(b2.command + ":" + path, a, b2);
      b2.relation.keys.length && call(b2.command + ":" + path + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
    }
    function pong() {
      const x2 = Buffer.alloc(34);
      x2[0] = 114;
      x2.fill(state2.lsn, 1);
      x2.writeBigInt64BE(BigInt(Date.now() - Date.UTC(2000, 0, 1)) * BigInt(1000), 25);
      stream2.write(x2);
    }
  }
  function call(x, a, b2) {
    subscribers.has(x) && subscribers.get(x).forEach(({ fn }) => fn(a, b2, x));
  }
}
function Time(x) {
  return new Date(Date.UTC(2000, 0, 1) + Number(x / BigInt(1000)));
}
function parse3(x, state, parsers2, handle, transform) {
  const char = (acc, [k, v]) => (acc[k.charCodeAt(0)] = v, acc);
  Object.entries({
    R: (x2) => {
      let i = 1;
      const r = state[x2.readUInt32BE(i)] = {
        schema: x2.toString("utf8", i += 4, i = x2.indexOf(0, i)) || "pg_catalog",
        table: x2.toString("utf8", i + 1, i = x2.indexOf(0, i + 1)),
        columns: Array(x2.readUInt16BE(i += 2)),
        keys: []
      };
      i += 2;
      let columnIndex = 0, column;
      while (i < x2.length) {
        column = r.columns[columnIndex++] = {
          key: x2[i++],
          name: transform.column.from ? transform.column.from(x2.toString("utf8", i, i = x2.indexOf(0, i))) : x2.toString("utf8", i, i = x2.indexOf(0, i)),
          type: x2.readUInt32BE(i += 1),
          parser: parsers2[x2.readUInt32BE(i)],
          atttypmod: x2.readUInt32BE(i += 4)
        };
        column.key && r.keys.push(column);
        i += 4;
      }
    },
    Y: () => {
    },
    O: () => {
    },
    B: (x2) => {
      state.date = Time(x2.readBigInt64BE(9));
      state.lsn = x2.subarray(1, 9);
    },
    I: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      const { row } = tuples(x2, relation.columns, i += 7, transform);
      handle(row, {
        command: "insert",
        relation
      });
    },
    D: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      handle(key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform).row : null, {
        command: "delete",
        relation,
        key
      });
    },
    U: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      const xs = key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform) : null;
      xs && (i = xs.i);
      const { row } = tuples(x2, relation.columns, i + 3, transform);
      handle(row, {
        command: "update",
        relation,
        key,
        old: xs && xs.row
      });
    },
    T: () => {
    },
    C: () => {
    }
  }).reduce(char, {})[x[0]](x);
}
function tuples(x, columns, xi, transform) {
  let type, column, value;
  const row = transform.raw ? new Array(columns.length) : {};
  for (let i = 0;i < columns.length; i++) {
    type = x[xi++];
    column = columns[i];
    value = type === 110 ? null : type === 117 ? undefined : column.parser === undefined ? x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)) : column.parser.array === true ? column.parser(x.toString("utf8", xi + 5, xi += 4 + x.readUInt32BE(xi))) : column.parser(x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)));
    transform.raw ? row[i] = transform.raw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
  }
  return { i: xi, row: transform.row.from ? transform.row.from(row) : row };
}
function parseEvent(x) {
  const xs = x.match(/^(\*|insert|update|delete)?:?([^.]+?\.?[^=]+)?=?(.+)?/i) || [];
  if (!xs)
    throw new Error("Malformed subscribe pattern: " + x);
  const [, command, path, key] = xs;
  return (command || "*") + (path ? ":" + (path.indexOf(".") === -1 ? "public." + path : path) : "") + (key ? "=" + key : "");
}
var noop2 = () => {
};

// node_modules/postgres/src/large.js
import Stream2 from "stream";
function largeObject(sql, oid, mode = 131072 | 262144) {
  return new Promise(async (resolve, reject) => {
    await sql.begin(async (sql2) => {
      let finish;
      !oid && ([{ oid }] = await sql2`select lo_creat(-1) as oid`);
      const [{ fd }] = await sql2`select lo_open(${oid}, ${mode}) as fd`;
      const lo = {
        writable,
        readable,
        close: () => sql2`select lo_close(${fd})`.then(finish),
        tell: () => sql2`select lo_tell64(${fd})`,
        read: (x) => sql2`select loread(${fd}, ${x}) as data`,
        write: (x) => sql2`select lowrite(${fd}, ${x})`,
        truncate: (x) => sql2`select lo_truncate64(${fd}, ${x})`,
        seek: (x, whence = 0) => sql2`select lo_lseek64(${fd}, ${x}, ${whence})`,
        size: () => sql2`
          select
            lo_lseek64(${fd}, location, 0) as position,
            seek.size
          from (
            select
              lo_lseek64($1, 0, 2) as size,
              tell.location
            from (select lo_tell64($1) as location) tell
          ) seek
        `
      };
      resolve(lo);
      return new Promise(async (r) => finish = r);
      async function readable({
        highWaterMark = 2048 * 8,
        start = 0,
        end = Infinity
      } = {}) {
        let max = end - start;
        start && await lo.seek(start);
        return new Stream2.Readable({
          highWaterMark,
          async read(size2) {
            const l = size2 > max ? size2 - max : size2;
            max -= size2;
            const [{ data }] = await lo.read(l);
            this.push(data);
            if (data.length < size2)
              this.push(null);
          }
        });
      }
      async function writable({
        highWaterMark = 2048 * 8,
        start = 0
      } = {}) {
        start && await lo.seek(start);
        return new Stream2.Writable({
          highWaterMark,
          write(chunk, encoding, callback) {
            lo.write(chunk).then(() => callback(), callback);
          }
        });
      }
    }).catch(reject);
  });
}
var init_large = () => {
};

// node_modules/postgres/src/index.js
import os from "os";
import fs from "fs";
function Postgres(a, b2) {
  const options = parseOptions(a, b2), subscribe = options.no_subscribe || Subscribe(Postgres, { ...options });
  let ending = false;
  const queries = queue_default(), connecting = queue_default(), reserved = queue_default(), closed = queue_default(), ended = queue_default(), open = queue_default(), busy = queue_default(), full = queue_default(), queues = { connecting, reserved, closed, ended, open, busy, full };
  const connections = [...Array(options.max)].map(() => connection_default(options, queues, { onopen, onend, onclose }));
  const sql = Sql(handler);
  Object.assign(sql, {
    get parameters() {
      return options.parameters;
    },
    largeObject: largeObject.bind(null, sql),
    subscribe,
    CLOSE,
    END: CLOSE,
    PostgresError,
    options,
    reserve,
    listen,
    begin,
    close,
    end
  });
  return sql;
  function Sql(handler2) {
    handler2.debug = options.debug;
    Object.entries(options.types).reduce((acc, [name, type]) => {
      acc[name] = (x) => new Parameter(x, type.to);
      return acc;
    }, typed);
    Object.assign(sql2, {
      types: typed,
      typed,
      unsafe,
      notify,
      array,
      json,
      file
    });
    return sql2;
    function typed(value, type) {
      return new Parameter(value, type);
    }
    function sql2(strings, ...args) {
      const query = strings && Array.isArray(strings.raw) ? new Query(strings, args, handler2, cancel) : typeof strings === "string" && !args.length ? new Identifier(options.transform.column.to ? options.transform.column.to(strings) : strings) : new Builder(strings, args);
      return query;
    }
    function unsafe(string, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([string], args, handler2, cancel, {
        prepare: false,
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
    function file(path, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([], args, (query2) => {
        fs.readFile(path, "utf8", (err, string) => {
          if (err)
            return query2.reject(err);
          query2.strings = [string];
          handler2(query2);
        });
      }, cancel, {
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
  }
  async function listen(name, fn, onlisten) {
    const listener = { fn, onlisten };
    const sql2 = listen.sql || (listen.sql = Postgres({
      ...options,
      max: 1,
      idle_timeout: null,
      max_lifetime: null,
      fetch_types: false,
      onclose() {
        Object.entries(listen.channels).forEach(([name2, { listeners }]) => {
          delete listen.channels[name2];
          Promise.all(listeners.map((l) => listen(name2, l.fn, l.onlisten).catch(() => {
          })));
        });
      },
      onnotify(c, x) {
        c in listen.channels && listen.channels[c].listeners.forEach((l) => l.fn(x));
      }
    }));
    const channels = listen.channels || (listen.channels = {}), exists2 = name in channels;
    if (exists2) {
      channels[name].listeners.push(listener);
      const result2 = await channels[name].result;
      listener.onlisten && listener.onlisten();
      return { state: result2.state, unlisten };
    }
    channels[name] = { result: sql2`listen ${sql2.unsafe('"' + name.replace(/"/g, '""') + '"')}`, listeners: [listener] };
    const result = await channels[name].result;
    listener.onlisten && listener.onlisten();
    return { state: result.state, unlisten };
    async function unlisten() {
      if (name in channels === false)
        return;
      channels[name].listeners = channels[name].listeners.filter((x) => x !== listener);
      if (channels[name].listeners.length)
        return;
      delete channels[name];
      return sql2`unlisten ${sql2.unsafe('"' + name.replace(/"/g, '""') + '"')}`;
    }
  }
  async function notify(channel, payload) {
    return await sql`select pg_notify(${channel}, ${"" + payload})`;
  }
  async function reserve() {
    const queue = queue_default();
    const c = open.length ? open.shift() : await new Promise((r) => {
      queries.push({ reserve: r });
      closed.length && connect(closed.shift());
    });
    move(c, reserved);
    c.reserved = () => queue.length ? c.execute(queue.shift()) : move(c, reserved);
    c.reserved.release = true;
    const sql2 = Sql(handler2);
    sql2.release = () => {
      c.reserved = null;
      onopen(c);
    };
    return sql2;
    function handler2(q) {
      c.queue === full ? queue.push(q) : c.execute(q) || move(c, full);
    }
  }
  async function begin(options2, fn) {
    !fn && (fn = options2, options2 = "");
    const queries2 = queue_default();
    let savepoints = 0, connection2, prepare = null;
    try {
      await sql.unsafe("begin " + options2.replace(/[^a-z ]/ig, ""), [], { onexecute }).execute();
      return await Promise.race([
        scope(connection2, fn),
        new Promise((_, reject) => connection2.onclose = reject)
      ]);
    } catch (error) {
      throw error;
    }
    async function scope(c, fn2, name) {
      const sql2 = Sql(handler2);
      sql2.savepoint = savepoint;
      sql2.prepare = (x) => prepare = x.replace(/[^a-z0-9$-_. ]/gi);
      let uncaughtError, result;
      name && await sql2`savepoint ${sql2(name)}`;
      try {
        result = await new Promise((resolve, reject) => {
          const x = fn2(sql2);
          Promise.resolve(Array.isArray(x) ? Promise.all(x) : x).then(resolve, reject);
        });
        if (uncaughtError)
          throw uncaughtError;
      } catch (e) {
        await (name ? sql2`rollback to ${sql2(name)}` : sql2`rollback`);
        throw e instanceof PostgresError && e.code === "25P02" && uncaughtError || e;
      }
      if (!name) {
        prepare ? await sql2`prepare transaction '${sql2.unsafe(prepare)}'` : await sql2`commit`;
      }
      return result;
      function savepoint(name2, fn3) {
        if (name2 && Array.isArray(name2.raw))
          return savepoint((sql3) => sql3.apply(sql3, arguments));
        arguments.length === 1 && (fn3 = name2, name2 = null);
        return scope(c, fn3, "s" + savepoints++ + (name2 ? "_" + name2 : ""));
      }
      function handler2(q) {
        q.catch((e) => uncaughtError || (uncaughtError = e));
        c.queue === full ? queries2.push(q) : c.execute(q) || move(c, full);
      }
    }
    function onexecute(c) {
      connection2 = c;
      move(c, reserved);
      c.reserved = () => queries2.length ? c.execute(queries2.shift()) : move(c, reserved);
    }
  }
  function move(c, queue) {
    c.queue.remove(c);
    queue.push(c);
    c.queue = queue;
    queue === open ? c.idleTimer.start() : c.idleTimer.cancel();
    return c;
  }
  function json(x) {
    return new Parameter(x, 3802);
  }
  function array(x, type) {
    if (!Array.isArray(x))
      return array(Array.from(arguments));
    return new Parameter(x, type || (x.length ? inferType(x) || 25 : 0), options.shared.typeArrayMap);
  }
  function handler(query) {
    if (ending)
      return query.reject(Errors.connection("CONNECTION_ENDED", options, options));
    if (open.length)
      return go(open.shift(), query);
    if (closed.length)
      return connect(closed.shift(), query);
    busy.length ? go(busy.shift(), query) : queries.push(query);
  }
  function go(c, query) {
    return c.execute(query) ? move(c, busy) : move(c, full);
  }
  function cancel(query) {
    return new Promise((resolve, reject) => {
      query.state ? query.active ? connection_default(options).cancel(query.state, resolve, reject) : query.cancelled = { resolve, reject } : (queries.remove(query), query.cancelled = true, query.reject(Errors.generic("57014", "canceling statement due to user request")), resolve());
    });
  }
  async function end({ timeout = null } = {}) {
    if (ending)
      return ending;
    await 1;
    let timer2;
    return ending = Promise.race([
      new Promise((r) => timeout !== null && (timer2 = setTimeout(destroy, timeout * 1000, r))),
      Promise.all(connections.map((c) => c.end()).concat(listen.sql ? listen.sql.end({ timeout: 0 }) : [], subscribe.sql ? subscribe.sql.end({ timeout: 0 }) : []))
    ]).then(() => clearTimeout(timer2));
  }
  async function close() {
    await Promise.all(connections.map((c) => c.end()));
  }
  async function destroy(resolve) {
    await Promise.all(connections.map((c) => c.terminate()));
    while (queries.length)
      queries.shift().reject(Errors.connection("CONNECTION_DESTROYED", options));
    resolve();
  }
  function connect(c, query) {
    move(c, connecting);
    c.connect(query);
    return c;
  }
  function onend(c) {
    move(c, ended);
  }
  function onopen(c) {
    if (queries.length === 0)
      return move(c, open);
    let max = Math.ceil(queries.length / (connecting.length + 1)), ready = true;
    while (ready && queries.length && max-- > 0) {
      const query = queries.shift();
      if (query.reserve)
        return query.reserve(c);
      ready = c.execute(query);
    }
    ready ? move(c, busy) : move(c, full);
  }
  function onclose(c, e) {
    move(c, closed);
    c.reserved = null;
    c.onclose && (c.onclose(e), c.onclose = null);
    options.onclose && options.onclose(c.id);
    queries.length && connect(c, queries.shift());
  }
}
function parseOptions(a, b2) {
  if (a && a.shared)
    return a;
  const env = process.env, o = (!a || typeof a === "string" ? b2 : a) || {}, { url, multihost } = parseUrl(a), query = [...url.searchParams].reduce((a2, [b3, c]) => (a2[b3] = c, a2), {}), host = o.hostname || o.host || multihost || url.hostname || env.PGHOST || "localhost", port = o.port || url.port || env.PGPORT || 5432, user = o.user || o.username || url.username || env.PGUSERNAME || env.PGUSER || osUsername();
  o.no_prepare && (o.prepare = false);
  query.sslmode && (query.ssl = query.sslmode, delete query.sslmode);
  "timeout" in o && (console.log("The timeout option is deprecated, use idle_timeout instead"), o.idle_timeout = o.timeout);
  query.sslrootcert === "system" && (query.ssl = "verify-full");
  const ints = ["idle_timeout", "connect_timeout", "max_lifetime", "max_pipeline", "backoff", "keep_alive"];
  const defaults = {
    max: 10,
    ssl: false,
    idle_timeout: null,
    connect_timeout: 30,
    max_lifetime,
    max_pipeline: 100,
    backoff,
    keep_alive: 60,
    prepare: true,
    debug: false,
    fetch_types: true,
    publications: "alltables",
    target_session_attrs: null
  };
  return {
    host: Array.isArray(host) ? host : host.split(",").map((x) => x.split(":")[0]),
    port: Array.isArray(port) ? port : host.split(",").map((x) => parseInt(x.split(":")[1] || port)),
    path: o.path || host.indexOf("/") > -1 && host + "/.s.PGSQL." + port,
    database: o.database || o.db || (url.pathname || "").slice(1) || env.PGDATABASE || user,
    user,
    pass: o.pass || o.password || url.password || env.PGPASSWORD || "",
    ...Object.entries(defaults).reduce((acc, [k, d]) => {
      const value = k in o ? o[k] : (k in query) ? query[k] === "disable" || query[k] === "false" ? false : query[k] : env["PG" + k.toUpperCase()] || d;
      acc[k] = typeof value === "string" && ints.includes(k) ? +value : value;
      return acc;
    }, {}),
    connection: {
      application_name: "postgres.js",
      ...o.connection,
      ...Object.entries(query).reduce((acc, [k, v]) => ((k in defaults) || (acc[k] = v), acc), {})
    },
    types: o.types || {},
    target_session_attrs: tsa(o, url, env),
    onnotice: o.onnotice,
    onnotify: o.onnotify,
    onclose: o.onclose,
    onparameter: o.onparameter,
    socket: o.socket,
    transform: parseTransform(o.transform || { undefined: undefined }),
    parameters: {},
    shared: { retries: 0, typeArrayMap: {} },
    ...mergeUserTypes(o.types)
  };
}
function tsa(o, url, env) {
  const x = o.target_session_attrs || url.searchParams.get("target_session_attrs") || env.PGTARGETSESSIONATTRS;
  if (!x || ["read-write", "read-only", "primary", "standby", "prefer-standby"].includes(x))
    return x;
  throw new Error("target_session_attrs " + x + " is not supported");
}
function backoff(retries) {
  return (0.5 + Math.random() / 2) * Math.min(3 ** retries / 100, 20);
}
function max_lifetime() {
  return 60 * (30 + Math.random() * 30);
}
function parseTransform(x) {
  return {
    undefined: x.undefined,
    column: {
      from: typeof x.column === "function" ? x.column : x.column && x.column.from,
      to: x.column && x.column.to
    },
    value: {
      from: typeof x.value === "function" ? x.value : x.value && x.value.from,
      to: x.value && x.value.to
    },
    row: {
      from: typeof x.row === "function" ? x.row : x.row && x.row.from,
      to: x.row && x.row.to
    }
  };
}
function parseUrl(url) {
  if (!url || typeof url !== "string")
    return { url: { searchParams: new Map } };
  let host = url;
  host = host.slice(host.indexOf("://") + 3).split(/[?/]/)[0];
  host = decodeURIComponent(host.slice(host.indexOf("@") + 1));
  const urlObj = new URL(url.replace(host, host.split(",")[0]));
  return {
    url: {
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      host: urlObj.host,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams
    },
    multihost: host.indexOf(",") > -1 && host
  };
}
function osUsername() {
  try {
    return os.userInfo().username;
  } catch (_) {
    return process.env.USERNAME || process.env.USER || process.env.LOGNAME;
  }
}
var src_default;
var init_src = __esm(() => {
  init_types();
  init_connection();
  init_query();
  init_queue();
  init_errors();
  init_large();
  Object.assign(Postgres, {
    PostgresError,
    toPascal,
    pascal,
    toCamel,
    camel,
    toKebab,
    kebab,
    fromPascal,
    fromCamel,
    fromKebab,
    BigInt: {
      to: 20,
      from: [20],
      parse: (x) => BigInt(x),
      serialize: (x) => x.toString()
    }
  });
  src_default = Postgres;
});

// node_modules/drizzle-orm/entity.js
function is(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(`Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`);
  }
  let cls = Object.getPrototypeOf(value).constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}
var entityKind, hasOwnEntityKind;
var init_entity = __esm(() => {
  entityKind = Symbol.for("drizzle:entityKind");
  hasOwnEntityKind = Symbol.for("drizzle:hasOwnEntityKind");
});

// node_modules/drizzle-orm/logger.js
var ConsoleLogWriter, DefaultLogger, NoopLogger;
var init_logger = __esm(() => {
  init_entity();
  ConsoleLogWriter = class ConsoleLogWriter {
    static [entityKind] = "ConsoleLogWriter";
    write(message2) {
      console.log(message2);
    }
  };
  DefaultLogger = class DefaultLogger {
    static [entityKind] = "DefaultLogger";
    writer;
    constructor(config) {
      this.writer = config?.writer ?? new ConsoleLogWriter;
    }
    logQuery(query, params) {
      const stringifiedParams = params.map((p) => {
        try {
          return JSON.stringify(p);
        } catch {
          return String(p);
        }
      });
      const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
      this.writer.write(`Query: ${query}${paramsStr}`);
    }
  };
  NoopLogger = class NoopLogger {
    static [entityKind] = "NoopLogger";
    logQuery() {
    }
  };
});

// node_modules/drizzle-orm/query-promise.js
var QueryPromise;
var init_query_promise = __esm(() => {
  init_entity();
  QueryPromise = class QueryPromise {
    static [entityKind] = "QueryPromise";
    [Symbol.toStringTag] = "QueryPromise";
    catch(onRejected) {
      return this.then(undefined, onRejected);
    }
    finally(onFinally) {
      return this.then((value) => {
        onFinally?.();
        return value;
      }, (reason) => {
        onFinally?.();
        throw reason;
      });
    }
    then(onFulfilled, onRejected) {
      return this.execute().then(onFulfilled, onRejected);
    }
  };
});

// node_modules/drizzle-orm/column.js
var Column;
var init_column = __esm(() => {
  init_entity();
  Column = class Column {
    constructor(table, config) {
      this.table = table;
      this.config = config;
      this.name = config.name;
      this.keyAsName = config.keyAsName;
      this.notNull = config.notNull;
      this.default = config.default;
      this.defaultFn = config.defaultFn;
      this.onUpdateFn = config.onUpdateFn;
      this.hasDefault = config.hasDefault;
      this.primary = config.primaryKey;
      this.isUnique = config.isUnique;
      this.uniqueName = config.uniqueName;
      this.uniqueType = config.uniqueType;
      this.dataType = config.dataType;
      this.columnType = config.columnType;
      this.generated = config.generated;
      this.generatedIdentity = config.generatedIdentity;
    }
    static [entityKind] = "Column";
    name;
    keyAsName;
    primary;
    notNull;
    default;
    defaultFn;
    onUpdateFn;
    hasDefault;
    isUnique;
    uniqueName;
    uniqueType;
    dataType;
    columnType;
    enumValues = undefined;
    generated = undefined;
    generatedIdentity = undefined;
    config;
    mapFromDriverValue(value) {
      return value;
    }
    mapToDriverValue(value) {
      return value;
    }
    shouldDisableInsert() {
      return this.config.generated !== undefined && this.config.generated.type !== "byDefault";
    }
  };
});

// node_modules/drizzle-orm/column-builder.js
var ColumnBuilder;
var init_column_builder = __esm(() => {
  init_entity();
  ColumnBuilder = class ColumnBuilder {
    static [entityKind] = "ColumnBuilder";
    config;
    constructor(name, dataType, columnType) {
      this.config = {
        name,
        keyAsName: name === "",
        notNull: false,
        default: undefined,
        hasDefault: false,
        primaryKey: false,
        isUnique: false,
        uniqueName: undefined,
        uniqueType: undefined,
        dataType,
        columnType,
        generated: undefined
      };
    }
    $type() {
      return this;
    }
    notNull() {
      this.config.notNull = true;
      return this;
    }
    default(value) {
      this.config.default = value;
      this.config.hasDefault = true;
      return this;
    }
    $defaultFn(fn) {
      this.config.defaultFn = fn;
      this.config.hasDefault = true;
      return this;
    }
    $default = this.$defaultFn;
    $onUpdateFn(fn) {
      this.config.onUpdateFn = fn;
      this.config.hasDefault = true;
      return this;
    }
    $onUpdate = this.$onUpdateFn;
    primaryKey() {
      this.config.primaryKey = true;
      this.config.notNull = true;
      return this;
    }
    setName(name) {
      if (this.config.name !== "")
        return;
      this.config.name = name;
    }
  };
});

// node_modules/drizzle-orm/table.utils.js
var TableName;
var init_table_utils = __esm(() => {
  TableName = Symbol.for("drizzle:Name");
});

// node_modules/drizzle-orm/pg-core/foreign-keys.js
var ForeignKeyBuilder, ForeignKey;
var init_foreign_keys = __esm(() => {
  init_entity();
  init_table_utils();
  ForeignKeyBuilder = class ForeignKeyBuilder {
    static [entityKind] = "PgForeignKeyBuilder";
    reference;
    _onUpdate = "no action";
    _onDelete = "no action";
    constructor(config, actions) {
      this.reference = () => {
        const { name, columns, foreignColumns } = config();
        return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
      };
      if (actions) {
        this._onUpdate = actions.onUpdate;
        this._onDelete = actions.onDelete;
      }
    }
    onUpdate(action) {
      this._onUpdate = action === undefined ? "no action" : action;
      return this;
    }
    onDelete(action) {
      this._onDelete = action === undefined ? "no action" : action;
      return this;
    }
    build(table) {
      return new ForeignKey(table, this);
    }
  };
  ForeignKey = class ForeignKey {
    constructor(table, builder) {
      this.table = table;
      this.reference = builder.reference;
      this.onUpdate = builder._onUpdate;
      this.onDelete = builder._onDelete;
    }
    static [entityKind] = "PgForeignKey";
    reference;
    onUpdate;
    onDelete;
    getName() {
      const { name, columns, foreignColumns } = this.reference();
      const columnNames = columns.map((column) => column.name);
      const foreignColumnNames = foreignColumns.map((column) => column.name);
      const chunks = [
        this.table[TableName],
        ...columnNames,
        foreignColumns[0].table[TableName],
        ...foreignColumnNames
      ];
      return name ?? `${chunks.join("_")}_fk`;
    }
  };
});

// node_modules/drizzle-orm/tracing-utils.js
function iife(fn, ...args) {
  return fn(...args);
}
var init_tracing_utils = () => {
};

// node_modules/drizzle-orm/pg-core/unique-constraint.js
function uniqueKeyName(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}
var init_unique_constraint = __esm(() => {
  init_table_utils();
});

// node_modules/drizzle-orm/pg-core/utils/array.js
function parsePgArrayValue(arrayString, startFrom, inQuotes) {
  for (let i = startFrom;i < arrayString.length; i++) {
    const char = arrayString[i];
    if (char === "\\") {
      i++;
      continue;
    }
    if (char === '"') {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i + 1];
    }
    if (inQuotes) {
      continue;
    }
    if (char === "," || char === "}") {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i];
    }
  }
  return [arrayString.slice(startFrom).replace(/\\/g, ""), arrayString.length];
}
function parsePgNestedArray(arrayString, startFrom = 0) {
  const result = [];
  let i = startFrom;
  let lastCharIsComma = false;
  while (i < arrayString.length) {
    const char = arrayString[i];
    if (char === ",") {
      if (lastCharIsComma || i === startFrom) {
        result.push("");
      }
      lastCharIsComma = true;
      i++;
      continue;
    }
    lastCharIsComma = false;
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (char === '"') {
      const [value2, startFrom2] = parsePgArrayValue(arrayString, i + 1, true);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    if (char === "}") {
      return [result, i + 1];
    }
    if (char === "{") {
      const [value2, startFrom2] = parsePgNestedArray(arrayString, i + 1);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    const [value, newStartFrom] = parsePgArrayValue(arrayString, i, false);
    result.push(value);
    i = newStartFrom;
  }
  return [result, i];
}
function parsePgArray(arrayString) {
  const [result] = parsePgNestedArray(arrayString, 1);
  return result;
}
function makePgArray(array) {
  return `{${array.map((item) => {
    if (Array.isArray(item)) {
      return makePgArray(item);
    }
    if (typeof item === "string") {
      return `"${item.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
    }
    return `${item}`;
  }).join(",")}}`;
}
var init_array = () => {
};

// node_modules/drizzle-orm/pg-core/columns/common.js
var PgColumnBuilder, PgColumn, ExtraConfigColumn, IndexedColumn, PgArrayBuilder, PgArray;
var init_common = __esm(() => {
  init_column_builder();
  init_column();
  init_entity();
  init_foreign_keys();
  init_tracing_utils();
  init_unique_constraint();
  init_array();
  PgColumnBuilder = class PgColumnBuilder extends ColumnBuilder {
    foreignKeyConfigs = [];
    static [entityKind] = "PgColumnBuilder";
    array(size2) {
      return new PgArrayBuilder(this.config.name, this, size2);
    }
    references(ref, actions = {}) {
      this.foreignKeyConfigs.push({ ref, actions });
      return this;
    }
    unique(name, config) {
      this.config.isUnique = true;
      this.config.uniqueName = name;
      this.config.uniqueType = config?.nulls;
      return this;
    }
    generatedAlwaysAs(as) {
      this.config.generated = {
        as,
        type: "always",
        mode: "stored"
      };
      return this;
    }
    buildForeignKeys(column, table) {
      return this.foreignKeyConfigs.map(({ ref, actions }) => {
        return iife((ref2, actions2) => {
          const builder = new ForeignKeyBuilder(() => {
            const foreignColumn = ref2();
            return { columns: [column], foreignColumns: [foreignColumn] };
          });
          if (actions2.onUpdate) {
            builder.onUpdate(actions2.onUpdate);
          }
          if (actions2.onDelete) {
            builder.onDelete(actions2.onDelete);
          }
          return builder.build(table);
        }, ref, actions);
      });
    }
    buildExtraConfigColumn(table) {
      return new ExtraConfigColumn(table, this.config);
    }
  };
  PgColumn = class PgColumn extends Column {
    constructor(table, config) {
      if (!config.uniqueName) {
        config.uniqueName = uniqueKeyName(table, [config.name]);
      }
      super(table, config);
      this.table = table;
    }
    static [entityKind] = "PgColumn";
  };
  ExtraConfigColumn = class ExtraConfigColumn extends PgColumn {
    static [entityKind] = "ExtraConfigColumn";
    getSQLType() {
      return this.getSQLType();
    }
    indexConfig = {
      order: this.config.order ?? "asc",
      nulls: this.config.nulls ?? "last",
      opClass: this.config.opClass
    };
    defaultConfig = {
      order: "asc",
      nulls: "last",
      opClass: undefined
    };
    asc() {
      this.indexConfig.order = "asc";
      return this;
    }
    desc() {
      this.indexConfig.order = "desc";
      return this;
    }
    nullsFirst() {
      this.indexConfig.nulls = "first";
      return this;
    }
    nullsLast() {
      this.indexConfig.nulls = "last";
      return this;
    }
    op(opClass) {
      this.indexConfig.opClass = opClass;
      return this;
    }
  };
  IndexedColumn = class IndexedColumn {
    static [entityKind] = "IndexedColumn";
    constructor(name, keyAsName, type, indexConfig) {
      this.name = name;
      this.keyAsName = keyAsName;
      this.type = type;
      this.indexConfig = indexConfig;
    }
    name;
    keyAsName;
    type;
    indexConfig;
  };
  PgArrayBuilder = class PgArrayBuilder extends PgColumnBuilder {
    static [entityKind] = "PgArrayBuilder";
    constructor(name, baseBuilder, size2) {
      super(name, "array", "PgArray");
      this.config.baseBuilder = baseBuilder;
      this.config.size = size2;
    }
    build(table) {
      const baseColumn = this.config.baseBuilder.build(table);
      return new PgArray(table, this.config, baseColumn);
    }
  };
  PgArray = class PgArray extends PgColumn {
    constructor(table, config, baseColumn, range) {
      super(table, config);
      this.baseColumn = baseColumn;
      this.range = range;
      this.size = config.size;
    }
    size;
    static [entityKind] = "PgArray";
    getSQLType() {
      return `${this.baseColumn.getSQLType()}[${typeof this.size === "number" ? this.size : ""}]`;
    }
    mapFromDriverValue(value) {
      if (typeof value === "string") {
        value = parsePgArray(value);
      }
      return value.map((v) => this.baseColumn.mapFromDriverValue(v));
    }
    mapToDriverValue(value, isNestedArray = false) {
      const a = value.map((v) => v === null ? null : is(this.baseColumn, PgArray) ? this.baseColumn.mapToDriverValue(v, true) : this.baseColumn.mapToDriverValue(v));
      if (isNestedArray)
        return a;
      return makePgArray(a);
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/enum.js
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}
var isPgEnumSym, PgEnumColumn;
var init_enum = __esm(() => {
  init_entity();
  init_common();
  isPgEnumSym = Symbol.for("drizzle:isPgEnum");
  PgEnumColumn = class PgEnumColumn extends PgColumn {
    static [entityKind] = "PgEnumColumn";
    enum = this.config.enum;
    enumValues = this.config.enum.enumValues;
    constructor(table, config) {
      super(table, config);
      this.enum = config.enum;
    }
    getSQLType() {
      return this.enum.enumName;
    }
  };
});

// node_modules/drizzle-orm/subquery.js
var Subquery, WithSubquery;
var init_subquery = __esm(() => {
  init_entity();
  Subquery = class Subquery {
    static [entityKind] = "Subquery";
    constructor(sql, selection, alias, isWith = false) {
      this._ = {
        brand: "Subquery",
        sql,
        selectedFields: selection,
        alias,
        isWith
      };
    }
  };
  WithSubquery = class WithSubquery extends Subquery {
    static [entityKind] = "WithSubquery";
  };
});

// node_modules/drizzle-orm/version.js
var version = "0.41.0";
var init_version = () => {
};

// node_modules/drizzle-orm/tracing.js
var otel, rawTracer, tracer;
var init_tracing = __esm(() => {
  init_tracing_utils();
  init_version();
  tracer = {
    startActiveSpan(name, fn) {
      if (!otel) {
        return fn();
      }
      if (!rawTracer) {
        rawTracer = otel.trace.getTracer("drizzle-orm", version);
      }
      return iife((otel2, rawTracer2) => rawTracer2.startActiveSpan(name, (span) => {
        try {
          return fn(span);
        } catch (e) {
          span.setStatus({
            code: otel2.SpanStatusCode.ERROR,
            message: e instanceof Error ? e.message : "Unknown error"
          });
          throw e;
        } finally {
          span.end();
        }
      }), otel, rawTracer);
    }
  };
});

// node_modules/drizzle-orm/view-common.js
var ViewBaseConfig;
var init_view_common = __esm(() => {
  ViewBaseConfig = Symbol.for("drizzle:ViewBaseConfig");
});

// node_modules/drizzle-orm/table.js
function getTableName(table) {
  return table[TableName];
}
function getTableUniqueName(table) {
  return `${table[Schema] ?? "public"}.${table[TableName]}`;
}
var Schema, Columns, ExtraConfigColumns, OriginalName, BaseName, IsAlias, ExtraConfigBuilder, IsDrizzleTable, Table;
var init_table = __esm(() => {
  init_entity();
  init_table_utils();
  Schema = Symbol.for("drizzle:Schema");
  Columns = Symbol.for("drizzle:Columns");
  ExtraConfigColumns = Symbol.for("drizzle:ExtraConfigColumns");
  OriginalName = Symbol.for("drizzle:OriginalName");
  BaseName = Symbol.for("drizzle:BaseName");
  IsAlias = Symbol.for("drizzle:IsAlias");
  ExtraConfigBuilder = Symbol.for("drizzle:ExtraConfigBuilder");
  IsDrizzleTable = Symbol.for("drizzle:IsDrizzleTable");
  Table = class Table {
    static [entityKind] = "Table";
    static Symbol = {
      Name: TableName,
      Schema,
      OriginalName,
      Columns,
      ExtraConfigColumns,
      BaseName,
      IsAlias,
      ExtraConfigBuilder
    };
    [TableName];
    [OriginalName];
    [Schema];
    [Columns];
    [ExtraConfigColumns];
    [BaseName];
    [IsAlias] = false;
    [IsDrizzleTable] = true;
    [ExtraConfigBuilder] = undefined;
    constructor(name, schema, baseName) {
      this[TableName] = this[OriginalName] = name;
      this[Schema] = schema;
      this[BaseName] = baseName;
    }
  };
});

// node_modules/drizzle-orm/sql/sql.js
function isSQLWrapper(value) {
  return value !== null && value !== undefined && typeof value.getSQL === "function";
}
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
function fillPlaceholders(params, values2) {
  return params.map((p) => {
    if (is(p, Placeholder)) {
      if (!(p.name in values2)) {
        throw new Error(`No value for placeholder "${p.name}" was provided`);
      }
      return values2[p.name];
    }
    if (is(p, Param) && is(p.value, Placeholder)) {
      if (!(p.value.name in values2)) {
        throw new Error(`No value for placeholder "${p.value.name}" was provided`);
      }
      return p.encoder.mapToDriverValue(values2[p.value.name]);
    }
    return p;
  });
}
var StringChunk, SQL, Name, noopDecoder, noopEncoder, noopMapper, Param, Placeholder, IsDrizzleView, View;
var init_sql = __esm(() => {
  init_entity();
  init_enum();
  init_subquery();
  init_tracing();
  init_view_common();
  init_column();
  init_table();
  StringChunk = class StringChunk {
    static [entityKind] = "StringChunk";
    value;
    constructor(value) {
      this.value = Array.isArray(value) ? value : [value];
    }
    getSQL() {
      return new SQL([this]);
    }
  };
  SQL = class SQL {
    constructor(queryChunks) {
      this.queryChunks = queryChunks;
    }
    static [entityKind] = "SQL";
    decoder = noopDecoder;
    shouldInlineParams = false;
    append(query) {
      this.queryChunks.push(...query.queryChunks);
      return this;
    }
    toQuery(config) {
      return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
        const query = this.buildQueryFromSourceParams(this.queryChunks, config);
        span?.setAttributes({
          "drizzle.query.text": query.sql,
          "drizzle.query.params": JSON.stringify(query.params)
        });
        return query;
      });
    }
    buildQueryFromSourceParams(chunks, _config) {
      const config = Object.assign({}, _config, {
        inlineParams: _config.inlineParams || this.shouldInlineParams,
        paramStartIndex: _config.paramStartIndex || { value: 0 }
      });
      const {
        casing,
        escapeName,
        escapeParam,
        prepareTyping,
        inlineParams,
        paramStartIndex
      } = config;
      return mergeQueries(chunks.map((chunk) => {
        if (is(chunk, StringChunk)) {
          return { sql: chunk.value.join(""), params: [] };
        }
        if (is(chunk, Name)) {
          return { sql: escapeName(chunk.value), params: [] };
        }
        if (chunk === undefined) {
          return { sql: "", params: [] };
        }
        if (Array.isArray(chunk)) {
          const result = [new StringChunk("(")];
          for (const [i, p] of chunk.entries()) {
            result.push(p);
            if (i < chunk.length - 1) {
              result.push(new StringChunk(", "));
            }
          }
          result.push(new StringChunk(")"));
          return this.buildQueryFromSourceParams(result, config);
        }
        if (is(chunk, SQL)) {
          return this.buildQueryFromSourceParams(chunk.queryChunks, {
            ...config,
            inlineParams: inlineParams || chunk.shouldInlineParams
          });
        }
        if (is(chunk, Table)) {
          const schemaName = chunk[Table.Symbol.Schema];
          const tableName = chunk[Table.Symbol.Name];
          return {
            sql: schemaName === undefined || chunk[IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
            params: []
          };
        }
        if (is(chunk, Column)) {
          const columnName = casing.getColumnCasing(chunk);
          if (_config.invokeSource === "indexes") {
            return { sql: escapeName(columnName), params: [] };
          }
          const schemaName = chunk.table[Table.Symbol.Schema];
          return {
            sql: chunk.table[IsAlias] || schemaName === undefined ? escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName),
            params: []
          };
        }
        if (is(chunk, View)) {
          const schemaName = chunk[ViewBaseConfig].schema;
          const viewName = chunk[ViewBaseConfig].name;
          return {
            sql: schemaName === undefined || chunk[ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
            params: []
          };
        }
        if (is(chunk, Param)) {
          if (is(chunk.value, Placeholder)) {
            return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
          }
          const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
          if (is(mappedValue, SQL)) {
            return this.buildQueryFromSourceParams([mappedValue], config);
          }
          if (inlineParams) {
            return { sql: this.mapInlineParam(mappedValue, config), params: [] };
          }
          let typings = ["none"];
          if (prepareTyping) {
            typings = [prepareTyping(chunk.encoder)];
          }
          return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
        }
        if (is(chunk, Placeholder)) {
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }
        if (is(chunk, SQL.Aliased) && chunk.fieldAlias !== undefined) {
          return { sql: escapeName(chunk.fieldAlias), params: [] };
        }
        if (is(chunk, Subquery)) {
          if (chunk._.isWith) {
            return { sql: escapeName(chunk._.alias), params: [] };
          }
          return this.buildQueryFromSourceParams([
            new StringChunk("("),
            chunk._.sql,
            new StringChunk(") "),
            new Name(chunk._.alias)
          ], config);
        }
        if (isPgEnum(chunk)) {
          if (chunk.schema) {
            return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
          }
          return { sql: escapeName(chunk.enumName), params: [] };
        }
        if (isSQLWrapper(chunk)) {
          if (chunk.shouldOmitSQLParens?.()) {
            return this.buildQueryFromSourceParams([chunk.getSQL()], config);
          }
          return this.buildQueryFromSourceParams([
            new StringChunk("("),
            chunk.getSQL(),
            new StringChunk(")")
          ], config);
        }
        if (inlineParams) {
          return { sql: this.mapInlineParam(chunk, config), params: [] };
        }
        return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
      }));
    }
    mapInlineParam(chunk, { escapeString }) {
      if (chunk === null) {
        return "null";
      }
      if (typeof chunk === "number" || typeof chunk === "boolean") {
        return chunk.toString();
      }
      if (typeof chunk === "string") {
        return escapeString(chunk);
      }
      if (typeof chunk === "object") {
        const mappedValueAsString = chunk.toString();
        if (mappedValueAsString === "[object Object]") {
          return escapeString(JSON.stringify(chunk));
        }
        return escapeString(mappedValueAsString);
      }
      throw new Error("Unexpected param value: " + chunk);
    }
    getSQL() {
      return this;
    }
    as(alias) {
      if (alias === undefined) {
        return this;
      }
      return new SQL.Aliased(this, alias);
    }
    mapWith(decoder2) {
      this.decoder = typeof decoder2 === "function" ? { mapFromDriverValue: decoder2 } : decoder2;
      return this;
    }
    inlineParams() {
      this.shouldInlineParams = true;
      return this;
    }
    if(condition) {
      return condition ? this : undefined;
    }
  };
  Name = class Name {
    constructor(value) {
      this.value = value;
    }
    static [entityKind] = "Name";
    brand;
    getSQL() {
      return new SQL([this]);
    }
  };
  noopDecoder = {
    mapFromDriverValue: (value) => value
  };
  noopEncoder = {
    mapToDriverValue: (value) => value
  };
  noopMapper = {
    ...noopDecoder,
    ...noopEncoder
  };
  Param = class Param {
    constructor(value, encoder2 = noopEncoder) {
      this.value = value;
      this.encoder = encoder2;
    }
    static [entityKind] = "Param";
    brand;
    getSQL() {
      return new SQL([this]);
    }
  };
  ((sql2) => {
    function empty() {
      return new SQL([]);
    }
    sql2.empty = empty;
    function fromList(list) {
      return new SQL(list);
    }
    sql2.fromList = fromList;
    function raw2(str) {
      return new SQL([new StringChunk(str)]);
    }
    sql2.raw = raw2;
    function join(chunks, separator) {
      const result = [];
      for (const [i, chunk] of chunks.entries()) {
        if (i > 0 && separator !== undefined) {
          result.push(separator);
        }
        result.push(chunk);
      }
      return new SQL(result);
    }
    sql2.join = join;
    function identifier(value) {
      return new Name(value);
    }
    sql2.identifier = identifier;
    function placeholder2(name2) {
      return new Placeholder(name2);
    }
    sql2.placeholder = placeholder2;
    function param2(value, encoder2) {
      return new Param(value, encoder2);
    }
    sql2.param = param2;
  })(sql || (sql = {}));
  ((SQL2) => {

    class Aliased {
      constructor(sql2, fieldAlias) {
        this.sql = sql2;
        this.fieldAlias = fieldAlias;
      }
      static [entityKind] = "SQL.Aliased";
      isSelectionField = false;
      getSQL() {
        return this.sql;
      }
      clone() {
        return new Aliased(this.sql, this.fieldAlias);
      }
    }
    SQL2.Aliased = Aliased;
  })(SQL || (SQL = {}));
  Placeholder = class Placeholder {
    constructor(name2) {
      this.name = name2;
    }
    static [entityKind] = "Placeholder";
    getSQL() {
      return new SQL([this]);
    }
  };
  IsDrizzleView = Symbol.for("drizzle:IsDrizzleView");
  View = class View {
    static [entityKind] = "View";
    [ViewBaseConfig];
    [IsDrizzleView] = true;
    constructor({ name: name2, schema, selectedFields, query }) {
      this[ViewBaseConfig] = {
        name: name2,
        originalName: name2,
        schema,
        selectedFields,
        query,
        isExisting: !query,
        isAlias: false
      };
    }
    getSQL() {
      return new SQL([this]);
    }
  };
  Column.prototype.getSQL = function() {
    return new SQL([this]);
  };
  Table.prototype.getSQL = function() {
    return new SQL([this]);
  };
  Subquery.prototype.getSQL = function() {
    return new SQL([this]);
  };
});

// node_modules/drizzle-orm/alias.js
function aliasedTable(table, tableAlias) {
  return new Proxy(table, new TableAliasProxyHandler(tableAlias, false));
}
function aliasedTableColumn(column, tableAlias) {
  return new Proxy(column, new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false))));
}
function mapColumnsInAliasedSQLToAlias(query, alias) {
  return new SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
}
function mapColumnsInSQLToAlias(query, alias) {
  return sql.join(query.queryChunks.map((c) => {
    if (is(c, Column)) {
      return aliasedTableColumn(c, alias);
    }
    if (is(c, SQL)) {
      return mapColumnsInSQLToAlias(c, alias);
    }
    if (is(c, SQL.Aliased)) {
      return mapColumnsInAliasedSQLToAlias(c, alias);
    }
    return c;
  }));
}
var ColumnAliasProxyHandler, TableAliasProxyHandler;
var init_alias = __esm(() => {
  init_column();
  init_entity();
  init_sql();
  init_table();
  init_view_common();
  ColumnAliasProxyHandler = class ColumnAliasProxyHandler {
    constructor(table) {
      this.table = table;
    }
    static [entityKind] = "ColumnAliasProxyHandler";
    get(columnObj, prop) {
      if (prop === "table") {
        return this.table;
      }
      return columnObj[prop];
    }
  };
  TableAliasProxyHandler = class TableAliasProxyHandler {
    constructor(alias, replaceOriginalName) {
      this.alias = alias;
      this.replaceOriginalName = replaceOriginalName;
    }
    static [entityKind] = "TableAliasProxyHandler";
    get(target, prop) {
      if (prop === Table.Symbol.IsAlias) {
        return true;
      }
      if (prop === Table.Symbol.Name) {
        return this.alias;
      }
      if (this.replaceOriginalName && prop === Table.Symbol.OriginalName) {
        return this.alias;
      }
      if (prop === ViewBaseConfig) {
        return {
          ...target[ViewBaseConfig],
          name: this.alias,
          isAlias: true
        };
      }
      if (prop === Table.Symbol.Columns) {
        const columns = target[Table.Symbol.Columns];
        if (!columns) {
          return columns;
        }
        const proxiedColumns = {};
        Object.keys(columns).map((key) => {
          proxiedColumns[key] = new Proxy(columns[key], new ColumnAliasProxyHandler(new Proxy(target, this)));
        });
        return proxiedColumns;
      }
      const value = target[prop];
      if (is(value, Column)) {
        return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
      }
      return value;
    }
  };
});

// node_modules/drizzle-orm/selection-proxy.js
var SelectionProxyHandler;
var init_selection_proxy = __esm(() => {
  init_alias();
  init_column();
  init_entity();
  init_sql();
  init_subquery();
  init_view_common();
  SelectionProxyHandler = class SelectionProxyHandler {
    static [entityKind] = "SelectionProxyHandler";
    config;
    constructor(config) {
      this.config = { ...config };
    }
    get(subquery, prop) {
      if (prop === "_") {
        return {
          ...subquery["_"],
          selectedFields: new Proxy(subquery._.selectedFields, this)
        };
      }
      if (prop === ViewBaseConfig) {
        return {
          ...subquery[ViewBaseConfig],
          selectedFields: new Proxy(subquery[ViewBaseConfig].selectedFields, this)
        };
      }
      if (typeof prop === "symbol") {
        return subquery[prop];
      }
      const columns = is(subquery, Subquery) ? subquery._.selectedFields : is(subquery, View) ? subquery[ViewBaseConfig].selectedFields : subquery;
      const value = columns[prop];
      if (is(value, SQL.Aliased)) {
        if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
          return value.sql;
        }
        const newValue = value.clone();
        newValue.isSelectionField = true;
        return newValue;
      }
      if (is(value, SQL)) {
        if (this.config.sqlBehavior === "sql") {
          return value;
        }
        throw new Error(`You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`);
      }
      if (is(value, Column)) {
        if (this.config.alias) {
          return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(value.table, new TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false))));
        }
        return value;
      }
      if (typeof value !== "object" || value === null) {
        return value;
      }
      return new Proxy(value, new SelectionProxyHandler(this.config));
    }
  };
});

// node_modules/drizzle-orm/utils.js
function mapResultRow(columns, row, joinsNotNullableMap) {
  const nullifyMap = {};
  const result = columns.reduce((result2, { path, field }, columnIndex) => {
    let decoder2;
    if (is(field, Column)) {
      decoder2 = field;
    } else if (is(field, SQL)) {
      decoder2 = field.decoder;
    } else {
      decoder2 = field.sql.decoder;
    }
    let node = result2;
    for (const [pathChunkIndex, pathChunk] of path.entries()) {
      if (pathChunkIndex < path.length - 1) {
        if (!(pathChunk in node)) {
          node[pathChunk] = {};
        }
        node = node[pathChunk];
      } else {
        const rawValue = row[columnIndex];
        const value = node[pathChunk] = rawValue === null ? null : decoder2.mapFromDriverValue(rawValue);
        if (joinsNotNullableMap && is(field, Column) && path.length === 2) {
          const objectName = path[0];
          if (!(objectName in nullifyMap)) {
            nullifyMap[objectName] = value === null ? getTableName(field.table) : false;
          } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== getTableName(field.table)) {
            nullifyMap[objectName] = false;
          }
        }
      }
    }
    return result2;
  }, {});
  if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
    for (const [objectName, tableName] of Object.entries(nullifyMap)) {
      if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
        result[objectName] = null;
      }
    }
  }
  return result;
}
function orderSelectedFields(fields, pathPrefix) {
  return Object.entries(fields).reduce((result, [name, field]) => {
    if (typeof name !== "string") {
      return result;
    }
    const newPath = pathPrefix ? [...pathPrefix, name] : [name];
    if (is(field, Column) || is(field, SQL) || is(field, SQL.Aliased)) {
      result.push({ path: newPath, field });
    } else if (is(field, Table)) {
      result.push(...orderSelectedFields(field[Table.Symbol.Columns], newPath));
    } else {
      result.push(...orderSelectedFields(field, newPath));
    }
    return result;
  }, []);
}
function haveSameKeys(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const [index, key] of leftKeys.entries()) {
    if (key !== rightKeys[index]) {
      return false;
    }
  }
  return true;
}
function mapUpdateSet(table, values2) {
  const entries = Object.entries(values2).filter(([, value]) => value !== undefined).map(([key, value]) => {
    if (is(value, SQL) || is(value, Column)) {
      return [key, value];
    } else {
      return [key, new Param(value, table[Table.Symbol.Columns][key])];
    }
  });
  if (entries.length === 0) {
    throw new Error("No values to set");
  }
  return Object.fromEntries(entries);
}
function applyMixins(baseClass, extendedClasses) {
  for (const extendedClass of extendedClasses) {
    for (const name of Object.getOwnPropertyNames(extendedClass.prototype)) {
      if (name === "constructor")
        continue;
      Object.defineProperty(baseClass.prototype, name, Object.getOwnPropertyDescriptor(extendedClass.prototype, name) || /* @__PURE__ */ Object.create(null));
    }
  }
}
function getTableColumns(table) {
  return table[Table.Symbol.Columns];
}
function getTableLikeName(table) {
  return is(table, Subquery) ? table._.alias : is(table, View) ? table[ViewBaseConfig].name : is(table, SQL) ? undefined : table[Table.Symbol.IsAlias] ? table[Table.Symbol.Name] : table[Table.Symbol.BaseName];
}
function getColumnNameAndConfig(a, b2) {
  return {
    name: typeof a === "string" && a.length > 0 ? a : "",
    config: typeof a === "object" ? a : b2
  };
}
function isConfig(data) {
  if (typeof data !== "object" || data === null)
    return false;
  if (data.constructor.name !== "Object")
    return false;
  if ("logger" in data) {
    const type = typeof data["logger"];
    if (type !== "boolean" && (type !== "object" || typeof data["logger"]["logQuery"] !== "function") && type !== "undefined")
      return false;
    return true;
  }
  if ("schema" in data) {
    const type = typeof data["schema"];
    if (type !== "object" && type !== "undefined")
      return false;
    return true;
  }
  if ("casing" in data) {
    const type = typeof data["casing"];
    if (type !== "string" && type !== "undefined")
      return false;
    return true;
  }
  if ("mode" in data) {
    if (data["mode"] !== "default" || data["mode"] !== "planetscale" || data["mode"] !== undefined)
      return false;
    return true;
  }
  if ("connection" in data) {
    const type = typeof data["connection"];
    if (type !== "string" && type !== "object" && type !== "undefined")
      return false;
    return true;
  }
  if ("client" in data) {
    const type = typeof data["client"];
    if (type !== "object" && type !== "function" && type !== "undefined")
      return false;
    return true;
  }
  if (Object.keys(data).length === 0)
    return true;
  return false;
}
var init_utils = __esm(() => {
  init_column();
  init_entity();
  init_sql();
  init_subquery();
  init_table();
  init_view_common();
});

// node_modules/drizzle-orm/pg-core/query-builders/delete.js
var PgDeleteBase;
var init_delete = __esm(() => {
  init_entity();
  init_query_promise();
  init_selection_proxy();
  init_table();
  init_tracing();
  init_utils();
  PgDeleteBase = class PgDeleteBase extends QueryPromise {
    constructor(table, session, dialect, withList) {
      super();
      this.session = session;
      this.dialect = dialect;
      this.config = { table, withList };
    }
    static [entityKind] = "PgDelete";
    config;
    where(where) {
      this.config.where = where;
      return this;
    }
    returning(fields = this.config.table[Table.Symbol.Columns]) {
      this.config.returningFields = fields;
      this.config.returning = orderSelectedFields(fields);
      return this;
    }
    getSQL() {
      return this.dialect.buildDeleteQuery(this.config);
    }
    toSQL() {
      const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
      return rest;
    }
    _prepare(name) {
      return tracer.startActiveSpan("drizzle.prepareQuery", () => {
        return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true);
      });
    }
    prepare(name) {
      return this._prepare(name);
    }
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    execute = (placeholderValues) => {
      return tracer.startActiveSpan("drizzle.operation", () => {
        return this._prepare().execute(placeholderValues, this.authToken);
      });
    };
    getSelectedFields() {
      return this.config.returningFields ? new Proxy(this.config.returningFields, new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })) : undefined;
    }
    $dynamic() {
      return this;
    }
  };
});

// node_modules/drizzle-orm/casing.js
function toSnakeCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.map((word) => word.toLowerCase()).join("_");
}
function toCamelCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.reduce((acc, word, i) => {
    const formattedWord = i === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
    return acc + formattedWord;
  }, "");
}
function noopCase(input) {
  return input;
}
var CasingCache;
var init_casing = __esm(() => {
  init_entity();
  init_table();
  CasingCache = class CasingCache {
    static [entityKind] = "CasingCache";
    cache = {};
    cachedTables = {};
    convert;
    constructor(casing) {
      this.convert = casing === "snake_case" ? toSnakeCase : casing === "camelCase" ? toCamelCase : noopCase;
    }
    getColumnCasing(column) {
      if (!column.keyAsName)
        return column.name;
      const schema = column.table[Table.Symbol.Schema] ?? "public";
      const tableName = column.table[Table.Symbol.OriginalName];
      const key = `${schema}.${tableName}.${column.name}`;
      if (!this.cache[key]) {
        this.cacheTable(column.table);
      }
      return this.cache[key];
    }
    cacheTable(table) {
      const schema = table[Table.Symbol.Schema] ?? "public";
      const tableName = table[Table.Symbol.OriginalName];
      const tableKey = `${schema}.${tableName}`;
      if (!this.cachedTables[tableKey]) {
        for (const column of Object.values(table[Table.Symbol.Columns])) {
          const columnKey = `${tableKey}.${column.name}`;
          this.cache[columnKey] = this.convert(column.name);
        }
        this.cachedTables[tableKey] = true;
      }
    }
    clearCache() {
      this.cache = {};
      this.cachedTables = {};
    }
  };
});

// node_modules/drizzle-orm/errors.js
var DrizzleError, TransactionRollbackError;
var init_errors2 = __esm(() => {
  init_entity();
  DrizzleError = class DrizzleError extends Error {
    static [entityKind] = "DrizzleError";
    constructor({ message: message2, cause }) {
      super(message2);
      this.name = "DrizzleError";
      this.cause = cause;
    }
  };
  TransactionRollbackError = class TransactionRollbackError extends DrizzleError {
    static [entityKind] = "TransactionRollbackError";
    constructor() {
      super({ message: "Rollback" });
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/int.common.js
var PgIntColumnBaseBuilder;
var init_int_common = __esm(() => {
  init_entity();
  init_common();
  PgIntColumnBaseBuilder = class PgIntColumnBaseBuilder extends PgColumnBuilder {
    static [entityKind] = "PgIntColumnBaseBuilder";
    generatedAlwaysAsIdentity(sequence) {
      if (sequence) {
        const { name, ...options } = sequence;
        this.config.generatedIdentity = {
          type: "always",
          sequenceName: name,
          sequenceOptions: options
        };
      } else {
        this.config.generatedIdentity = {
          type: "always"
        };
      }
      this.config.hasDefault = true;
      this.config.notNull = true;
      return this;
    }
    generatedByDefaultAsIdentity(sequence) {
      if (sequence) {
        const { name, ...options } = sequence;
        this.config.generatedIdentity = {
          type: "byDefault",
          sequenceName: name,
          sequenceOptions: options
        };
      } else {
        this.config.generatedIdentity = {
          type: "byDefault"
        };
      }
      this.config.hasDefault = true;
      this.config.notNull = true;
      return this;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/bigint.js
function bigint(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  if (config.mode === "number") {
    return new PgBigInt53Builder(name);
  }
  return new PgBigInt64Builder(name);
}
var PgBigInt53Builder, PgBigInt53, PgBigInt64Builder, PgBigInt64;
var init_bigint = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  init_int_common();
  PgBigInt53Builder = class PgBigInt53Builder extends PgIntColumnBaseBuilder {
    static [entityKind] = "PgBigInt53Builder";
    constructor(name) {
      super(name, "number", "PgBigInt53");
    }
    build(table) {
      return new PgBigInt53(table, this.config);
    }
  };
  PgBigInt53 = class PgBigInt53 extends PgColumn {
    static [entityKind] = "PgBigInt53";
    getSQLType() {
      return "bigint";
    }
    mapFromDriverValue(value) {
      if (typeof value === "number") {
        return value;
      }
      return Number(value);
    }
  };
  PgBigInt64Builder = class PgBigInt64Builder extends PgIntColumnBaseBuilder {
    static [entityKind] = "PgBigInt64Builder";
    constructor(name) {
      super(name, "bigint", "PgBigInt64");
    }
    build(table) {
      return new PgBigInt64(table, this.config);
    }
  };
  PgBigInt64 = class PgBigInt64 extends PgColumn {
    static [entityKind] = "PgBigInt64";
    getSQLType() {
      return "bigint";
    }
    mapFromDriverValue(value) {
      return BigInt(value);
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/bigserial.js
function bigserial(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  if (config.mode === "number") {
    return new PgBigSerial53Builder(name);
  }
  return new PgBigSerial64Builder(name);
}
var PgBigSerial53Builder, PgBigSerial53, PgBigSerial64Builder, PgBigSerial64;
var init_bigserial = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgBigSerial53Builder = class PgBigSerial53Builder extends PgColumnBuilder {
    static [entityKind] = "PgBigSerial53Builder";
    constructor(name) {
      super(name, "number", "PgBigSerial53");
      this.config.hasDefault = true;
      this.config.notNull = true;
    }
    build(table) {
      return new PgBigSerial53(table, this.config);
    }
  };
  PgBigSerial53 = class PgBigSerial53 extends PgColumn {
    static [entityKind] = "PgBigSerial53";
    getSQLType() {
      return "bigserial";
    }
    mapFromDriverValue(value) {
      if (typeof value === "number") {
        return value;
      }
      return Number(value);
    }
  };
  PgBigSerial64Builder = class PgBigSerial64Builder extends PgColumnBuilder {
    static [entityKind] = "PgBigSerial64Builder";
    constructor(name) {
      super(name, "bigint", "PgBigSerial64");
      this.config.hasDefault = true;
    }
    build(table) {
      return new PgBigSerial64(table, this.config);
    }
  };
  PgBigSerial64 = class PgBigSerial64 extends PgColumn {
    static [entityKind] = "PgBigSerial64";
    getSQLType() {
      return "bigserial";
    }
    mapFromDriverValue(value) {
      return BigInt(value);
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/boolean.js
function boolean(name) {
  return new PgBooleanBuilder(name ?? "");
}
var PgBooleanBuilder, PgBoolean;
var init_boolean = __esm(() => {
  init_entity();
  init_common();
  PgBooleanBuilder = class PgBooleanBuilder extends PgColumnBuilder {
    static [entityKind] = "PgBooleanBuilder";
    constructor(name) {
      super(name, "boolean", "PgBoolean");
    }
    build(table) {
      return new PgBoolean(table, this.config);
    }
  };
  PgBoolean = class PgBoolean extends PgColumn {
    static [entityKind] = "PgBoolean";
    getSQLType() {
      return "boolean";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/char.js
function char(a, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgCharBuilder(name, config);
}
var PgCharBuilder, PgChar;
var init_char = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgCharBuilder = class PgCharBuilder extends PgColumnBuilder {
    static [entityKind] = "PgCharBuilder";
    constructor(name, config) {
      super(name, "string", "PgChar");
      this.config.length = config.length;
      this.config.enumValues = config.enum;
    }
    build(table) {
      return new PgChar(table, this.config);
    }
  };
  PgChar = class PgChar extends PgColumn {
    static [entityKind] = "PgChar";
    length = this.config.length;
    enumValues = this.config.enumValues;
    getSQLType() {
      return this.length === undefined ? `char` : `char(${this.length})`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/cidr.js
function cidr(name) {
  return new PgCidrBuilder(name ?? "");
}
var PgCidrBuilder, PgCidr;
var init_cidr = __esm(() => {
  init_entity();
  init_common();
  PgCidrBuilder = class PgCidrBuilder extends PgColumnBuilder {
    static [entityKind] = "PgCidrBuilder";
    constructor(name) {
      super(name, "string", "PgCidr");
    }
    build(table) {
      return new PgCidr(table, this.config);
    }
  };
  PgCidr = class PgCidr extends PgColumn {
    static [entityKind] = "PgCidr";
    getSQLType() {
      return "cidr";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/custom.js
function customType(customTypeParams) {
  return (a, b2) => {
    const { name, config } = getColumnNameAndConfig(a, b2);
    return new PgCustomColumnBuilder(name, config, customTypeParams);
  };
}
var PgCustomColumnBuilder, PgCustomColumn;
var init_custom = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgCustomColumnBuilder = class PgCustomColumnBuilder extends PgColumnBuilder {
    static [entityKind] = "PgCustomColumnBuilder";
    constructor(name, fieldConfig, customTypeParams) {
      super(name, "custom", "PgCustomColumn");
      this.config.fieldConfig = fieldConfig;
      this.config.customTypeParams = customTypeParams;
    }
    build(table) {
      return new PgCustomColumn(table, this.config);
    }
  };
  PgCustomColumn = class PgCustomColumn extends PgColumn {
    static [entityKind] = "PgCustomColumn";
    sqlName;
    mapTo;
    mapFrom;
    constructor(table, config) {
      super(table, config);
      this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
      this.mapTo = config.customTypeParams.toDriver;
      this.mapFrom = config.customTypeParams.fromDriver;
    }
    getSQLType() {
      return this.sqlName;
    }
    mapFromDriverValue(value) {
      return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
    }
    mapToDriverValue(value) {
      return typeof this.mapTo === "function" ? this.mapTo(value) : value;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/date.common.js
var PgDateColumnBaseBuilder;
var init_date_common = __esm(() => {
  init_entity();
  init_sql();
  init_common();
  PgDateColumnBaseBuilder = class PgDateColumnBaseBuilder extends PgColumnBuilder {
    static [entityKind] = "PgDateColumnBaseBuilder";
    defaultNow() {
      return this.default(sql`now()`);
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/date.js
function date(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  if (config?.mode === "date") {
    return new PgDateBuilder(name);
  }
  return new PgDateStringBuilder(name);
}
var PgDateBuilder, PgDate, PgDateStringBuilder, PgDateString;
var init_date = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  init_date_common();
  PgDateBuilder = class PgDateBuilder extends PgDateColumnBaseBuilder {
    static [entityKind] = "PgDateBuilder";
    constructor(name) {
      super(name, "date", "PgDate");
    }
    build(table) {
      return new PgDate(table, this.config);
    }
  };
  PgDate = class PgDate extends PgColumn {
    static [entityKind] = "PgDate";
    getSQLType() {
      return "date";
    }
    mapFromDriverValue(value) {
      return new Date(value);
    }
    mapToDriverValue(value) {
      return value.toISOString();
    }
  };
  PgDateStringBuilder = class PgDateStringBuilder extends PgDateColumnBaseBuilder {
    static [entityKind] = "PgDateStringBuilder";
    constructor(name) {
      super(name, "string", "PgDateString");
    }
    build(table) {
      return new PgDateString(table, this.config);
    }
  };
  PgDateString = class PgDateString extends PgColumn {
    static [entityKind] = "PgDateString";
    getSQLType() {
      return "date";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/double-precision.js
function doublePrecision(name) {
  return new PgDoublePrecisionBuilder(name ?? "");
}
var PgDoublePrecisionBuilder, PgDoublePrecision;
var init_double_precision = __esm(() => {
  init_entity();
  init_common();
  PgDoublePrecisionBuilder = class PgDoublePrecisionBuilder extends PgColumnBuilder {
    static [entityKind] = "PgDoublePrecisionBuilder";
    constructor(name) {
      super(name, "number", "PgDoublePrecision");
    }
    build(table) {
      return new PgDoublePrecision(table, this.config);
    }
  };
  PgDoublePrecision = class PgDoublePrecision extends PgColumn {
    static [entityKind] = "PgDoublePrecision";
    getSQLType() {
      return "double precision";
    }
    mapFromDriverValue(value) {
      if (typeof value === "string") {
        return Number.parseFloat(value);
      }
      return value;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/inet.js
function inet(name) {
  return new PgInetBuilder(name ?? "");
}
var PgInetBuilder, PgInet;
var init_inet = __esm(() => {
  init_entity();
  init_common();
  PgInetBuilder = class PgInetBuilder extends PgColumnBuilder {
    static [entityKind] = "PgInetBuilder";
    constructor(name) {
      super(name, "string", "PgInet");
    }
    build(table) {
      return new PgInet(table, this.config);
    }
  };
  PgInet = class PgInet extends PgColumn {
    static [entityKind] = "PgInet";
    getSQLType() {
      return "inet";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/integer.js
function integer(name) {
  return new PgIntegerBuilder(name ?? "");
}
var PgIntegerBuilder, PgInteger;
var init_integer = __esm(() => {
  init_entity();
  init_common();
  init_int_common();
  PgIntegerBuilder = class PgIntegerBuilder extends PgIntColumnBaseBuilder {
    static [entityKind] = "PgIntegerBuilder";
    constructor(name) {
      super(name, "number", "PgInteger");
    }
    build(table) {
      return new PgInteger(table, this.config);
    }
  };
  PgInteger = class PgInteger extends PgColumn {
    static [entityKind] = "PgInteger";
    getSQLType() {
      return "integer";
    }
    mapFromDriverValue(value) {
      if (typeof value === "string") {
        return Number.parseInt(value);
      }
      return value;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/interval.js
function interval(a, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgIntervalBuilder(name, config);
}
var PgIntervalBuilder, PgInterval;
var init_interval = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgIntervalBuilder = class PgIntervalBuilder extends PgColumnBuilder {
    static [entityKind] = "PgIntervalBuilder";
    constructor(name, intervalConfig) {
      super(name, "string", "PgInterval");
      this.config.intervalConfig = intervalConfig;
    }
    build(table) {
      return new PgInterval(table, this.config);
    }
  };
  PgInterval = class PgInterval extends PgColumn {
    static [entityKind] = "PgInterval";
    fields = this.config.intervalConfig.fields;
    precision = this.config.intervalConfig.precision;
    getSQLType() {
      const fields = this.fields ? ` ${this.fields}` : "";
      const precision = this.precision ? `(${this.precision})` : "";
      return `interval${fields}${precision}`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/json.js
function json(name) {
  return new PgJsonBuilder(name ?? "");
}
var PgJsonBuilder, PgJson;
var init_json = __esm(() => {
  init_entity();
  init_common();
  PgJsonBuilder = class PgJsonBuilder extends PgColumnBuilder {
    static [entityKind] = "PgJsonBuilder";
    constructor(name) {
      super(name, "json", "PgJson");
    }
    build(table) {
      return new PgJson(table, this.config);
    }
  };
  PgJson = class PgJson extends PgColumn {
    static [entityKind] = "PgJson";
    constructor(table, config) {
      super(table, config);
    }
    getSQLType() {
      return "json";
    }
    mapToDriverValue(value) {
      return JSON.stringify(value);
    }
    mapFromDriverValue(value) {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/jsonb.js
function jsonb(name) {
  return new PgJsonbBuilder(name ?? "");
}
var PgJsonbBuilder, PgJsonb;
var init_jsonb = __esm(() => {
  init_entity();
  init_common();
  PgJsonbBuilder = class PgJsonbBuilder extends PgColumnBuilder {
    static [entityKind] = "PgJsonbBuilder";
    constructor(name) {
      super(name, "json", "PgJsonb");
    }
    build(table) {
      return new PgJsonb(table, this.config);
    }
  };
  PgJsonb = class PgJsonb extends PgColumn {
    static [entityKind] = "PgJsonb";
    constructor(table, config) {
      super(table, config);
    }
    getSQLType() {
      return "jsonb";
    }
    mapToDriverValue(value) {
      return JSON.stringify(value);
    }
    mapFromDriverValue(value) {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/line.js
function line(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgLineBuilder(name);
  }
  return new PgLineABCBuilder(name);
}
var PgLineBuilder, PgLineTuple, PgLineABCBuilder, PgLineABC;
var init_line = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgLineBuilder = class PgLineBuilder extends PgColumnBuilder {
    static [entityKind] = "PgLineBuilder";
    constructor(name) {
      super(name, "array", "PgLine");
    }
    build(table) {
      return new PgLineTuple(table, this.config);
    }
  };
  PgLineTuple = class PgLineTuple extends PgColumn {
    static [entityKind] = "PgLine";
    getSQLType() {
      return "line";
    }
    mapFromDriverValue(value) {
      const [a, b2, c] = value.slice(1, -1).split(",");
      return [Number.parseFloat(a), Number.parseFloat(b2), Number.parseFloat(c)];
    }
    mapToDriverValue(value) {
      return `{${value[0]},${value[1]},${value[2]}}`;
    }
  };
  PgLineABCBuilder = class PgLineABCBuilder extends PgColumnBuilder {
    static [entityKind] = "PgLineABCBuilder";
    constructor(name) {
      super(name, "json", "PgLineABC");
    }
    build(table) {
      return new PgLineABC(table, this.config);
    }
  };
  PgLineABC = class PgLineABC extends PgColumn {
    static [entityKind] = "PgLineABC";
    getSQLType() {
      return "line";
    }
    mapFromDriverValue(value) {
      const [a, b2, c] = value.slice(1, -1).split(",");
      return { a: Number.parseFloat(a), b: Number.parseFloat(b2), c: Number.parseFloat(c) };
    }
    mapToDriverValue(value) {
      return `{${value.a},${value.b},${value.c}}`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/macaddr.js
function macaddr(name) {
  return new PgMacaddrBuilder(name ?? "");
}
var PgMacaddrBuilder, PgMacaddr;
var init_macaddr = __esm(() => {
  init_entity();
  init_common();
  PgMacaddrBuilder = class PgMacaddrBuilder extends PgColumnBuilder {
    static [entityKind] = "PgMacaddrBuilder";
    constructor(name) {
      super(name, "string", "PgMacaddr");
    }
    build(table) {
      return new PgMacaddr(table, this.config);
    }
  };
  PgMacaddr = class PgMacaddr extends PgColumn {
    static [entityKind] = "PgMacaddr";
    getSQLType() {
      return "macaddr";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/macaddr8.js
function macaddr8(name) {
  return new PgMacaddr8Builder(name ?? "");
}
var PgMacaddr8Builder, PgMacaddr8;
var init_macaddr8 = __esm(() => {
  init_entity();
  init_common();
  PgMacaddr8Builder = class PgMacaddr8Builder extends PgColumnBuilder {
    static [entityKind] = "PgMacaddr8Builder";
    constructor(name) {
      super(name, "string", "PgMacaddr8");
    }
    build(table) {
      return new PgMacaddr8(table, this.config);
    }
  };
  PgMacaddr8 = class PgMacaddr8 extends PgColumn {
    static [entityKind] = "PgMacaddr8";
    getSQLType() {
      return "macaddr8";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/numeric.js
function numeric(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  const mode = config?.mode;
  return mode === "number" ? new PgNumericNumberBuilder(name, config?.precision, config?.scale) : mode === "bigint" ? new PgNumericBigIntBuilder(name, config?.precision, config?.scale) : new PgNumericBuilder(name, config?.precision, config?.scale);
}
var PgNumericBuilder, PgNumeric, PgNumericNumberBuilder, PgNumericNumber, PgNumericBigIntBuilder, PgNumericBigInt;
var init_numeric = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgNumericBuilder = class PgNumericBuilder extends PgColumnBuilder {
    static [entityKind] = "PgNumericBuilder";
    constructor(name, precision, scale) {
      super(name, "string", "PgNumeric");
      this.config.precision = precision;
      this.config.scale = scale;
    }
    build(table) {
      return new PgNumeric(table, this.config);
    }
  };
  PgNumeric = class PgNumeric extends PgColumn {
    static [entityKind] = "PgNumeric";
    precision;
    scale;
    constructor(table, config) {
      super(table, config);
      this.precision = config.precision;
      this.scale = config.scale;
    }
    mapFromDriverValue(value) {
      if (typeof value === "string")
        return value;
      return String(value);
    }
    getSQLType() {
      if (this.precision !== undefined && this.scale !== undefined) {
        return `numeric(${this.precision}, ${this.scale})`;
      } else if (this.precision === undefined) {
        return "numeric";
      } else {
        return `numeric(${this.precision})`;
      }
    }
  };
  PgNumericNumberBuilder = class PgNumericNumberBuilder extends PgColumnBuilder {
    static [entityKind] = "PgNumericNumberBuilder";
    constructor(name, precision, scale) {
      super(name, "number", "PgNumericNumber");
      this.config.precision = precision;
      this.config.scale = scale;
    }
    build(table) {
      return new PgNumericNumber(table, this.config);
    }
  };
  PgNumericNumber = class PgNumericNumber extends PgColumn {
    static [entityKind] = "PgNumericNumber";
    precision;
    scale;
    constructor(table, config) {
      super(table, config);
      this.precision = config.precision;
      this.scale = config.scale;
    }
    mapFromDriverValue(value) {
      if (typeof value === "number")
        return value;
      return Number(value);
    }
    mapToDriverValue = String;
    getSQLType() {
      if (this.precision !== undefined && this.scale !== undefined) {
        return `numeric(${this.precision}, ${this.scale})`;
      } else if (this.precision === undefined) {
        return "numeric";
      } else {
        return `numeric(${this.precision})`;
      }
    }
  };
  PgNumericBigIntBuilder = class PgNumericBigIntBuilder extends PgColumnBuilder {
    static [entityKind] = "PgNumericBigIntBuilder";
    constructor(name, precision, scale) {
      super(name, "bigint", "PgNumericBigInt");
      this.config.precision = precision;
      this.config.scale = scale;
    }
    build(table) {
      return new PgNumericBigInt(table, this.config);
    }
  };
  PgNumericBigInt = class PgNumericBigInt extends PgColumn {
    static [entityKind] = "PgNumericBigInt";
    precision;
    scale;
    constructor(table, config) {
      super(table, config);
      this.precision = config.precision;
      this.scale = config.scale;
    }
    mapFromDriverValue = BigInt;
    mapToDriverValue = String;
    getSQLType() {
      if (this.precision !== undefined && this.scale !== undefined) {
        return `numeric(${this.precision}, ${this.scale})`;
      } else if (this.precision === undefined) {
        return "numeric";
      } else {
        return `numeric(${this.precision})`;
      }
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/point.js
function point(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgPointTupleBuilder(name);
  }
  return new PgPointObjectBuilder(name);
}
var PgPointTupleBuilder, PgPointTuple, PgPointObjectBuilder, PgPointObject;
var init_point = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgPointTupleBuilder = class PgPointTupleBuilder extends PgColumnBuilder {
    static [entityKind] = "PgPointTupleBuilder";
    constructor(name) {
      super(name, "array", "PgPointTuple");
    }
    build(table) {
      return new PgPointTuple(table, this.config);
    }
  };
  PgPointTuple = class PgPointTuple extends PgColumn {
    static [entityKind] = "PgPointTuple";
    getSQLType() {
      return "point";
    }
    mapFromDriverValue(value) {
      if (typeof value === "string") {
        const [x, y] = value.slice(1, -1).split(",");
        return [Number.parseFloat(x), Number.parseFloat(y)];
      }
      return [value.x, value.y];
    }
    mapToDriverValue(value) {
      return `(${value[0]},${value[1]})`;
    }
  };
  PgPointObjectBuilder = class PgPointObjectBuilder extends PgColumnBuilder {
    static [entityKind] = "PgPointObjectBuilder";
    constructor(name) {
      super(name, "json", "PgPointObject");
    }
    build(table) {
      return new PgPointObject(table, this.config);
    }
  };
  PgPointObject = class PgPointObject extends PgColumn {
    static [entityKind] = "PgPointObject";
    getSQLType() {
      return "point";
    }
    mapFromDriverValue(value) {
      if (typeof value === "string") {
        const [x, y] = value.slice(1, -1).split(",");
        return { x: Number.parseFloat(x), y: Number.parseFloat(y) };
      }
      return value;
    }
    mapToDriverValue(value) {
      return `(${value.x},${value.y})`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/postgis_extension/utils.js
function hexToBytes(hex) {
  const bytes = [];
  for (let c = 0;c < hex.length; c += 2) {
    bytes.push(Number.parseInt(hex.slice(c, c + 2), 16));
  }
  return new Uint8Array(bytes);
}
function bytesToFloat64(bytes, offset) {
  const buffer2 = new ArrayBuffer(8);
  const view = new DataView(buffer2);
  for (let i = 0;i < 8; i++) {
    view.setUint8(i, bytes[offset + i]);
  }
  return view.getFloat64(0, true);
}
function parseEWKB(hex) {
  const bytes = hexToBytes(hex);
  let offset = 0;
  const byteOrder = bytes[offset];
  offset += 1;
  const view = new DataView(bytes.buffer);
  const geomType = view.getUint32(offset, byteOrder === 1);
  offset += 4;
  let _srid;
  if (geomType & 536870912) {
    _srid = view.getUint32(offset, byteOrder === 1);
    offset += 4;
  }
  if ((geomType & 65535) === 1) {
    const x = bytesToFloat64(bytes, offset);
    offset += 8;
    const y = bytesToFloat64(bytes, offset);
    offset += 8;
    return [x, y];
  }
  throw new Error("Unsupported geometry type");
}
var init_utils2 = () => {
};

// node_modules/drizzle-orm/pg-core/columns/postgis_extension/geometry.js
function geometry(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgGeometryBuilder(name);
  }
  return new PgGeometryObjectBuilder(name);
}
var PgGeometryBuilder, PgGeometry, PgGeometryObjectBuilder, PgGeometryObject;
var init_geometry = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  init_utils2();
  PgGeometryBuilder = class PgGeometryBuilder extends PgColumnBuilder {
    static [entityKind] = "PgGeometryBuilder";
    constructor(name) {
      super(name, "array", "PgGeometry");
    }
    build(table) {
      return new PgGeometry(table, this.config);
    }
  };
  PgGeometry = class PgGeometry extends PgColumn {
    static [entityKind] = "PgGeometry";
    getSQLType() {
      return "geometry(point)";
    }
    mapFromDriverValue(value) {
      return parseEWKB(value);
    }
    mapToDriverValue(value) {
      return `point(${value[0]} ${value[1]})`;
    }
  };
  PgGeometryObjectBuilder = class PgGeometryObjectBuilder extends PgColumnBuilder {
    static [entityKind] = "PgGeometryObjectBuilder";
    constructor(name) {
      super(name, "json", "PgGeometryObject");
    }
    build(table) {
      return new PgGeometryObject(table, this.config);
    }
  };
  PgGeometryObject = class PgGeometryObject extends PgColumn {
    static [entityKind] = "PgGeometryObject";
    getSQLType() {
      return "geometry(point)";
    }
    mapFromDriverValue(value) {
      const parsed = parseEWKB(value);
      return { x: parsed[0], y: parsed[1] };
    }
    mapToDriverValue(value) {
      return `point(${value.x} ${value.y})`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/real.js
function real(name) {
  return new PgRealBuilder(name ?? "");
}
var PgRealBuilder, PgReal;
var init_real = __esm(() => {
  init_entity();
  init_common();
  PgRealBuilder = class PgRealBuilder extends PgColumnBuilder {
    static [entityKind] = "PgRealBuilder";
    constructor(name, length) {
      super(name, "number", "PgReal");
      this.config.length = length;
    }
    build(table) {
      return new PgReal(table, this.config);
    }
  };
  PgReal = class PgReal extends PgColumn {
    static [entityKind] = "PgReal";
    constructor(table, config) {
      super(table, config);
    }
    getSQLType() {
      return "real";
    }
    mapFromDriverValue = (value) => {
      if (typeof value === "string") {
        return Number.parseFloat(value);
      }
      return value;
    };
  };
});

// node_modules/drizzle-orm/pg-core/columns/serial.js
function serial(name) {
  return new PgSerialBuilder(name ?? "");
}
var PgSerialBuilder, PgSerial;
var init_serial = __esm(() => {
  init_entity();
  init_common();
  PgSerialBuilder = class PgSerialBuilder extends PgColumnBuilder {
    static [entityKind] = "PgSerialBuilder";
    constructor(name) {
      super(name, "number", "PgSerial");
      this.config.hasDefault = true;
      this.config.notNull = true;
    }
    build(table) {
      return new PgSerial(table, this.config);
    }
  };
  PgSerial = class PgSerial extends PgColumn {
    static [entityKind] = "PgSerial";
    getSQLType() {
      return "serial";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/smallint.js
function smallint(name) {
  return new PgSmallIntBuilder(name ?? "");
}
var PgSmallIntBuilder, PgSmallInt;
var init_smallint = __esm(() => {
  init_entity();
  init_common();
  init_int_common();
  PgSmallIntBuilder = class PgSmallIntBuilder extends PgIntColumnBaseBuilder {
    static [entityKind] = "PgSmallIntBuilder";
    constructor(name) {
      super(name, "number", "PgSmallInt");
    }
    build(table) {
      return new PgSmallInt(table, this.config);
    }
  };
  PgSmallInt = class PgSmallInt extends PgColumn {
    static [entityKind] = "PgSmallInt";
    getSQLType() {
      return "smallint";
    }
    mapFromDriverValue = (value) => {
      if (typeof value === "string") {
        return Number(value);
      }
      return value;
    };
  };
});

// node_modules/drizzle-orm/pg-core/columns/smallserial.js
function smallserial(name) {
  return new PgSmallSerialBuilder(name ?? "");
}
var PgSmallSerialBuilder, PgSmallSerial;
var init_smallserial = __esm(() => {
  init_entity();
  init_common();
  PgSmallSerialBuilder = class PgSmallSerialBuilder extends PgColumnBuilder {
    static [entityKind] = "PgSmallSerialBuilder";
    constructor(name) {
      super(name, "number", "PgSmallSerial");
      this.config.hasDefault = true;
      this.config.notNull = true;
    }
    build(table) {
      return new PgSmallSerial(table, this.config);
    }
  };
  PgSmallSerial = class PgSmallSerial extends PgColumn {
    static [entityKind] = "PgSmallSerial";
    getSQLType() {
      return "smallserial";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/text.js
function text(a, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgTextBuilder(name, config);
}
var PgTextBuilder, PgText;
var init_text = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgTextBuilder = class PgTextBuilder extends PgColumnBuilder {
    static [entityKind] = "PgTextBuilder";
    constructor(name, config) {
      super(name, "string", "PgText");
      this.config.enumValues = config.enum;
    }
    build(table) {
      return new PgText(table, this.config);
    }
  };
  PgText = class PgText extends PgColumn {
    static [entityKind] = "PgText";
    enumValues = this.config.enumValues;
    getSQLType() {
      return "text";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/time.js
function time2(a, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgTimeBuilder(name, config.withTimezone ?? false, config.precision);
}
var PgTimeBuilder, PgTime;
var init_time = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  init_date_common();
  PgTimeBuilder = class PgTimeBuilder extends PgDateColumnBaseBuilder {
    constructor(name, withTimezone, precision) {
      super(name, "string", "PgTime");
      this.withTimezone = withTimezone;
      this.precision = precision;
      this.config.withTimezone = withTimezone;
      this.config.precision = precision;
    }
    static [entityKind] = "PgTimeBuilder";
    build(table) {
      return new PgTime(table, this.config);
    }
  };
  PgTime = class PgTime extends PgColumn {
    static [entityKind] = "PgTime";
    withTimezone;
    precision;
    constructor(table, config) {
      super(table, config);
      this.withTimezone = config.withTimezone;
      this.precision = config.precision;
    }
    getSQLType() {
      const precision = this.precision === undefined ? "" : `(${this.precision})`;
      return `time${precision}${this.withTimezone ? " with time zone" : ""}`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/timestamp.js
function timestamp(a, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  if (config?.mode === "string") {
    return new PgTimestampStringBuilder(name, config.withTimezone ?? false, config.precision);
  }
  return new PgTimestampBuilder(name, config?.withTimezone ?? false, config?.precision);
}
var PgTimestampBuilder, PgTimestamp, PgTimestampStringBuilder, PgTimestampString;
var init_timestamp = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  init_date_common();
  PgTimestampBuilder = class PgTimestampBuilder extends PgDateColumnBaseBuilder {
    static [entityKind] = "PgTimestampBuilder";
    constructor(name, withTimezone, precision) {
      super(name, "date", "PgTimestamp");
      this.config.withTimezone = withTimezone;
      this.config.precision = precision;
    }
    build(table) {
      return new PgTimestamp(table, this.config);
    }
  };
  PgTimestamp = class PgTimestamp extends PgColumn {
    static [entityKind] = "PgTimestamp";
    withTimezone;
    precision;
    constructor(table, config) {
      super(table, config);
      this.withTimezone = config.withTimezone;
      this.precision = config.precision;
    }
    getSQLType() {
      const precision = this.precision === undefined ? "" : ` (${this.precision})`;
      return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
    }
    mapFromDriverValue = (value) => {
      return new Date(this.withTimezone ? value : value + "+0000");
    };
    mapToDriverValue = (value) => {
      return value.toISOString();
    };
  };
  PgTimestampStringBuilder = class PgTimestampStringBuilder extends PgDateColumnBaseBuilder {
    static [entityKind] = "PgTimestampStringBuilder";
    constructor(name, withTimezone, precision) {
      super(name, "string", "PgTimestampString");
      this.config.withTimezone = withTimezone;
      this.config.precision = precision;
    }
    build(table) {
      return new PgTimestampString(table, this.config);
    }
  };
  PgTimestampString = class PgTimestampString extends PgColumn {
    static [entityKind] = "PgTimestampString";
    withTimezone;
    precision;
    constructor(table, config) {
      super(table, config);
      this.withTimezone = config.withTimezone;
      this.precision = config.precision;
    }
    getSQLType() {
      const precision = this.precision === undefined ? "" : `(${this.precision})`;
      return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/uuid.js
function uuid(name) {
  return new PgUUIDBuilder(name ?? "");
}
var PgUUIDBuilder, PgUUID;
var init_uuid = __esm(() => {
  init_entity();
  init_sql();
  init_common();
  PgUUIDBuilder = class PgUUIDBuilder extends PgColumnBuilder {
    static [entityKind] = "PgUUIDBuilder";
    constructor(name) {
      super(name, "string", "PgUUID");
    }
    defaultRandom() {
      return this.default(sql`gen_random_uuid()`);
    }
    build(table) {
      return new PgUUID(table, this.config);
    }
  };
  PgUUID = class PgUUID extends PgColumn {
    static [entityKind] = "PgUUID";
    getSQLType() {
      return "uuid";
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/varchar.js
function varchar(a, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgVarcharBuilder(name, config);
}
var PgVarcharBuilder, PgVarchar;
var init_varchar = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgVarcharBuilder = class PgVarcharBuilder extends PgColumnBuilder {
    static [entityKind] = "PgVarcharBuilder";
    constructor(name, config) {
      super(name, "string", "PgVarchar");
      this.config.length = config.length;
      this.config.enumValues = config.enum;
    }
    build(table) {
      return new PgVarchar(table, this.config);
    }
  };
  PgVarchar = class PgVarchar extends PgColumn {
    static [entityKind] = "PgVarchar";
    length = this.config.length;
    enumValues = this.config.enumValues;
    getSQLType() {
      return this.length === undefined ? `varchar` : `varchar(${this.length})`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/vector_extension/bit.js
function bit(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgBinaryVectorBuilder(name, config);
}
var PgBinaryVectorBuilder, PgBinaryVector;
var init_bit = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgBinaryVectorBuilder = class PgBinaryVectorBuilder extends PgColumnBuilder {
    static [entityKind] = "PgBinaryVectorBuilder";
    constructor(name, config) {
      super(name, "string", "PgBinaryVector");
      this.config.dimensions = config.dimensions;
    }
    build(table) {
      return new PgBinaryVector(table, this.config);
    }
  };
  PgBinaryVector = class PgBinaryVector extends PgColumn {
    static [entityKind] = "PgBinaryVector";
    dimensions = this.config.dimensions;
    getSQLType() {
      return `bit(${this.dimensions})`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/vector_extension/halfvec.js
function halfvec(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgHalfVectorBuilder(name, config);
}
var PgHalfVectorBuilder, PgHalfVector;
var init_halfvec = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgHalfVectorBuilder = class PgHalfVectorBuilder extends PgColumnBuilder {
    static [entityKind] = "PgHalfVectorBuilder";
    constructor(name, config) {
      super(name, "array", "PgHalfVector");
      this.config.dimensions = config.dimensions;
    }
    build(table) {
      return new PgHalfVector(table, this.config);
    }
  };
  PgHalfVector = class PgHalfVector extends PgColumn {
    static [entityKind] = "PgHalfVector";
    dimensions = this.config.dimensions;
    getSQLType() {
      return `halfvec(${this.dimensions})`;
    }
    mapToDriverValue(value) {
      return JSON.stringify(value);
    }
    mapFromDriverValue(value) {
      return value.slice(1, -1).split(",").map((v) => Number.parseFloat(v));
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/vector_extension/sparsevec.js
function sparsevec(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgSparseVectorBuilder(name, config);
}
var PgSparseVectorBuilder, PgSparseVector;
var init_sparsevec = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgSparseVectorBuilder = class PgSparseVectorBuilder extends PgColumnBuilder {
    static [entityKind] = "PgSparseVectorBuilder";
    constructor(name, config) {
      super(name, "string", "PgSparseVector");
      this.config.dimensions = config.dimensions;
    }
    build(table) {
      return new PgSparseVector(table, this.config);
    }
  };
  PgSparseVector = class PgSparseVector extends PgColumn {
    static [entityKind] = "PgSparseVector";
    dimensions = this.config.dimensions;
    getSQLType() {
      return `sparsevec(${this.dimensions})`;
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.js
function vector(a, b2) {
  const { name, config } = getColumnNameAndConfig(a, b2);
  return new PgVectorBuilder(name, config);
}
var PgVectorBuilder, PgVector;
var init_vector = __esm(() => {
  init_entity();
  init_utils();
  init_common();
  PgVectorBuilder = class PgVectorBuilder extends PgColumnBuilder {
    static [entityKind] = "PgVectorBuilder";
    constructor(name, config) {
      super(name, "array", "PgVector");
      this.config.dimensions = config.dimensions;
    }
    build(table) {
      return new PgVector(table, this.config);
    }
  };
  PgVector = class PgVector extends PgColumn {
    static [entityKind] = "PgVector";
    dimensions = this.config.dimensions;
    getSQLType() {
      return `vector(${this.dimensions})`;
    }
    mapToDriverValue(value) {
      return JSON.stringify(value);
    }
    mapFromDriverValue(value) {
      return value.slice(1, -1).split(",").map((v) => Number.parseFloat(v));
    }
  };
});

// node_modules/drizzle-orm/pg-core/columns/index.js
var init_columns = __esm(() => {
  init_bigint();
  init_bigserial();
  init_boolean();
  init_char();
  init_cidr();
  init_common();
  init_custom();
  init_date();
  init_double_precision();
  init_enum();
  init_inet();
  init_int_common();
  init_integer();
  init_interval();
  init_json();
  init_jsonb();
  init_line();
  init_macaddr();
  init_macaddr8();
  init_numeric();
  init_point();
  init_geometry();
  init_real();
  init_serial();
  init_smallint();
  init_smallserial();
  init_text();
  init_time();
  init_timestamp();
  init_uuid();
  init_varchar();
  init_bit();
  init_halfvec();
  init_sparsevec();
  init_vector();
});

// node_modules/drizzle-orm/pg-core/columns/all.js
function getPgColumnBuilders() {
  return {
    bigint,
    bigserial,
    boolean,
    char,
    cidr,
    customType,
    date,
    doublePrecision,
    inet,
    integer,
    interval,
    json,
    jsonb,
    line,
    macaddr,
    macaddr8,
    numeric,
    point,
    geometry,
    real,
    serial,
    smallint,
    smallserial,
    text,
    time: time2,
    timestamp,
    uuid,
    varchar,
    bit,
    halfvec,
    sparsevec,
    vector
  };
}
var init_all = __esm(() => {
  init_bigint();
  init_bigserial();
  init_boolean();
  init_char();
  init_cidr();
  init_custom();
  init_date();
  init_double_precision();
  init_inet();
  init_integer();
  init_interval();
  init_json();
  init_jsonb();
  init_line();
  init_macaddr();
  init_macaddr8();
  init_numeric();
  init_point();
  init_geometry();
  init_real();
  init_serial();
  init_smallint();
  init_smallserial();
  init_text();
  init_time();
  init_timestamp();
  init_uuid();
  init_varchar();
  init_bit();
  init_halfvec();
  init_sparsevec();
  init_vector();
});

// node_modules/drizzle-orm/pg-core/table.js
function pgTableWithSchema(name, columns, extraConfig, schema, baseName = name) {
  const rawTable = new PgTable(name, schema, baseName);
  const parsedColumns = typeof columns === "function" ? columns(getPgColumnBuilders()) : columns;
  const builtColumns = Object.fromEntries(Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
    const colBuilder = colBuilderBase;
    colBuilder.setName(name2);
    const column = colBuilder.build(rawTable);
    rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
    return [name2, column];
  }));
  const builtColumnsForExtraConfig = Object.fromEntries(Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
    const colBuilder = colBuilderBase;
    colBuilder.setName(name2);
    const column = colBuilder.buildExtraConfigColumn(rawTable);
    return [name2, column];
  }));
  const table = Object.assign(rawTable, builtColumns);
  table[Table.Symbol.Columns] = builtColumns;
  table[Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;
  if (extraConfig) {
    table[PgTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return Object.assign(table, {
    enableRLS: () => {
      table[PgTable.Symbol.EnableRLS] = true;
      return table;
    }
  });
}
var InlineForeignKeys, EnableRLS, PgTable, pgTable = (name, columns, extraConfig) => {
  return pgTableWithSchema(name, columns, extraConfig, undefined);
};
var init_table2 = __esm(() => {
  init_entity();
  init_table();
  init_all();
  InlineForeignKeys = Symbol.for("drizzle:PgInlineForeignKeys");
  EnableRLS = Symbol.for("drizzle:EnableRLS");
  PgTable = class PgTable extends Table {
    static [entityKind] = "PgTable";
    static Symbol = Object.assign({}, Table.Symbol, {
      InlineForeignKeys,
      EnableRLS
    });
    [InlineForeignKeys] = [];
    [EnableRLS] = false;
    [Table.Symbol.ExtraConfigBuilder] = undefined;
    [Table.Symbol.ExtraConfigColumns] = {};
  };
});

// node_modules/drizzle-orm/pg-core/primary-keys.js
var PrimaryKeyBuilder, PrimaryKey;
var init_primary_keys = __esm(() => {
  init_entity();
  init_table2();
  PrimaryKeyBuilder = class PrimaryKeyBuilder {
    static [entityKind] = "PgPrimaryKeyBuilder";
    columns;
    name;
    constructor(columns, name) {
      this.columns = columns;
      this.name = name;
    }
    build(table) {
      return new PrimaryKey(table, this.columns, this.name);
    }
  };
  PrimaryKey = class PrimaryKey {
    constructor(table, columns, name) {
      this.table = table;
      this.columns = columns;
      this.name = name;
    }
    static [entityKind] = "PgPrimaryKey";
    columns;
    name;
    getName() {
      return this.name ?? `${this.table[PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
    }
  };
});

// node_modules/drizzle-orm/sql/expressions/conditions.js
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is(value, Param) && !is(value, Placeholder) && !is(value, Column) && !is(value, Table) && !is(value, View)) {
    return new Param(value, column);
  }
  return value;
}
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter((c) => c !== undefined);
  if (conditions.length === 0) {
    return;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter((c) => c !== undefined);
  if (conditions.length === 0) {
    return;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
function not(condition) {
  return sql`not ${condition}`;
}
function inArray(column, values2) {
  if (Array.isArray(values2)) {
    if (values2.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values2.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} in ${bindIfParam(values2, column)}`;
}
function notInArray(column, values2) {
  if (Array.isArray(values2)) {
    if (values2.length === 0) {
      return sql`true`;
    }
    return sql`${column} not in ${values2.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} not in ${bindIfParam(values2, column)}`;
}
function isNull(value) {
  return sql`${value} is null`;
}
function isNotNull(value) {
  return sql`${value} is not null`;
}
function exists2(subquery) {
  return sql`exists ${subquery}`;
}
function notExists(subquery) {
  return sql`not exists ${subquery}`;
}
function between(column, min, max) {
  return sql`${column} between ${bindIfParam(min, column)} and ${bindIfParam(max, column)}`;
}
function notBetween(column, min, max) {
  return sql`${column} not between ${bindIfParam(min, column)} and ${bindIfParam(max, column)}`;
}
function like(column, value) {
  return sql`${column} like ${value}`;
}
function notLike(column, value) {
  return sql`${column} not like ${value}`;
}
function ilike(column, value) {
  return sql`${column} ilike ${value}`;
}
function notIlike(column, value) {
  return sql`${column} not ilike ${value}`;
}
var eq = (left, right) => {
  return sql`${left} = ${bindIfParam(right, left)}`;
}, ne = (left, right) => {
  return sql`${left} <> ${bindIfParam(right, left)}`;
}, gt = (left, right) => {
  return sql`${left} > ${bindIfParam(right, left)}`;
}, gte = (left, right) => {
  return sql`${left} >= ${bindIfParam(right, left)}`;
}, lt = (left, right) => {
  return sql`${left} < ${bindIfParam(right, left)}`;
}, lte = (left, right) => {
  return sql`${left} <= ${bindIfParam(right, left)}`;
};
var init_conditions = __esm(() => {
  init_column();
  init_entity();
  init_table();
  init_sql();
});

// node_modules/drizzle-orm/sql/expressions/select.js
function asc(column) {
  return sql`${column} asc`;
}
function desc(column) {
  return sql`${column} desc`;
}
var init_select = __esm(() => {
  init_sql();
});

// node_modules/drizzle-orm/sql/expressions/index.js
var init_expressions = __esm(() => {
  init_conditions();
  init_select();
});

// node_modules/drizzle-orm/relations.js
function getOperators() {
  return {
    and,
    between,
    eq,
    exists: exists2,
    gt,
    gte,
    ilike,
    inArray,
    isNull,
    isNotNull,
    like,
    lt,
    lte,
    ne,
    not,
    notBetween,
    notExists,
    notLike,
    notIlike,
    notInArray,
    or,
    sql
  };
}
function getOrderByOperators() {
  return {
    sql,
    asc,
    desc
  };
}
function extractTablesRelationalConfig(schema, configHelpers) {
  if (Object.keys(schema).length === 1 && "default" in schema && !is(schema["default"], Table)) {
    schema = schema["default"];
  }
  const tableNamesMap = {};
  const relationsBuffer = {};
  const tablesConfig = {};
  for (const [key, value] of Object.entries(schema)) {
    if (is(value, Table)) {
      const dbName = getTableUniqueName(value);
      const bufferedRelations = relationsBuffer[dbName];
      tableNamesMap[dbName] = key;
      tablesConfig[key] = {
        tsName: key,
        dbName: value[Table.Symbol.Name],
        schema: value[Table.Symbol.Schema],
        columns: value[Table.Symbol.Columns],
        relations: bufferedRelations?.relations ?? {},
        primaryKey: bufferedRelations?.primaryKey ?? []
      };
      for (const column of Object.values(value[Table.Symbol.Columns])) {
        if (column.primary) {
          tablesConfig[key].primaryKey.push(column);
        }
      }
      const extraConfig = value[Table.Symbol.ExtraConfigBuilder]?.(value[Table.Symbol.ExtraConfigColumns]);
      if (extraConfig) {
        for (const configEntry of Object.values(extraConfig)) {
          if (is(configEntry, PrimaryKeyBuilder)) {
            tablesConfig[key].primaryKey.push(...configEntry.columns);
          }
        }
      }
    } else if (is(value, Relations)) {
      const dbName = getTableUniqueName(value.table);
      const tableName = tableNamesMap[dbName];
      const relations2 = value.config(configHelpers(value.table));
      let primaryKey;
      for (const [relationName, relation] of Object.entries(relations2)) {
        if (tableName) {
          const tableConfig = tablesConfig[tableName];
          tableConfig.relations[relationName] = relation;
          if (primaryKey) {
            tableConfig.primaryKey.push(...primaryKey);
          }
        } else {
          if (!(dbName in relationsBuffer)) {
            relationsBuffer[dbName] = {
              relations: {},
              primaryKey
            };
          }
          relationsBuffer[dbName].relations[relationName] = relation;
        }
      }
    }
  }
  return { tables: tablesConfig, tableNamesMap };
}
function createOne(sourceTable) {
  return function one(table, config) {
    return new One(sourceTable, table, config, config?.fields.reduce((res, f) => res && f.notNull, true) ?? false);
  };
}
function createMany(sourceTable) {
  return function many(referencedTable, config) {
    return new Many(sourceTable, referencedTable, config);
  };
}
function normalizeRelation(schema, tableNamesMap, relation) {
  if (is(relation, One) && relation.config) {
    return {
      fields: relation.config.fields,
      references: relation.config.references
    };
  }
  const referencedTableTsName = tableNamesMap[getTableUniqueName(relation.referencedTable)];
  if (!referencedTableTsName) {
    throw new Error(`Table "${relation.referencedTable[Table.Symbol.Name]}" not found in schema`);
  }
  const referencedTableConfig = schema[referencedTableTsName];
  if (!referencedTableConfig) {
    throw new Error(`Table "${referencedTableTsName}" not found in schema`);
  }
  const sourceTable = relation.sourceTable;
  const sourceTableTsName = tableNamesMap[getTableUniqueName(sourceTable)];
  if (!sourceTableTsName) {
    throw new Error(`Table "${sourceTable[Table.Symbol.Name]}" not found in schema`);
  }
  const reverseRelations = [];
  for (const referencedTableRelation of Object.values(referencedTableConfig.relations)) {
    if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
      reverseRelations.push(referencedTableRelation);
    }
  }
  if (reverseRelations.length > 1) {
    throw relation.relationName ? new Error(`There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`) : new Error(`There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[Table.Symbol.Name]}". Please specify relation name`);
  }
  if (reverseRelations[0] && is(reverseRelations[0], One) && reverseRelations[0].config) {
    return {
      fields: reverseRelations[0].config.references,
      references: reverseRelations[0].config.fields
    };
  }
  throw new Error(`There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`);
}
function createTableRelationsHelpers(sourceTable) {
  return {
    one: createOne(sourceTable),
    many: createMany(sourceTable)
  };
}
function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
  const result = {};
  for (const [
    selectionItemIndex,
    selectionItem
  ] of buildQueryResultSelection.entries()) {
    if (selectionItem.isJson) {
      const relation = tableConfig.relations[selectionItem.tsKey];
      const rawSubRows = row[selectionItemIndex];
      const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
      result[selectionItem.tsKey] = is(relation, One) ? subRows && mapRelationalRow(tablesConfig, tablesConfig[selectionItem.relationTableTsKey], subRows, selectionItem.selection, mapColumnValue) : subRows.map((subRow) => mapRelationalRow(tablesConfig, tablesConfig[selectionItem.relationTableTsKey], subRow, selectionItem.selection, mapColumnValue));
    } else {
      const value = mapColumnValue(row[selectionItemIndex]);
      const field = selectionItem.field;
      let decoder2;
      if (is(field, Column)) {
        decoder2 = field;
      } else if (is(field, SQL)) {
        decoder2 = field.decoder;
      } else {
        decoder2 = field.sql.decoder;
      }
      result[selectionItem.tsKey] = value === null ? null : decoder2.mapFromDriverValue(value);
    }
  }
  return result;
}
var Relation, Relations, One, Many;
var init_relations = __esm(() => {
  init_table();
  init_column();
  init_entity();
  init_primary_keys();
  init_expressions();
  init_sql();
  Relation = class Relation {
    constructor(sourceTable, referencedTable, relationName) {
      this.sourceTable = sourceTable;
      this.referencedTable = referencedTable;
      this.relationName = relationName;
      this.referencedTableName = referencedTable[Table.Symbol.Name];
    }
    static [entityKind] = "Relation";
    referencedTableName;
    fieldName;
  };
  Relations = class Relations {
    constructor(table, config) {
      this.table = table;
      this.config = config;
    }
    static [entityKind] = "Relations";
  };
  One = class One extends Relation {
    constructor(sourceTable, referencedTable, config, isNullable) {
      super(sourceTable, referencedTable, config?.relationName);
      this.config = config;
      this.isNullable = isNullable;
    }
    static [entityKind] = "One";
    withFieldName(fieldName) {
      const relation = new One(this.sourceTable, this.referencedTable, this.config, this.isNullable);
      relation.fieldName = fieldName;
      return relation;
    }
  };
  Many = class Many extends Relation {
    constructor(sourceTable, referencedTable, config) {
      super(sourceTable, referencedTable, config?.relationName);
      this.config = config;
    }
    static [entityKind] = "Many";
    withFieldName(fieldName) {
      const relation = new Many(this.sourceTable, this.referencedTable, this.config);
      relation.fieldName = fieldName;
      return relation;
    }
  };
});

// node_modules/drizzle-orm/sql/functions/aggregate.js
var init_aggregate = () => {
};

// node_modules/drizzle-orm/sql/functions/vector.js
var init_vector2 = () => {
};

// node_modules/drizzle-orm/sql/functions/index.js
var init_functions = __esm(() => {
  init_aggregate();
  init_vector2();
});

// node_modules/drizzle-orm/sql/index.js
var init_sql2 = __esm(() => {
  init_expressions();
  init_functions();
  init_sql();
});

// node_modules/drizzle-orm/pg-core/view-base.js
var PgViewBase;
var init_view_base = __esm(() => {
  init_entity();
  init_sql();
  PgViewBase = class PgViewBase extends View {
    static [entityKind] = "PgViewBase";
  };
});

// node_modules/drizzle-orm/pg-core/dialect.js
var PgDialect;
var init_dialect = __esm(() => {
  init_alias();
  init_casing();
  init_column();
  init_entity();
  init_errors2();
  init_columns();
  init_table2();
  init_relations();
  init_sql2();
  init_sql();
  init_subquery();
  init_table();
  init_utils();
  init_view_common();
  init_view_base();
  PgDialect = class PgDialect {
    static [entityKind] = "PgDialect";
    casing;
    constructor(config) {
      this.casing = new CasingCache(config?.casing);
    }
    async migrate(migrations, session, config) {
      const migrationsTable = typeof config === "string" ? "__drizzle_migrations" : config.migrationsTable ?? "__drizzle_migrations";
      const migrationsSchema = typeof config === "string" ? "drizzle" : config.migrationsSchema ?? "drizzle";
      const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`;
      await session.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(migrationsSchema)}`);
      await session.execute(migrationTableCreate);
      const dbMigrations = await session.all(sql`select id, hash, created_at from ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} order by created_at desc limit 1`);
      const lastDbMigration = dbMigrations[0];
      await session.transaction(async (tx) => {
        for await (const migration of migrations) {
          if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
            for (const stmt of migration.sql) {
              await tx.execute(sql.raw(stmt));
            }
            await tx.execute(sql`insert into ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`);
          }
        }
      });
    }
    escapeName(name) {
      return `"${name}"`;
    }
    escapeParam(num) {
      return `$${num + 1}`;
    }
    escapeString(str) {
      return `'${str.replace(/'/g, "''")}'`;
    }
    buildWithCTE(queries) {
      if (!queries?.length)
        return;
      const withSqlChunks = [sql`with `];
      for (const [i, w] of queries.entries()) {
        withSqlChunks.push(sql`${sql.identifier(w._.alias)} as (${w._.sql})`);
        if (i < queries.length - 1) {
          withSqlChunks.push(sql`, `);
        }
      }
      withSqlChunks.push(sql` `);
      return sql.join(withSqlChunks);
    }
    buildDeleteQuery({ table, where, returning, withList }) {
      const withSql = this.buildWithCTE(withList);
      const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : undefined;
      const whereSql = where ? sql` where ${where}` : undefined;
      return sql`${withSql}delete from ${table}${whereSql}${returningSql}`;
    }
    buildUpdateSet(table, set) {
      const tableColumns = table[Table.Symbol.Columns];
      const columnNames = Object.keys(tableColumns).filter((colName) => set[colName] !== undefined || tableColumns[colName]?.onUpdateFn !== undefined);
      const setSize = columnNames.length;
      return sql.join(columnNames.flatMap((colName, i) => {
        const col = tableColumns[colName];
        const value = set[colName] ?? sql.param(col.onUpdateFn(), col);
        const res = sql`${sql.identifier(this.casing.getColumnCasing(col))} = ${value}`;
        if (i < setSize - 1) {
          return [res, sql.raw(", ")];
        }
        return [res];
      }));
    }
    buildUpdateQuery({ table, set, where, returning, withList, from, joins }) {
      const withSql = this.buildWithCTE(withList);
      const tableName = table[PgTable.Symbol.Name];
      const tableSchema = table[PgTable.Symbol.Schema];
      const origTableName = table[PgTable.Symbol.OriginalName];
      const alias = tableName === origTableName ? undefined : tableName;
      const tableSql = sql`${tableSchema ? sql`${sql.identifier(tableSchema)}.` : undefined}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`}`;
      const setSql = this.buildUpdateSet(table, set);
      const fromSql = from && sql.join([sql.raw(" from "), this.buildFromTable(from)]);
      const joinsSql = this.buildJoins(joins);
      const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: !from })}` : undefined;
      const whereSql = where ? sql` where ${where}` : undefined;
      return sql`${withSql}update ${tableSql} set ${setSql}${fromSql}${joinsSql}${whereSql}${returningSql}`;
    }
    buildSelection(fields, { isSingleTable = false } = {}) {
      const columnsLen = fields.length;
      const chunks = fields.flatMap(({ field }, i) => {
        const chunk = [];
        if (is(field, SQL.Aliased) && field.isSelectionField) {
          chunk.push(sql.identifier(field.fieldAlias));
        } else if (is(field, SQL.Aliased) || is(field, SQL)) {
          const query = is(field, SQL.Aliased) ? field.sql : field;
          if (isSingleTable) {
            chunk.push(new SQL(query.queryChunks.map((c) => {
              if (is(c, PgColumn)) {
                return sql.identifier(this.casing.getColumnCasing(c));
              }
              return c;
            })));
          } else {
            chunk.push(query);
          }
          if (is(field, SQL.Aliased)) {
            chunk.push(sql` as ${sql.identifier(field.fieldAlias)}`);
          }
        } else if (is(field, Column)) {
          if (isSingleTable) {
            chunk.push(sql.identifier(this.casing.getColumnCasing(field)));
          } else {
            chunk.push(field);
          }
        }
        if (i < columnsLen - 1) {
          chunk.push(sql`, `);
        }
        return chunk;
      });
      return sql.join(chunks);
    }
    buildJoins(joins) {
      if (!joins || joins.length === 0) {
        return;
      }
      const joinsArray = [];
      for (const [index, joinMeta] of joins.entries()) {
        if (index === 0) {
          joinsArray.push(sql` `);
        }
        const table = joinMeta.table;
        const lateralSql = joinMeta.lateral ? sql` lateral` : undefined;
        if (is(table, PgTable)) {
          const tableName = table[PgTable.Symbol.Name];
          const tableSchema = table[PgTable.Symbol.Schema];
          const origTableName = table[PgTable.Symbol.OriginalName];
          const alias = tableName === origTableName ? undefined : joinMeta.alias;
          joinsArray.push(sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${tableSchema ? sql`${sql.identifier(tableSchema)}.` : undefined}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`} on ${joinMeta.on}`);
        } else if (is(table, View)) {
          const viewName = table[ViewBaseConfig].name;
          const viewSchema = table[ViewBaseConfig].schema;
          const origViewName = table[ViewBaseConfig].originalName;
          const alias = viewName === origViewName ? undefined : joinMeta.alias;
          joinsArray.push(sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${viewSchema ? sql`${sql.identifier(viewSchema)}.` : undefined}${sql.identifier(origViewName)}${alias && sql` ${sql.identifier(alias)}`} on ${joinMeta.on}`);
        } else {
          joinsArray.push(sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${table} on ${joinMeta.on}`);
        }
        if (index < joins.length - 1) {
          joinsArray.push(sql` `);
        }
      }
      return sql.join(joinsArray);
    }
    buildFromTable(table) {
      if (is(table, Table) && table[Table.Symbol.IsAlias]) {
        let fullName = sql`${sql.identifier(table[Table.Symbol.OriginalName])}`;
        if (table[Table.Symbol.Schema]) {
          fullName = sql`${sql.identifier(table[Table.Symbol.Schema])}.${fullName}`;
        }
        return sql`${fullName} ${sql.identifier(table[Table.Symbol.Name])}`;
      }
      return table;
    }
    buildSelectQuery({
      withList,
      fields,
      fieldsFlat,
      where,
      having,
      table,
      joins,
      orderBy,
      groupBy,
      limit,
      offset,
      lockingClause,
      distinct,
      setOperators
    }) {
      const fieldsList = fieldsFlat ?? orderSelectedFields(fields);
      for (const f of fieldsList) {
        if (is(f.field, Column) && getTableName(f.field.table) !== (is(table, Subquery) ? table._.alias : is(table, PgViewBase) ? table[ViewBaseConfig].name : is(table, SQL) ? undefined : getTableName(table)) && !((table2) => joins?.some(({ alias }) => alias === (table2[Table.Symbol.IsAlias] ? getTableName(table2) : table2[Table.Symbol.BaseName])))(f.field.table)) {
          const tableName = getTableName(f.field.table);
          throw new Error(`Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`);
        }
      }
      const isSingleTable = !joins || joins.length === 0;
      const withSql = this.buildWithCTE(withList);
      let distinctSql;
      if (distinct) {
        distinctSql = distinct === true ? sql` distinct` : sql` distinct on (${sql.join(distinct.on, sql`, `)})`;
      }
      const selection = this.buildSelection(fieldsList, { isSingleTable });
      const tableSql = this.buildFromTable(table);
      const joinsSql = this.buildJoins(joins);
      const whereSql = where ? sql` where ${where}` : undefined;
      const havingSql = having ? sql` having ${having}` : undefined;
      let orderBySql;
      if (orderBy && orderBy.length > 0) {
        orderBySql = sql` order by ${sql.join(orderBy, sql`, `)}`;
      }
      let groupBySql;
      if (groupBy && groupBy.length > 0) {
        groupBySql = sql` group by ${sql.join(groupBy, sql`, `)}`;
      }
      const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : undefined;
      const offsetSql = offset ? sql` offset ${offset}` : undefined;
      const lockingClauseSql = sql.empty();
      if (lockingClause) {
        const clauseSql = sql` for ${sql.raw(lockingClause.strength)}`;
        if (lockingClause.config.of) {
          clauseSql.append(sql` of ${sql.join(Array.isArray(lockingClause.config.of) ? lockingClause.config.of : [lockingClause.config.of], sql`, `)}`);
        }
        if (lockingClause.config.noWait) {
          clauseSql.append(sql` no wait`);
        } else if (lockingClause.config.skipLocked) {
          clauseSql.append(sql` skip locked`);
        }
        lockingClauseSql.append(clauseSql);
      }
      const finalQuery = sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}${lockingClauseSql}`;
      if (setOperators.length > 0) {
        return this.buildSetOperations(finalQuery, setOperators);
      }
      return finalQuery;
    }
    buildSetOperations(leftSelect, setOperators) {
      const [setOperator, ...rest] = setOperators;
      if (!setOperator) {
        throw new Error("Cannot pass undefined values to any set operator");
      }
      if (rest.length === 0) {
        return this.buildSetOperationQuery({ leftSelect, setOperator });
      }
      return this.buildSetOperations(this.buildSetOperationQuery({ leftSelect, setOperator }), rest);
    }
    buildSetOperationQuery({
      leftSelect,
      setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
    }) {
      const leftChunk = sql`(${leftSelect.getSQL()}) `;
      const rightChunk = sql`(${rightSelect.getSQL()})`;
      let orderBySql;
      if (orderBy && orderBy.length > 0) {
        const orderByValues = [];
        for (const singleOrderBy of orderBy) {
          if (is(singleOrderBy, PgColumn)) {
            orderByValues.push(sql.identifier(singleOrderBy.name));
          } else if (is(singleOrderBy, SQL)) {
            for (let i = 0;i < singleOrderBy.queryChunks.length; i++) {
              const chunk = singleOrderBy.queryChunks[i];
              if (is(chunk, PgColumn)) {
                singleOrderBy.queryChunks[i] = sql.identifier(chunk.name);
              }
            }
            orderByValues.push(sql`${singleOrderBy}`);
          } else {
            orderByValues.push(sql`${singleOrderBy}`);
          }
        }
        orderBySql = sql` order by ${sql.join(orderByValues, sql`, `)} `;
      }
      const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : undefined;
      const operatorChunk = sql.raw(`${type} ${isAll ? "all " : ""}`);
      const offsetSql = offset ? sql` offset ${offset}` : undefined;
      return sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
    }
    buildInsertQuery({ table, values: valuesOrSelect, onConflict, returning, withList, select: select3, overridingSystemValue_ }) {
      const valuesSqlList = [];
      const columns = table[Table.Symbol.Columns];
      const colEntries = Object.entries(columns).filter(([_, col]) => !col.shouldDisableInsert());
      const insertOrder = colEntries.map(([, column]) => sql.identifier(this.casing.getColumnCasing(column)));
      if (select3) {
        const select22 = valuesOrSelect;
        if (is(select22, SQL)) {
          valuesSqlList.push(select22);
        } else {
          valuesSqlList.push(select22.getSQL());
        }
      } else {
        const values2 = valuesOrSelect;
        valuesSqlList.push(sql.raw("values "));
        for (const [valueIndex, value] of values2.entries()) {
          const valueList = [];
          for (const [fieldName, col] of colEntries) {
            const colValue = value[fieldName];
            if (colValue === undefined || is(colValue, Param) && colValue.value === undefined) {
              if (col.defaultFn !== undefined) {
                const defaultFnResult = col.defaultFn();
                const defaultValue = is(defaultFnResult, SQL) ? defaultFnResult : sql.param(defaultFnResult, col);
                valueList.push(defaultValue);
              } else if (!col.default && col.onUpdateFn !== undefined) {
                const onUpdateFnResult = col.onUpdateFn();
                const newValue = is(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col);
                valueList.push(newValue);
              } else {
                valueList.push(sql`default`);
              }
            } else {
              valueList.push(colValue);
            }
          }
          valuesSqlList.push(valueList);
          if (valueIndex < values2.length - 1) {
            valuesSqlList.push(sql`, `);
          }
        }
      }
      const withSql = this.buildWithCTE(withList);
      const valuesSql = sql.join(valuesSqlList);
      const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : undefined;
      const onConflictSql = onConflict ? sql` on conflict ${onConflict}` : undefined;
      const overridingSql = overridingSystemValue_ === true ? sql`overriding system value ` : undefined;
      return sql`${withSql}insert into ${table} ${insertOrder} ${overridingSql}${valuesSql}${onConflictSql}${returningSql}`;
    }
    buildRefreshMaterializedViewQuery({ view, concurrently, withNoData }) {
      const concurrentlySql = concurrently ? sql` concurrently` : undefined;
      const withNoDataSql = withNoData ? sql` with no data` : undefined;
      return sql`refresh materialized view${concurrentlySql} ${view}${withNoDataSql}`;
    }
    prepareTyping(encoder2) {
      if (is(encoder2, PgJsonb) || is(encoder2, PgJson)) {
        return "json";
      } else if (is(encoder2, PgNumeric)) {
        return "decimal";
      } else if (is(encoder2, PgTime)) {
        return "time";
      } else if (is(encoder2, PgTimestamp) || is(encoder2, PgTimestampString)) {
        return "timestamp";
      } else if (is(encoder2, PgDate) || is(encoder2, PgDateString)) {
        return "date";
      } else if (is(encoder2, PgUUID)) {
        return "uuid";
      } else {
        return "none";
      }
    }
    sqlToQuery(sql22, invokeSource) {
      return sql22.toQuery({
        casing: this.casing,
        escapeName: this.escapeName,
        escapeParam: this.escapeParam,
        escapeString: this.escapeString,
        prepareTyping: this.prepareTyping,
        invokeSource
      });
    }
    buildRelationalQueryWithoutPK({
      fullSchema,
      schema,
      tableNamesMap,
      table,
      tableConfig,
      queryConfig: config,
      tableAlias,
      nestedQueryRelation,
      joinOn
    }) {
      let selection = [];
      let limit, offset, orderBy = [], where;
      const joins = [];
      if (config === true) {
        const selectionEntries = Object.entries(tableConfig.columns);
        selection = selectionEntries.map(([key, value]) => ({
          dbKey: value.name,
          tsKey: key,
          field: aliasedTableColumn(value, tableAlias),
          relationTableTsKey: undefined,
          isJson: false,
          selection: []
        }));
      } else {
        const aliasedColumns = Object.fromEntries(Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)]));
        if (config.where) {
          const whereSql = typeof config.where === "function" ? config.where(aliasedColumns, getOperators()) : config.where;
          where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
        }
        const fieldsSelection = [];
        let selectedColumns = [];
        if (config.columns) {
          let isIncludeMode = false;
          for (const [field, value] of Object.entries(config.columns)) {
            if (value === undefined) {
              continue;
            }
            if (field in tableConfig.columns) {
              if (!isIncludeMode && value === true) {
                isIncludeMode = true;
              }
              selectedColumns.push(field);
            }
          }
          if (selectedColumns.length > 0) {
            selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
          }
        } else {
          selectedColumns = Object.keys(tableConfig.columns);
        }
        for (const field of selectedColumns) {
          const column = tableConfig.columns[field];
          fieldsSelection.push({ tsKey: field, value: column });
        }
        let selectedRelations = [];
        if (config.with) {
          selectedRelations = Object.entries(config.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey] }));
        }
        let extras;
        if (config.extras) {
          extras = typeof config.extras === "function" ? config.extras(aliasedColumns, { sql }) : config.extras;
          for (const [tsKey, value] of Object.entries(extras)) {
            fieldsSelection.push({
              tsKey,
              value: mapColumnsInAliasedSQLToAlias(value, tableAlias)
            });
          }
        }
        for (const { tsKey, value } of fieldsSelection) {
          selection.push({
            dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
            tsKey,
            field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
            relationTableTsKey: undefined,
            isJson: false,
            selection: []
          });
        }
        let orderByOrig = typeof config.orderBy === "function" ? config.orderBy(aliasedColumns, getOrderByOperators()) : config.orderBy ?? [];
        if (!Array.isArray(orderByOrig)) {
          orderByOrig = [orderByOrig];
        }
        orderBy = orderByOrig.map((orderByValue) => {
          if (is(orderByValue, Column)) {
            return aliasedTableColumn(orderByValue, tableAlias);
          }
          return mapColumnsInSQLToAlias(orderByValue, tableAlias);
        });
        limit = config.limit;
        offset = config.offset;
        for (const {
          tsKey: selectedRelationTsKey,
          queryConfig: selectedRelationConfigValue,
          relation
        } of selectedRelations) {
          const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
          const relationTableName = getTableUniqueName(relation.referencedTable);
          const relationTableTsName = tableNamesMap[relationTableName];
          const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
          const joinOn2 = and(...normalizedRelation.fields.map((field2, i) => eq(aliasedTableColumn(normalizedRelation.references[i], relationTableAlias), aliasedTableColumn(field2, tableAlias))));
          const builtRelation = this.buildRelationalQueryWithoutPK({
            fullSchema,
            schema,
            tableNamesMap,
            table: fullSchema[relationTableTsName],
            tableConfig: schema[relationTableTsName],
            queryConfig: is(relation, One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
            tableAlias: relationTableAlias,
            joinOn: joinOn2,
            nestedQueryRelation: relation
          });
          const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier("data")}`.as(selectedRelationTsKey);
          joins.push({
            on: sql`true`,
            table: new Subquery(builtRelation.sql, {}, relationTableAlias),
            alias: relationTableAlias,
            joinType: "left",
            lateral: true
          });
          selection.push({
            dbKey: selectedRelationTsKey,
            tsKey: selectedRelationTsKey,
            field,
            relationTableTsKey: relationTableTsName,
            isJson: true,
            selection: builtRelation.selection
          });
        }
      }
      if (selection.length === 0) {
        throw new DrizzleError({ message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")` });
      }
      let result;
      where = and(joinOn, where);
      if (nestedQueryRelation) {
        let field = sql`json_build_array(${sql.join(selection.map(({ field: field2, tsKey, isJson }) => isJson ? sql`${sql.identifier(`${tableAlias}_${tsKey}`)}.${sql.identifier("data")}` : is(field2, SQL.Aliased) ? field2.sql : field2), sql`, `)})`;
        if (is(nestedQueryRelation, Many)) {
          field = sql`coalesce(json_agg(${field}${orderBy.length > 0 ? sql` order by ${sql.join(orderBy, sql`, `)}` : undefined}), '[]'::json)`;
        }
        const nestedSelection = [{
          dbKey: "data",
          tsKey: "data",
          field: field.as("data"),
          isJson: true,
          relationTableTsKey: tableConfig.tsName,
          selection
        }];
        const needsSubquery = limit !== undefined || offset !== undefined || orderBy.length > 0;
        if (needsSubquery) {
          result = this.buildSelectQuery({
            table: aliasedTable(table, tableAlias),
            fields: {},
            fieldsFlat: [{
              path: [],
              field: sql.raw("*")
            }],
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
          where = undefined;
          limit = undefined;
          offset = undefined;
          orderBy = [];
        } else {
          result = aliasedTable(table, tableAlias);
        }
        result = this.buildSelectQuery({
          table: is(result, PgTable) ? result : new Subquery(result, {}, tableAlias),
          fields: {},
          fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
            path: [],
            field: is(field2, Column) ? aliasedTableColumn(field2, tableAlias) : field2
          })),
          joins,
          where,
          limit,
          offset,
          orderBy,
          setOperators: []
        });
      } else {
        result = this.buildSelectQuery({
          table: aliasedTable(table, tableAlias),
          fields: {},
          fieldsFlat: selection.map(({ field }) => ({
            path: [],
            field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field
          })),
          joins,
          where,
          limit,
          offset,
          orderBy,
          setOperators: []
        });
      }
      return {
        tableTsKey: tableConfig.tsName,
        sql: result,
        selection
      };
    }
  };
});

// node_modules/drizzle-orm/query-builders/query-builder.js
var TypedQueryBuilder;
var init_query_builder = __esm(() => {
  init_entity();
  TypedQueryBuilder = class TypedQueryBuilder {
    static [entityKind] = "TypedQueryBuilder";
    getSelectedFields() {
      return this._.selectedFields;
    }
  };
});

// node_modules/drizzle-orm/pg-core/query-builders/select.js
function createSetOperator(type, isAll) {
  return (leftSelect, rightSelect, ...restSelects) => {
    const setOperators = [rightSelect, ...restSelects].map((select3) => ({
      type,
      isAll,
      rightSelect: select3
    }));
    for (const setOperator of setOperators) {
      if (!haveSameKeys(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
        throw new Error("Set operator error (union / intersect / except): selected fields are not the same or are in a different order");
      }
    }
    return leftSelect.addSetOperators(setOperators);
  };
}
var PgSelectBuilder, PgSelectQueryBuilderBase, PgSelectBase, getPgSetOperators = () => ({
  union,
  unionAll,
  intersect,
  intersectAll,
  except,
  exceptAll
}), union, unionAll, intersect, intersectAll, except, exceptAll;
var init_select2 = __esm(() => {
  init_entity();
  init_view_base();
  init_query_builder();
  init_query_promise();
  init_selection_proxy();
  init_sql();
  init_subquery();
  init_table();
  init_tracing();
  init_utils();
  init_utils();
  init_view_common();
  PgSelectBuilder = class PgSelectBuilder {
    static [entityKind] = "PgSelectBuilder";
    fields;
    session;
    dialect;
    withList = [];
    distinct;
    constructor(config) {
      this.fields = config.fields;
      this.session = config.session;
      this.dialect = config.dialect;
      if (config.withList) {
        this.withList = config.withList;
      }
      this.distinct = config.distinct;
    }
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    from(source) {
      const isPartialSelect = !!this.fields;
      const src = source;
      let fields;
      if (this.fields) {
        fields = this.fields;
      } else if (is(src, Subquery)) {
        fields = Object.fromEntries(Object.keys(src._.selectedFields).map((key) => [key, src[key]]));
      } else if (is(src, PgViewBase)) {
        fields = src[ViewBaseConfig].selectedFields;
      } else if (is(src, SQL)) {
        fields = {};
      } else {
        fields = getTableColumns(src);
      }
      return new PgSelectBase({
        table: src,
        fields,
        isPartialSelect,
        session: this.session,
        dialect: this.dialect,
        withList: this.withList,
        distinct: this.distinct
      }).setToken(this.authToken);
    }
  };
  PgSelectQueryBuilderBase = class PgSelectQueryBuilderBase extends TypedQueryBuilder {
    static [entityKind] = "PgSelectQueryBuilder";
    _;
    config;
    joinsNotNullableMap;
    tableName;
    isPartialSelect;
    session;
    dialect;
    constructor({ table, fields, isPartialSelect, session, dialect, withList, distinct }) {
      super();
      this.config = {
        withList,
        table,
        fields: { ...fields },
        distinct,
        setOperators: []
      };
      this.isPartialSelect = isPartialSelect;
      this.session = session;
      this.dialect = dialect;
      this._ = {
        selectedFields: fields
      };
      this.tableName = getTableLikeName(table);
      this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
    }
    createJoin(joinType) {
      return (table, on) => {
        const baseTableName = this.tableName;
        const tableName = getTableLikeName(table);
        if (typeof tableName === "string" && this.config.joins?.some((join) => join.alias === tableName)) {
          throw new Error(`Alias "${tableName}" is already used in this query`);
        }
        if (!this.isPartialSelect) {
          if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
            this.config.fields = {
              [baseTableName]: this.config.fields
            };
          }
          if (typeof tableName === "string" && !is(table, SQL)) {
            const selection = is(table, Subquery) ? table._.selectedFields : is(table, View) ? table[ViewBaseConfig].selectedFields : table[Table.Symbol.Columns];
            this.config.fields[tableName] = selection;
          }
        }
        if (typeof on === "function") {
          on = on(new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })));
        }
        if (!this.config.joins) {
          this.config.joins = [];
        }
        this.config.joins.push({ on, table, joinType, alias: tableName });
        if (typeof tableName === "string") {
          switch (joinType) {
            case "left": {
              this.joinsNotNullableMap[tableName] = false;
              break;
            }
            case "right": {
              this.joinsNotNullableMap = Object.fromEntries(Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false]));
              this.joinsNotNullableMap[tableName] = true;
              break;
            }
            case "inner": {
              this.joinsNotNullableMap[tableName] = true;
              break;
            }
            case "full": {
              this.joinsNotNullableMap = Object.fromEntries(Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false]));
              this.joinsNotNullableMap[tableName] = false;
              break;
            }
          }
        }
        return this;
      };
    }
    leftJoin = this.createJoin("left");
    rightJoin = this.createJoin("right");
    innerJoin = this.createJoin("inner");
    fullJoin = this.createJoin("full");
    createSetOperator(type, isAll) {
      return (rightSelection) => {
        const rightSelect = typeof rightSelection === "function" ? rightSelection(getPgSetOperators()) : rightSelection;
        if (!haveSameKeys(this.getSelectedFields(), rightSelect.getSelectedFields())) {
          throw new Error("Set operator error (union / intersect / except): selected fields are not the same or are in a different order");
        }
        this.config.setOperators.push({ type, isAll, rightSelect });
        return this;
      };
    }
    union = this.createSetOperator("union", false);
    unionAll = this.createSetOperator("union", true);
    intersect = this.createSetOperator("intersect", false);
    intersectAll = this.createSetOperator("intersect", true);
    except = this.createSetOperator("except", false);
    exceptAll = this.createSetOperator("except", true);
    addSetOperators(setOperators) {
      this.config.setOperators.push(...setOperators);
      return this;
    }
    where(where) {
      if (typeof where === "function") {
        where = where(new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })));
      }
      this.config.where = where;
      return this;
    }
    having(having) {
      if (typeof having === "function") {
        having = having(new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })));
      }
      this.config.having = having;
      return this;
    }
    groupBy(...columns) {
      if (typeof columns[0] === "function") {
        const groupBy = columns[0](new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })));
        this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
      } else {
        this.config.groupBy = columns;
      }
      return this;
    }
    orderBy(...columns) {
      if (typeof columns[0] === "function") {
        const orderBy = columns[0](new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })));
        const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).orderBy = orderByArray;
        } else {
          this.config.orderBy = orderByArray;
        }
      } else {
        const orderByArray = columns;
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).orderBy = orderByArray;
        } else {
          this.config.orderBy = orderByArray;
        }
      }
      return this;
    }
    limit(limit) {
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).limit = limit;
      } else {
        this.config.limit = limit;
      }
      return this;
    }
    offset(offset) {
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).offset = offset;
      } else {
        this.config.offset = offset;
      }
      return this;
    }
    for(strength, config = {}) {
      this.config.lockingClause = { strength, config };
      return this;
    }
    getSQL() {
      return this.dialect.buildSelectQuery(this.config);
    }
    toSQL() {
      const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
      return rest;
    }
    as(alias) {
      return new Proxy(new Subquery(this.getSQL(), this.config.fields, alias), new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" }));
    }
    getSelectedFields() {
      return new Proxy(this.config.fields, new SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" }));
    }
    $dynamic() {
      return this;
    }
  };
  PgSelectBase = class PgSelectBase extends PgSelectQueryBuilderBase {
    static [entityKind] = "PgSelect";
    _prepare(name) {
      const { session, config, dialect, joinsNotNullableMap, authToken } = this;
      if (!session) {
        throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
      }
      return tracer.startActiveSpan("drizzle.prepareQuery", () => {
        const fieldsList = orderSelectedFields(config.fields);
        const query = session.prepareQuery(dialect.sqlToQuery(this.getSQL()), fieldsList, name, true);
        query.joinsNotNullableMap = joinsNotNullableMap;
        return query.setToken(authToken);
      });
    }
    prepare(name) {
      return this._prepare(name);
    }
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    execute = (placeholderValues) => {
      return tracer.startActiveSpan("drizzle.operation", () => {
        return this._prepare().execute(placeholderValues, this.authToken);
      });
    };
  };
  applyMixins(PgSelectBase, [QueryPromise]);
  union = createSetOperator("union", false);
  unionAll = createSetOperator("union", true);
  intersect = createSetOperator("intersect", false);
  intersectAll = createSetOperator("intersect", true);
  except = createSetOperator("except", false);
  exceptAll = createSetOperator("except", true);
});

// node_modules/drizzle-orm/pg-core/query-builders/query-builder.js
var QueryBuilder;
var init_query_builder2 = __esm(() => {
  init_entity();
  init_dialect();
  init_selection_proxy();
  init_subquery();
  init_select2();
  QueryBuilder = class QueryBuilder {
    static [entityKind] = "PgQueryBuilder";
    dialect;
    dialectConfig;
    constructor(dialect) {
      this.dialect = is(dialect, PgDialect) ? dialect : undefined;
      this.dialectConfig = is(dialect, PgDialect) ? undefined : dialect;
    }
    $with = (alias, selection) => {
      const queryBuilder = this;
      const as = (qb) => {
        if (typeof qb === "function") {
          qb = qb(queryBuilder);
        }
        return new Proxy(new WithSubquery(qb.getSQL(), selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}), alias, true), new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" }));
      };
      return { as };
    };
    with(...queries) {
      const self = this;
      function select3(fields) {
        return new PgSelectBuilder({
          fields: fields ?? undefined,
          session: undefined,
          dialect: self.getDialect(),
          withList: queries
        });
      }
      function selectDistinct(fields) {
        return new PgSelectBuilder({
          fields: fields ?? undefined,
          session: undefined,
          dialect: self.getDialect(),
          distinct: true
        });
      }
      function selectDistinctOn(on, fields) {
        return new PgSelectBuilder({
          fields: fields ?? undefined,
          session: undefined,
          dialect: self.getDialect(),
          distinct: { on }
        });
      }
      return { select: select3, selectDistinct, selectDistinctOn };
    }
    select(fields) {
      return new PgSelectBuilder({
        fields: fields ?? undefined,
        session: undefined,
        dialect: this.getDialect()
      });
    }
    selectDistinct(fields) {
      return new PgSelectBuilder({
        fields: fields ?? undefined,
        session: undefined,
        dialect: this.getDialect(),
        distinct: true
      });
    }
    selectDistinctOn(on, fields) {
      return new PgSelectBuilder({
        fields: fields ?? undefined,
        session: undefined,
        dialect: this.getDialect(),
        distinct: { on }
      });
    }
    getDialect() {
      if (!this.dialect) {
        this.dialect = new PgDialect(this.dialectConfig);
      }
      return this.dialect;
    }
  };
});

// node_modules/drizzle-orm/pg-core/query-builders/insert.js
var PgInsertBuilder, PgInsertBase;
var init_insert = __esm(() => {
  init_entity();
  init_query_promise();
  init_selection_proxy();
  init_sql();
  init_table();
  init_tracing();
  init_utils();
  init_query_builder2();
  PgInsertBuilder = class PgInsertBuilder {
    constructor(table, session, dialect, withList, overridingSystemValue_) {
      this.table = table;
      this.session = session;
      this.dialect = dialect;
      this.withList = withList;
      this.overridingSystemValue_ = overridingSystemValue_;
    }
    static [entityKind] = "PgInsertBuilder";
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    overridingSystemValue() {
      this.overridingSystemValue_ = true;
      return this;
    }
    values(values2) {
      values2 = Array.isArray(values2) ? values2 : [values2];
      if (values2.length === 0) {
        throw new Error("values() must be called with at least one value");
      }
      const mappedValues = values2.map((entry) => {
        const result = {};
        const cols = this.table[Table.Symbol.Columns];
        for (const colKey of Object.keys(entry)) {
          const colValue = entry[colKey];
          result[colKey] = is(colValue, SQL) ? colValue : new Param(colValue, cols[colKey]);
        }
        return result;
      });
      return new PgInsertBase(this.table, mappedValues, this.session, this.dialect, this.withList, false, this.overridingSystemValue_).setToken(this.authToken);
    }
    select(selectQuery) {
      const select3 = typeof selectQuery === "function" ? selectQuery(new QueryBuilder) : selectQuery;
      if (!is(select3, SQL) && !haveSameKeys(this.table[Columns], select3._.selectedFields)) {
        throw new Error("Insert select error: selected fields are not the same or are in a different order compared to the table definition");
      }
      return new PgInsertBase(this.table, select3, this.session, this.dialect, this.withList, true);
    }
  };
  PgInsertBase = class PgInsertBase extends QueryPromise {
    constructor(table, values2, session, dialect, withList, select3, overridingSystemValue_) {
      super();
      this.session = session;
      this.dialect = dialect;
      this.config = { table, values: values2, withList, select: select3, overridingSystemValue_ };
    }
    static [entityKind] = "PgInsert";
    config;
    returning(fields = this.config.table[Table.Symbol.Columns]) {
      this.config.returningFields = fields;
      this.config.returning = orderSelectedFields(fields);
      return this;
    }
    onConflictDoNothing(config = {}) {
      if (config.target === undefined) {
        this.config.onConflict = sql`do nothing`;
      } else {
        let targetColumn = "";
        targetColumn = Array.isArray(config.target) ? config.target.map((it) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
        const whereSql = config.where ? sql` where ${config.where}` : undefined;
        this.config.onConflict = sql`(${sql.raw(targetColumn)})${whereSql} do nothing`;
      }
      return this;
    }
    onConflictDoUpdate(config) {
      if (config.where && (config.targetWhere || config.setWhere)) {
        throw new Error('You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.');
      }
      const whereSql = config.where ? sql` where ${config.where}` : undefined;
      const targetWhereSql = config.targetWhere ? sql` where ${config.targetWhere}` : undefined;
      const setWhereSql = config.setWhere ? sql` where ${config.setWhere}` : undefined;
      const setSql = this.dialect.buildUpdateSet(this.config.table, mapUpdateSet(this.config.table, config.set));
      let targetColumn = "";
      targetColumn = Array.isArray(config.target) ? config.target.map((it) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
      this.config.onConflict = sql`(${sql.raw(targetColumn)})${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`;
      return this;
    }
    getSQL() {
      return this.dialect.buildInsertQuery(this.config);
    }
    toSQL() {
      const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
      return rest;
    }
    _prepare(name) {
      return tracer.startActiveSpan("drizzle.prepareQuery", () => {
        return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true);
      });
    }
    prepare(name) {
      return this._prepare(name);
    }
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    execute = (placeholderValues) => {
      return tracer.startActiveSpan("drizzle.operation", () => {
        return this._prepare().execute(placeholderValues, this.authToken);
      });
    };
    getSelectedFields() {
      return this.config.returningFields ? new Proxy(this.config.returningFields, new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })) : undefined;
    }
    $dynamic() {
      return this;
    }
  };
});

// node_modules/drizzle-orm/pg-core/query-builders/refresh-materialized-view.js
var PgRefreshMaterializedView;
var init_refresh_materialized_view = __esm(() => {
  init_entity();
  init_query_promise();
  init_tracing();
  PgRefreshMaterializedView = class PgRefreshMaterializedView extends QueryPromise {
    constructor(view, session, dialect) {
      super();
      this.session = session;
      this.dialect = dialect;
      this.config = { view };
    }
    static [entityKind] = "PgRefreshMaterializedView";
    config;
    concurrently() {
      if (this.config.withNoData !== undefined) {
        throw new Error("Cannot use concurrently and withNoData together");
      }
      this.config.concurrently = true;
      return this;
    }
    withNoData() {
      if (this.config.concurrently !== undefined) {
        throw new Error("Cannot use concurrently and withNoData together");
      }
      this.config.withNoData = true;
      return this;
    }
    getSQL() {
      return this.dialect.buildRefreshMaterializedViewQuery(this.config);
    }
    toSQL() {
      const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
      return rest;
    }
    _prepare(name) {
      return tracer.startActiveSpan("drizzle.prepareQuery", () => {
        return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), undefined, name, true);
      });
    }
    prepare(name) {
      return this._prepare(name);
    }
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    execute = (placeholderValues) => {
      return tracer.startActiveSpan("drizzle.operation", () => {
        return this._prepare().execute(placeholderValues, this.authToken);
      });
    };
  };
});

// node_modules/drizzle-orm/pg-core/query-builders/update.js
var PgUpdateBuilder, PgUpdateBase;
var init_update = __esm(() => {
  init_entity();
  init_table2();
  init_query_promise();
  init_selection_proxy();
  init_sql();
  init_subquery();
  init_table();
  init_utils();
  init_view_common();
  PgUpdateBuilder = class PgUpdateBuilder {
    constructor(table, session, dialect, withList) {
      this.table = table;
      this.session = session;
      this.dialect = dialect;
      this.withList = withList;
    }
    static [entityKind] = "PgUpdateBuilder";
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    set(values2) {
      return new PgUpdateBase(this.table, mapUpdateSet(this.table, values2), this.session, this.dialect, this.withList).setToken(this.authToken);
    }
  };
  PgUpdateBase = class PgUpdateBase extends QueryPromise {
    constructor(table, set, session, dialect, withList) {
      super();
      this.session = session;
      this.dialect = dialect;
      this.config = { set, table, withList, joins: [] };
      this.tableName = getTableLikeName(table);
      this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
    }
    static [entityKind] = "PgUpdate";
    config;
    tableName;
    joinsNotNullableMap;
    from(source) {
      const src = source;
      const tableName = getTableLikeName(src);
      if (typeof tableName === "string") {
        this.joinsNotNullableMap[tableName] = true;
      }
      this.config.from = src;
      return this;
    }
    getTableLikeFields(table) {
      if (is(table, PgTable)) {
        return table[Table.Symbol.Columns];
      } else if (is(table, Subquery)) {
        return table._.selectedFields;
      }
      return table[ViewBaseConfig].selectedFields;
    }
    createJoin(joinType) {
      return (table, on) => {
        const tableName = getTableLikeName(table);
        if (typeof tableName === "string" && this.config.joins.some((join) => join.alias === tableName)) {
          throw new Error(`Alias "${tableName}" is already used in this query`);
        }
        if (typeof on === "function") {
          const from = this.config.from && !is(this.config.from, SQL) ? this.getTableLikeFields(this.config.from) : undefined;
          on = on(new Proxy(this.config.table[Table.Symbol.Columns], new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })), from && new Proxy(from, new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })));
        }
        this.config.joins.push({ on, table, joinType, alias: tableName });
        if (typeof tableName === "string") {
          switch (joinType) {
            case "left": {
              this.joinsNotNullableMap[tableName] = false;
              break;
            }
            case "right": {
              this.joinsNotNullableMap = Object.fromEntries(Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false]));
              this.joinsNotNullableMap[tableName] = true;
              break;
            }
            case "inner": {
              this.joinsNotNullableMap[tableName] = true;
              break;
            }
            case "full": {
              this.joinsNotNullableMap = Object.fromEntries(Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false]));
              this.joinsNotNullableMap[tableName] = false;
              break;
            }
          }
        }
        return this;
      };
    }
    leftJoin = this.createJoin("left");
    rightJoin = this.createJoin("right");
    innerJoin = this.createJoin("inner");
    fullJoin = this.createJoin("full");
    where(where) {
      this.config.where = where;
      return this;
    }
    returning(fields) {
      if (!fields) {
        fields = Object.assign({}, this.config.table[Table.Symbol.Columns]);
        if (this.config.from) {
          const tableName = getTableLikeName(this.config.from);
          if (typeof tableName === "string" && this.config.from && !is(this.config.from, SQL)) {
            const fromFields = this.getTableLikeFields(this.config.from);
            fields[tableName] = fromFields;
          }
          for (const join of this.config.joins) {
            const tableName2 = getTableLikeName(join.table);
            if (typeof tableName2 === "string" && !is(join.table, SQL)) {
              const fromFields = this.getTableLikeFields(join.table);
              fields[tableName2] = fromFields;
            }
          }
        }
      }
      this.config.returningFields = fields;
      this.config.returning = orderSelectedFields(fields);
      return this;
    }
    getSQL() {
      return this.dialect.buildUpdateQuery(this.config);
    }
    toSQL() {
      const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
      return rest;
    }
    _prepare(name) {
      const query = this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true);
      query.joinsNotNullableMap = this.joinsNotNullableMap;
      return query;
    }
    prepare(name) {
      return this._prepare(name);
    }
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    execute = (placeholderValues) => {
      return this._prepare().execute(placeholderValues, this.authToken);
    };
    getSelectedFields() {
      return this.config.returningFields ? new Proxy(this.config.returningFields, new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })) : undefined;
    }
    $dynamic() {
      return this;
    }
  };
});

// node_modules/drizzle-orm/pg-core/query-builders/index.js
var init_query_builders = __esm(() => {
  init_delete();
  init_insert();
  init_query_builder2();
  init_refresh_materialized_view();
  init_select2();
  init_update();
});

// node_modules/drizzle-orm/pg-core/query-builders/count.js
var PgCountBuilder;
var init_count = __esm(() => {
  init_entity();
  init_sql();
  PgCountBuilder = class PgCountBuilder extends SQL {
    constructor(params) {
      super(PgCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);
      this.params = params;
      this.mapWith(Number);
      this.session = params.session;
      this.sql = PgCountBuilder.buildCount(params.source, params.filters);
    }
    sql;
    token;
    static [entityKind] = "PgCountBuilder";
    [Symbol.toStringTag] = "PgCountBuilder";
    session;
    static buildEmbeddedCount(source, filters) {
      return sql`(select count(*) from ${source}${sql.raw(" where ").if(filters)}${filters})`;
    }
    static buildCount(source, filters) {
      return sql`select count(*) as count from ${source}${sql.raw(" where ").if(filters)}${filters};`;
    }
    setToken(token) {
      this.token = token;
      return this;
    }
    then(onfulfilled, onrejected) {
      return Promise.resolve(this.session.count(this.sql, this.token)).then(onfulfilled, onrejected);
    }
    catch(onRejected) {
      return this.then(undefined, onRejected);
    }
    finally(onFinally) {
      return this.then((value) => {
        onFinally?.();
        return value;
      }, (reason) => {
        onFinally?.();
        throw reason;
      });
    }
  };
});

// node_modules/drizzle-orm/pg-core/query-builders/query.js
var RelationalQueryBuilder, PgRelationalQuery;
var init_query2 = __esm(() => {
  init_entity();
  init_query_promise();
  init_relations();
  init_tracing();
  RelationalQueryBuilder = class RelationalQueryBuilder {
    constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session) {
      this.fullSchema = fullSchema;
      this.schema = schema;
      this.tableNamesMap = tableNamesMap;
      this.table = table;
      this.tableConfig = tableConfig;
      this.dialect = dialect;
      this.session = session;
    }
    static [entityKind] = "PgRelationalQueryBuilder";
    findMany(config) {
      return new PgRelationalQuery(this.fullSchema, this.schema, this.tableNamesMap, this.table, this.tableConfig, this.dialect, this.session, config ? config : {}, "many");
    }
    findFirst(config) {
      return new PgRelationalQuery(this.fullSchema, this.schema, this.tableNamesMap, this.table, this.tableConfig, this.dialect, this.session, config ? { ...config, limit: 1 } : { limit: 1 }, "first");
    }
  };
  PgRelationalQuery = class PgRelationalQuery extends QueryPromise {
    constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session, config, mode) {
      super();
      this.fullSchema = fullSchema;
      this.schema = schema;
      this.tableNamesMap = tableNamesMap;
      this.table = table;
      this.tableConfig = tableConfig;
      this.dialect = dialect;
      this.session = session;
      this.config = config;
      this.mode = mode;
    }
    static [entityKind] = "PgRelationalQuery";
    _prepare(name) {
      return tracer.startActiveSpan("drizzle.prepareQuery", () => {
        const { query, builtQuery } = this._toSQL();
        return this.session.prepareQuery(builtQuery, undefined, name, true, (rawRows, mapColumnValue) => {
          const rows = rawRows.map((row) => mapRelationalRow(this.schema, this.tableConfig, row, query.selection, mapColumnValue));
          if (this.mode === "first") {
            return rows[0];
          }
          return rows;
        });
      });
    }
    prepare(name) {
      return this._prepare(name);
    }
    _getQuery() {
      return this.dialect.buildRelationalQueryWithoutPK({
        fullSchema: this.fullSchema,
        schema: this.schema,
        tableNamesMap: this.tableNamesMap,
        table: this.table,
        tableConfig: this.tableConfig,
        queryConfig: this.config,
        tableAlias: this.tableConfig.tsName
      });
    }
    getSQL() {
      return this._getQuery().sql;
    }
    _toSQL() {
      const query = this._getQuery();
      const builtQuery = this.dialect.sqlToQuery(query.sql);
      return { query, builtQuery };
    }
    toSQL() {
      return this._toSQL().builtQuery;
    }
    authToken;
    setToken(token) {
      this.authToken = token;
      return this;
    }
    execute() {
      return tracer.startActiveSpan("drizzle.operation", () => {
        return this._prepare().execute(undefined, this.authToken);
      });
    }
  };
});

// node_modules/drizzle-orm/pg-core/query-builders/raw.js
var PgRaw;
var init_raw = __esm(() => {
  init_entity();
  init_query_promise();
  PgRaw = class PgRaw extends QueryPromise {
    constructor(execute, sql3, query, mapBatchResult) {
      super();
      this.execute = execute;
      this.sql = sql3;
      this.query = query;
      this.mapBatchResult = mapBatchResult;
    }
    static [entityKind] = "PgRaw";
    getSQL() {
      return this.sql;
    }
    getQuery() {
      return this.query;
    }
    mapResult(result, isFromBatch) {
      return isFromBatch ? this.mapBatchResult(result) : result;
    }
    _prepare() {
      return this;
    }
    isResponseInArrayMode() {
      return false;
    }
  };
});

// node_modules/drizzle-orm/pg-core/db.js
var PgDatabase;
var init_db = __esm(() => {
  init_entity();
  init_query_builders();
  init_selection_proxy();
  init_sql();
  init_subquery();
  init_count();
  init_query2();
  init_raw();
  init_refresh_materialized_view();
  PgDatabase = class PgDatabase {
    constructor(dialect, session, schema) {
      this.dialect = dialect;
      this.session = session;
      this._ = schema ? {
        schema: schema.schema,
        fullSchema: schema.fullSchema,
        tableNamesMap: schema.tableNamesMap,
        session
      } : {
        schema: undefined,
        fullSchema: {},
        tableNamesMap: {},
        session
      };
      this.query = {};
      if (this._.schema) {
        for (const [tableName, columns] of Object.entries(this._.schema)) {
          this.query[tableName] = new RelationalQueryBuilder(schema.fullSchema, this._.schema, this._.tableNamesMap, schema.fullSchema[tableName], columns, dialect, session);
        }
      }
    }
    static [entityKind] = "PgDatabase";
    query;
    $with = (alias, selection) => {
      const self = this;
      const as = (qb) => {
        if (typeof qb === "function") {
          qb = qb(new QueryBuilder(self.dialect));
        }
        return new Proxy(new WithSubquery(qb.getSQL(), selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}), alias, true), new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" }));
      };
      return { as };
    };
    $count(source, filters) {
      return new PgCountBuilder({ source, filters, session: this.session });
    }
    with(...queries) {
      const self = this;
      function select4(fields) {
        return new PgSelectBuilder({
          fields: fields ?? undefined,
          session: self.session,
          dialect: self.dialect,
          withList: queries
        });
      }
      function selectDistinct(fields) {
        return new PgSelectBuilder({
          fields: fields ?? undefined,
          session: self.session,
          dialect: self.dialect,
          withList: queries,
          distinct: true
        });
      }
      function selectDistinctOn(on, fields) {
        return new PgSelectBuilder({
          fields: fields ?? undefined,
          session: self.session,
          dialect: self.dialect,
          withList: queries,
          distinct: { on }
        });
      }
      function update2(table) {
        return new PgUpdateBuilder(table, self.session, self.dialect, queries);
      }
      function insert2(table) {
        return new PgInsertBuilder(table, self.session, self.dialect, queries);
      }
      function delete_(table) {
        return new PgDeleteBase(table, self.session, self.dialect, queries);
      }
      return { select: select4, selectDistinct, selectDistinctOn, update: update2, insert: insert2, delete: delete_ };
    }
    select(fields) {
      return new PgSelectBuilder({
        fields: fields ?? undefined,
        session: this.session,
        dialect: this.dialect
      });
    }
    selectDistinct(fields) {
      return new PgSelectBuilder({
        fields: fields ?? undefined,
        session: this.session,
        dialect: this.dialect,
        distinct: true
      });
    }
    selectDistinctOn(on, fields) {
      return new PgSelectBuilder({
        fields: fields ?? undefined,
        session: this.session,
        dialect: this.dialect,
        distinct: { on }
      });
    }
    update(table) {
      return new PgUpdateBuilder(table, this.session, this.dialect);
    }
    insert(table) {
      return new PgInsertBuilder(table, this.session, this.dialect);
    }
    delete(table) {
      return new PgDeleteBase(table, this.session, this.dialect);
    }
    refreshMaterializedView(view) {
      return new PgRefreshMaterializedView(view, this.session, this.dialect);
    }
    authToken;
    execute(query) {
      const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
      const builtQuery = this.dialect.sqlToQuery(sequel);
      const prepared = this.session.prepareQuery(builtQuery, undefined, undefined, false);
      return new PgRaw(() => prepared.execute(undefined, this.authToken), sequel, builtQuery, (result) => prepared.mapResult(result, true));
    }
    transaction(transaction, config) {
      return this.session.transaction(transaction, config);
    }
  };
});

// node_modules/drizzle-orm/pg-core/alias.js
var init_alias2 = () => {
};

// node_modules/drizzle-orm/pg-core/checks.js
var init_checks = () => {
};

// node_modules/drizzle-orm/pg-core/indexes.js
function index(name) {
  return new IndexBuilderOn(false, name);
}
var IndexBuilderOn, IndexBuilder, Index;
var init_indexes = __esm(() => {
  init_sql();
  init_entity();
  init_columns();
  IndexBuilderOn = class IndexBuilderOn {
    constructor(unique, name) {
      this.unique = unique;
      this.name = name;
    }
    static [entityKind] = "PgIndexBuilderOn";
    on(...columns) {
      return new IndexBuilder(columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
        return clonedIndexedColumn;
      }), this.unique, false, this.name);
    }
    onOnly(...columns) {
      return new IndexBuilder(columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = it.defaultConfig;
        return clonedIndexedColumn;
      }), this.unique, true, this.name);
    }
    using(method, ...columns) {
      return new IndexBuilder(columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
        return clonedIndexedColumn;
      }), this.unique, true, this.name, method);
    }
  };
  IndexBuilder = class IndexBuilder {
    static [entityKind] = "PgIndexBuilder";
    config;
    constructor(columns, unique, only, name, method = "btree") {
      this.config = {
        name,
        columns,
        unique,
        only,
        method
      };
    }
    concurrently() {
      this.config.concurrently = true;
      return this;
    }
    with(obj) {
      this.config.with = obj;
      return this;
    }
    where(condition) {
      this.config.where = condition;
      return this;
    }
    build(table) {
      return new Index(this.config, table);
    }
  };
  Index = class Index {
    static [entityKind] = "PgIndex";
    config;
    constructor(config, table) {
      this.config = { ...config, table };
    }
  };
});

// node_modules/drizzle-orm/pg-core/policies.js
var init_policies = () => {
};

// node_modules/drizzle-orm/pg-core/roles.js
var init_roles = () => {
};

// node_modules/drizzle-orm/pg-core/sequence.js
var init_sequence = () => {
};

// node_modules/drizzle-orm/pg-core/view-common.js
var PgViewConfig;
var init_view_common2 = __esm(() => {
  PgViewConfig = Symbol.for("drizzle:PgViewConfig");
});

// node_modules/drizzle-orm/pg-core/view.js
var PgMaterializedViewConfig;
var init_view = __esm(() => {
  PgMaterializedViewConfig = Symbol.for("drizzle:PgMaterializedViewConfig");
});

// node_modules/drizzle-orm/pg-core/schema.js
var init_schema = () => {
};

// node_modules/drizzle-orm/pg-core/session.js
var PgPreparedQuery, PgSession, PgTransaction;
var init_session = __esm(() => {
  init_entity();
  init_errors2();
  init_sql2();
  init_tracing();
  init_db();
  PgPreparedQuery = class PgPreparedQuery {
    constructor(query) {
      this.query = query;
    }
    authToken;
    getQuery() {
      return this.query;
    }
    mapResult(response, _isFromBatch) {
      return response;
    }
    setToken(token) {
      this.authToken = token;
      return this;
    }
    static [entityKind] = "PgPreparedQuery";
    joinsNotNullableMap;
  };
  PgSession = class PgSession {
    constructor(dialect) {
      this.dialect = dialect;
    }
    static [entityKind] = "PgSession";
    execute(query, token) {
      return tracer.startActiveSpan("drizzle.operation", () => {
        const prepared = tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.prepareQuery(this.dialect.sqlToQuery(query), undefined, undefined, false);
        });
        return prepared.setToken(token).execute(undefined, token);
      });
    }
    all(query) {
      return this.prepareQuery(this.dialect.sqlToQuery(query), undefined, undefined, false).all();
    }
    async count(sql22, token) {
      const res = await this.execute(sql22, token);
      return Number(res[0]["count"]);
    }
  };
  PgTransaction = class PgTransaction extends PgDatabase {
    constructor(dialect, session, schema, nestedIndex = 0) {
      super(dialect, session, schema);
      this.schema = schema;
      this.nestedIndex = nestedIndex;
    }
    static [entityKind] = "PgTransaction";
    rollback() {
      throw new TransactionRollbackError;
    }
    getTransactionConfigSQL(config) {
      const chunks = [];
      if (config.isolationLevel) {
        chunks.push(`isolation level ${config.isolationLevel}`);
      }
      if (config.accessMode) {
        chunks.push(config.accessMode);
      }
      if (typeof config.deferrable === "boolean") {
        chunks.push(config.deferrable ? "deferrable" : "not deferrable");
      }
      return sql.raw(chunks.join(" "));
    }
    setTransaction(config) {
      return this.session.execute(sql`set transaction ${this.getTransactionConfigSQL(config)}`);
    }
  };
});

// node_modules/drizzle-orm/pg-core/utils.js
var init_utils3 = () => {
};

// node_modules/drizzle-orm/pg-core/utils/index.js
var init_utils4 = __esm(() => {
  init_array();
});

// node_modules/drizzle-orm/pg-core/index.js
var init_pg_core = __esm(() => {
  init_alias2();
  init_checks();
  init_columns();
  init_db();
  init_dialect();
  init_foreign_keys();
  init_indexes();
  init_policies();
  init_primary_keys();
  init_query_builders();
  init_roles();
  init_schema();
  init_sequence();
  init_session();
  init_table2();
  init_unique_constraint();
  init_utils3();
  init_utils4();
  init_view_common2();
  init_view();
});

// node_modules/drizzle-orm/postgres-js/session.js
var PostgresJsPreparedQuery, PostgresJsSession, PostgresJsTransaction;
var init_session2 = __esm(() => {
  init_entity();
  init_logger();
  init_pg_core();
  init_session();
  init_sql();
  init_tracing();
  init_utils();
  PostgresJsPreparedQuery = class PostgresJsPreparedQuery extends PgPreparedQuery {
    constructor(client, queryString, params, logger2, fields, _isResponseInArrayMode, customResultMapper) {
      super({ sql: queryString, params });
      this.client = client;
      this.queryString = queryString;
      this.params = params;
      this.logger = logger2;
      this.fields = fields;
      this._isResponseInArrayMode = _isResponseInArrayMode;
      this.customResultMapper = customResultMapper;
    }
    static [entityKind] = "PostgresJsPreparedQuery";
    async execute(placeholderValues = {}) {
      return tracer.startActiveSpan("drizzle.execute", async (span) => {
        const params = fillPlaceholders(this.params, placeholderValues);
        span?.setAttributes({
          "drizzle.query.text": this.queryString,
          "drizzle.query.params": JSON.stringify(params)
        });
        this.logger.logQuery(this.queryString, params);
        const { fields, queryString: query, client, joinsNotNullableMap, customResultMapper } = this;
        if (!fields && !customResultMapper) {
          return tracer.startActiveSpan("drizzle.driver.execute", () => {
            return client.unsafe(query, params);
          });
        }
        const rows = await tracer.startActiveSpan("drizzle.driver.execute", () => {
          span?.setAttributes({
            "drizzle.query.text": query,
            "drizzle.query.params": JSON.stringify(params)
          });
          return client.unsafe(query, params).values();
        });
        return tracer.startActiveSpan("drizzle.mapResponse", () => {
          return customResultMapper ? customResultMapper(rows) : rows.map((row) => mapResultRow(fields, row, joinsNotNullableMap));
        });
      });
    }
    all(placeholderValues = {}) {
      return tracer.startActiveSpan("drizzle.execute", async (span) => {
        const params = fillPlaceholders(this.params, placeholderValues);
        span?.setAttributes({
          "drizzle.query.text": this.queryString,
          "drizzle.query.params": JSON.stringify(params)
        });
        this.logger.logQuery(this.queryString, params);
        return tracer.startActiveSpan("drizzle.driver.execute", () => {
          span?.setAttributes({
            "drizzle.query.text": this.queryString,
            "drizzle.query.params": JSON.stringify(params)
          });
          return this.client.unsafe(this.queryString, params);
        });
      });
    }
    isResponseInArrayMode() {
      return this._isResponseInArrayMode;
    }
  };
  PostgresJsSession = class PostgresJsSession extends PgSession {
    constructor(client, dialect2, schema2, options = {}) {
      super(dialect2);
      this.client = client;
      this.schema = schema2;
      this.options = options;
      this.logger = options.logger ?? new NoopLogger;
    }
    static [entityKind] = "PostgresJsSession";
    logger;
    prepareQuery(query, fields, name, isResponseInArrayMode, customResultMapper) {
      return new PostgresJsPreparedQuery(this.client, query.sql, query.params, this.logger, fields, isResponseInArrayMode, customResultMapper);
    }
    query(query, params) {
      this.logger.logQuery(query, params);
      return this.client.unsafe(query, params).values();
    }
    queryObjects(query, params) {
      return this.client.unsafe(query, params);
    }
    transaction(transaction, config) {
      return this.client.begin(async (client) => {
        const session2 = new PostgresJsSession(client, this.dialect, this.schema, this.options);
        const tx = new PostgresJsTransaction(this.dialect, session2, this.schema);
        if (config) {
          await tx.setTransaction(config);
        }
        return transaction(tx);
      });
    }
  };
  PostgresJsTransaction = class PostgresJsTransaction extends PgTransaction {
    constructor(dialect2, session2, schema2, nestedIndex = 0) {
      super(dialect2, session2, schema2, nestedIndex);
      this.session = session2;
    }
    static [entityKind] = "PostgresJsTransaction";
    transaction(transaction) {
      return this.session.client.savepoint((client) => {
        const session2 = new PostgresJsSession(client, this.dialect, this.schema, this.session.options);
        const tx = new PostgresJsTransaction(this.dialect, session2, this.schema);
        return transaction(tx);
      });
    }
  };
});

// node_modules/drizzle-orm/postgres-js/driver.js
function construct(client, config = {}) {
  const transparentParser = (val) => val;
  for (const type of ["1184", "1082", "1083", "1114", "1182", "1185", "1115", "1231"]) {
    client.options.parsers[type] = transparentParser;
    client.options.serializers[type] = transparentParser;
  }
  client.options.serializers["114"] = transparentParser;
  client.options.serializers["3802"] = transparentParser;
  const dialect2 = new PgDialect({ casing: config.casing });
  let logger2;
  if (config.logger === true) {
    logger2 = new DefaultLogger;
  } else if (config.logger !== false) {
    logger2 = config.logger;
  }
  let schema2;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(config.schema, createTableRelationsHelpers);
    schema2 = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap
    };
  }
  const session2 = new PostgresJsSession(client, dialect2, schema2, { logger: logger2 });
  const db2 = new PostgresJsDatabase(dialect2, session2, schema2);
  db2.$client = client;
  return db2;
}
function drizzle(...params) {
  if (typeof params[0] === "string") {
    const instance = src_default(params[0]);
    return construct(instance, params[1]);
  }
  if (isConfig(params[0])) {
    const { connection: connection2, client, ...drizzleConfig } = params[0];
    if (client)
      return construct(client, drizzleConfig);
    if (typeof connection2 === "object" && connection2.url !== undefined) {
      const { url, ...config } = connection2;
      const instance2 = src_default(url, config);
      return construct(instance2, drizzleConfig);
    }
    const instance = src_default(connection2);
    return construct(instance, drizzleConfig);
  }
  return construct(params[0], params[1]);
}
var PostgresJsDatabase;
var init_driver = __esm(() => {
  init_src();
  init_entity();
  init_logger();
  init_db();
  init_dialect();
  init_relations();
  init_utils();
  init_session2();
  PostgresJsDatabase = class PostgresJsDatabase extends PgDatabase {
    static [entityKind] = "PostgresJsDatabase";
  };
  ((drizzle2) => {
    function mock(config) {
      return construct({
        options: {
          parsers: {},
          serializers: {}
        }
      }, config);
    }
    drizzle2.mock = mock;
  })(drizzle || (drizzle = {}));
});

// node_modules/drizzle-orm/postgres-js/index.js
var init_postgres_js = __esm(() => {
  init_driver();
  init_session2();
});

// node_modules/drizzle-orm/migrator.js
import crypto6 from "node:crypto";
import fs2 from "node:fs";
function readMigrationFiles(config) {
  const migrationFolderTo = config.migrationsFolder;
  const migrationQueries = [];
  const journalPath = `${migrationFolderTo}/meta/_journal.json`;
  if (!fs2.existsSync(journalPath)) {
    throw new Error(`Can't find meta/_journal.json file`);
  }
  const journalAsString = fs2.readFileSync(`${migrationFolderTo}/meta/_journal.json`).toString();
  const journal = JSON.parse(journalAsString);
  for (const journalEntry of journal.entries) {
    const migrationPath = `${migrationFolderTo}/${journalEntry.tag}.sql`;
    try {
      const query = fs2.readFileSync(`${migrationFolderTo}/${journalEntry.tag}.sql`).toString();
      const result = query.split("--> statement-breakpoint").map((it) => {
        return it;
      });
      migrationQueries.push({
        sql: result,
        bps: journalEntry.breakpoints,
        folderMillis: journalEntry.when,
        hash: crypto6.createHash("sha256").update(query).digest("hex")
      });
    } catch {
      throw new Error(`No file ${migrationPath} found in ${migrationFolderTo} folder`);
    }
  }
  return migrationQueries;
}
var init_migrator = () => {
};

// node_modules/drizzle-orm/postgres-js/migrator.js
async function migrate(db2, config) {
  const migrations = readMigrationFiles(config);
  await db2.dialect.migrate(migrations, db2.session, config);
}
var init_migrator2 = __esm(() => {
  init_migrator();
});

// src/db/index.prod.ts
var exports_index_prod = {};
__export(exports_index_prod, {
  migrate: () => migrate2,
  getDb: () => getDb
});
var getDb = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  const queryClient = src_default(process.env.DATABASE_URL);
  return drizzle({ client: queryClient });
}, migrate2 = async () => {
  const db2 = await getDb();
  await migrate(db2, { migrationsFolder: "./migrations" });
};
var init_index_prod = __esm(() => {
  init_postgres_js();
  init_src();
  init_migrator2();
});

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== undefined) {
    if (Array.isArray(form[key])) {
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    form[key] = value;
  }
};
var handleParsingNestedValues = (form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1;i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1;j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    if (!patternCache[label]) {
      if (match[2]) {
        patternCache[label] = [label, match[1], new RegExp("^" + match[2] + "$")];
      } else {
        patternCache[label] = [label, match[1], true];
      }
    }
    return patternCache[label];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", 8);
  let i = start;
  for (;i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? undefined : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (...paths) => {
  let p = "";
  let endsWithSlash = false;
  for (let path of paths) {
    if (p.at(-1) === "/") {
      p = p.slice(0, -1);
      endsWithSlash = true;
    }
    if (path[0] !== "/") {
      path = `/${path}`;
    }
    if (path === "/" && endsWithSlash) {
      p = `${p}/`;
    } else if (path !== "/") {
      p = `${p}${path}`;
    }
    if (path === "/" && p === "") {
      p = "/";
    }
  }
  return p;
};
var checkOptionalParameter = (path) => {
  if (!path.match(/\:.+\?$/)) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? decodeURIComponent_(value) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? undefined : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? undefined : nextKeyIndex : valueIndex);
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? undefined : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param ? /\%/.test(param) ? tryDecodeURIComponent(param) : param : undefined;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name.toLowerCase()) ?? undefined;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw[key]();
  };
  json() {
    return this.#cachedBody("json");
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setHeaders = (headers, map = {}) => {
  for (const key of Object.keys(map)) {
    headers.set(key, map[key]);
  }
  return headers;
};
var Context = class {
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status = 200;
  #executionCtx;
  #headers;
  #preparedHeaders;
  #res;
  #isFresh = true;
  #layout;
  #renderer;
  #notFoundHandler;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    this.#isFresh = false;
    return this.#res ||= new Response("404 Not Found", { status: 404 });
  }
  set res(_res) {
    this.#isFresh = false;
    if (this.#res && _res) {
      try {
        for (const [k, v] of this.#res.headers.entries()) {
          if (k === "content-type") {
            continue;
          }
          if (k === "set-cookie") {
            const cookies = this.#res.headers.getSetCookie();
            _res.headers.delete("set-cookie");
            for (const cookie of cookies) {
              _res.headers.append("set-cookie", cookie);
            }
          } else {
            _res.headers.set(k, v);
          }
        }
      } catch (e) {
        if (e instanceof TypeError && e.message.includes("immutable")) {
          this.res = new Response(_res.body, {
            headers: _res.headers,
            status: _res.status
          });
          return;
        } else {
          throw e;
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  setLayout = (layout) => this.#layout = layout;
  getLayout = () => this.#layout;
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  header = (name, value, options) => {
    if (value === undefined) {
      if (this.#headers) {
        this.#headers.delete(name);
      } else if (this.#preparedHeaders) {
        delete this.#preparedHeaders[name.toLocaleLowerCase()];
      }
      if (this.finalized) {
        this.res.headers.delete(name);
      }
      return;
    }
    if (options?.append) {
      if (!this.#headers) {
        this.#isFresh = false;
        this.#headers = new Headers(this.#preparedHeaders);
        this.#preparedHeaders = {};
      }
      this.#headers.append(name, value);
    } else {
      if (this.#headers) {
        this.#headers.set(name, value);
      } else {
        this.#preparedHeaders ??= {};
        this.#preparedHeaders[name.toLowerCase()] = value;
      }
    }
    if (this.finalized) {
      if (options?.append) {
        this.res.headers.append(name, value);
      } else {
        this.res.headers.set(name, value);
      }
    }
  };
  status = (status) => {
    this.#isFresh = false;
    this.#status = status;
  };
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map;
    this.#var.set(key, value);
  };
  get = (key) => {
    return this.#var ? this.#var.get(key) : undefined;
  };
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    if (this.#isFresh && !headers && !arg && this.#status === 200) {
      return new Response(data, {
        headers: this.#preparedHeaders
      });
    }
    if (arg && typeof arg !== "number") {
      const header = new Headers(arg.headers);
      if (this.#headers) {
        this.#headers.forEach((v, k) => {
          if (k === "set-cookie") {
            header.append(k, v);
          } else {
            header.set(k, v);
          }
        });
      }
      const headers2 = setHeaders(header, this.#preparedHeaders);
      return new Response(data, {
        headers: headers2,
        status: arg.status ?? this.#status
      });
    }
    const status = typeof arg === "number" ? arg : this.#status;
    this.#preparedHeaders ??= {};
    this.#headers ??= new Headers;
    setHeaders(this.#headers, this.#preparedHeaders);
    if (this.#res) {
      this.#res.headers.forEach((v, k) => {
        if (k === "set-cookie") {
          this.#headers?.append(k, v);
        } else {
          this.#headers?.set(k, v);
        }
      });
      setHeaders(this.#headers, this.#preparedHeaders);
    }
    headers ??= {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") {
        this.#headers.set(k, v);
      } else {
        this.#headers.delete(k);
        for (const v2 of v) {
          this.#headers.append(k, v2);
        }
      }
    }
    return new Response(data, {
      status,
      headers: this.#headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  body = (data, arg, headers) => {
    return typeof arg === "number" ? this.#newResponse(data, arg, headers) : this.#newResponse(data, arg);
  };
  text = (text, arg, headers) => {
    if (!this.#preparedHeaders) {
      if (this.#isFresh && !headers && !arg) {
        return new Response(text);
      }
      this.#preparedHeaders = {};
    }
    this.#preparedHeaders["content-type"] = TEXT_PLAIN;
    if (typeof arg === "number") {
      return this.#newResponse(text, arg, headers);
    }
    return this.#newResponse(text, arg);
  };
  json = (object, arg, headers) => {
    const body = JSON.stringify(object);
    this.#preparedHeaders ??= {};
    this.#preparedHeaders["content-type"] = "application/json";
    return typeof arg === "number" ? this.#newResponse(body, arg, headers) : this.#newResponse(body, arg);
  };
  html = (html, arg, headers) => {
    this.#preparedHeaders ??= {};
    this.#preparedHeaders["content-type"] = "text/html; charset=UTF-8";
    if (typeof html === "object") {
      return resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then((html2) => {
        return typeof arg === "number" ? this.#newResponse(html2, arg, headers) : this.#newResponse(html2, arg);
      });
    }
    return typeof arg === "number" ? this.#newResponse(html, arg, headers) : this.#newResponse(html, arg);
  };
  redirect = (location, status) => {
    this.#headers ??= new Headers;
    this.#headers.set("Location", String(location));
    return this.newResponse(null, status ?? 302);
  };
  notFound = () => {
    this.#notFoundHandler ??= () => new Response;
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    const isContext = context instanceof Context;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        if (isContext) {
          context.req.routeIndex = i;
        }
      } else {
        handler = i === middleware.length && next || undefined;
      }
      if (!handler) {
        if (isContext && context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      } else {
        try {
          res = await handler(context, () => {
            return dispatch(i + 1);
          });
        } catch (err) {
          if (err instanceof Error && isContext && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    return err.getResponse();
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const strict = options.strict ?? true;
    delete options.strict;
    Object.assign(this, options);
    this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app) {
    const subApp = this.basePath(path);
    app.routes.map((r) => {
      let handler;
      if (app.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = undefined;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, undefined, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== undefined) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some((k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR)) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node;
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some((k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR)) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node;
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node;
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0;; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1;i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1;j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== undefined) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== undefined) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(path === "*" ? "" : `^${path.replace(/\/\*$|([.\\+*[^\]$()])/g, (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)")}$`);
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie;
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map((route) => [!/\*|\/:/.test(route[0]), ...route]).sort(([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length);
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length;i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (;paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length;i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length;j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length;k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach((p) => re.test(p) && routes[m][p].push([handler, paramCount]));
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length;i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.#buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  #buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = undefined;
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]]));
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (;i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length;i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = undefined;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length;i < len; i++) {
      const p = parts[i];
      if (Object.keys(curNode.#children).includes(p)) {
        curNode = curNode.#children[p];
        const pattern2 = getPattern(p);
        if (pattern2) {
          possibleKeys.push(pattern2[1]);
        }
        continue;
      }
      curNode.#children[p] = new Node2;
      const pattern = getPattern(p);
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[p];
    }
    const m = /* @__PURE__ */ Object.create(null);
    const handlerSet = {
      handler,
      possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
      score: this.#order
    };
    m[method] = handlerSet;
    curNode.#methods.push(m);
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length;i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== undefined) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length;i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    for (let i = 0, len = parts.length;i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length;j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(...this.#getHandlerSets(nextNode.#children["*"], method, node.#params));
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length;k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              tempNodes.push(astNode);
            }
            continue;
          }
          if (part === "") {
            continue;
          }
          const [key, name, matcher] = pattern;
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp && matcher.test(restPathString)) {
            params[name] = restPathString;
            handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
            continue;
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(...this.#getHandlerSets(child.#children["*"], method, params, node.#params));
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2;
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length;i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter, new TrieRouter]
    });
  }
};

// node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process: process2, Deno } = globalThis;
  const isNoColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : process2 !== undefined ? "NO_COLOR" in process2?.env : false;
  return !isNoColor;
}

// node_modules/hono/dist/middleware/logger/index.js
var humanize = (times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
};
var time = (start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1000 ? delta + "ms" : Math.round(delta / 1000) + "s"]);
};
var colorStatus = (status) => {
  const colorEnabled = getColorEnabled();
  if (colorEnabled) {
    switch (status / 100 | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
};
function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${colorStatus(status)} ${elapsed}`;
  fn(out);
}
var logger = (fn = console.log) => {
  return async function logger2(c, next) {
    const { method } = c.req;
    const path = getPath(c.req.raw);
    log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    log(fn, "-->", method, path, c.res.status, time(start));
  };
};

// node_modules/hono/dist/adapter/bun/serve-static.js
import { stat } from "node:fs/promises";

// node_modules/hono/dist/utils/compress.js
var COMPRESSIBLE_CONTENT_TYPE_REGEX = /^\s*(?:text\/(?!event-stream(?:[;\s]|$))[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;

// node_modules/hono/dist/utils/filepath.js
var getFilePath = (options) => {
  let filename = options.filename;
  const defaultDocument = options.defaultDocument || "index.html";
  if (filename.endsWith("/")) {
    filename = filename.concat(defaultDocument);
  } else if (!filename.match(/\.[a-zA-Z0-9_-]+$/)) {
    filename = filename.concat("/" + defaultDocument);
  }
  const path = getFilePathWithoutDefaultDocument({
    root: options.root,
    filename
  });
  return path;
};
var getFilePathWithoutDefaultDocument = (options) => {
  let root = options.root || "";
  let filename = options.filename;
  if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
    return;
  }
  filename = filename.replace(/^\.?[\/\\]/, "");
  filename = filename.replace(/\\/, "/");
  root = root.replace(/\/$/, "");
  let path = root ? root + "/" + filename : filename;
  path = path.replace(/^\.?\//, "");
  if (root[0] !== "/" && path[0] === "/") {
    return;
  }
  return path;
};

// node_modules/hono/dist/utils/mime.js
var getMimeType = (filename, mimes = baseMimes) => {
  const regexp = /\.([a-zA-Z0-9]+?)$/;
  const match = filename.match(regexp);
  if (!match) {
    return;
  }
  let mimeType = mimes[match[1]];
  if (mimeType && mimeType.startsWith("text")) {
    mimeType += "; charset=utf-8";
  }
  return mimeType;
};
var _baseMimes = {
  aac: "audio/aac",
  avi: "video/x-msvideo",
  avif: "image/avif",
  av1: "video/av1",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  css: "text/css",
  csv: "text/csv",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gif: "image/gif",
  gz: "application/gzip",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  ics: "text/calendar",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsonld: "application/ld+json",
  map: "application/json",
  mid: "audio/x-midi",
  midi: "audio/x-midi",
  mjs: "text/javascript",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  pdf: "application/pdf",
  png: "image/png",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain",
  wasm: "application/wasm",
  webm: "video/webm",
  weba: "audio/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  xml: "application/xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  gltf: "model/gltf+json",
  glb: "model/gltf-binary"
};
var baseMimes = _baseMimes;

// node_modules/hono/dist/middleware/serve-static/index.js
var ENCODINGS = {
  br: ".br",
  zstd: ".zst",
  gzip: ".gz"
};
var ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS);
var DEFAULT_DOCUMENT = "index.html";
var defaultPathResolve = (path) => path;
var serveStatic = (options) => {
  let isAbsoluteRoot = false;
  let root;
  if (options.root) {
    if (options.root.startsWith("/")) {
      isAbsoluteRoot = true;
      root = new URL(`file://${options.root}`).pathname;
    } else {
      root = options.root;
    }
  }
  return async (c, next) => {
    if (c.finalized) {
      await next();
      return;
    }
    let filename = options.path ?? decodeURI(c.req.path);
    filename = options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename;
    if (!filename.endsWith("/") && options.isDir) {
      const path2 = getFilePathWithoutDefaultDocument({
        filename,
        root
      });
      if (path2 && await options.isDir(path2)) {
        filename += "/";
      }
    }
    let path = getFilePath({
      filename,
      root,
      defaultDocument: DEFAULT_DOCUMENT
    });
    if (!path) {
      return await next();
    }
    if (isAbsoluteRoot) {
      path = "/" + path;
    }
    const getContent = options.getContent;
    const pathResolve = options.pathResolve ?? defaultPathResolve;
    path = pathResolve(path);
    let content = await getContent(path, c);
    if (!content) {
      let pathWithoutDefaultDocument = getFilePathWithoutDefaultDocument({
        filename,
        root
      });
      if (!pathWithoutDefaultDocument) {
        return await next();
      }
      pathWithoutDefaultDocument = pathResolve(pathWithoutDefaultDocument);
      if (pathWithoutDefaultDocument !== path) {
        content = await getContent(pathWithoutDefaultDocument, c);
        if (content) {
          path = pathWithoutDefaultDocument;
        }
      }
    }
    if (content instanceof Response) {
      return c.newResponse(content.body, content);
    }
    if (content) {
      const mimeType = options.mimes && getMimeType(path, options.mimes) || getMimeType(path);
      c.header("Content-Type", mimeType || "application/octet-stream");
      if (options.precompressed && (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))) {
        const acceptEncodingSet = new Set(c.req.header("Accept-Encoding")?.split(",").map((encoding) => encoding.trim()));
        for (const encoding of ENCODINGS_ORDERED_KEYS) {
          if (!acceptEncodingSet.has(encoding)) {
            continue;
          }
          const compressedContent = await getContent(path + ENCODINGS[encoding], c);
          if (compressedContent) {
            content = compressedContent;
            c.header("Content-Encoding", encoding);
            c.header("Vary", "Accept-Encoding", { append: true });
            break;
          }
        }
      }
      await options.onFound?.(path, c);
      return c.body(content);
    }
    await options.onNotFound?.(path, c);
    await next();
    return;
  };
};

// node_modules/hono/dist/adapter/bun/serve-static.js
var serveStatic2 = (options) => {
  return async function serveStatic2(c, next) {
    const getContent = async (path) => {
      path = path.startsWith("/") ? path : `./${path}`;
      const file = Bun.file(path);
      return await file.exists() ? file : null;
    };
    const pathResolve = (path) => {
      return path.startsWith("/") ? path : `./${path}`;
    };
    const isDir = async (path) => {
      let isDir2;
      try {
        const stats = await stat(path);
        isDir2 = stats.isDirectory();
      } catch {
      }
      return isDir2;
    };
    return serveStatic({
      ...options,
      getContent,
      pathResolve,
      isDir
    })(c, next);
  };
};

// node_modules/hono/dist/helper/ssg/middleware.js
var X_HONO_DISABLE_SSG_HEADER_KEY = "x-hono-disable-ssg";
var SSG_DISABLED_RESPONSE = (() => {
  try {
    return new Response("SSG is disabled", {
      status: 404,
      headers: { [X_HONO_DISABLE_SSG_HEADER_KEY]: "true" }
    });
  } catch {
    return null;
  }
})();
// node_modules/hono/dist/adapter/bun/ssg.js
var { write } = Bun;

// node_modules/hono/dist/helper/websocket/index.js
var WSContext = class {
  #init;
  constructor(init) {
    this.#init = init;
    this.raw = init.raw;
    this.url = init.url ? new URL(init.url) : null;
    this.protocol = init.protocol ?? null;
  }
  send(source, options) {
    this.#init.send(source, options ?? {});
  }
  raw;
  binaryType = "arraybuffer";
  get readyState() {
    return this.#init.readyState;
  }
  url;
  protocol;
  close(code, reason) {
    this.#init.close(code, reason);
  }
};

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = (cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = decodeURIComponent_(cookieValue);
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
};
var _serialize = (name, value, opt = {}) => {
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 34560000) {
      throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 34560000000) {
      throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.priority) {
    cookie += `; Priority=${opt.priority}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
};
var serialize = (name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
};

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
};
var setCookie = (c, name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = serialize("__Secure-" + name, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = serialize("__Host-" + name, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: undefined
    });
  } else {
    cookie = serialize(name, value, { path: "/", ...opt });
  }
  c.header("Set-Cookie", cookie, { append: true });
};
var deleteCookie = (c, name, opt) => {
  const deletedCookie = getCookie(c, name);
  setCookie(c, name, "", { ...opt, maxAge: 0 });
  return deletedCookie;
};

// node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  res;
  status;
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  getResponse() {
    if (this.res) {
      const newResponse = new Response(this.res.body, {
        status: this.status,
        headers: this.res.headers
      });
      return newResponse;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType
    }
  });
  return response.formData();
};

// node_modules/hono/dist/validator/validator.js
var jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/;
var urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
var validator = (target, validationFunc) => {
  return async (c, next) => {
    let value = {};
    const contentType = c.req.header("Content-Type");
    switch (target) {
      case "json":
        if (!contentType || !jsonRegex.test(contentType)) {
          break;
        }
        try {
          value = await c.req.json();
        } catch {
          const message = "Malformed JSON in request body";
          throw new HTTPException(400, { message });
        }
        break;
      case "form": {
        if (!contentType || !(multipartRegex.test(contentType) || urlencodedRegex.test(contentType))) {
          break;
        }
        let formData;
        if (c.req.bodyCache.formData) {
          formData = await c.req.bodyCache.formData;
        } else {
          try {
            const arrayBuffer = await c.req.arrayBuffer();
            formData = await bufferToFormData(arrayBuffer, contentType);
            c.req.bodyCache.formData = formData;
          } catch (e) {
            let message = "Malformed FormData request.";
            message += e instanceof Error ? ` ${e.message}` : ` ${String(e)}`;
            throw new HTTPException(400, { message });
          }
        }
        const form = {};
        formData.forEach((value2, key) => {
          if (key.endsWith("[]")) {
            (form[key] ??= []).push(value2);
          } else if (Array.isArray(form[key])) {
            form[key].push(value2);
          } else if (key in form) {
            form[key] = [form[key], value2];
          } else {
            form[key] = value2;
          }
        });
        value = form;
        break;
      }
      case "query":
        value = Object.fromEntries(Object.entries(c.req.queries()).map(([k, v]) => {
          return v.length === 1 ? [k, v[0]] : [k, v];
        }));
        break;
      case "param":
        value = c.req.param();
        break;
      case "header":
        value = c.req.header();
        break;
      case "cookie":
        value = getCookie(c);
        break;
    }
    const res = await validationFunc(value, c);
    if (res instanceof Response) {
      return res;
    }
    c.req.addValidatedData(target, res);
    await next();
  };
};

// node_modules/zod/lib/index.mjs
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error;
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};

class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === errorMap ? undefined : errorMap
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}

class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === undefined ? undefined : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;

class ParseInputLazyPath {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== undefined ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== undefined ? message : required_error) !== null && _a !== undefined ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== undefined ? message : invalid_type_error) !== null && _b !== undefined ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus,
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === undefined ? undefined : params.async) !== null && _a !== undefined ? _a : false,
        contextualErrorMap: params === null || params === undefined ? undefined : params.errorMap
      },
      path: (params === null || params === undefined ? undefined : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err === null || err === undefined ? undefined : err.message) === null || _a === undefined ? undefined : _a.toLowerCase()) === null || _b === undefined ? undefined : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === undefined ? undefined : params.errorMap,
        async: true
      },
      path: (params === null || params === undefined ? undefined : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
  if (args.precision) {
    regex = `${regex}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    regex = `${regex}(\\.\\d+)?`;
  }
  return regex;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if (!decoded.typ || !decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch (_a) {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}

class ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === undefined ? undefined : options.precision) === "undefined" ? null : options === null || options === undefined ? undefined : options.precision,
      offset: (_a = options === null || options === undefined ? undefined : options.offset) !== null && _a !== undefined ? _a : false,
      local: (_b = options === null || options === undefined ? undefined : options.local) !== null && _b !== undefined ? _b : false,
      ...errorUtil.errToObj(options === null || options === undefined ? undefined : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === undefined ? undefined : options.precision) === "undefined" ? null : options === null || options === undefined ? undefined : options.precision,
      ...errorUtil.errToObj(options === null || options === undefined ? undefined : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === undefined ? undefined : options.position,
      ...errorUtil.errToObj(options === null || options === undefined ? undefined : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === undefined ? undefined : params.coerce) !== null && _a !== undefined ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}

class ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
}
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === undefined ? undefined : params.coerce) || false,
    ...processCreateParams(params)
  });
};

class ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch (_a) {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === undefined ? undefined : params.coerce) !== null && _a !== undefined ? _a : false,
    ...processCreateParams(params)
  });
};

class ZodBoolean extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === undefined ? undefined : params.coerce) || false,
    ...processCreateParams(params)
  });
};

class ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
}
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === undefined ? undefined : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};

class ZodSymbol extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};

class ZodUndefined extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};

class ZodNull extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};

class ZodAny extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};

class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};

class ZodNever extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
}
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};

class ZodVoid extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};

class ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : undefined,
          maximum: tooBig ? def.exactLength.value : undefined,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}

class ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip")
        ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== undefined ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === undefined ? undefined : _b.call(_a, issue, ctx).message) !== null && _c !== undefined ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== undefined ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  extend(augmentation) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  merge(merging) {
    const merged = new ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  catchall(index) {
    return new ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
}
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};

class ZodUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = undefined;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [undefined];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [undefined, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};

class ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create(discriminator, options, params) {
    const optionsMap = new Map;
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}

class ZodIntersection extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
}
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};

class ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple({
      ...this._def,
      rest
    });
  }
}
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};

class ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
}

class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = new Map;
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = new Map;
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
}
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};

class ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = new Set;
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};

class ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
}

class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};

class ZodLiteral extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}

class ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, undefined);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
}
_ZodEnum_cache = new WeakMap;
ZodEnum.create = createZodEnum;

class ZodNativeEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, undefined);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
}
_ZodNativeEnum_cache = new WeakMap;
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};

class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
}
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};

class ZodEffects extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
}
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};

class ZodOptional extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(undefined);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};

class ZodNullable extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};

class ZodDefault extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};

class ZodCatch extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};

class ZodNaN extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
}
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");

class ZodBranded extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}

class ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}

class ZodReadonly extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function custom(check, params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      if (!check(data)) {
        const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
        const _fatal = (_b = (_a = p.fatal) !== null && _a !== undefined ? _a : fatal) !== null && _b !== undefined ? _b : true;
        const p2 = typeof p === "string" ? { message: p } : p;
        ctx.addIssue({ code: "custom", ...p2, fatal: _fatal });
      }
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  enum: enumType,
  function: functionType,
  instanceof: instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  null: nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  undefined: undefinedType,
  union: unionType,
  unknown: unknownType,
  void: voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});

// node_modules/@hono/zod-validator/dist/index.js
var zValidator = (target, schema, hook) => validator(target, async (value, c) => {
  let validatorValue = value;
  if (target === "header" && schema instanceof ZodObject) {
    const schemaKeys = Object.keys(schema.shape);
    const caseInsensitiveKeymap = Object.fromEntries(schemaKeys.map((key) => [key.toLowerCase(), key]));
    validatorValue = Object.fromEntries(Object.entries(value).map(([key, value2]) => [caseInsensitiveKeymap[key] || key, value2]));
  }
  const result = await schema.safeParseAsync(validatorValue);
  if (hook) {
    const hookResult = await hook({ data: validatorValue, ...result, target }, c);
    if (hookResult) {
      if (hookResult instanceof Response) {
        return hookResult;
      }
      if ("response" in hookResult) {
        return hookResult.response;
      }
    }
  }
  if (!result.success) {
    return c.json(result, 400);
  }
  return result.data;
});

// node_modules/hono/dist/helper/factory/index.js
var createMiddleware = (middleware) => middleware;

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/runtime.js
var __extends = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __assign = function() {
  __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length;i < n; i++) {
      s = arguments[i];
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var __values = function(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m)
    return m.call(o);
  if (o && typeof o.length === "number")
    return {
      next: function() {
        if (o && i >= o.length)
          o = undefined;
        return { value: o && o[i++], done: !o };
      }
    };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === undefined || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
};
var __spreadArray = function(to, from, pack) {
  if (pack || arguments.length === 2)
    for (var i = 0, l = from.length, ar;i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar)
          ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var BASE_PATH = "https://app.kinde.com".replace(/\/+$/, "");
var Configuration = function() {
  function Configuration2(configuration) {
    if (configuration === undefined) {
      configuration = {};
    }
    this.configuration = configuration;
  }
  Object.defineProperty(Configuration2.prototype, "config", {
    set: function(configuration) {
      this.configuration = configuration;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "basePath", {
    get: function() {
      return this.configuration.basePath != null ? this.configuration.basePath : BASE_PATH;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "fetchApi", {
    get: function() {
      return this.configuration.fetchApi;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "middleware", {
    get: function() {
      return this.configuration.middleware || [];
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "queryParamsStringify", {
    get: function() {
      return this.configuration.queryParamsStringify || querystring;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "username", {
    get: function() {
      return this.configuration.username;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "password", {
    get: function() {
      return this.configuration.password;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "apiKey", {
    get: function() {
      var apiKey = this.configuration.apiKey;
      if (apiKey) {
        return typeof apiKey === "function" ? apiKey : function() {
          return apiKey;
        };
      }
      return;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "accessToken", {
    get: function() {
      var _this = this;
      var accessToken = this.configuration.accessToken;
      if (accessToken) {
        return typeof accessToken === "function" ? accessToken : function() {
          return __awaiter(_this, undefined, undefined, function() {
            return __generator(this, function(_a) {
              return [2, accessToken];
            });
          });
        };
      }
      return;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "headers", {
    get: function() {
      return this.configuration.headers;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Configuration2.prototype, "credentials", {
    get: function() {
      return this.configuration.credentials;
    },
    enumerable: false,
    configurable: true
  });
  return Configuration2;
}();
var DefaultConfig = new Configuration;
var BaseAPI = function() {
  function BaseAPI2(configuration) {
    if (configuration === undefined) {
      configuration = DefaultConfig;
    }
    var _this = this;
    this.configuration = configuration;
    this.fetchApi = function(url, init) {
      return __awaiter(_this, undefined, undefined, function() {
        var fetchParams, _a, _b, middleware, e_1_1, response, e_2, _c, _d, middleware, e_3_1, _e, _f, middleware, e_4_1;
        var e_1, _g, e_3, _h, e_4, _j;
        return __generator(this, function(_k) {
          switch (_k.label) {
            case 0:
              fetchParams = { url, init };
              _k.label = 1;
            case 1:
              _k.trys.push([1, 6, 7, 8]);
              _a = __values(this.middleware), _b = _a.next();
              _k.label = 2;
            case 2:
              if (!!_b.done)
                return [3, 5];
              middleware = _b.value;
              if (!middleware.pre)
                return [3, 4];
              return [4, middleware.pre(__assign({ fetch: this.fetchApi }, fetchParams))];
            case 3:
              fetchParams = _k.sent() || fetchParams;
              _k.label = 4;
            case 4:
              _b = _a.next();
              return [3, 2];
            case 5:
              return [3, 8];
            case 6:
              e_1_1 = _k.sent();
              e_1 = { error: e_1_1 };
              return [3, 8];
            case 7:
              try {
                if (_b && !_b.done && (_g = _a.return))
                  _g.call(_a);
              } finally {
                if (e_1)
                  throw e_1.error;
              }
              return [7];
            case 8:
              response = undefined;
              _k.label = 9;
            case 9:
              _k.trys.push([9, 11, , 20]);
              return [4, (this.configuration.fetchApi || fetch)(fetchParams.url, fetchParams.init)];
            case 10:
              response = _k.sent();
              return [3, 20];
            case 11:
              e_2 = _k.sent();
              _k.label = 12;
            case 12:
              _k.trys.push([12, 17, 18, 19]);
              _c = __values(this.middleware), _d = _c.next();
              _k.label = 13;
            case 13:
              if (!!_d.done)
                return [3, 16];
              middleware = _d.value;
              if (!middleware.onError)
                return [3, 15];
              return [4, middleware.onError({
                fetch: this.fetchApi,
                url: fetchParams.url,
                init: fetchParams.init,
                error: e_2,
                response: response ? response.clone() : undefined
              })];
            case 14:
              response = _k.sent() || response;
              _k.label = 15;
            case 15:
              _d = _c.next();
              return [3, 13];
            case 16:
              return [3, 19];
            case 17:
              e_3_1 = _k.sent();
              e_3 = { error: e_3_1 };
              return [3, 19];
            case 18:
              try {
                if (_d && !_d.done && (_h = _c.return))
                  _h.call(_c);
              } finally {
                if (e_3)
                  throw e_3.error;
              }
              return [7];
            case 19:
              if (response === undefined) {
                if (e_2 instanceof Error) {
                  throw new FetchError(e_2, "The request failed and the interceptors did not return an alternative response");
                } else {
                  throw e_2;
                }
              }
              return [3, 20];
            case 20:
              _k.trys.push([20, 25, 26, 27]);
              _e = __values(this.middleware), _f = _e.next();
              _k.label = 21;
            case 21:
              if (!!_f.done)
                return [3, 24];
              middleware = _f.value;
              if (!middleware.post)
                return [3, 23];
              return [4, middleware.post({
                fetch: this.fetchApi,
                url: fetchParams.url,
                init: fetchParams.init,
                response: response.clone()
              })];
            case 22:
              response = _k.sent() || response;
              _k.label = 23;
            case 23:
              _f = _e.next();
              return [3, 21];
            case 24:
              return [3, 27];
            case 25:
              e_4_1 = _k.sent();
              e_4 = { error: e_4_1 };
              return [3, 27];
            case 26:
              try {
                if (_f && !_f.done && (_j = _e.return))
                  _j.call(_e);
              } finally {
                if (e_4)
                  throw e_4.error;
              }
              return [7];
            case 27:
              return [2, response];
          }
        });
      });
    };
    this.middleware = configuration.middleware;
  }
  BaseAPI2.prototype.withMiddleware = function() {
    var _a;
    var middlewares = [];
    for (var _i = 0;_i < arguments.length; _i++) {
      middlewares[_i] = arguments[_i];
    }
    var next = this.clone();
    next.middleware = (_a = next.middleware).concat.apply(_a, __spreadArray([], __read(middlewares), false));
    return next;
  };
  BaseAPI2.prototype.withPreMiddleware = function() {
    var preMiddlewares = [];
    for (var _i = 0;_i < arguments.length; _i++) {
      preMiddlewares[_i] = arguments[_i];
    }
    var middlewares = preMiddlewares.map(function(pre) {
      return { pre };
    });
    return this.withMiddleware.apply(this, __spreadArray([], __read(middlewares), false));
  };
  BaseAPI2.prototype.withPostMiddleware = function() {
    var postMiddlewares = [];
    for (var _i = 0;_i < arguments.length; _i++) {
      postMiddlewares[_i] = arguments[_i];
    }
    var middlewares = postMiddlewares.map(function(post) {
      return { post };
    });
    return this.withMiddleware.apply(this, __spreadArray([], __read(middlewares), false));
  };
  BaseAPI2.prototype.isJsonMime = function(mime) {
    if (!mime) {
      return false;
    }
    return BaseAPI2.jsonRegex.test(mime);
  };
  BaseAPI2.prototype.request = function(context, initOverrides) {
    return __awaiter(this, undefined, undefined, function() {
      var url, init, response;
      var _a;
      return __generator(this, function(_b) {
        switch (_b.label) {
          case 0:
            return [4, this.createFetchParams(context, initOverrides)];
          case 1:
            url = (_a = _b.sent(), _a.url), init = _a.init;
            return [4, this.fetchApi(url, init)];
          case 2:
            response = _b.sent();
            if (response && (response.status >= 200 && response.status < 300)) {
              return [2, response];
            }
            throw new ResponseError(response, "Response returned an error code");
        }
      });
    });
  };
  BaseAPI2.prototype.createFetchParams = function(context, initOverrides) {
    return __awaiter(this, undefined, undefined, function() {
      var url, headers, initOverrideFn, initParams, overriddenInit, _a, body, init;
      var _this = this;
      return __generator(this, function(_b) {
        switch (_b.label) {
          case 0:
            url = this.configuration.basePath + context.path;
            if (context.query !== undefined && Object.keys(context.query).length !== 0) {
              url += "?" + this.configuration.queryParamsStringify(context.query);
            }
            headers = Object.assign({}, this.configuration.headers, context.headers);
            Object.keys(headers).forEach(function(key) {
              return headers[key] === undefined ? delete headers[key] : {};
            });
            initOverrideFn = typeof initOverrides === "function" ? initOverrides : function() {
              return __awaiter(_this, undefined, undefined, function() {
                return __generator(this, function(_a2) {
                  return [2, initOverrides];
                });
              });
            };
            initParams = {
              method: context.method,
              headers,
              body: context.body,
              credentials: this.configuration.credentials
            };
            _a = [__assign({}, initParams)];
            return [4, initOverrideFn({
              init: initParams,
              context
            })];
          case 1:
            overriddenInit = __assign.apply(undefined, _a.concat([_b.sent()]));
            if (isFormData(overriddenInit.body) || overriddenInit.body instanceof URLSearchParams || isBlob(overriddenInit.body)) {
              body = overriddenInit.body;
            } else if (this.isJsonMime(headers["Content-Type"])) {
              body = JSON.stringify(overriddenInit.body);
            } else {
              body = overriddenInit.body;
            }
            init = __assign(__assign({}, overriddenInit), { body });
            return [2, { url, init }];
        }
      });
    });
  };
  BaseAPI2.prototype.clone = function() {
    var constructor = this.constructor;
    var next = new constructor(this.configuration);
    next.middleware = this.middleware.slice();
    return next;
  };
  BaseAPI2.jsonRegex = new RegExp("^(:?application/json|[^;/ \t]+/[^;/ \t]+[+]json)[ \t]*(:?;.*)?$", "i");
  return BaseAPI2;
}();
function isBlob(value) {
  return typeof Blob !== "undefined" && value instanceof Blob;
}
function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}
var ResponseError = function(_super) {
  __extends(ResponseError2, _super);
  function ResponseError2(response, msg) {
    var _this = _super.call(this, msg) || this;
    _this.response = response;
    _this.name = "ResponseError";
    return _this;
  }
  return ResponseError2;
}(Error);
var FetchError = function(_super) {
  __extends(FetchError2, _super);
  function FetchError2(cause, msg) {
    var _this = _super.call(this, msg) || this;
    _this.cause = cause;
    _this.name = "FetchError";
    return _this;
  }
  return FetchError2;
}(Error);
var RequiredError = function(_super) {
  __extends(RequiredError2, _super);
  function RequiredError2(field, msg) {
    var _this = _super.call(this, msg) || this;
    _this.field = field;
    _this.name = "RequiredError";
    return _this;
  }
  return RequiredError2;
}(Error);
function exists(json, key) {
  var value = json[key];
  return value !== null && value !== undefined;
}
function querystring(params, prefix) {
  if (prefix === undefined) {
    prefix = "";
  }
  return Object.keys(params).map(function(key) {
    return querystringSingleKey(key, params[key], prefix);
  }).filter(function(part) {
    return part.length > 0;
  }).join("&");
}
function querystringSingleKey(key, value, keyPrefix) {
  if (keyPrefix === undefined) {
    keyPrefix = "";
  }
  var fullKey = keyPrefix + (keyPrefix.length ? "[".concat(key, "]") : key);
  if (value instanceof Array) {
    var multiValue = value.map(function(singleValue) {
      return encodeURIComponent(String(singleValue));
    }).join("&".concat(encodeURIComponent(fullKey), "="));
    return "".concat(encodeURIComponent(fullKey), "=").concat(multiValue);
  }
  if (value instanceof Set) {
    var valueAsArray = Array.from(value);
    return querystringSingleKey(key, valueAsArray, keyPrefix);
  }
  if (value instanceof Date) {
    return "".concat(encodeURIComponent(fullKey), "=").concat(encodeURIComponent(value.toISOString()));
  }
  if (value instanceof Object) {
    return querystring(value, fullKey);
  }
  return "".concat(encodeURIComponent(fullKey), "=").concat(encodeURIComponent(String(value)));
}
function mapValues(data, fn) {
  return Object.keys(data).reduce(function(acc, key) {
    var _a;
    return __assign(__assign({}, acc), (_a = {}, _a[key] = fn(data[key]), _a));
  }, {});
}
function canConsumeForm(consumes) {
  var e_5, _a;
  try {
    for (var consumes_1 = __values(consumes), consumes_1_1 = consumes_1.next();!consumes_1_1.done; consumes_1_1 = consumes_1.next()) {
      var consume = consumes_1_1.value;
      if (consume.contentType === "multipart/form-data") {
        return true;
      }
    }
  } catch (e_5_1) {
    e_5 = { error: e_5_1 };
  } finally {
    try {
      if (consumes_1_1 && !consumes_1_1.done && (_a = consumes_1.return))
        _a.call(consumes_1);
    } finally {
      if (e_5)
        throw e_5.error;
    }
  }
  return false;
}
var JSONApiResponse = function() {
  function JSONApiResponse2(raw2, transformer) {
    if (transformer === undefined) {
      transformer = function(jsonValue) {
        return jsonValue;
      };
    }
    this.raw = raw2;
    this.transformer = transformer;
  }
  JSONApiResponse2.prototype.value = function() {
    return __awaiter(this, undefined, undefined, function() {
      var _a;
      return __generator(this, function(_b) {
        switch (_b.label) {
          case 0:
            _a = this.transformer;
            return [4, this.raw.json()];
          case 1:
            return [2, _a.apply(this, [_b.sent()])];
        }
      });
    });
  };
  return JSONApiResponse2;
}();
var VoidApiResponse = function() {
  function VoidApiResponse2(raw2) {
    this.raw = raw2;
  }
  VoidApiResponse2.prototype.value = function() {
    return __awaiter(this, undefined, undefined, function() {
      return __generator(this, function(_a) {
        return [2, undefined];
      });
    });
  };
  return VoidApiResponse2;
}();
var BlobApiResponse = function() {
  function BlobApiResponse2(raw2) {
    this.raw = raw2;
  }
  BlobApiResponse2.prototype.value = function() {
    return __awaiter(this, undefined, undefined, function() {
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.raw.blob()];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  return BlobApiResponse2;
}();
var TextApiResponse = function() {
  function TextApiResponse2(raw2) {
    this.raw = raw2;
  }
  TextApiResponse2.prototype.value = function() {
    return __awaiter(this, undefined, undefined, function() {
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.raw.text()];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  return TextApiResponse2;
}();

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/AddAPIsRequest.js
function AddAPIsRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    audience: value.audience
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/AddOrganizationUsersRequestUsersInner.js
function AddOrganizationUsersRequestUsersInnerToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    id: value.id,
    roles: value.roles,
    permissions: value.permissions
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/AddOrganizationUsersRequest.js
function AddOrganizationUsersRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    users: value.users === undefined ? undefined : value.users.map(AddOrganizationUsersRequestUsersInnerToJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/AddOrganizationUsersResponse.js
function AddOrganizationUsersResponseFromJSON(json) {
  return AddOrganizationUsersResponseFromJSONTyped(json, false);
}
function AddOrganizationUsersResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    usersAdded: !exists(json, "users_added") ? undefined : json["users_added"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/ApiApplicationsInner.js
function ApiApplicationsInnerFromJSON(json) {
  return ApiApplicationsInnerFromJSONTyped(json, false);
}
function ApiApplicationsInnerFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    name: !exists(json, "name") ? undefined : json["name"],
    type: !exists(json, "type") ? undefined : json["type"],
    isActive: !exists(json, "is_active") ? undefined : json["is_active"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Api.js
function ApiFromJSON(json) {
  return ApiFromJSONTyped(json, false);
}
function ApiFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    code: !exists(json, "code") ? undefined : json["code"],
    name: !exists(json, "name") ? undefined : json["name"],
    message: !exists(json, "message") ? undefined : json["message"],
    audience: !exists(json, "audience") ? undefined : json["audience"],
    applications: !exists(json, "applications") ? undefined : json["applications"].map(ApiApplicationsInnerFromJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Apis.js
function ApisFromJSON(json) {
  return ApisFromJSONTyped(json, false);
}
function ApisFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    name: !exists(json, "name") ? undefined : json["name"],
    audience: !exists(json, "audience") ? undefined : json["audience"],
    isManagementApi: !exists(json, "is_management_api") ? undefined : json["is_management_api"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Applications.js
function ApplicationsFromJSON(json) {
  return ApplicationsFromJSONTyped(json, false);
}
function ApplicationsFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    name: !exists(json, "name") ? undefined : json["name"],
    type: !exists(json, "type") ? undefined : json["type"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Category.js
function CategoryFromJSON(json) {
  return CategoryFromJSONTyped(json, false);
}
function CategoryFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    name: !exists(json, "name") ? undefined : json["name"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/ConnectedAppsAccessToken.js
function ConnectedAppsAccessTokenFromJSON(json) {
  return ConnectedAppsAccessTokenFromJSONTyped(json, false);
}
function ConnectedAppsAccessTokenFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    accessToken: !exists(json, "access_token") ? undefined : json["access_token"],
    accessTokenExpiry: !exists(json, "access_token_expiry") ? undefined : json["access_token_expiry"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/ConnectedAppsAuthUrl.js
function ConnectedAppsAuthUrlFromJSON(json) {
  return ConnectedAppsAuthUrlFromJSONTyped(json, false);
}
function ConnectedAppsAuthUrlFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    url: !exists(json, "url") ? undefined : json["url"],
    sessionId: !exists(json, "session_id") ? undefined : json["session_id"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateApplicationRequest.js
function CreateApplicationRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    type: value.type
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateApplicationResponseApplication.js
function CreateApplicationResponseApplicationFromJSON(json) {
  return CreateApplicationResponseApplicationFromJSONTyped(json, false);
}
function CreateApplicationResponseApplicationFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    clientId: !exists(json, "client_id") ? undefined : json["client_id"],
    clientSecret: !exists(json, "client_secret") ? undefined : json["client_secret"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateApplicationResponse.js
function CreateApplicationResponseFromJSON(json) {
  return CreateApplicationResponseFromJSONTyped(json, false);
}
function CreateApplicationResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    application: !exists(json, "application") ? undefined : CreateApplicationResponseApplicationFromJSON(json["application"])
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateCategoryRequest.js
function CreateCategoryRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    context: value.context
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateCategoryResponseCategory.js
function CreateCategoryResponseCategoryFromJSON(json) {
  return CreateCategoryResponseCategoryFromJSONTyped(json, false);
}
function CreateCategoryResponseCategoryFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateCategoryResponse.js
function CreateCategoryResponseFromJSON(json) {
  return CreateCategoryResponseFromJSONTyped(json, false);
}
function CreateCategoryResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    message: !exists(json, "message") ? undefined : json["message"],
    code: !exists(json, "code") ? undefined : json["code"],
    category: !exists(json, "category") ? undefined : CreateCategoryResponseCategoryFromJSON(json["category"])
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateFeatureFlagRequest.js
function CreateFeatureFlagRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    description: value.description,
    key: value.key,
    type: value.type,
    allow_override_level: value.allowOverrideLevel,
    default_value: value.defaultValue
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateOrganizationRequest.js
function CreateOrganizationRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    feature_flags: value.featureFlags,
    external_id: value.externalId,
    background_color: value.backgroundColor,
    button_color: value.buttonColor,
    button_text_color: value.buttonTextColor,
    link_color: value.linkColor,
    background_color_dark: value.backgroundColorDark,
    button_color_dark: value.buttonColorDark,
    button_text_color_dark: value.buttonTextColorDark,
    link_color_dark: value.linkColorDark,
    theme_code: value.themeCode,
    handle: value.handle,
    is_allow_registrations: value.isAllowRegistrations
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateOrganizationResponseOrganization.js
function CreateOrganizationResponseOrganizationFromJSON(json) {
  return CreateOrganizationResponseOrganizationFromJSONTyped(json, false);
}
function CreateOrganizationResponseOrganizationFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateOrganizationResponse.js
function CreateOrganizationResponseFromJSON(json) {
  return CreateOrganizationResponseFromJSONTyped(json, false);
}
function CreateOrganizationResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    message: !exists(json, "message") ? undefined : json["message"],
    code: !exists(json, "code") ? undefined : json["code"],
    organization: !exists(json, "organization") ? undefined : CreateOrganizationResponseOrganizationFromJSON(json["organization"])
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateOrganizationUserPermissionRequest.js
function CreateOrganizationUserPermissionRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    permission_id: value.permissionId
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateOrganizationUserRoleRequest.js
function CreateOrganizationUserRoleRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    role_id: value.roleId
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreatePermissionRequest.js
function CreatePermissionRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    description: value.description,
    key: value.key
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreatePropertyRequest.js
function CreatePropertyRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    description: value.description,
    key: value.key,
    type: value.type,
    context: value.context,
    is_private: value.isPrivate,
    category_id: value.categoryId
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreatePropertyResponseProperty.js
function CreatePropertyResponsePropertyFromJSON(json) {
  return CreatePropertyResponsePropertyFromJSONTyped(json, false);
}
function CreatePropertyResponsePropertyFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreatePropertyResponse.js
function CreatePropertyResponseFromJSON(json) {
  return CreatePropertyResponseFromJSONTyped(json, false);
}
function CreatePropertyResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    message: !exists(json, "message") ? undefined : json["message"],
    code: !exists(json, "code") ? undefined : json["code"],
    property: !exists(json, "property") ? undefined : CreatePropertyResponsePropertyFromJSON(json["property"])
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateRoleRequest.js
function CreateRoleRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    description: value.description,
    key: value.key,
    is_default_role: value.isDefaultRole
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateSubscriberSuccessResponseSubscriber.js
function CreateSubscriberSuccessResponseSubscriberFromJSON(json) {
  return CreateSubscriberSuccessResponseSubscriberFromJSONTyped(json, false);
}
function CreateSubscriberSuccessResponseSubscriberFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    subscriberId: !exists(json, "subscriber_id") ? undefined : json["subscriber_id"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateSubscriberSuccessResponse.js
function CreateSubscriberSuccessResponseFromJSON(json) {
  return CreateSubscriberSuccessResponseFromJSONTyped(json, false);
}
function CreateSubscriberSuccessResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    subscriber: !exists(json, "subscriber") ? undefined : CreateSubscriberSuccessResponseSubscriberFromJSON(json["subscriber"])
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateUserRequestIdentitiesInnerDetails.js
function CreateUserRequestIdentitiesInnerDetailsToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    email: value.email,
    phone: value.phone,
    username: value.username
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateUserRequestIdentitiesInner.js
function CreateUserRequestIdentitiesInnerToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    type: value.type,
    details: CreateUserRequestIdentitiesInnerDetailsToJSON(value.details)
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateUserRequestProfile.js
function CreateUserRequestProfileToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    given_name: value.givenName,
    family_name: value.familyName
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateUserRequest.js
function CreateUserRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    profile: CreateUserRequestProfileToJSON(value.profile),
    organization_code: value.organizationCode,
    identities: value.identities === undefined ? undefined : value.identities.map(CreateUserRequestIdentitiesInnerToJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UserIdentityResult.js
function UserIdentityResultFromJSON(json) {
  return UserIdentityResultFromJSONTyped(json, false);
}
function UserIdentityResultFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    created: !exists(json, "created") ? undefined : json["created"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UserIdentity.js
function UserIdentityFromJSON(json) {
  return UserIdentityFromJSONTyped(json, false);
}
function UserIdentityFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    type: !exists(json, "type") ? undefined : json["type"],
    result: !exists(json, "result") ? undefined : UserIdentityResultFromJSON(json["result"])
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/CreateUserResponse.js
function CreateUserResponseFromJSON(json) {
  return CreateUserResponseFromJSONTyped(json, false);
}
function CreateUserResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    created: !exists(json, "created") ? undefined : json["created"],
    identities: !exists(json, "identities") ? undefined : json["identities"].map(UserIdentityFromJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetApplicationResponseApplication.js
function GetApplicationResponseApplicationFromJSON(json) {
  return GetApplicationResponseApplicationFromJSONTyped(json, false);
}
function GetApplicationResponseApplicationFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    name: !exists(json, "name") ? undefined : json["name"],
    type: !exists(json, "type") ? undefined : json["type"],
    clientId: !exists(json, "client_id") ? undefined : json["client_id"],
    clientSecret: !exists(json, "client_secret") ? undefined : json["client_secret"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetApplicationResponse.js
function GetApplicationResponseFromJSON(json) {
  return GetApplicationResponseFromJSONTyped(json, false);
}
function GetApplicationResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    application: !exists(json, "application") ? undefined : GetApplicationResponseApplicationFromJSON(json["application"])
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetApplicationsResponse.js
function GetApplicationsResponseFromJSON(json) {
  return GetApplicationsResponseFromJSONTyped(json, false);
}
function GetApplicationsResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    applications: !exists(json, "applications") ? undefined : json["applications"].map(ApplicationsFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetCategoriesResponse.js
function GetCategoriesResponseFromJSON(json) {
  return GetCategoriesResponseFromJSONTyped(json, false);
}
function GetCategoriesResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    categories: !exists(json, "categories") ? undefined : json["categories"].map(CategoryFromJSON),
    hasMore: !exists(json, "has_more") ? undefined : json["has_more"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetOrganizationFeatureFlagsResponseFeatureFlagsValue.js
function GetOrganizationFeatureFlagsResponseFeatureFlagsValueFromJSON(json) {
  return GetOrganizationFeatureFlagsResponseFeatureFlagsValueFromJSONTyped(json, false);
}
function GetOrganizationFeatureFlagsResponseFeatureFlagsValueFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    type: !exists(json, "type") ? undefined : json["type"],
    value: !exists(json, "value") ? undefined : json["value"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetEnvironmentFeatureFlagsResponse.js
function GetEnvironmentFeatureFlagsResponseFromJSON(json) {
  return GetEnvironmentFeatureFlagsResponseFromJSONTyped(json, false);
}
function GetEnvironmentFeatureFlagsResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    featureFlags: !exists(json, "feature_flags") ? undefined : mapValues(json["feature_flags"], GetOrganizationFeatureFlagsResponseFeatureFlagsValueFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetOrganizationFeatureFlagsResponse.js
function GetOrganizationFeatureFlagsResponseFromJSON(json) {
  return GetOrganizationFeatureFlagsResponseFromJSONTyped(json, false);
}
function GetOrganizationFeatureFlagsResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    featureFlags: !exists(json, "feature_flags") ? undefined : mapValues(json["feature_flags"], GetOrganizationFeatureFlagsResponseFeatureFlagsValueFromJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/OrganizationUser.js
function OrganizationUserFromJSON(json) {
  return OrganizationUserFromJSONTyped(json, false);
}
function OrganizationUserFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    email: !exists(json, "email") ? undefined : json["email"],
    fullName: !exists(json, "full_name") ? undefined : json["full_name"],
    lastName: !exists(json, "last_name") ? undefined : json["last_name"],
    firstName: !exists(json, "first_name") ? undefined : json["first_name"],
    roles: !exists(json, "roles") ? undefined : json["roles"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetOrganizationUsersResponse.js
function GetOrganizationUsersResponseFromJSON(json) {
  return GetOrganizationUsersResponseFromJSONTyped(json, false);
}
function GetOrganizationUsersResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    organizationUsers: !exists(json, "organization_users") ? undefined : json["organization_users"].map(OrganizationUserFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Organization.js
function OrganizationFromJSON(json) {
  return OrganizationFromJSONTyped(json, false);
}
function OrganizationFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    name: !exists(json, "name") ? undefined : json["name"],
    isDefault: !exists(json, "is_default") ? undefined : json["is_default"],
    externalId: !exists(json, "external_id") ? undefined : json["external_id"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetOrganizationsResponse.js
function GetOrganizationsResponseFromJSON(json) {
  return GetOrganizationsResponseFromJSONTyped(json, false);
}
function GetOrganizationsResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    organizations: !exists(json, "organizations") ? undefined : json["organizations"].map(OrganizationFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/OrganizationUserPermissionRolesInner.js
function OrganizationUserPermissionRolesInnerFromJSON(json) {
  return OrganizationUserPermissionRolesInnerFromJSONTyped(json, false);
}
function OrganizationUserPermissionRolesInnerFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    key: !exists(json, "key") ? undefined : json["key"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/OrganizationUserPermission.js
function OrganizationUserPermissionFromJSON(json) {
  return OrganizationUserPermissionFromJSONTyped(json, false);
}
function OrganizationUserPermissionFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    key: !exists(json, "key") ? undefined : json["key"],
    name: !exists(json, "name") ? undefined : json["name"],
    description: !exists(json, "description") ? undefined : json["description"],
    roles: !exists(json, "roles") ? undefined : json["roles"].map(OrganizationUserPermissionRolesInnerFromJSON)
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetOrganizationsUserPermissionsResponse.js
function GetOrganizationsUserPermissionsResponseFromJSON(json) {
  return GetOrganizationsUserPermissionsResponseFromJSONTyped(json, false);
}
function GetOrganizationsUserPermissionsResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    permissions: !exists(json, "permissions") ? undefined : json["permissions"].map(OrganizationUserPermissionFromJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/OrganizationUserRole.js
function OrganizationUserRoleFromJSON(json) {
  return OrganizationUserRoleFromJSONTyped(json, false);
}
function OrganizationUserRoleFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    key: !exists(json, "key") ? undefined : json["key"],
    name: !exists(json, "name") ? undefined : json["name"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetOrganizationsUserRolesResponse.js
function GetOrganizationsUserRolesResponseFromJSON(json) {
  return GetOrganizationsUserRolesResponseFromJSONTyped(json, false);
}
function GetOrganizationsUserRolesResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    roles: !exists(json, "roles") ? undefined : json["roles"].map(OrganizationUserRoleFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Permissions.js
function PermissionsFromJSON(json) {
  return PermissionsFromJSONTyped(json, false);
}
function PermissionsFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    key: !exists(json, "key") ? undefined : json["key"],
    name: !exists(json, "name") ? undefined : json["name"],
    description: !exists(json, "description") ? undefined : json["description"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetPermissionsResponse.js
function GetPermissionsResponseFromJSON(json) {
  return GetPermissionsResponseFromJSONTyped(json, false);
}
function GetPermissionsResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    permissions: !exists(json, "permissions") ? undefined : json["permissions"].map(PermissionsFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Property.js
function PropertyFromJSON(json) {
  return PropertyFromJSONTyped(json, false);
}
function PropertyFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    key: !exists(json, "key") ? undefined : json["key"],
    name: !exists(json, "name") ? undefined : json["name"],
    isPrivate: !exists(json, "is_private") ? undefined : json["is_private"],
    description: !exists(json, "description") ? undefined : json["description"],
    isKindeProperty: !exists(json, "is_kinde_property") ? undefined : json["is_kinde_property"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetPropertiesResponse.js
function GetPropertiesResponseFromJSON(json) {
  return GetPropertiesResponseFromJSONTyped(json, false);
}
function GetPropertiesResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    properties: !exists(json, "properties") ? undefined : json["properties"].map(PropertyFromJSON),
    hasMore: !exists(json, "has_more") ? undefined : json["has_more"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/PropertyValue.js
function PropertyValueFromJSON(json) {
  return PropertyValueFromJSONTyped(json, false);
}
function PropertyValueFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    name: !exists(json, "name") ? undefined : json["name"],
    description: !exists(json, "description") ? undefined : json["description"],
    key: !exists(json, "key") ? undefined : json["key"],
    value: !exists(json, "value") ? undefined : json["value"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetPropertyValuesResponse.js
function GetPropertyValuesResponseFromJSON(json) {
  return GetPropertyValuesResponseFromJSONTyped(json, false);
}
function GetPropertyValuesResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    properties: !exists(json, "properties") ? undefined : json["properties"].map(PropertyValueFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/RedirectCallbackUrls.js
function RedirectCallbackUrlsFromJSON(json) {
  return RedirectCallbackUrlsFromJSONTyped(json, false);
}
function RedirectCallbackUrlsFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    redirectUrls: !exists(json, "redirect_urls") ? undefined : json["redirect_urls"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Roles.js
function RolesFromJSON(json) {
  return RolesFromJSONTyped(json, false);
}
function RolesFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    key: !exists(json, "key") ? undefined : json["key"],
    name: !exists(json, "name") ? undefined : json["name"],
    description: !exists(json, "description") ? undefined : json["description"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetRolesResponse.js
function GetRolesResponseFromJSON(json) {
  return GetRolesResponseFromJSONTyped(json, false);
}
function GetRolesResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    roles: !exists(json, "roles") ? undefined : json["roles"].map(RolesFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/Subscriber.js
function SubscriberFromJSON(json) {
  return SubscriberFromJSONTyped(json, false);
}
function SubscriberFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    preferredEmail: !exists(json, "preferred_email") ? undefined : json["preferred_email"],
    firstName: !exists(json, "first_name") ? undefined : json["first_name"],
    lastName: !exists(json, "last_name") ? undefined : json["last_name"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetSubscriberResponse.js
function GetSubscriberResponseFromJSON(json) {
  return GetSubscriberResponseFromJSONTyped(json, false);
}
function GetSubscriberResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    subscribers: !exists(json, "subscribers") ? undefined : json["subscribers"].map(SubscriberFromJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/SubscribersSubscriber.js
function SubscribersSubscriberFromJSON(json) {
  return SubscribersSubscriberFromJSONTyped(json, false);
}
function SubscribersSubscriberFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    email: !exists(json, "email") ? undefined : json["email"],
    fullName: !exists(json, "full_name") ? undefined : json["full_name"],
    firstName: !exists(json, "first_name") ? undefined : json["first_name"],
    lastName: !exists(json, "last_name") ? undefined : json["last_name"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/GetSubscribersResponse.js
function GetSubscribersResponseFromJSON(json) {
  return GetSubscribersResponseFromJSONTyped(json, false);
}
function GetSubscribersResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    subscribers: !exists(json, "subscribers") ? undefined : json["subscribers"].map(SubscribersSubscriberFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/LogoutRedirectUrls.js
function LogoutRedirectUrlsFromJSON(json) {
  return LogoutRedirectUrlsFromJSONTyped(json, false);
}
function LogoutRedirectUrlsFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    redirectUrls: !exists(json, "redirect_urls") ? undefined : json["redirect_urls"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/ReplaceLogoutRedirectURLsRequest.js
function ReplaceLogoutRedirectURLsRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    urls: value.urls
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/ReplaceRedirectCallbackURLsRequest.js
function ReplaceRedirectCallbackURLsRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    urls: value.urls
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/RolesPermissionResponseInner.js
function RolesPermissionResponseInnerFromJSON(json) {
  return RolesPermissionResponseInnerFromJSONTyped(json, false);
}
function RolesPermissionResponseInnerFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    key: !exists(json, "key") ? undefined : json["key"],
    name: !exists(json, "name") ? undefined : json["name"],
    description: !exists(json, "description") ? undefined : json["description"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/SetUserPasswordRequest.js
function SetUserPasswordRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    hashed_password: value.hashedPassword,
    hashing_method: value.hashingMethod,
    salt: value.salt,
    salt_position: value.saltPosition,
    is_temporary_password: value.isTemporaryPassword
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/SuccessResponse.js
function SuccessResponseFromJSON(json) {
  return SuccessResponseFromJSONTyped(json, false);
}
function SuccessResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    message: !exists(json, "message") ? undefined : json["message"],
    code: !exists(json, "code") ? undefined : json["code"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/TokenIntrospect.js
function TokenIntrospectFromJSON(json) {
  return TokenIntrospectFromJSONTyped(json, false);
}
function TokenIntrospectFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    active: !exists(json, "active") ? undefined : json["active"],
    aud: !exists(json, "aud") ? undefined : json["aud"],
    clientId: !exists(json, "client_id") ? undefined : json["client_id"],
    exp: !exists(json, "exp") ? undefined : json["exp"],
    iat: !exists(json, "iat") ? undefined : json["iat"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateAPIApplicationsRequestApplicationsInner.js
function UpdateAPIApplicationsRequestApplicationsInnerToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    id: value.id,
    operation: value.operation
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateAPIApplicationsRequest.js
function UpdateAPIApplicationsRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    applications: value.applications.map(UpdateAPIApplicationsRequestApplicationsInnerToJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateApplicationRequest.js
function UpdateApplicationRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    language_key: value.languageKey,
    logout_uris: value.logoutUris,
    redirect_uris: value.redirectUris
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateCategoryRequest.js
function UpdateCategoryRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateEnvironementFeatureFlagOverrideRequest.js
function UpdateEnvironementFeatureFlagOverrideRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    value: value.value
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateOrganizationPropertiesRequest.js
function UpdateOrganizationPropertiesRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    properties: value.properties
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateOrganizationRequest.js
function UpdateOrganizationRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    external_id: value.externalId,
    background_color: value.backgroundColor,
    button_color: value.buttonColor,
    button_text_color: value.buttonTextColor,
    link_color: value.linkColor,
    background_color_dark: value.backgroundColorDark,
    button_color_dark: value.buttonColorDark,
    button_text_color_dark: value.buttonTextColorDark,
    link_color_dark: value.linkColorDark,
    theme_code: value.themeCode,
    handle: value.handle,
    is_allow_registrations: value.isAllowRegistrations
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateOrganizationUsersRequestUsersInner.js
function UpdateOrganizationUsersRequestUsersInnerToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    id: value.id,
    operation: value.operation,
    roles: value.roles,
    permissions: value.permissions
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateOrganizationUsersRequest.js
function UpdateOrganizationUsersRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    users: value.users === undefined ? undefined : value.users.map(UpdateOrganizationUsersRequestUsersInnerToJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateOrganizationUsersResponse.js
function UpdateOrganizationUsersResponseFromJSON(json) {
  return UpdateOrganizationUsersResponseFromJSONTyped(json, false);
}
function UpdateOrganizationUsersResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    message: !exists(json, "message") ? undefined : json["message"],
    usersAdded: !exists(json, "users_added") ? undefined : json["users_added"],
    usersUpdated: !exists(json, "users_updated") ? undefined : json["users_updated"],
    usersRemoved: !exists(json, "users_removed") ? undefined : json["users_removed"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdatePropertyRequest.js
function UpdatePropertyRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    description: value.description,
    is_private: value.isPrivate,
    category_id: value.categoryId
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateRolePermissionsRequestPermissionsInner.js
function UpdateRolePermissionsRequestPermissionsInnerToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    id: value.id,
    operation: value.operation
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateRolePermissionsRequest.js
function UpdateRolePermissionsRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    permissions: value.permissions === undefined ? undefined : value.permissions.map(UpdateRolePermissionsRequestPermissionsInnerToJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateRolePermissionsResponse.js
function UpdateRolePermissionsResponseFromJSON(json) {
  return UpdateRolePermissionsResponseFromJSONTyped(json, false);
}
function UpdateRolePermissionsResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    permissionsAdded: !exists(json, "permissions_added") ? undefined : json["permissions_added"],
    permissionsRemoved: !exists(json, "permissions_removed") ? undefined : json["permissions_removed"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateRolesRequest.js
function UpdateRolesRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    name: value.name,
    description: value.description,
    key: value.key,
    is_default_role: value.isDefaultRole
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateUserRequest.js
function UpdateUserRequestToJSON(value) {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    return null;
  }
  return {
    given_name: value.givenName,
    family_name: value.familyName,
    is_suspended: value.isSuspended,
    is_password_reset_requested: value.isPasswordResetRequested
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UpdateUserResponse.js
function UpdateUserResponseFromJSON(json) {
  return UpdateUserResponseFromJSONTyped(json, false);
}
function UpdateUserResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    givenName: !exists(json, "given_name") ? undefined : json["given_name"],
    familyName: !exists(json, "family_name") ? undefined : json["family_name"],
    email: !exists(json, "email") ? undefined : json["email"],
    isSuspended: !exists(json, "is_suspended") ? undefined : json["is_suspended"],
    isPasswordResetRequested: !exists(json, "is_password_reset_requested") ? undefined : json["is_password_reset_requested"],
    picture: !exists(json, "picture") ? undefined : json["picture"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UserIdentitiesInner.js
function UserIdentitiesInnerFromJSON(json) {
  return UserIdentitiesInnerFromJSONTyped(json, false);
}
function UserIdentitiesInnerFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    type: !exists(json, "type") ? undefined : json["type"],
    identity: !exists(json, "identity") ? undefined : json["identity"]
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/User.js
function UserFromJSON(json) {
  return UserFromJSONTyped(json, false);
}
function UserFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    providedId: !exists(json, "provided_id") ? undefined : json["provided_id"],
    preferredEmail: !exists(json, "preferred_email") ? undefined : json["preferred_email"],
    username: !exists(json, "username") ? undefined : json["username"],
    lastName: !exists(json, "last_name") ? undefined : json["last_name"],
    firstName: !exists(json, "first_name") ? undefined : json["first_name"],
    isSuspended: !exists(json, "is_suspended") ? undefined : json["is_suspended"],
    picture: !exists(json, "picture") ? undefined : json["picture"],
    totalSignIns: !exists(json, "total_sign_ins") ? undefined : json["total_sign_ins"],
    failedSignIns: !exists(json, "failed_sign_ins") ? undefined : json["failed_sign_ins"],
    lastSignedIn: !exists(json, "last_signed_in") ? undefined : json["last_signed_in"],
    createdOn: !exists(json, "created_on") ? undefined : json["created_on"],
    organizations: !exists(json, "organizations") ? undefined : json["organizations"],
    identities: !exists(json, "identities") ? undefined : json["identities"].map(UserIdentitiesInnerFromJSON)
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UserProfile.js
function UserProfileFromJSON(json) {
  return UserProfileFromJSONTyped(json, false);
}
function UserProfileFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    preferredEmail: !exists(json, "preferred_email") ? undefined : json["preferred_email"],
    username: !exists(json, "username") ? undefined : json["username"],
    providedId: !exists(json, "provided_id") ? undefined : json["provided_id"],
    lastName: !exists(json, "last_name") ? undefined : json["last_name"],
    firstName: !exists(json, "first_name") ? undefined : json["first_name"],
    picture: !exists(json, "picture") ? undefined : json["picture"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UserProfileV2.js
function UserProfileV2FromJSON(json) {
  return UserProfileV2FromJSONTyped(json, false);
}
function UserProfileV2FromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    sub: !exists(json, "sub") ? undefined : json["sub"],
    providedId: !exists(json, "provided_id") ? undefined : json["provided_id"],
    name: !exists(json, "name") ? undefined : json["name"],
    givenName: !exists(json, "given_name") ? undefined : json["given_name"],
    familyName: !exists(json, "family_name") ? undefined : json["family_name"],
    updatedAt: !exists(json, "updated_at") ? undefined : json["updated_at"],
    email: !exists(json, "email") ? undefined : json["email"],
    picture: !exists(json, "picture") ? undefined : json["picture"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UsersResponseUsersInner.js
function UsersResponseUsersInnerFromJSON(json) {
  return UsersResponseUsersInnerFromJSONTyped(json, false);
}
function UsersResponseUsersInnerFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    id: !exists(json, "id") ? undefined : json["id"],
    providedId: !exists(json, "provided_id") ? undefined : json["provided_id"],
    email: !exists(json, "email") ? undefined : json["email"],
    username: !exists(json, "username") ? undefined : json["username"],
    lastName: !exists(json, "last_name") ? undefined : json["last_name"],
    firstName: !exists(json, "first_name") ? undefined : json["first_name"],
    isSuspended: !exists(json, "is_suspended") ? undefined : json["is_suspended"],
    picture: !exists(json, "picture") ? undefined : json["picture"],
    totalSignIns: !exists(json, "total_sign_ins") ? undefined : json["total_sign_ins"],
    failedSignIns: !exists(json, "failed_sign_ins") ? undefined : json["failed_sign_ins"],
    lastSignedIn: !exists(json, "last_signed_in") ? undefined : json["last_signed_in"],
    createdOn: !exists(json, "created_on") ? undefined : json["created_on"],
    organizations: !exists(json, "organizations") ? undefined : json["organizations"],
    identities: !exists(json, "identities") ? undefined : json["identities"].map(UserIdentitiesInnerFromJSON)
  };
}

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/models/UsersResponse.js
function UsersResponseFromJSON(json) {
  return UsersResponseFromJSONTyped(json, false);
}
function UsersResponseFromJSONTyped(json, ignoreDiscriminator) {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    code: !exists(json, "code") ? undefined : json["code"],
    message: !exists(json, "message") ? undefined : json["message"],
    users: !exists(json, "users") ? undefined : json["users"].map(UsersResponseUsersInnerFromJSON),
    nextToken: !exists(json, "next_token") ? undefined : json["next_token"]
  };
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/APIsApi.js
var __extends2 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator2 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var APIsApi = function(_super) {
  __extends2(APIsApi2, _super);
  function APIsApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  APIsApi2.prototype.addAPIsRaw = function(requestParameters, initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.addAPIsRequest === null || requestParameters.addAPIsRequest === undefined) {
              throw new RequiredError("addAPIsRequest", "Required parameter requestParameters.addAPIsRequest was null or undefined when calling addAPIs.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/apis",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: AddAPIsRequestToJSON(requestParameters.addAPIsRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  APIsApi2.prototype.addAPIs = function(requestParameters, initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.addAPIsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  APIsApi2.prototype.deleteAPIRaw = function(requestParameters, initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.apiId === null || requestParameters.apiId === undefined) {
              throw new RequiredError("apiId", "Required parameter requestParameters.apiId was null or undefined when calling deleteAPI.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/apis/{api_id}".replace("{".concat("api_id", "}"), encodeURIComponent(String(requestParameters.apiId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  APIsApi2.prototype.deleteAPI = function(requestParameters, initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteAPIRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  APIsApi2.prototype.getAPIRaw = function(requestParameters, initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.apiId === null || requestParameters.apiId === undefined) {
              throw new RequiredError("apiId", "Required parameter requestParameters.apiId was null or undefined when calling getAPI.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/apis/{api_id}".replace("{".concat("api_id", "}"), encodeURIComponent(String(requestParameters.apiId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return ApiFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  APIsApi2.prototype.getAPI = function(requestParameters, initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getAPIRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  APIsApi2.prototype.getAPIsRaw = function(initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/apis",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return ApisFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  APIsApi2.prototype.getAPIs = function(initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getAPIsRaw(initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  APIsApi2.prototype.updateAPIApplicationsRaw = function(requestParameters, initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.apiId === null || requestParameters.apiId === undefined) {
              throw new RequiredError("apiId", "Required parameter requestParameters.apiId was null or undefined when calling updateAPIApplications.");
            }
            if (requestParameters.updateAPIApplicationsRequest === null || requestParameters.updateAPIApplicationsRequest === undefined) {
              throw new RequiredError("updateAPIApplicationsRequest", "Required parameter requestParameters.updateAPIApplicationsRequest was null or undefined when calling updateAPIApplications.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/apis/{api_id}/applications".replace("{".concat("api_id", "}"), encodeURIComponent(String(requestParameters.apiId))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateAPIApplicationsRequestToJSON(requestParameters.updateAPIApplicationsRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  APIsApi2.prototype.updateAPIApplications = function(requestParameters, initOverrides) {
    return __awaiter2(this, undefined, undefined, function() {
      var response;
      return __generator2(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateAPIApplicationsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return APIsApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/ApplicationsApi.js
var __extends3 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter3 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator3 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var ApplicationsApi = function(_super) {
  __extends3(ApplicationsApi2, _super);
  function ApplicationsApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  ApplicationsApi2.prototype.createApplicationRaw = function(requestParameters, initOverrides) {
    return __awaiter3(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreateApplicationRequestToJSON(requestParameters.createApplicationRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return CreateApplicationResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  ApplicationsApi2.prototype.createApplication = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter3(this, undefined, undefined, function() {
      var response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createApplicationRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  ApplicationsApi2.prototype.deleteApplicationRaw = function(requestParameters, initOverrides) {
    return __awaiter3(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.applicationId === null || requestParameters.applicationId === undefined) {
              throw new RequiredError("applicationId", "Required parameter requestParameters.applicationId was null or undefined when calling deleteApplication.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{application_id}".replace("{".concat("application_id", "}"), encodeURIComponent(String(requestParameters.applicationId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  ApplicationsApi2.prototype.deleteApplication = function(requestParameters, initOverrides) {
    return __awaiter3(this, undefined, undefined, function() {
      var response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteApplicationRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  ApplicationsApi2.prototype.getApplicationRaw = function(requestParameters, initOverrides) {
    return __awaiter3(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.applicationId === null || requestParameters.applicationId === undefined) {
              throw new RequiredError("applicationId", "Required parameter requestParameters.applicationId was null or undefined when calling getApplication.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{application_id}".replace("{".concat("application_id", "}"), encodeURIComponent(String(requestParameters.applicationId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetApplicationResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  ApplicationsApi2.prototype.getApplication = function(requestParameters, initOverrides) {
    return __awaiter3(this, undefined, undefined, function() {
      var response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getApplicationRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  ApplicationsApi2.prototype.getApplicationsRaw = function(requestParameters, initOverrides) {
    return __awaiter3(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.sort !== undefined) {
              queryParameters["sort"] = requestParameters.sort;
            }
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.nextToken !== undefined) {
              queryParameters["next_token"] = requestParameters.nextToken;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetApplicationsResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  ApplicationsApi2.prototype.getApplications = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter3(this, undefined, undefined, function() {
      var response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getApplicationsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  ApplicationsApi2.prototype.updateApplicationRaw = function(requestParameters, initOverrides) {
    return __awaiter3(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.applicationId === null || requestParameters.applicationId === undefined) {
              throw new RequiredError("applicationId", "Required parameter requestParameters.applicationId was null or undefined when calling updateApplication.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{application_id}".replace("{".concat("application_id", "}"), encodeURIComponent(String(requestParameters.applicationId))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateApplicationRequestToJSON(requestParameters.updateApplicationRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new VoidApiResponse(response)];
        }
      });
    });
  };
  ApplicationsApi2.prototype.updateApplication = function(requestParameters, initOverrides) {
    return __awaiter3(this, undefined, undefined, function() {
      return __generator3(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateApplicationRaw(requestParameters, initOverrides)];
          case 1:
            _a.sent();
            return [2];
        }
      });
    });
  };
  return ApplicationsApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/BusinessApi.js
var __extends4 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter4 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator4 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var BusinessApi = function(_super) {
  __extends4(BusinessApi2, _super);
  function BusinessApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  BusinessApi2.prototype.getBusinessRaw = function(requestParameters, initOverrides) {
    return __awaiter4(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator4(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.code === null || requestParameters.code === undefined) {
              throw new RequiredError("code", "Required parameter requestParameters.code was null or undefined when calling getBusiness.");
            }
            if (requestParameters.name === null || requestParameters.name === undefined) {
              throw new RequiredError("name", "Required parameter requestParameters.name was null or undefined when calling getBusiness.");
            }
            if (requestParameters.email === null || requestParameters.email === undefined) {
              throw new RequiredError("email", "Required parameter requestParameters.email was null or undefined when calling getBusiness.");
            }
            queryParameters = {};
            if (requestParameters.code !== undefined) {
              queryParameters["code"] = requestParameters.code;
            }
            if (requestParameters.name !== undefined) {
              queryParameters["name"] = requestParameters.name;
            }
            if (requestParameters.email !== undefined) {
              queryParameters["email"] = requestParameters.email;
            }
            if (requestParameters.phone !== undefined) {
              queryParameters["phone"] = requestParameters.phone;
            }
            if (requestParameters.industry !== undefined) {
              queryParameters["industry"] = requestParameters.industry;
            }
            if (requestParameters.timezone !== undefined) {
              queryParameters["timezone"] = requestParameters.timezone;
            }
            if (requestParameters.privacyUrl !== undefined) {
              queryParameters["privacy_url"] = requestParameters.privacyUrl;
            }
            if (requestParameters.termsUrl !== undefined) {
              queryParameters["terms_url"] = requestParameters.termsUrl;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/business",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  BusinessApi2.prototype.getBusiness = function(requestParameters, initOverrides) {
    return __awaiter4(this, undefined, undefined, function() {
      var response;
      return __generator4(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getBusinessRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  BusinessApi2.prototype.updateBusinessRaw = function(requestParameters, initOverrides) {
    return __awaiter4(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator4(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.businessName === null || requestParameters.businessName === undefined) {
              throw new RequiredError("businessName", "Required parameter requestParameters.businessName was null or undefined when calling updateBusiness.");
            }
            if (requestParameters.primaryEmail === null || requestParameters.primaryEmail === undefined) {
              throw new RequiredError("primaryEmail", "Required parameter requestParameters.primaryEmail was null or undefined when calling updateBusiness.");
            }
            queryParameters = {};
            if (requestParameters.businessName !== undefined) {
              queryParameters["business_name"] = requestParameters.businessName;
            }
            if (requestParameters.primaryEmail !== undefined) {
              queryParameters["primary_email"] = requestParameters.primaryEmail;
            }
            if (requestParameters.primaryPhone !== undefined) {
              queryParameters["primary_phone"] = requestParameters.primaryPhone;
            }
            if (requestParameters.industryKey !== undefined) {
              queryParameters["industry_key"] = requestParameters.industryKey;
            }
            if (requestParameters.timezoneId !== undefined) {
              queryParameters["timezone_id"] = requestParameters.timezoneId;
            }
            if (requestParameters.privacyUrl !== undefined) {
              queryParameters["privacy_url"] = requestParameters.privacyUrl;
            }
            if (requestParameters.termsUrl !== undefined) {
              queryParameters["terms_url"] = requestParameters.termsUrl;
            }
            if (requestParameters.isShowKindeBranding !== undefined) {
              queryParameters["is_show_kinde_branding"] = requestParameters.isShowKindeBranding;
            }
            if (requestParameters.isClickWrap !== undefined) {
              queryParameters["is_click_wrap"] = requestParameters.isClickWrap;
            }
            if (requestParameters.partnerCode !== undefined) {
              queryParameters["partner_code"] = requestParameters.partnerCode;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/business",
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  BusinessApi2.prototype.updateBusiness = function(requestParameters, initOverrides) {
    return __awaiter4(this, undefined, undefined, function() {
      var response;
      return __generator4(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateBusinessRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return BusinessApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/CallbacksApi.js
var __extends5 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter5 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator5 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var CallbacksApi = function(_super) {
  __extends5(CallbacksApi2, _super);
  function CallbacksApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  CallbacksApi2.prototype.addLogoutRedirectURLsRaw = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.appId === null || requestParameters.appId === undefined) {
              throw new RequiredError("appId", "Required parameter requestParameters.appId was null or undefined when calling addLogoutRedirectURLs.");
            }
            if (requestParameters.replaceLogoutRedirectURLsRequest === null || requestParameters.replaceLogoutRedirectURLsRequest === undefined) {
              throw new RequiredError("replaceLogoutRedirectURLsRequest", "Required parameter requestParameters.replaceLogoutRedirectURLsRequest was null or undefined when calling addLogoutRedirectURLs.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{app_id}/auth_logout_urls".replace("{".concat("app_id", "}"), encodeURIComponent(String(requestParameters.appId))),
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: ReplaceLogoutRedirectURLsRequestToJSON(requestParameters.replaceLogoutRedirectURLsRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  CallbacksApi2.prototype.addLogoutRedirectURLs = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.addLogoutRedirectURLsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  CallbacksApi2.prototype.addRedirectCallbackURLsRaw = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.appId === null || requestParameters.appId === undefined) {
              throw new RequiredError("appId", "Required parameter requestParameters.appId was null or undefined when calling addRedirectCallbackURLs.");
            }
            if (requestParameters.replaceRedirectCallbackURLsRequest === null || requestParameters.replaceRedirectCallbackURLsRequest === undefined) {
              throw new RequiredError("replaceRedirectCallbackURLsRequest", "Required parameter requestParameters.replaceRedirectCallbackURLsRequest was null or undefined when calling addRedirectCallbackURLs.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{app_id}/auth_redirect_urls".replace("{".concat("app_id", "}"), encodeURIComponent(String(requestParameters.appId))),
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: ReplaceRedirectCallbackURLsRequestToJSON(requestParameters.replaceRedirectCallbackURLsRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  CallbacksApi2.prototype.addRedirectCallbackURLs = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.addRedirectCallbackURLsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  CallbacksApi2.prototype.deleteCallbackURLsRaw = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.appId === null || requestParameters.appId === undefined) {
              throw new RequiredError("appId", "Required parameter requestParameters.appId was null or undefined when calling deleteCallbackURLs.");
            }
            if (requestParameters.urls === null || requestParameters.urls === undefined) {
              throw new RequiredError("urls", "Required parameter requestParameters.urls was null or undefined when calling deleteCallbackURLs.");
            }
            queryParameters = {};
            if (requestParameters.urls !== undefined) {
              queryParameters["urls"] = requestParameters.urls;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{app_id}/auth_redirect_urls".replace("{".concat("app_id", "}"), encodeURIComponent(String(requestParameters.appId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  CallbacksApi2.prototype.deleteCallbackURLs = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteCallbackURLsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  CallbacksApi2.prototype.deleteLogoutURLsRaw = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.appId === null || requestParameters.appId === undefined) {
              throw new RequiredError("appId", "Required parameter requestParameters.appId was null or undefined when calling deleteLogoutURLs.");
            }
            if (requestParameters.urls === null || requestParameters.urls === undefined) {
              throw new RequiredError("urls", "Required parameter requestParameters.urls was null or undefined when calling deleteLogoutURLs.");
            }
            queryParameters = {};
            if (requestParameters.urls !== undefined) {
              queryParameters["urls"] = requestParameters.urls;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{app_id}/auth_logout_urls".replace("{".concat("app_id", "}"), encodeURIComponent(String(requestParameters.appId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  CallbacksApi2.prototype.deleteLogoutURLs = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteLogoutURLsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  CallbacksApi2.prototype.getCallbackURLsRaw = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.appId === null || requestParameters.appId === undefined) {
              throw new RequiredError("appId", "Required parameter requestParameters.appId was null or undefined when calling getCallbackURLs.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{app_id}/auth_redirect_urls".replace("{".concat("app_id", "}"), encodeURIComponent(String(requestParameters.appId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return RedirectCallbackUrlsFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  CallbacksApi2.prototype.getCallbackURLs = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getCallbackURLsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  CallbacksApi2.prototype.getLogoutURLsRaw = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.appId === null || requestParameters.appId === undefined) {
              throw new RequiredError("appId", "Required parameter requestParameters.appId was null or undefined when calling getLogoutURLs.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{app_id}/auth_logout_urls".replace("{".concat("app_id", "}"), encodeURIComponent(String(requestParameters.appId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return LogoutRedirectUrlsFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  CallbacksApi2.prototype.getLogoutURLs = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getLogoutURLsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  CallbacksApi2.prototype.replaceLogoutRedirectURLsRaw = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.appId === null || requestParameters.appId === undefined) {
              throw new RequiredError("appId", "Required parameter requestParameters.appId was null or undefined when calling replaceLogoutRedirectURLs.");
            }
            if (requestParameters.replaceLogoutRedirectURLsRequest === null || requestParameters.replaceLogoutRedirectURLsRequest === undefined) {
              throw new RequiredError("replaceLogoutRedirectURLsRequest", "Required parameter requestParameters.replaceLogoutRedirectURLsRequest was null or undefined when calling replaceLogoutRedirectURLs.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{app_id}/auth_logout_urls".replace("{".concat("app_id", "}"), encodeURIComponent(String(requestParameters.appId))),
              method: "PUT",
              headers: headerParameters,
              query: queryParameters,
              body: ReplaceLogoutRedirectURLsRequestToJSON(requestParameters.replaceLogoutRedirectURLsRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  CallbacksApi2.prototype.replaceLogoutRedirectURLs = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.replaceLogoutRedirectURLsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  CallbacksApi2.prototype.replaceRedirectCallbackURLsRaw = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.appId === null || requestParameters.appId === undefined) {
              throw new RequiredError("appId", "Required parameter requestParameters.appId was null or undefined when calling replaceRedirectCallbackURLs.");
            }
            if (requestParameters.replaceRedirectCallbackURLsRequest === null || requestParameters.replaceRedirectCallbackURLsRequest === undefined) {
              throw new RequiredError("replaceRedirectCallbackURLsRequest", "Required parameter requestParameters.replaceRedirectCallbackURLsRequest was null or undefined when calling replaceRedirectCallbackURLs.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/applications/{app_id}/auth_redirect_urls".replace("{".concat("app_id", "}"), encodeURIComponent(String(requestParameters.appId))),
              method: "PUT",
              headers: headerParameters,
              query: queryParameters,
              body: ReplaceRedirectCallbackURLsRequestToJSON(requestParameters.replaceRedirectCallbackURLsRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  CallbacksApi2.prototype.replaceRedirectCallbackURLs = function(requestParameters, initOverrides) {
    return __awaiter5(this, undefined, undefined, function() {
      var response;
      return __generator5(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.replaceRedirectCallbackURLsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return CallbacksApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/ConnectedAppsApi.js
var __extends6 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter6 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator6 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var ConnectedAppsApi = function(_super) {
  __extends6(ConnectedAppsApi2, _super);
  function ConnectedAppsApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  ConnectedAppsApi2.prototype.getConnectedAppAuthUrlRaw = function(requestParameters, initOverrides) {
    return __awaiter6(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator6(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.keyCodeRef === null || requestParameters.keyCodeRef === undefined) {
              throw new RequiredError("keyCodeRef", "Required parameter requestParameters.keyCodeRef was null or undefined when calling getConnectedAppAuthUrl.");
            }
            queryParameters = {};
            if (requestParameters.keyCodeRef !== undefined) {
              queryParameters["key_code_ref"] = requestParameters.keyCodeRef;
            }
            if (requestParameters.userId !== undefined) {
              queryParameters["user_id"] = requestParameters.userId;
            }
            if (requestParameters.orgCode !== undefined) {
              queryParameters["org_code"] = requestParameters.orgCode;
            }
            if (requestParameters.overrideCallbackUrl !== undefined) {
              queryParameters["override_callback_url"] = requestParameters.overrideCallbackUrl;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/connected_apps/auth_url",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return ConnectedAppsAuthUrlFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  ConnectedAppsApi2.prototype.getConnectedAppAuthUrl = function(requestParameters, initOverrides) {
    return __awaiter6(this, undefined, undefined, function() {
      var response;
      return __generator6(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getConnectedAppAuthUrlRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  ConnectedAppsApi2.prototype.getConnectedAppTokenRaw = function(requestParameters, initOverrides) {
    return __awaiter6(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator6(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.sessionId === null || requestParameters.sessionId === undefined) {
              throw new RequiredError("sessionId", "Required parameter requestParameters.sessionId was null or undefined when calling getConnectedAppToken.");
            }
            queryParameters = {};
            if (requestParameters.sessionId !== undefined) {
              queryParameters["session_id"] = requestParameters.sessionId;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/connected_apps/token",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return ConnectedAppsAccessTokenFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  ConnectedAppsApi2.prototype.getConnectedAppToken = function(requestParameters, initOverrides) {
    return __awaiter6(this, undefined, undefined, function() {
      var response;
      return __generator6(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getConnectedAppTokenRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  ConnectedAppsApi2.prototype.revokeConnectedAppTokenRaw = function(requestParameters, initOverrides) {
    return __awaiter6(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator6(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.sessionId === null || requestParameters.sessionId === undefined) {
              throw new RequiredError("sessionId", "Required parameter requestParameters.sessionId was null or undefined when calling revokeConnectedAppToken.");
            }
            queryParameters = {};
            if (requestParameters.sessionId !== undefined) {
              queryParameters["session_id"] = requestParameters.sessionId;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/connected_apps/revoke",
              method: "POST",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  ConnectedAppsApi2.prototype.revokeConnectedAppToken = function(requestParameters, initOverrides) {
    return __awaiter6(this, undefined, undefined, function() {
      var response;
      return __generator6(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.revokeConnectedAppTokenRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return ConnectedAppsApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/EnvironmentsApi.js
var __extends7 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter7 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator7 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var EnvironmentsApi = function(_super) {
  __extends7(EnvironmentsApi2, _super);
  function EnvironmentsApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  EnvironmentsApi2.prototype.deleteEnvironementFeatureFlagOverrideRaw = function(requestParameters, initOverrides) {
    return __awaiter7(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator7(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.featureFlagKey === null || requestParameters.featureFlagKey === undefined) {
              throw new RequiredError("featureFlagKey", "Required parameter requestParameters.featureFlagKey was null or undefined when calling deleteEnvironementFeatureFlagOverride.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/environment/feature_flags/{feature_flag_key}".replace("{".concat("feature_flag_key", "}"), encodeURIComponent(String(requestParameters.featureFlagKey))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  EnvironmentsApi2.prototype.deleteEnvironementFeatureFlagOverride = function(requestParameters, initOverrides) {
    return __awaiter7(this, undefined, undefined, function() {
      var response;
      return __generator7(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteEnvironementFeatureFlagOverrideRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  EnvironmentsApi2.prototype.deleteEnvironementFeatureFlagOverridesRaw = function(initOverrides) {
    return __awaiter7(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator7(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/environment/feature_flags",
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  EnvironmentsApi2.prototype.deleteEnvironementFeatureFlagOverrides = function(initOverrides) {
    return __awaiter7(this, undefined, undefined, function() {
      var response;
      return __generator7(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteEnvironementFeatureFlagOverridesRaw(initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  EnvironmentsApi2.prototype.getEnvironementFeatureFlagsRaw = function(initOverrides) {
    return __awaiter7(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator7(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/environment/feature_flags",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetEnvironmentFeatureFlagsResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  EnvironmentsApi2.prototype.getEnvironementFeatureFlags = function(initOverrides) {
    return __awaiter7(this, undefined, undefined, function() {
      var response;
      return __generator7(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getEnvironementFeatureFlagsRaw(initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  EnvironmentsApi2.prototype.updateEnvironementFeatureFlagOverrideRaw = function(requestParameters, initOverrides) {
    return __awaiter7(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator7(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.featureFlagKey === null || requestParameters.featureFlagKey === undefined) {
              throw new RequiredError("featureFlagKey", "Required parameter requestParameters.featureFlagKey was null or undefined when calling updateEnvironementFeatureFlagOverride.");
            }
            if (requestParameters.updateEnvironementFeatureFlagOverrideRequest === null || requestParameters.updateEnvironementFeatureFlagOverrideRequest === undefined) {
              throw new RequiredError("updateEnvironementFeatureFlagOverrideRequest", "Required parameter requestParameters.updateEnvironementFeatureFlagOverrideRequest was null or undefined when calling updateEnvironementFeatureFlagOverride.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/environment/feature_flags/{feature_flag_key}".replace("{".concat("feature_flag_key", "}"), encodeURIComponent(String(requestParameters.featureFlagKey))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateEnvironementFeatureFlagOverrideRequestToJSON(requestParameters.updateEnvironementFeatureFlagOverrideRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  EnvironmentsApi2.prototype.updateEnvironementFeatureFlagOverride = function(requestParameters, initOverrides) {
    return __awaiter7(this, undefined, undefined, function() {
      var response;
      return __generator7(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateEnvironementFeatureFlagOverrideRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return EnvironmentsApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/FeatureFlagsApi.js
var __extends8 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter8 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator8 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var FeatureFlagsApi = function(_super) {
  __extends8(FeatureFlagsApi2, _super);
  function FeatureFlagsApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  FeatureFlagsApi2.prototype.createFeatureFlagRaw = function(requestParameters, initOverrides) {
    return __awaiter8(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator8(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.createFeatureFlagRequest === null || requestParameters.createFeatureFlagRequest === undefined) {
              throw new RequiredError("createFeatureFlagRequest", "Required parameter requestParameters.createFeatureFlagRequest was null or undefined when calling createFeatureFlag.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/feature_flags",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreateFeatureFlagRequestToJSON(requestParameters.createFeatureFlagRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  FeatureFlagsApi2.prototype.createFeatureFlag = function(requestParameters, initOverrides) {
    return __awaiter8(this, undefined, undefined, function() {
      var response;
      return __generator8(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createFeatureFlagRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  FeatureFlagsApi2.prototype.deleteFeatureFlagRaw = function(requestParameters, initOverrides) {
    return __awaiter8(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator8(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.featureFlagKey === null || requestParameters.featureFlagKey === undefined) {
              throw new RequiredError("featureFlagKey", "Required parameter requestParameters.featureFlagKey was null or undefined when calling deleteFeatureFlag.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/feature_flags/{feature_flag_key}".replace("{".concat("feature_flag_key", "}"), encodeURIComponent(String(requestParameters.featureFlagKey))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  FeatureFlagsApi2.prototype.deleteFeatureFlag = function(requestParameters, initOverrides) {
    return __awaiter8(this, undefined, undefined, function() {
      var response;
      return __generator8(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteFeatureFlagRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  FeatureFlagsApi2.prototype.updateFeatureFlagRaw = function(requestParameters, initOverrides) {
    return __awaiter8(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator8(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.featureFlagKey === null || requestParameters.featureFlagKey === undefined) {
              throw new RequiredError("featureFlagKey", "Required parameter requestParameters.featureFlagKey was null or undefined when calling updateFeatureFlag.");
            }
            if (requestParameters.name === null || requestParameters.name === undefined) {
              throw new RequiredError("name", "Required parameter requestParameters.name was null or undefined when calling updateFeatureFlag.");
            }
            if (requestParameters.description === null || requestParameters.description === undefined) {
              throw new RequiredError("description", "Required parameter requestParameters.description was null or undefined when calling updateFeatureFlag.");
            }
            if (requestParameters.type === null || requestParameters.type === undefined) {
              throw new RequiredError("type", "Required parameter requestParameters.type was null or undefined when calling updateFeatureFlag.");
            }
            if (requestParameters.allowOverrideLevel === null || requestParameters.allowOverrideLevel === undefined) {
              throw new RequiredError("allowOverrideLevel", "Required parameter requestParameters.allowOverrideLevel was null or undefined when calling updateFeatureFlag.");
            }
            if (requestParameters.defaultValue === null || requestParameters.defaultValue === undefined) {
              throw new RequiredError("defaultValue", "Required parameter requestParameters.defaultValue was null or undefined when calling updateFeatureFlag.");
            }
            queryParameters = {};
            if (requestParameters.name !== undefined) {
              queryParameters["name"] = requestParameters.name;
            }
            if (requestParameters.description !== undefined) {
              queryParameters["description"] = requestParameters.description;
            }
            if (requestParameters.type !== undefined) {
              queryParameters["type"] = requestParameters.type;
            }
            if (requestParameters.allowOverrideLevel !== undefined) {
              queryParameters["allow_override_level"] = requestParameters.allowOverrideLevel;
            }
            if (requestParameters.defaultValue !== undefined) {
              queryParameters["default_value"] = requestParameters.defaultValue;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/feature_flags/{feature_flag_key}".replace("{".concat("feature_flag_key", "}"), encodeURIComponent(String(requestParameters.featureFlagKey))),
              method: "PUT",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  FeatureFlagsApi2.prototype.updateFeatureFlag = function(requestParameters, initOverrides) {
    return __awaiter8(this, undefined, undefined, function() {
      var response;
      return __generator8(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateFeatureFlagRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return FeatureFlagsApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/IndustriesApi.js
var __extends9 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter9 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator9 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var IndustriesApi = function(_super) {
  __extends9(IndustriesApi2, _super);
  function IndustriesApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  IndustriesApi2.prototype.getIndustriesRaw = function(requestParameters, initOverrides) {
    return __awaiter9(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator9(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.industryKey !== undefined) {
              queryParameters["industry_key"] = requestParameters.industryKey;
            }
            if (requestParameters.name !== undefined) {
              queryParameters["name"] = requestParameters.name;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/industries",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  IndustriesApi2.prototype.getIndustries = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter9(this, undefined, undefined, function() {
      var response;
      return __generator9(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getIndustriesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return IndustriesApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/OAuthApi.js
var __extends10 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter10 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator10 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var OAuthApi = function(_super) {
  __extends10(OAuthApi2, _super);
  function OAuthApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  OAuthApi2.prototype.getUserRaw = function(initOverrides) {
    return __awaiter10(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator10(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/oauth2/user_profile",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return UserProfileFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OAuthApi2.prototype.getUser = function(initOverrides) {
    return __awaiter10(this, undefined, undefined, function() {
      var response;
      return __generator10(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getUserRaw(initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OAuthApi2.prototype.getUserProfileV2Raw = function(initOverrides) {
    return __awaiter10(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator10(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/oauth2/v2/user_profile",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return UserProfileV2FromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OAuthApi2.prototype.getUserProfileV2 = function(initOverrides) {
    return __awaiter10(this, undefined, undefined, function() {
      var response;
      return __generator10(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getUserProfileV2Raw(initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OAuthApi2.prototype.tokenIntrospectionRaw = function(requestParameters, initOverrides) {
    return __awaiter10(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, consumes, canConsumeForm2, formParams, useForm, response;
      return __generator10(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            consumes = [
              { contentType: "application/x-www-form-urlencoded" }
            ];
            canConsumeForm2 = canConsumeForm(consumes);
            useForm = false;
            if (useForm) {
              formParams = new FormData;
            } else {
              formParams = new URLSearchParams;
            }
            if (requestParameters.token !== undefined) {
              formParams.append("token", requestParameters.token);
            }
            if (requestParameters.tokenType !== undefined) {
              formParams.append("token_type", requestParameters.tokenType);
            }
            return [4, this.request({
              path: "/oauth2/introspect",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: formParams
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return TokenIntrospectFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OAuthApi2.prototype.tokenIntrospection = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter10(this, undefined, undefined, function() {
      var response;
      return __generator10(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.tokenIntrospectionRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OAuthApi2.prototype.tokenRevocationRaw = function(requestParameters, initOverrides) {
    return __awaiter10(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, consumes, canConsumeForm2, formParams, useForm, response;
      return __generator10(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            consumes = [
              { contentType: "application/x-www-form-urlencoded" }
            ];
            canConsumeForm2 = canConsumeForm(consumes);
            useForm = false;
            if (useForm) {
              formParams = new FormData;
            } else {
              formParams = new URLSearchParams;
            }
            if (requestParameters.token !== undefined) {
              formParams.append("token", requestParameters.token);
            }
            if (requestParameters.clientId !== undefined) {
              formParams.append("client_id", requestParameters.clientId);
            }
            if (requestParameters.clientSecret !== undefined) {
              formParams.append("client_secret", requestParameters.clientSecret);
            }
            return [4, this.request({
              path: "/oauth2/revoke",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: formParams
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new VoidApiResponse(response)];
        }
      });
    });
  };
  OAuthApi2.prototype.tokenRevocation = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter10(this, undefined, undefined, function() {
      return __generator10(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.tokenRevocationRaw(requestParameters, initOverrides)];
          case 1:
            _a.sent();
            return [2];
        }
      });
    });
  };
  return OAuthApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/OrganizationsApi.js
var __extends11 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter11 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator11 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var OrganizationsApi = function(_super) {
  __extends11(OrganizationsApi2, _super);
  function OrganizationsApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  OrganizationsApi2.prototype.addOrganizationUsersRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling addOrganizationUsers.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: AddOrganizationUsersRequestToJSON(requestParameters.addOrganizationUsersRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return AddOrganizationUsersResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.addOrganizationUsers = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.addOrganizationUsersRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.createOrganizationRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.createOrganizationRequest === null || requestParameters.createOrganizationRequest === undefined) {
              throw new RequiredError("createOrganizationRequest", "Required parameter requestParameters.createOrganizationRequest was null or undefined when calling createOrganization.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organization",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreateOrganizationRequestToJSON(requestParameters.createOrganizationRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return CreateOrganizationResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.createOrganization = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createOrganizationRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.createOrganizationUserPermissionRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling createOrganizationUserPermission.");
            }
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling createOrganizationUserPermission.");
            }
            if (requestParameters.createOrganizationUserPermissionRequest === null || requestParameters.createOrganizationUserPermissionRequest === undefined) {
              throw new RequiredError("createOrganizationUserPermissionRequest", "Required parameter requestParameters.createOrganizationUserPermissionRequest was null or undefined when calling createOrganizationUserPermission.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users/{user_id}/permissions".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreateOrganizationUserPermissionRequestToJSON(requestParameters.createOrganizationUserPermissionRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.createOrganizationUserPermission = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createOrganizationUserPermissionRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.createOrganizationUserRoleRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling createOrganizationUserRole.");
            }
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling createOrganizationUserRole.");
            }
            if (requestParameters.createOrganizationUserRoleRequest === null || requestParameters.createOrganizationUserRoleRequest === undefined) {
              throw new RequiredError("createOrganizationUserRoleRequest", "Required parameter requestParameters.createOrganizationUserRoleRequest was null or undefined when calling createOrganizationUserRole.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users/{user_id}/roles".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreateOrganizationUserRoleRequestToJSON(requestParameters.createOrganizationUserRoleRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.createOrganizationUserRole = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createOrganizationUserRoleRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling deleteOrganization.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organization/{org_code}".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new VoidApiResponse(response)];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganization = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteOrganizationRaw(requestParameters, initOverrides)];
          case 1:
            _a.sent();
            return [2];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationFeatureFlagOverrideRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling deleteOrganizationFeatureFlagOverride.");
            }
            if (requestParameters.featureFlagKey === null || requestParameters.featureFlagKey === undefined) {
              throw new RequiredError("featureFlagKey", "Required parameter requestParameters.featureFlagKey was null or undefined when calling deleteOrganizationFeatureFlagOverride.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/feature_flags/{feature_flag_key}".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("feature_flag_key", "}"), encodeURIComponent(String(requestParameters.featureFlagKey))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationFeatureFlagOverride = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteOrganizationFeatureFlagOverrideRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationFeatureFlagOverridesRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling deleteOrganizationFeatureFlagOverrides.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/feature_flags".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationFeatureFlagOverrides = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteOrganizationFeatureFlagOverridesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationHandleRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling deleteOrganizationHandle.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organization/{org_code}/handle".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationHandle = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteOrganizationHandleRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationUserPermissionRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling deleteOrganizationUserPermission.");
            }
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling deleteOrganizationUserPermission.");
            }
            if (requestParameters.permissionId === null || requestParameters.permissionId === undefined) {
              throw new RequiredError("permissionId", "Required parameter requestParameters.permissionId was null or undefined when calling deleteOrganizationUserPermission.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users/{user_id}/permissions/{permission_id}".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))).replace("{".concat("permission_id", "}"), encodeURIComponent(String(requestParameters.permissionId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationUserPermission = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteOrganizationUserPermissionRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationUserRoleRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling deleteOrganizationUserRole.");
            }
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling deleteOrganizationUserRole.");
            }
            if (requestParameters.roleId === null || requestParameters.roleId === undefined) {
              throw new RequiredError("roleId", "Required parameter requestParameters.roleId was null or undefined when calling deleteOrganizationUserRole.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users/{user_id}/roles/{role_id}".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))).replace("{".concat("role_id", "}"), encodeURIComponent(String(requestParameters.roleId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.deleteOrganizationUserRole = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteOrganizationUserRoleRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.code !== undefined) {
              queryParameters["code"] = requestParameters.code;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organization",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return OrganizationFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganization = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getOrganizationRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationFeatureFlagsRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling getOrganizationFeatureFlags.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/feature_flags".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetOrganizationFeatureFlagsResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationFeatureFlags = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getOrganizationFeatureFlagsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationPropertyValuesRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling getOrganizationPropertyValues.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/properties".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetPropertyValuesResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationPropertyValues = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getOrganizationPropertyValuesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationUserPermissionsRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling getOrganizationUserPermissions.");
            }
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling getOrganizationUserPermissions.");
            }
            queryParameters = {};
            if (requestParameters.expand !== undefined) {
              queryParameters["expand"] = requestParameters.expand;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users/{user_id}/permissions".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetOrganizationsUserPermissionsResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationUserPermissions = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getOrganizationUserPermissionsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationUserRolesRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling getOrganizationUserRoles.");
            }
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling getOrganizationUserRoles.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users/{user_id}/roles".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetOrganizationsUserRolesResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationUserRoles = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getOrganizationUserRolesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationUsersRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling getOrganizationUsers.");
            }
            queryParameters = {};
            if (requestParameters.sort !== undefined) {
              queryParameters["sort"] = requestParameters.sort;
            }
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.nextToken !== undefined) {
              queryParameters["next_token"] = requestParameters.nextToken;
            }
            if (requestParameters.permissions !== undefined) {
              queryParameters["permissions"] = requestParameters.permissions;
            }
            if (requestParameters.roles !== undefined) {
              queryParameters["roles"] = requestParameters.roles;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetOrganizationUsersResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationUsers = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getOrganizationUsersRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizationsRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.sort !== undefined) {
              queryParameters["sort"] = requestParameters.sort;
            }
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.nextToken !== undefined) {
              queryParameters["next_token"] = requestParameters.nextToken;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetOrganizationsResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.getOrganizations = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getOrganizationsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.removeOrganizationUserRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling removeOrganizationUser.");
            }
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling removeOrganizationUser.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users/{user_id}".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.removeOrganizationUser = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.removeOrganizationUserRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling updateOrganization.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organization/{org_code}".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateOrganizationRequestToJSON(requestParameters.updateOrganizationRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganization = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateOrganizationRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationFeatureFlagOverrideRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling updateOrganizationFeatureFlagOverride.");
            }
            if (requestParameters.featureFlagKey === null || requestParameters.featureFlagKey === undefined) {
              throw new RequiredError("featureFlagKey", "Required parameter requestParameters.featureFlagKey was null or undefined when calling updateOrganizationFeatureFlagOverride.");
            }
            if (requestParameters.value === null || requestParameters.value === undefined) {
              throw new RequiredError("value", "Required parameter requestParameters.value was null or undefined when calling updateOrganizationFeatureFlagOverride.");
            }
            queryParameters = {};
            if (requestParameters.value !== undefined) {
              queryParameters["value"] = requestParameters.value;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/feature_flags/{feature_flag_key}".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("feature_flag_key", "}"), encodeURIComponent(String(requestParameters.featureFlagKey))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationFeatureFlagOverride = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateOrganizationFeatureFlagOverrideRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationPropertiesRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling updateOrganizationProperties.");
            }
            if (requestParameters.updateOrganizationPropertiesRequest === null || requestParameters.updateOrganizationPropertiesRequest === undefined) {
              throw new RequiredError("updateOrganizationPropertiesRequest", "Required parameter requestParameters.updateOrganizationPropertiesRequest was null or undefined when calling updateOrganizationProperties.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/properties".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateOrganizationPropertiesRequestToJSON(requestParameters.updateOrganizationPropertiesRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationProperties = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateOrganizationPropertiesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationPropertyRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling updateOrganizationProperty.");
            }
            if (requestParameters.propertyKey === null || requestParameters.propertyKey === undefined) {
              throw new RequiredError("propertyKey", "Required parameter requestParameters.propertyKey was null or undefined when calling updateOrganizationProperty.");
            }
            if (requestParameters.value === null || requestParameters.value === undefined) {
              throw new RequiredError("value", "Required parameter requestParameters.value was null or undefined when calling updateOrganizationProperty.");
            }
            queryParameters = {};
            if (requestParameters.value !== undefined) {
              queryParameters["value"] = requestParameters.value;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/properties/{property_key}".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))).replace("{".concat("property_key", "}"), encodeURIComponent(String(requestParameters.propertyKey))),
              method: "PUT",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationProperty = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateOrganizationPropertyRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationUsersRaw = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.orgCode === null || requestParameters.orgCode === undefined) {
              throw new RequiredError("orgCode", "Required parameter requestParameters.orgCode was null or undefined when calling updateOrganizationUsers.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/organizations/{org_code}/users".replace("{".concat("org_code", "}"), encodeURIComponent(String(requestParameters.orgCode))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateOrganizationUsersRequestToJSON(requestParameters.updateOrganizationUsersRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return UpdateOrganizationUsersResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  OrganizationsApi2.prototype.updateOrganizationUsers = function(requestParameters, initOverrides) {
    return __awaiter11(this, undefined, undefined, function() {
      var response;
      return __generator11(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateOrganizationUsersRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return OrganizationsApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/PermissionsApi.js
var __extends12 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter12 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator12 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var PermissionsApi = function(_super) {
  __extends12(PermissionsApi2, _super);
  function PermissionsApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  PermissionsApi2.prototype.createPermissionRaw = function(requestParameters, initOverrides) {
    return __awaiter12(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator12(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/permissions",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreatePermissionRequestToJSON(requestParameters.createPermissionRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PermissionsApi2.prototype.createPermission = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter12(this, undefined, undefined, function() {
      var response;
      return __generator12(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createPermissionRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  PermissionsApi2.prototype.deletePermissionRaw = function(requestParameters, initOverrides) {
    return __awaiter12(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator12(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.permissionId === null || requestParameters.permissionId === undefined) {
              throw new RequiredError("permissionId", "Required parameter requestParameters.permissionId was null or undefined when calling deletePermission.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/permissions/{permission_id}".replace("{".concat("permission_id", "}"), encodeURIComponent(String(requestParameters.permissionId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PermissionsApi2.prototype.deletePermission = function(requestParameters, initOverrides) {
    return __awaiter12(this, undefined, undefined, function() {
      var response;
      return __generator12(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deletePermissionRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  PermissionsApi2.prototype.getPermissionsRaw = function(requestParameters, initOverrides) {
    return __awaiter12(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator12(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.sort !== undefined) {
              queryParameters["sort"] = requestParameters.sort;
            }
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.nextToken !== undefined) {
              queryParameters["next_token"] = requestParameters.nextToken;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/permissions",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetPermissionsResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PermissionsApi2.prototype.getPermissions = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter12(this, undefined, undefined, function() {
      var response;
      return __generator12(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getPermissionsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  PermissionsApi2.prototype.updatePermissionsRaw = function(requestParameters, initOverrides) {
    return __awaiter12(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator12(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.permissionId === null || requestParameters.permissionId === undefined) {
              throw new RequiredError("permissionId", "Required parameter requestParameters.permissionId was null or undefined when calling updatePermissions.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/permissions/{permission_id}".replace("{".concat("permission_id", "}"), encodeURIComponent(String(requestParameters.permissionId))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: CreatePermissionRequestToJSON(requestParameters.createPermissionRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PermissionsApi2.prototype.updatePermissions = function(requestParameters, initOverrides) {
    return __awaiter12(this, undefined, undefined, function() {
      var response;
      return __generator12(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updatePermissionsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return PermissionsApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/PropertiesApi.js
var __extends13 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter13 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator13 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var PropertiesApi = function(_super) {
  __extends13(PropertiesApi2, _super);
  function PropertiesApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  PropertiesApi2.prototype.createPropertyRaw = function(requestParameters, initOverrides) {
    return __awaiter13(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator13(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.createPropertyRequest === null || requestParameters.createPropertyRequest === undefined) {
              throw new RequiredError("createPropertyRequest", "Required parameter requestParameters.createPropertyRequest was null or undefined when calling createProperty.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/properties",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreatePropertyRequestToJSON(requestParameters.createPropertyRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return CreatePropertyResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PropertiesApi2.prototype.createProperty = function(requestParameters, initOverrides) {
    return __awaiter13(this, undefined, undefined, function() {
      var response;
      return __generator13(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createPropertyRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  PropertiesApi2.prototype.getPropertiesRaw = function(requestParameters, initOverrides) {
    return __awaiter13(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator13(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.startingAfter !== undefined) {
              queryParameters["starting_after"] = requestParameters.startingAfter;
            }
            if (requestParameters.endingBefore !== undefined) {
              queryParameters["ending_before"] = requestParameters.endingBefore;
            }
            if (requestParameters.context !== undefined) {
              queryParameters["context"] = requestParameters.context;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/properties",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetPropertiesResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PropertiesApi2.prototype.getProperties = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter13(this, undefined, undefined, function() {
      var response;
      return __generator13(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getPropertiesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  PropertiesApi2.prototype.updatePropertyRaw = function(requestParameters, initOverrides) {
    return __awaiter13(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator13(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.propertyId === null || requestParameters.propertyId === undefined) {
              throw new RequiredError("propertyId", "Required parameter requestParameters.propertyId was null or undefined when calling updateProperty.");
            }
            if (requestParameters.updatePropertyRequest === null || requestParameters.updatePropertyRequest === undefined) {
              throw new RequiredError("updatePropertyRequest", "Required parameter requestParameters.updatePropertyRequest was null or undefined when calling updateProperty.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/properties/{property_id}".replace("{".concat("property_id", "}"), encodeURIComponent(String(requestParameters.propertyId))),
              method: "PUT",
              headers: headerParameters,
              query: queryParameters,
              body: UpdatePropertyRequestToJSON(requestParameters.updatePropertyRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PropertiesApi2.prototype.updateProperty = function(requestParameters, initOverrides) {
    return __awaiter13(this, undefined, undefined, function() {
      var response;
      return __generator13(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updatePropertyRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return PropertiesApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/PropertyCategoriesApi.js
var __extends14 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter14 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator14 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var PropertyCategoriesApi = function(_super) {
  __extends14(PropertyCategoriesApi2, _super);
  function PropertyCategoriesApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  PropertyCategoriesApi2.prototype.createCategoryRaw = function(requestParameters, initOverrides) {
    return __awaiter14(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator14(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.createCategoryRequest === null || requestParameters.createCategoryRequest === undefined) {
              throw new RequiredError("createCategoryRequest", "Required parameter requestParameters.createCategoryRequest was null or undefined when calling createCategory.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/property_categories",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreateCategoryRequestToJSON(requestParameters.createCategoryRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return CreateCategoryResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PropertyCategoriesApi2.prototype.createCategory = function(requestParameters, initOverrides) {
    return __awaiter14(this, undefined, undefined, function() {
      var response;
      return __generator14(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createCategoryRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  PropertyCategoriesApi2.prototype.getCategoriesRaw = function(requestParameters, initOverrides) {
    return __awaiter14(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator14(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.startingAfter !== undefined) {
              queryParameters["starting_after"] = requestParameters.startingAfter;
            }
            if (requestParameters.endingBefore !== undefined) {
              queryParameters["ending_before"] = requestParameters.endingBefore;
            }
            if (requestParameters.context !== undefined) {
              queryParameters["context"] = requestParameters.context;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/property_categories",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetCategoriesResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PropertyCategoriesApi2.prototype.getCategories = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter14(this, undefined, undefined, function() {
      var response;
      return __generator14(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getCategoriesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  PropertyCategoriesApi2.prototype.updateCategoryRaw = function(requestParameters, initOverrides) {
    return __awaiter14(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator14(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.categoryId === null || requestParameters.categoryId === undefined) {
              throw new RequiredError("categoryId", "Required parameter requestParameters.categoryId was null or undefined when calling updateCategory.");
            }
            if (requestParameters.updateCategoryRequest === null || requestParameters.updateCategoryRequest === undefined) {
              throw new RequiredError("updateCategoryRequest", "Required parameter requestParameters.updateCategoryRequest was null or undefined when calling updateCategory.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/property_categories/{category_id}".replace("{".concat("category_id", "}"), encodeURIComponent(String(requestParameters.categoryId))),
              method: "PUT",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateCategoryRequestToJSON(requestParameters.updateCategoryRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  PropertyCategoriesApi2.prototype.updateCategory = function(requestParameters, initOverrides) {
    return __awaiter14(this, undefined, undefined, function() {
      var response;
      return __generator14(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateCategoryRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return PropertyCategoriesApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/RolesApi.js
var __extends15 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter15 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator15 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var RolesApi = function(_super) {
  __extends15(RolesApi2, _super);
  function RolesApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  RolesApi2.prototype.createRoleRaw = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/roles",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreateRoleRequestToJSON(requestParameters.createRoleRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  RolesApi2.prototype.createRole = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter15(this, undefined, undefined, function() {
      var response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createRoleRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  RolesApi2.prototype.deleteRoleRaw = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.roleId === null || requestParameters.roleId === undefined) {
              throw new RequiredError("roleId", "Required parameter requestParameters.roleId was null or undefined when calling deleteRole.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/roles/{role_id}".replace("{".concat("role_id", "}"), encodeURIComponent(String(requestParameters.roleId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  RolesApi2.prototype.deleteRole = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteRoleRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  RolesApi2.prototype.getRolePermissionRaw = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.roleId === null || requestParameters.roleId === undefined) {
              throw new RequiredError("roleId", "Required parameter requestParameters.roleId was null or undefined when calling getRolePermission.");
            }
            queryParameters = {};
            if (requestParameters.sort !== undefined) {
              queryParameters["sort"] = requestParameters.sort;
            }
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.nextToken !== undefined) {
              queryParameters["next_token"] = requestParameters.nextToken;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/roles/{role_id}/permissions".replace("{".concat("role_id", "}"), encodeURIComponent(String(requestParameters.roleId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return jsonValue.map(RolesPermissionResponseInnerFromJSON);
            })];
        }
      });
    });
  };
  RolesApi2.prototype.getRolePermission = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getRolePermissionRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  RolesApi2.prototype.getRolesRaw = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.sort !== undefined) {
              queryParameters["sort"] = requestParameters.sort;
            }
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.nextToken !== undefined) {
              queryParameters["next_token"] = requestParameters.nextToken;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/roles",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetRolesResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  RolesApi2.prototype.getRoles = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter15(this, undefined, undefined, function() {
      var response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getRolesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  RolesApi2.prototype.removeRolePermissionRaw = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.roleId === null || requestParameters.roleId === undefined) {
              throw new RequiredError("roleId", "Required parameter requestParameters.roleId was null or undefined when calling removeRolePermission.");
            }
            if (requestParameters.permissionId === null || requestParameters.permissionId === undefined) {
              throw new RequiredError("permissionId", "Required parameter requestParameters.permissionId was null or undefined when calling removeRolePermission.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/roles/{role_id}/permissions/{permission_id}".replace("{".concat("role_id", "}"), encodeURIComponent(String(requestParameters.roleId))).replace("{".concat("permission_id", "}"), encodeURIComponent(String(requestParameters.permissionId))),
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  RolesApi2.prototype.removeRolePermission = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.removeRolePermissionRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  RolesApi2.prototype.updateRolePermissionsRaw = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.roleId === null || requestParameters.roleId === undefined) {
              throw new RequiredError("roleId", "Required parameter requestParameters.roleId was null or undefined when calling updateRolePermissions.");
            }
            if (requestParameters.updateRolePermissionsRequest === null || requestParameters.updateRolePermissionsRequest === undefined) {
              throw new RequiredError("updateRolePermissionsRequest", "Required parameter requestParameters.updateRolePermissionsRequest was null or undefined when calling updateRolePermissions.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/roles/{role_id}/permissions".replace("{".concat("role_id", "}"), encodeURIComponent(String(requestParameters.roleId))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateRolePermissionsRequestToJSON(requestParameters.updateRolePermissionsRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return UpdateRolePermissionsResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  RolesApi2.prototype.updateRolePermissions = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateRolePermissionsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  RolesApi2.prototype.updateRolesRaw = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.roleId === null || requestParameters.roleId === undefined) {
              throw new RequiredError("roleId", "Required parameter requestParameters.roleId was null or undefined when calling updateRoles.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/roles/{role_id}".replace("{".concat("role_id", "}"), encodeURIComponent(String(requestParameters.roleId))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateRolesRequestToJSON(requestParameters.updateRolesRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  RolesApi2.prototype.updateRoles = function(requestParameters, initOverrides) {
    return __awaiter15(this, undefined, undefined, function() {
      var response;
      return __generator15(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateRolesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return RolesApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/SubscribersApi.js
var __extends16 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter16 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator16 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var SubscribersApi = function(_super) {
  __extends16(SubscribersApi2, _super);
  function SubscribersApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  SubscribersApi2.prototype.createSubscriberRaw = function(requestParameters, initOverrides) {
    return __awaiter16(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator16(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.firstName === null || requestParameters.firstName === undefined) {
              throw new RequiredError("firstName", "Required parameter requestParameters.firstName was null or undefined when calling createSubscriber.");
            }
            if (requestParameters.lastName === null || requestParameters.lastName === undefined) {
              throw new RequiredError("lastName", "Required parameter requestParameters.lastName was null or undefined when calling createSubscriber.");
            }
            if (requestParameters.email === null || requestParameters.email === undefined) {
              throw new RequiredError("email", "Required parameter requestParameters.email was null or undefined when calling createSubscriber.");
            }
            queryParameters = {};
            if (requestParameters.firstName !== undefined) {
              queryParameters["first_name"] = requestParameters.firstName;
            }
            if (requestParameters.lastName !== undefined) {
              queryParameters["last_name"] = requestParameters.lastName;
            }
            if (requestParameters.email !== undefined) {
              queryParameters["email"] = requestParameters.email;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/subscribers",
              method: "POST",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return CreateSubscriberSuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  SubscribersApi2.prototype.createSubscriber = function(requestParameters, initOverrides) {
    return __awaiter16(this, undefined, undefined, function() {
      var response;
      return __generator16(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createSubscriberRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  SubscribersApi2.prototype.getSubscriberRaw = function(requestParameters, initOverrides) {
    return __awaiter16(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator16(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.subscriberId === null || requestParameters.subscriberId === undefined) {
              throw new RequiredError("subscriberId", "Required parameter requestParameters.subscriberId was null or undefined when calling getSubscriber.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/subscribers/{subscriber_id}".replace("{".concat("subscriber_id", "}"), encodeURIComponent(String(requestParameters.subscriberId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetSubscriberResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  SubscribersApi2.prototype.getSubscriber = function(requestParameters, initOverrides) {
    return __awaiter16(this, undefined, undefined, function() {
      var response;
      return __generator16(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getSubscriberRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  SubscribersApi2.prototype.getSubscribersRaw = function(requestParameters, initOverrides) {
    return __awaiter16(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator16(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.sort !== undefined) {
              queryParameters["sort"] = requestParameters.sort;
            }
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.nextToken !== undefined) {
              queryParameters["next_token"] = requestParameters.nextToken;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/subscribers",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetSubscribersResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  SubscribersApi2.prototype.getSubscribers = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter16(this, undefined, undefined, function() {
      var response;
      return __generator16(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getSubscribersRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return SubscribersApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/TimezonesApi.js
var __extends17 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter17 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator17 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var TimezonesApi = function(_super) {
  __extends17(TimezonesApi2, _super);
  function TimezonesApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  TimezonesApi2.prototype.getTimezonesRaw = function(requestParameters, initOverrides) {
    return __awaiter17(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator17(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.timezoneKey !== undefined) {
              queryParameters["timezone_key"] = requestParameters.timezoneKey;
            }
            if (requestParameters.name !== undefined) {
              queryParameters["name"] = requestParameters.name;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/timezones",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  TimezonesApi2.prototype.getTimezones = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter17(this, undefined, undefined, function() {
      var response;
      return __generator17(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getTimezonesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return TimezonesApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/apis/UsersApi.js
var __extends18 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter18 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator18 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var UsersApi = function(_super) {
  __extends18(UsersApi2, _super);
  function UsersApi2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  UsersApi2.prototype.createUserRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/user",
              method: "POST",
              headers: headerParameters,
              query: queryParameters,
              body: CreateUserRequestToJSON(requestParameters.createUserRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return CreateUserResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.createUser = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.createUserRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.deleteUserRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.id === null || requestParameters.id === undefined) {
              throw new RequiredError("id", "Required parameter requestParameters.id was null or undefined when calling deleteUser.");
            }
            queryParameters = {};
            if (requestParameters.id !== undefined) {
              queryParameters["id"] = requestParameters.id;
            }
            if (requestParameters.isDeleteProfile !== undefined) {
              queryParameters["is_delete_profile"] = requestParameters.isDeleteProfile;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/user",
              method: "DELETE",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.deleteUser = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.deleteUserRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.getUserDataRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.id === null || requestParameters.id === undefined) {
              throw new RequiredError("id", "Required parameter requestParameters.id was null or undefined when calling getUserData.");
            }
            queryParameters = {};
            if (requestParameters.id !== undefined) {
              queryParameters["id"] = requestParameters.id;
            }
            if (requestParameters.expand !== undefined) {
              queryParameters["expand"] = requestParameters.expand;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/user",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return UserFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.getUserData = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getUserDataRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.getUserPropertyValuesRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling getUserPropertyValues.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/users/{user_id}/properties".replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return GetPropertyValuesResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.getUserPropertyValues = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getUserPropertyValuesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.getUsersRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            queryParameters = {};
            if (requestParameters.pageSize !== undefined) {
              queryParameters["page_size"] = requestParameters.pageSize;
            }
            if (requestParameters.userId !== undefined) {
              queryParameters["user_id"] = requestParameters.userId;
            }
            if (requestParameters.nextToken !== undefined) {
              queryParameters["next_token"] = requestParameters.nextToken;
            }
            if (requestParameters.email !== undefined) {
              queryParameters["email"] = requestParameters.email;
            }
            if (requestParameters.expand !== undefined) {
              queryParameters["expand"] = requestParameters.expand;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/users",
              method: "GET",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return UsersResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.getUsers = function(requestParameters, initOverrides) {
    if (requestParameters === undefined) {
      requestParameters = {};
    }
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getUsersRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.refreshUserClaimsRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling refreshUserClaims.");
            }
            queryParameters = {};
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/users/{user_id}/refresh_claims".replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "POST",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.refreshUserClaims = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.refreshUserClaimsRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.setUserPasswordRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling setUserPassword.");
            }
            if (requestParameters.setUserPasswordRequest === null || requestParameters.setUserPasswordRequest === undefined) {
              throw new RequiredError("setUserPasswordRequest", "Required parameter requestParameters.setUserPasswordRequest was null or undefined when calling setUserPassword.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/users/{user_id}/password".replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "PUT",
              headers: headerParameters,
              query: queryParameters,
              body: SetUserPasswordRequestToJSON(requestParameters.setUserPasswordRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.setUserPassword = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.setUserPasswordRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.updateUserRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.id === null || requestParameters.id === undefined) {
              throw new RequiredError("id", "Required parameter requestParameters.id was null or undefined when calling updateUser.");
            }
            if (requestParameters.updateUserRequest === null || requestParameters.updateUserRequest === undefined) {
              throw new RequiredError("updateUserRequest", "Required parameter requestParameters.updateUserRequest was null or undefined when calling updateUser.");
            }
            queryParameters = {};
            if (requestParameters.id !== undefined) {
              queryParameters["id"] = requestParameters.id;
            }
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/user",
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateUserRequestToJSON(requestParameters.updateUserRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return UpdateUserResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.updateUser = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateUserRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.updateUserFeatureFlagOverrideRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling updateUserFeatureFlagOverride.");
            }
            if (requestParameters.featureFlagKey === null || requestParameters.featureFlagKey === undefined) {
              throw new RequiredError("featureFlagKey", "Required parameter requestParameters.featureFlagKey was null or undefined when calling updateUserFeatureFlagOverride.");
            }
            if (requestParameters.value === null || requestParameters.value === undefined) {
              throw new RequiredError("value", "Required parameter requestParameters.value was null or undefined when calling updateUserFeatureFlagOverride.");
            }
            queryParameters = {};
            if (requestParameters.value !== undefined) {
              queryParameters["value"] = requestParameters.value;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/users/{user_id}/feature_flags/{feature_flag_key}".replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))).replace("{".concat("feature_flag_key", "}"), encodeURIComponent(String(requestParameters.featureFlagKey))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.updateUserFeatureFlagOverride = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateUserFeatureFlagOverrideRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.updateUserPropertiesRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling updateUserProperties.");
            }
            if (requestParameters.updateOrganizationPropertiesRequest === null || requestParameters.updateOrganizationPropertiesRequest === undefined) {
              throw new RequiredError("updateOrganizationPropertiesRequest", "Required parameter requestParameters.updateOrganizationPropertiesRequest was null or undefined when calling updateUserProperties.");
            }
            queryParameters = {};
            headerParameters = {};
            headerParameters["Content-Type"] = "application/json";
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/users/{user_id}/properties".replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))),
              method: "PATCH",
              headers: headerParameters,
              query: queryParameters,
              body: UpdateOrganizationPropertiesRequestToJSON(requestParameters.updateOrganizationPropertiesRequest)
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.updateUserProperties = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateUserPropertiesRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  UsersApi2.prototype.updateUserPropertyRaw = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var queryParameters, headerParameters, token, tokenString, response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (requestParameters.userId === null || requestParameters.userId === undefined) {
              throw new RequiredError("userId", "Required parameter requestParameters.userId was null or undefined when calling updateUserProperty.");
            }
            if (requestParameters.propertyKey === null || requestParameters.propertyKey === undefined) {
              throw new RequiredError("propertyKey", "Required parameter requestParameters.propertyKey was null or undefined when calling updateUserProperty.");
            }
            if (requestParameters.value === null || requestParameters.value === undefined) {
              throw new RequiredError("value", "Required parameter requestParameters.value was null or undefined when calling updateUserProperty.");
            }
            queryParameters = {};
            if (requestParameters.value !== undefined) {
              queryParameters["value"] = requestParameters.value;
            }
            headerParameters = {};
            if (!(this.configuration && this.configuration.accessToken))
              return [3, 2];
            token = this.configuration.accessToken;
            return [4, token("kindeBearerAuth", [])];
          case 1:
            tokenString = _a.sent();
            if (tokenString) {
              headerParameters["Authorization"] = "Bearer ".concat(tokenString);
            }
            _a.label = 2;
          case 2:
            return [4, this.request({
              path: "/api/v1/users/{user_id}/properties/{property_key}".replace("{".concat("user_id", "}"), encodeURIComponent(String(requestParameters.userId))).replace("{".concat("property_key", "}"), encodeURIComponent(String(requestParameters.propertyKey))),
              method: "PUT",
              headers: headerParameters,
              query: queryParameters
            }, initOverrides)];
          case 3:
            response = _a.sent();
            return [2, new JSONApiResponse(response, function(jsonValue) {
              return SuccessResponseFromJSON(jsonValue);
            })];
        }
      });
    });
  };
  UsersApi2.prototype.updateUserProperty = function(requestParameters, initOverrides) {
    return __awaiter18(this, undefined, undefined, function() {
      var response;
      return __generator18(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.updateUserPropertyRaw(requestParameters, initOverrides)];
          case 1:
            response = _a.sent();
            return [4, response.value()];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return UsersApi2;
}(BaseAPI);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/oauth2-flows/types.js
var GrantType;
(function(GrantType2) {
  GrantType2["AUTHORIZATION_CODE"] = "AUTHORIZATION_CODE";
  GrantType2["CLIENT_CREDENTIALS"] = "CLIENT_CREDENTIALS";
  GrantType2["PKCE"] = "PKCE";
})(GrantType || (GrantType = {}));
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/types.js
var FlagDataType;
(function(FlagDataType2) {
  FlagDataType2["s"] = "string";
  FlagDataType2["b"] = "boolean";
  FlagDataType2["i"] = "number";
})(FlagDataType || (FlagDataType = {}));
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/environment.js
var JSEnvironment;
(function(JSEnvironment2) {
  JSEnvironment2["BROWSER"] = "BROWSER";
  JSEnvironment2["NODEJS"] = "NODEJS";
})(JSEnvironment || (JSEnvironment = {}));
var currentEnvironment = typeof window === "undefined" ? JSEnvironment.NODEJS : JSEnvironment.BROWSER;
var isNodeEnvironment = function() {
  return currentEnvironment === JSEnvironment.NODEJS;
};
var isBrowserEnvironment = function() {
  return currentEnvironment === JSEnvironment.BROWSER;
};

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/session-managers/BrowserSessionManager.js
var __awaiter19 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator19 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var BrowserSessionManager = function() {
  function BrowserSessionManager2() {
    this.memCache = {};
    if (!isBrowserEnvironment()) {
      throw new Error("BrowserSessionStore must be instantiated on the browser");
    }
  }
  BrowserSessionManager2.prototype.generateItemKey = function(itemKey) {
    return "".concat(BrowserSessionManager2.ITEM_NAME_PREFIX).concat(itemKey);
  };
  BrowserSessionManager2.prototype.destroySession = function() {
    return __awaiter19(this, undefined, undefined, function() {
      return __generator19(this, function(_a) {
        sessionStorage.clear();
        this.memCache = {};
        return [2];
      });
    });
  };
  BrowserSessionManager2.prototype.setSessionItem = function(itemKey, itemValue) {
    return __awaiter19(this, undefined, undefined, function() {
      var key;
      return __generator19(this, function(_a) {
        key = this.generateItemKey(itemKey);
        this.memCache[key] = itemValue;
        return [2];
      });
    });
  };
  BrowserSessionManager2.prototype.setSessionItemBrowser = function(itemKey, itemValue) {
    return __awaiter19(this, undefined, undefined, function() {
      var key, isString, value;
      return __generator19(this, function(_a) {
        key = this.generateItemKey(itemKey);
        isString = typeof itemValue === "string";
        value = !isString ? JSON.stringify(itemValue) : itemValue;
        sessionStorage.setItem(key, value);
        return [2];
      });
    });
  };
  BrowserSessionManager2.prototype.getSessionItem = function(itemKey) {
    var _a;
    return __awaiter19(this, undefined, undefined, function() {
      var key;
      return __generator19(this, function(_b) {
        key = this.generateItemKey(itemKey);
        return [2, (_a = this.memCache[key]) !== null && _a !== undefined ? _a : null];
      });
    });
  };
  BrowserSessionManager2.prototype.getSessionItemBrowser = function(itemKey) {
    return __awaiter19(this, undefined, undefined, function() {
      var key;
      return __generator19(this, function(_a) {
        key = this.generateItemKey(itemKey);
        return [2, sessionStorage.getItem(key)];
      });
    });
  };
  BrowserSessionManager2.prototype.removeSessionItem = function(itemKey) {
    return __awaiter19(this, undefined, undefined, function() {
      var key;
      return __generator19(this, function(_a) {
        key = this.generateItemKey(itemKey);
        delete this.memCache[key];
        return [2];
      });
    });
  };
  BrowserSessionManager2.prototype.removeSessionItemBrowser = function(itemKey) {
    return __awaiter19(this, undefined, undefined, function() {
      var key;
      return __generator19(this, function(_a) {
        key = this.generateItemKey(itemKey);
        sessionStorage.removeItem(key);
        return [2];
      });
    });
  };
  BrowserSessionManager2.ITEM_NAME_PREFIX = "browser-session-store@";
  return BrowserSessionManager2;
}();
// node_modules/jose/dist/node/esm/runtime/base64url.js
import { Buffer as Buffer2 } from "node:buffer";

// node_modules/jose/dist/node/esm/lib/buffer_utils.js
var encoder = new TextEncoder;
var decoder = new TextDecoder;
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}

// node_modules/jose/dist/node/esm/runtime/base64url.js
function normalize(input) {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  return encoded;
}
var decode = (input) => new Uint8Array(Buffer2.from(normalize(input), "base64url"));

// node_modules/jose/dist/node/esm/util/errors.js
class JOSEError extends Error {
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message, options) {
    super(message, options);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class JWTClaimValidationFailed extends JOSEError {
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message, payload, claim = "unspecified", reason = "unspecified") {
    super(message, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
}

class JWTExpired extends JOSEError {
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message, payload, claim = "unspecified", reason = "unspecified") {
    super(message, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
}

class JOSEAlgNotAllowed extends JOSEError {
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
}

class JOSENotSupported extends JOSEError {
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
}
class JWSInvalid extends JOSEError {
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
}

class JWTInvalid extends JOSEError {
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
}
class JWKSInvalid extends JOSEError {
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
}

class JWKSNoMatchingKey extends JOSEError {
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message = "no applicable key found in the JSON Web Key Set", options) {
    super(message, options);
  }
}

class JWKSMultipleMatchingKeys extends JOSEError {
  [Symbol.asyncIterator];
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message, options);
  }
}

class JWKSTimeout extends JOSEError {
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message = "request timed out", options) {
    super(message, options);
  }
}

class JWSSignatureVerificationFailed extends JOSEError {
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message = "signature verification failed", options) {
    super(message, options);
  }
}

// node_modules/jose/dist/node/esm/runtime/is_key_object.js
import * as util2 from "node:util";
var is_key_object_default = (obj) => util2.types.isKeyObject(obj);

// node_modules/jose/dist/node/esm/runtime/webcrypto.js
import * as crypto2 from "node:crypto";
import * as util3 from "node:util";
var webcrypto2 = crypto2.webcrypto;
var webcrypto_default = webcrypto2;
var isCryptoKey = (key) => util3.types.isCryptoKey(key);

// node_modules/jose/dist/node/esm/lib/crypto_key.js
function unusable(name, prop = "algorithm.name") {
  return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
function isAlgorithm(algorithm, name) {
  return algorithm.name === name;
}
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
function checkUsage(key, usages) {
  if (usages.length && !usages.some((expected) => key.usages.includes(expected))) {
    let msg = "CryptoKey does not support this operation, its usages must include ";
    if (usages.length > 2) {
      const last = usages.pop();
      msg += `one of ${usages.join(", ")}, or ${last}.`;
    } else if (usages.length === 2) {
      msg += `one of ${usages[0]} or ${usages[1]}.`;
    } else {
      msg += `${usages[0]}.`;
    }
    throw new TypeError(msg);
  }
}
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (key.algorithm.name !== "Ed25519" && key.algorithm.name !== "Ed448") {
        throw unusable("Ed25519 or Ed448");
      }
      break;
    }
    case "Ed25519": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}

// node_modules/jose/dist/node/esm/lib/invalid_key_input.js
function message(msg, actual, ...types4) {
  types4 = types4.filter(Boolean);
  if (types4.length > 2) {
    const last = types4.pop();
    msg += `one of type ${types4.join(", ")}, or ${last}.`;
  } else if (types4.length === 2) {
    msg += `one of type ${types4[0]} or ${types4[1]}.`;
  } else {
    msg += `of type ${types4[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
var invalid_key_input_default = (actual, ...types4) => {
  return message("Key must be ", actual, ...types4);
};
function withAlg(alg, actual, ...types4) {
  return message(`Key for the ${alg} algorithm must be `, actual, ...types4);
}

// node_modules/jose/dist/node/esm/runtime/is_key_like.js
var is_key_like_default = (key) => is_key_object_default(key) || isCryptoKey(key);
var types4 = ["KeyObject"];
if (globalThis.CryptoKey || webcrypto_default?.CryptoKey) {
  types4.push("CryptoKey");
}

// node_modules/jose/dist/node/esm/lib/is_disjoint.js
var isDisjoint = (...headers) => {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
};
var is_disjoint_default = isDisjoint;

// node_modules/jose/dist/node/esm/lib/is_object.js
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}

// node_modules/jose/dist/node/esm/runtime/get_named_curve.js
import { KeyObject } from "node:crypto";

// node_modules/jose/dist/node/esm/lib/is_jwk.js
function isJWK(key) {
  return isObject(key) && typeof key.kty === "string";
}
function isPrivateJWK(key) {
  return key.kty !== "oct" && typeof key.d === "string";
}
function isPublicJWK(key) {
  return key.kty !== "oct" && typeof key.d === "undefined";
}
function isSecretJWK(key) {
  return isJWK(key) && key.kty === "oct" && typeof key.k === "string";
}

// node_modules/jose/dist/node/esm/runtime/get_named_curve.js
var weakMap = new WeakMap;
var namedCurveToJOSE = (namedCurve) => {
  switch (namedCurve) {
    case "prime256v1":
      return "P-256";
    case "secp384r1":
      return "P-384";
    case "secp521r1":
      return "P-521";
    case "secp256k1":
      return "secp256k1";
    default:
      throw new JOSENotSupported("Unsupported key curve for this operation");
  }
};
var getNamedCurve2 = (kee, raw2) => {
  let key;
  if (isCryptoKey(kee)) {
    key = KeyObject.from(kee);
  } else if (is_key_object_default(kee)) {
    key = kee;
  } else if (isJWK(kee)) {
    return kee.crv;
  } else {
    throw new TypeError(invalid_key_input_default(kee, ...types4));
  }
  if (key.type === "secret") {
    throw new TypeError('only "private" or "public" type keys can be used for this operation');
  }
  switch (key.asymmetricKeyType) {
    case "ed25519":
    case "ed448":
      return `Ed${key.asymmetricKeyType.slice(2)}`;
    case "x25519":
    case "x448":
      return `X${key.asymmetricKeyType.slice(1)}`;
    case "ec": {
      const namedCurve = key.asymmetricKeyDetails.namedCurve;
      if (raw2) {
        return namedCurve;
      }
      return namedCurveToJOSE(namedCurve);
    }
    default:
      throw new TypeError("Invalid asymmetric key type for this operation");
  }
};
var get_named_curve_default = getNamedCurve2;

// node_modules/jose/dist/node/esm/runtime/check_key_length.js
import { KeyObject as KeyObject2 } from "node:crypto";
var check_key_length_default = (key, alg) => {
  let modulusLength;
  try {
    if (key instanceof KeyObject2) {
      modulusLength = key.asymmetricKeyDetails?.modulusLength;
    } else {
      modulusLength = Buffer.from(key.n, "base64url").byteLength << 3;
    }
  } catch {
  }
  if (typeof modulusLength !== "number" || modulusLength < 2048) {
    throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
  }
};

// node_modules/jose/dist/node/esm/runtime/jwk_to_key.js
import { createPrivateKey, createPublicKey } from "node:crypto";
var parse2 = (key) => {
  if (key.d) {
    return createPrivateKey({ format: "jwk", key });
  }
  return createPublicKey({ format: "jwk", key });
};
var jwk_to_key_default = parse2;

// node_modules/jose/dist/node/esm/key/import.js
async function importJWK(jwk, alg) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  alg ||= jwk.alg;
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== undefined) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
    case "EC":
    case "OKP":
      return jwk_to_key_default({ ...jwk, alg });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}

// node_modules/jose/dist/node/esm/lib/check_key_type.js
var tag = (key) => key?.[Symbol.toStringTag];
var jwkMatchesOp = (alg, key, usage) => {
  if (key.use !== undefined && key.use !== "sig") {
    throw new TypeError("Invalid key for this operation, when present its use must be sig");
  }
  if (key.key_ops !== undefined && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(`Invalid key for this operation, when present its key_ops must include ${usage}`);
  }
  if (key.alg !== undefined && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, when present its alg must be ${alg}`);
  }
  return true;
};
var symmetricTypeCheck = (alg, key, usage, allowJwk) => {
  if (key instanceof Uint8Array)
    return;
  if (allowJwk && isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types4, "Uint8Array", allowJwk ? "JSON Web Key" : null));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
};
var asymmetricTypeCheck = (alg, key, usage, allowJwk) => {
  if (allowJwk && isJWK(key)) {
    switch (usage) {
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types4, allowJwk ? "JSON Web Key" : null));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (usage === "sign" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
  }
  if (usage === "decrypt" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
  }
  if (key.algorithm && usage === "verify" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
  }
  if (key.algorithm && usage === "encrypt" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
  }
};
function checkKeyType(allowJwk, alg, key, usage) {
  const symmetric = alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg);
  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}
var check_key_type_default = checkKeyType.bind(undefined, false);
var checkKeyTypeWithJwk = checkKeyType.bind(undefined, true);

// node_modules/jose/dist/node/esm/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== undefined && protectedHeader?.crit === undefined) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === undefined) {
    return new Set;
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== undefined) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === undefined) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === undefined) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
var validate_crit_default = validateCrit;

// node_modules/jose/dist/node/esm/lib/validate_algorithms.js
var validateAlgorithms = (option, algorithms) => {
  if (algorithms !== undefined && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return;
  }
  return new Set(algorithms);
};
var validate_algorithms_default = validateAlgorithms;

// node_modules/jose/dist/node/esm/runtime/verify.js
import * as crypto4 from "node:crypto";
import { promisify as promisify2 } from "node:util";

// node_modules/jose/dist/node/esm/runtime/dsa_digest.js
function dsaDigest(alg) {
  switch (alg) {
    case "PS256":
    case "RS256":
    case "ES256":
    case "ES256K":
      return "sha256";
    case "PS384":
    case "RS384":
    case "ES384":
      return "sha384";
    case "PS512":
    case "RS512":
    case "ES512":
      return "sha512";
    case "Ed25519":
    case "EdDSA":
      return;
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}

// node_modules/jose/dist/node/esm/runtime/node_key.js
import { constants, KeyObject as KeyObject3 } from "node:crypto";
var ecCurveAlgMap = new Map([
  ["ES256", "P-256"],
  ["ES256K", "secp256k1"],
  ["ES384", "P-384"],
  ["ES512", "P-521"]
]);
function keyForCrypto(alg, key) {
  let asymmetricKeyType;
  let asymmetricKeyDetails;
  let isJWK2;
  if (key instanceof KeyObject3) {
    asymmetricKeyType = key.asymmetricKeyType;
    asymmetricKeyDetails = key.asymmetricKeyDetails;
  } else {
    isJWK2 = true;
    switch (key.kty) {
      case "RSA":
        asymmetricKeyType = "rsa";
        break;
      case "EC":
        asymmetricKeyType = "ec";
        break;
      case "OKP": {
        if (key.crv === "Ed25519") {
          asymmetricKeyType = "ed25519";
          break;
        }
        if (key.crv === "Ed448") {
          asymmetricKeyType = "ed448";
          break;
        }
        throw new TypeError("Invalid key for this operation, its crv must be Ed25519 or Ed448");
      }
      default:
        throw new TypeError("Invalid key for this operation, its kty must be RSA, OKP, or EC");
    }
  }
  let options;
  switch (alg) {
    case "Ed25519":
      if (asymmetricKeyType !== "ed25519") {
        throw new TypeError(`Invalid key for this operation, its asymmetricKeyType must be ed25519`);
      }
      break;
    case "EdDSA":
      if (!["ed25519", "ed448"].includes(asymmetricKeyType)) {
        throw new TypeError("Invalid key for this operation, its asymmetricKeyType must be ed25519 or ed448");
      }
      break;
    case "RS256":
    case "RS384":
    case "RS512":
      if (asymmetricKeyType !== "rsa") {
        throw new TypeError("Invalid key for this operation, its asymmetricKeyType must be rsa");
      }
      check_key_length_default(key, alg);
      break;
    case "PS256":
    case "PS384":
    case "PS512":
      if (asymmetricKeyType === "rsa-pss") {
        const { hashAlgorithm, mgf1HashAlgorithm, saltLength } = asymmetricKeyDetails;
        const length = parseInt(alg.slice(-3), 10);
        if (hashAlgorithm !== undefined && (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm)) {
          throw new TypeError(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${alg}`);
        }
        if (saltLength !== undefined && saltLength > length >> 3) {
          throw new TypeError(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${alg}`);
        }
      } else if (asymmetricKeyType !== "rsa") {
        throw new TypeError("Invalid key for this operation, its asymmetricKeyType must be rsa or rsa-pss");
      }
      check_key_length_default(key, alg);
      options = {
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: constants.RSA_PSS_SALTLEN_DIGEST
      };
      break;
    case "ES256":
    case "ES256K":
    case "ES384":
    case "ES512": {
      if (asymmetricKeyType !== "ec") {
        throw new TypeError("Invalid key for this operation, its asymmetricKeyType must be ec");
      }
      const actual = get_named_curve_default(key);
      const expected = ecCurveAlgMap.get(alg);
      if (actual !== expected) {
        throw new TypeError(`Invalid key curve for the algorithm, its curve must be ${expected}, got ${actual}`);
      }
      options = { dsaEncoding: "ieee-p1363" };
      break;
    }
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
  if (isJWK2) {
    return { format: "jwk", key, ...options };
  }
  return options ? { ...options, key } : key;
}

// node_modules/jose/dist/node/esm/runtime/sign.js
import * as crypto3 from "node:crypto";
import { promisify } from "node:util";

// node_modules/jose/dist/node/esm/runtime/hmac_digest.js
function hmacDigest(alg) {
  switch (alg) {
    case "HS256":
      return "sha256";
    case "HS384":
      return "sha384";
    case "HS512":
      return "sha512";
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}

// node_modules/jose/dist/node/esm/runtime/get_sign_verify_key.js
import { KeyObject as KeyObject4, createSecretKey } from "node:crypto";
function getSignVerifyKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalid_key_input_default(key, ...types4));
    }
    return createSecretKey(key);
  }
  if (key instanceof KeyObject4) {
    return key;
  }
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return KeyObject4.from(key);
  }
  if (isJWK(key)) {
    if (alg.startsWith("HS")) {
      return createSecretKey(Buffer.from(key.k, "base64url"));
    }
    return key;
  }
  throw new TypeError(invalid_key_input_default(key, ...types4, "Uint8Array", "JSON Web Key"));
}

// node_modules/jose/dist/node/esm/runtime/sign.js
var oneShotSign = promisify(crypto3.sign);
var sign2 = async (alg, key, data) => {
  const k = getSignVerifyKey(alg, key, "sign");
  if (alg.startsWith("HS")) {
    const hmac = crypto3.createHmac(hmacDigest(alg), k);
    hmac.update(data);
    return hmac.digest();
  }
  return oneShotSign(dsaDigest(alg), data, keyForCrypto(alg, k));
};
var sign_default = sign2;

// node_modules/jose/dist/node/esm/runtime/verify.js
var oneShotVerify = promisify2(crypto4.verify);
var verify2 = async (alg, key, signature, data) => {
  const k = getSignVerifyKey(alg, key, "verify");
  if (alg.startsWith("HS")) {
    const expected = await sign_default(alg, k, data);
    const actual = signature;
    try {
      return crypto4.timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }
  const algorithm = dsaDigest(alg);
  const keyInput = keyForCrypto(alg, k);
  try {
    return await oneShotVerify(algorithm, data, keyInput, signature);
  } catch {
    return false;
  }
};
var verify_default = verify2;

// node_modules/jose/dist/node/esm/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === undefined && jws.header === undefined) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== undefined && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === undefined) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== undefined && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!is_disjoint_default(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validate_crit_default(JWSInvalid, new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validate_algorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
    checkKeyTypeWithJwk(alg, key, "verify");
    if (isJWK(key)) {
      key = await importJWK(key, alg);
    }
  } else {
    checkKeyTypeWithJwk(alg, key, "verify");
  }
  const data = concat(encoder.encode(jws.protected ?? ""), encoder.encode("."), typeof jws.payload === "string" ? encoder.encode(jws.payload) : jws.payload);
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid("Failed to base64url decode the signature");
  }
  const verified = await verify_default(alg, key, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed;
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid("Failed to base64url decode the payload");
    }
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== undefined) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== undefined) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key };
  }
  return result;
}

// node_modules/jose/dist/node/esm/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}

// node_modules/jose/dist/node/esm/lib/epoch.js
var epoch_default = (date) => Math.floor(date.getTime() / 1000);

// node_modules/jose/dist/node/esm/lib/secs.js
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var secs_default = (str) => {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
};

// node_modules/jose/dist/node/esm/lib/jwt_claims_set.js
var normalizeTyp = (value) => value.toLowerCase().replace(/^application\//, "");
var checkAudiencePresence = (audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
};
var jwt_claims_set_default = (protectedHeader, encodedPayload, options = {}) => {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== undefined)
    presenceCheck.push("iat");
  if (audience !== undefined)
    presenceCheck.push("aud");
  if (subject !== undefined)
    presenceCheck.push("sub");
  if (issuer !== undefined)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs_default(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch_default(currentDate || new Date);
  if ((payload.iat !== undefined || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== undefined) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== undefined) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs_default(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
};

// node_modules/jose/dist/node/esm/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = jwt_claims_set_default(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
// node_modules/jose/dist/node/esm/jwks/local.js
function getKtyFromAlg(alg) {
  switch (typeof alg === "string" && alg.slice(0, 2)) {
    case "RS":
    case "PS":
      return "RSA";
    case "ES":
      return "EC";
    case "Ed":
      return "OKP";
    default:
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
  }
}
function isJWKSLike(jwks) {
  return jwks && typeof jwks === "object" && Array.isArray(jwks.keys) && jwks.keys.every(isJWKLike);
}
function isJWKLike(key) {
  return isObject(key);
}
function clone(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

class LocalJWKSet {
  _jwks;
  _cached = new WeakMap;
  constructor(jwks) {
    if (!isJWKSLike(jwks)) {
      throw new JWKSInvalid("JSON Web Key Set malformed");
    }
    this._jwks = clone(jwks);
  }
  async getKey(protectedHeader, token) {
    const { alg, kid } = { ...protectedHeader, ...token?.header };
    const kty = getKtyFromAlg(alg);
    const candidates = this._jwks.keys.filter((jwk2) => {
      let candidate = kty === jwk2.kty;
      if (candidate && typeof kid === "string") {
        candidate = kid === jwk2.kid;
      }
      if (candidate && typeof jwk2.alg === "string") {
        candidate = alg === jwk2.alg;
      }
      if (candidate && typeof jwk2.use === "string") {
        candidate = jwk2.use === "sig";
      }
      if (candidate && Array.isArray(jwk2.key_ops)) {
        candidate = jwk2.key_ops.includes("verify");
      }
      if (candidate) {
        switch (alg) {
          case "ES256":
            candidate = jwk2.crv === "P-256";
            break;
          case "ES256K":
            candidate = jwk2.crv === "secp256k1";
            break;
          case "ES384":
            candidate = jwk2.crv === "P-384";
            break;
          case "ES512":
            candidate = jwk2.crv === "P-521";
            break;
          case "Ed25519":
            candidate = jwk2.crv === "Ed25519";
            break;
          case "EdDSA":
            candidate = jwk2.crv === "Ed25519" || jwk2.crv === "Ed448";
            break;
        }
      }
      return candidate;
    });
    const { 0: jwk, length } = candidates;
    if (length === 0) {
      throw new JWKSNoMatchingKey;
    }
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys;
      const { _cached } = this;
      error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates) {
          try {
            yield await importWithAlgCache(_cached, jwk2, alg);
          } catch {
          }
        }
      };
      throw error;
    }
    return importWithAlgCache(this._cached, jwk, alg);
  }
}
async function importWithAlgCache(cache, jwk, alg) {
  const cached = cache.get(jwk) || cache.set(jwk, {}).get(jwk);
  if (cached[alg] === undefined) {
    const key = await importJWK({ ...jwk, ext: true }, alg);
    if (key instanceof Uint8Array || key.type !== "public") {
      throw new JWKSInvalid("JSON Web Key Set members must be public keys");
    }
    cached[alg] = key;
  }
  return cached[alg];
}
function createLocalJWKSet(jwks) {
  const set = new LocalJWKSet(jwks);
  const localJWKSet = async (protectedHeader, token) => set.getKey(protectedHeader, token);
  Object.defineProperties(localJWKSet, {
    jwks: {
      value: () => clone(set._jwks),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return localJWKSet;
}
// node_modules/jose/dist/node/esm/runtime/fetch_jwks.js
import * as http from "node:http";
import * as https from "node:https";
import { once } from "node:events";
var fetchJwks = async (url, timeout, options) => {
  let get3;
  switch (url.protocol) {
    case "https:":
      get3 = https.get;
      break;
    case "http:":
      get3 = http.get;
      break;
    default:
      throw new TypeError("Unsupported URL protocol.");
  }
  const { agent, headers } = options;
  const req = get3(url.href, {
    agent,
    timeout,
    headers
  });
  const [response] = await Promise.race([once(req, "response"), once(req, "timeout")]);
  if (!response) {
    req.destroy();
    throw new JWKSTimeout;
  }
  if (response.statusCode !== 200) {
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  }
  const parts = [];
  for await (const part of response) {
    parts.push(part);
  }
  try {
    return JSON.parse(decoder.decode(concat(...parts)));
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
};
var fetch_jwks_default = fetchJwks;

// node_modules/jose/dist/node/esm/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair !== "undefined" || typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers" || typeof EdgeRuntime !== "undefined" && EdgeRuntime === "vercel";
}
var USER_AGENT;
if (typeof navigator === "undefined" || !navigator.userAgent?.startsWith?.("Mozilla/5.0 ")) {
  const NAME = "jose";
  const VERSION = "v5.10.0";
  USER_AGENT = `${NAME}/${VERSION}`;
}
var jwksCache = Symbol();
function isFreshJwksCache(input, cacheMaxAge) {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  if (!("uat" in input) || typeof input.uat !== "number" || Date.now() - input.uat >= cacheMaxAge) {
    return false;
  }
  if (!("jwks" in input) || !isObject(input.jwks) || !Array.isArray(input.jwks.keys) || !Array.prototype.every.call(input.jwks.keys, isObject)) {
    return false;
  }
  return true;
}

class RemoteJWKSet {
  _url;
  _timeoutDuration;
  _cooldownDuration;
  _cacheMaxAge;
  _jwksTimestamp;
  _pendingFetch;
  _options;
  _local;
  _cache;
  constructor(url, options) {
    if (!(url instanceof URL)) {
      throw new TypeError("url must be an instance of URL");
    }
    this._url = new URL(url.href);
    this._options = { agent: options?.agent, headers: options?.headers };
    this._timeoutDuration = typeof options?.timeoutDuration === "number" ? options?.timeoutDuration : 5000;
    this._cooldownDuration = typeof options?.cooldownDuration === "number" ? options?.cooldownDuration : 30000;
    this._cacheMaxAge = typeof options?.cacheMaxAge === "number" ? options?.cacheMaxAge : 600000;
    if (options?.[jwksCache] !== undefined) {
      this._cache = options?.[jwksCache];
      if (isFreshJwksCache(options?.[jwksCache], this._cacheMaxAge)) {
        this._jwksTimestamp = this._cache.uat;
        this._local = createLocalJWKSet(this._cache.jwks);
      }
    }
  }
  coolingDown() {
    return typeof this._jwksTimestamp === "number" ? Date.now() < this._jwksTimestamp + this._cooldownDuration : false;
  }
  fresh() {
    return typeof this._jwksTimestamp === "number" ? Date.now() < this._jwksTimestamp + this._cacheMaxAge : false;
  }
  async getKey(protectedHeader, token) {
    if (!this._local || !this.fresh()) {
      await this.reload();
    }
    try {
      return await this._local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey) {
        if (this.coolingDown() === false) {
          await this.reload();
          return this._local(protectedHeader, token);
        }
      }
      throw err;
    }
  }
  async reload() {
    if (this._pendingFetch && isCloudflareWorkers()) {
      this._pendingFetch = undefined;
    }
    const headers = new Headers(this._options.headers);
    if (USER_AGENT && !headers.has("User-Agent")) {
      headers.set("User-Agent", USER_AGENT);
      this._options.headers = Object.fromEntries(headers.entries());
    }
    this._pendingFetch ||= fetch_jwks_default(this._url, this._timeoutDuration, this._options).then((json) => {
      this._local = createLocalJWKSet(json);
      if (this._cache) {
        this._cache.uat = Date.now();
        this._cache.jwks = json;
      }
      this._jwksTimestamp = Date.now();
      this._pendingFetch = undefined;
    }).catch((err) => {
      this._pendingFetch = undefined;
      throw err;
    });
    await this._pendingFetch;
  }
}
function createRemoteJWKSet(url, options) {
  const set = new RemoteJWKSet(url, options);
  const remoteJWKSet = async (protectedHeader, token) => set.getKey(protectedHeader, token);
  Object.defineProperties(remoteJWKSet, {
    coolingDown: {
      get: () => set.coolingDown(),
      enumerable: true,
      configurable: false
    },
    fresh: {
      get: () => set.fresh(),
      enumerable: true,
      configurable: false
    },
    reload: {
      value: () => set.reload(),
      enumerable: true,
      configurable: false,
      writable: false
    },
    reloading: {
      get: () => !!set._pendingFetch,
      enumerable: true,
      configurable: false
    },
    jwks: {
      value: () => set._local?.jwks(),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return remoteJWKSet;
}
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/feature-flags.js
var exports_feature_flags = {};
__export(exports_feature_flags, {
  getStringFlag: () => getStringFlag,
  getIntegerFlag: () => getIntegerFlag,
  getFlag: () => getFlag,
  getBooleanFlag: () => getBooleanFlag
});

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/token-claims.js
var exports_token_claims = {};
__export(exports_token_claims, {
  getUserOrganizations: () => getUserOrganizations,
  getPermissions: () => getPermissions,
  getPermission: () => getPermission,
  getOrganization: () => getOrganization,
  getClaimValue: () => getClaimValue,
  getClaim: () => getClaim
});
var __awaiter20 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator20 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var __read2 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === undefined || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
};
var getClaimValue = function(sessionManager, claim, type, validationDetails) {
  if (type === undefined) {
    type = "access_token";
  }
  return __awaiter20(undefined, undefined, undefined, function() {
    var token, key, decodedToken, tokenPayload;
    var _a;
    return __generator20(this, function(_b) {
      switch (_b.label) {
        case 0:
          return [4, sessionManager.getSessionItem("".concat(type))];
        case 1:
          token = _b.sent();
          return [4, validationDetails.keyProvider()];
        case 2:
          key = _b.sent();
          return [4, jwtVerify(token, key, type === "id_token" ? { currentDate: new Date(0) } : {})];
        case 3:
          decodedToken = _b.sent();
          tokenPayload = decodedToken.payload;
          return [2, (_a = tokenPayload[claim]) !== null && _a !== undefined ? _a : null];
      }
    });
  });
};
var getClaim = function(sessionManager, claim, type, validationDetails) {
  return __awaiter20(undefined, undefined, undefined, function() {
    var _a;
    return __generator20(this, function(_b) {
      switch (_b.label) {
        case 0:
          _a = {
            name: claim
          };
          return [4, getClaimValue(sessionManager, claim, type, validationDetails)];
        case 1:
          return [2, (_a.value = _b.sent(), _a)];
      }
    });
  });
};
var getPermission = function(sessionManager, name, validationDetails) {
  return __awaiter20(undefined, undefined, undefined, function() {
    var permissions, isGranted, orgCode;
    var _a;
    return __generator20(this, function(_b) {
      switch (_b.label) {
        case 0:
          return [4, getClaimValue(sessionManager, "permissions", "access_token", validationDetails)];
        case 1:
          permissions = (_a = _b.sent()) !== null && _a !== undefined ? _a : [];
          isGranted = permissions.some(function(p) {
            return p === name;
          });
          return [4, getClaimValue(sessionManager, "org_code", "access_token", validationDetails)];
        case 2:
          orgCode = _b.sent();
          return [2, { orgCode, isGranted }];
      }
    });
  });
};
var getOrganization = function(sessionManager, validationDetails) {
  return __awaiter20(undefined, undefined, undefined, function() {
    var _a;
    return __generator20(this, function(_b) {
      switch (_b.label) {
        case 0:
          _a = {};
          return [4, getClaimValue(sessionManager, "org_code", "access_token", validationDetails)];
        case 1:
          return [2, (_a.orgCode = _b.sent(), _a)];
      }
    });
  });
};
var getPermissions = function(sessionManager, validationDetails) {
  return __awaiter20(undefined, undefined, undefined, function() {
    var _a, permissions, orgCode;
    var _b;
    return __generator20(this, function(_c) {
      switch (_c.label) {
        case 0:
          return [4, Promise.all([
            (_b = getClaimValue(sessionManager, "permissions", "access_token", validationDetails)) !== null && _b !== undefined ? _b : [],
            getClaimValue(sessionManager, "org_code", "access_token", validationDetails)
          ])];
        case 1:
          _a = __read2.apply(undefined, [_c.sent(), 2]), permissions = _a[0], orgCode = _a[1];
          return [2, {
            permissions,
            orgCode
          }];
      }
    });
  });
};
var getUserOrganizations = function(sessionManager, validationDetails) {
  return __awaiter20(undefined, undefined, undefined, function() {
    var _a;
    var _b;
    return __generator20(this, function(_c) {
      switch (_c.label) {
        case 0:
          _a = {};
          return [4, getClaimValue(sessionManager, "org_codes", "id_token", validationDetails)];
        case 1:
          return [2, (_a.orgCodes = (_b = _c.sent()) !== null && _b !== undefined ? _b : [], _a)];
      }
    });
  });
};

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/feature-flags.js
var __awaiter21 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator21 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var getFlag = function(sessionManager, code, validationDetails, defaultValue, type) {
  return __awaiter21(undefined, undefined, undefined, function() {
    var featureFlags, flag, response;
    var _a, _b, _c;
    return __generator21(this, function(_d) {
      switch (_d.label) {
        case 0:
          return [4, getClaimValue(sessionManager, "feature_flags", "access_token", validationDetails)];
        case 1:
          featureFlags = (_a = _d.sent()) !== null && _a !== undefined ? _a : {};
          flag = featureFlags[code];
          if (!flag && defaultValue === undefined) {
            throw new Error("Flag ".concat(code, " was not found, and no default value has been provided"));
          }
          if ((flag === null || flag === undefined ? undefined : flag.t) && type && type !== (flag === null || flag === undefined ? undefined : flag.t)) {
            throw new Error("Flag ".concat(code, " is of type ").concat(FlagDataType[flag.t], ", expected type is ").concat(FlagDataType[type]));
          }
          response = {
            is_default: (flag === null || flag === undefined ? undefined : flag.v) === undefined,
            value: (_b = flag === null || flag === undefined ? undefined : flag.v) !== null && _b !== undefined ? _b : defaultValue,
            code
          };
          if (!response.is_default) {
            response.type = FlagDataType[(_c = flag === null || flag === undefined ? undefined : flag.t) !== null && _c !== undefined ? _c : type];
          }
          return [2, response];
      }
    });
  });
};
var getIntegerFlag = function(sessionManager, code, validationDetails, defaultValue) {
  return __awaiter21(undefined, undefined, undefined, function() {
    return __generator21(this, function(_a) {
      switch (_a.label) {
        case 0:
          return [4, getFlag(sessionManager, code, validationDetails, defaultValue, "i")];
        case 1:
          return [2, _a.sent().value];
      }
    });
  });
};
var getStringFlag = function(sessionManager, code, validationDetails, defaultValue) {
  return __awaiter21(undefined, undefined, undefined, function() {
    return __generator21(this, function(_a) {
      switch (_a.label) {
        case 0:
          return [4, getFlag(sessionManager, code, validationDetails, defaultValue, "s")];
        case 1:
          return [2, _a.sent().value];
      }
    });
  });
};
var getBooleanFlag = function(sessionManager, code, validationDetails, defaultValue) {
  return __awaiter21(undefined, undefined, undefined, function() {
    return __generator21(this, function(_a) {
      switch (_a.label) {
        case 0:
          return [4, getFlag(sessionManager, code, validationDetails, defaultValue, "b")];
        case 1:
          return [2, _a.sent().value];
      }
    });
  });
};
// node_modules/uncrypto/dist/crypto.node.mjs
import nodeCrypto from "node:crypto";
var subtle = nodeCrypto.webcrypto?.subtle || {};
var getRandomValues = (array) => {
  return nodeCrypto.webcrypto.getRandomValues(array);
};

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/random-string.js
var generateRandomString = function(length) {
  if (length === undefined) {
    length = 28;
  }
  var bytesNeeded = Math.ceil(length / 2);
  var array = new Uint32Array(bytesNeeded);
  getRandomValues(array);
  var result = Array.from(array, function(dec) {
    return ("0" + dec.toString(16)).slice(-2);
  }).join("");
  if (length % 2 !== 0) {
    result = result.slice(0, -1);
  }
  return result;
};

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/code-challenge.js
var __awaiter22 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator22 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var __read3 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === undefined || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
};
var __spreadArray2 = function(to, from, pack) {
  if (pack || arguments.length === 2)
    for (var i = 0, l = from.length, ar;i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar)
          ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var base64UrlEncode = function(str) {
  return btoa(String.fromCharCode.apply(String, __spreadArray2([], __read3(new Uint8Array(str)), false))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
var sha2562 = function(plain) {
  return __awaiter22(undefined, undefined, undefined, function() {
    var encoder2, data;
    return __generator22(this, function(_a) {
      switch (_a.label) {
        case 0:
          encoder2 = new TextEncoder;
          data = encoder2.encode(plain);
          return [4, subtle.digest("SHA-256", data)];
        case 1:
          return [2, _a.sent()];
      }
    });
  });
};
var setupCodeChallenge = function() {
  return __awaiter22(undefined, undefined, undefined, function() {
    var secret, challenge, _a;
    return __generator22(this, function(_b) {
      switch (_b.label) {
        case 0:
          secret = generateRandomString(50);
          _a = base64UrlEncode;
          return [4, sha2562(secret)];
        case 1:
          challenge = _a.apply(undefined, [_b.sent()]);
          return [2, { challenge, verifier: secret }];
      }
    });
  });
};
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/exceptions.js
var __extends19 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var KindeSDKErrorCode;
(function(KindeSDKErrorCode2) {
  KindeSDKErrorCode2["INVALID_TOKEN_MEMORY_COMMIT"] = "INVALID_TOKEN_MEMORY_COMMIT";
  KindeSDKErrorCode2["FAILED_TOKENS_REFRESH_ATTEMPT"] = "FAILED_TOKENS_REFRESH_ATTEMPT";
})(KindeSDKErrorCode || (KindeSDKErrorCode = {}));
var KindeSDKError = function(_super) {
  __extends19(KindeSDKError2, _super);
  function KindeSDKError2(errorCode, message2) {
    var _this = _super.call(this, message2) || this;
    _this.errorCode = errorCode;
    _this.name = "KindeSDKError";
    Object.setPrototypeOf(_this, KindeSDKError2.prototype);
    return _this;
  }
  return KindeSDKError2;
}(Error);

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/token-utils.js
var __awaiter23 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator23 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var commitTokenToSession = function(sessionManager, token, type, validationDetails) {
  return __awaiter23(undefined, undefined, undefined, function() {
    var key, e_1;
    return __generator23(this, function(_a) {
      switch (_a.label) {
        case 0:
          if (!!token)
            return [3, 2];
          return [4, sessionManager.removeSessionItem(type)];
        case 1:
          _a.sent();
          return [2];
        case 2:
          if (!(type === "access_token" || type === "id_token"))
            return [3, 7];
          _a.label = 3;
        case 3:
          _a.trys.push([3, 6, , 7]);
          return [4, validationDetails.keyProvider()];
        case 4:
          key = _a.sent();
          return [4, jwtVerify(token, key)];
        case 5:
          _a.sent();
          return [3, 7];
        case 6:
          e_1 = _a.sent();
          throw new KindeSDKError(KindeSDKErrorCode.INVALID_TOKEN_MEMORY_COMMIT, "Attempting to commit invalid ".concat(type, ' token "').concat(token, '" to memory'));
        case 7:
          return [4, sessionManager.setSessionItem(type, token)];
        case 8:
          _a.sent();
          return [2];
      }
    });
  });
};
var commitTokensToSession = function(sessionManager, tokens, validationDetails) {
  return __awaiter23(undefined, undefined, undefined, function() {
    return __generator23(this, function(_a) {
      switch (_a.label) {
        case 0:
          return [4, Promise.all([
            commitTokenToSession(sessionManager, tokens.refresh_token, "refresh_token", validationDetails),
            commitTokenToSession(sessionManager, tokens.access_token, "access_token", validationDetails),
            commitTokenToSession(sessionManager, tokens.id_token, "id_token", validationDetails)
          ])];
        case 1:
          _a.sent();
          return [2];
      }
    });
  });
};
var getRefreshToken = function(sessionManager) {
  return __awaiter23(undefined, undefined, undefined, function() {
    return __generator23(this, function(_a) {
      switch (_a.label) {
        case 0:
          return [4, sessionManager.getSessionItem("refresh_token")];
        case 1:
          return [2, _a.sent()];
      }
    });
  });
};
var getAccessToken = function(sessionManager) {
  return __awaiter23(undefined, undefined, undefined, function() {
    return __generator23(this, function(_a) {
      switch (_a.label) {
        case 0:
          return [4, sessionManager.getSessionItem("access_token")];
        case 1:
          return [2, _a.sent()];
      }
    });
  });
};
var getUserFromSession = function(sessionManager, validationDetails) {
  return __awaiter23(undefined, undefined, undefined, function() {
    var idTokenString, idToken, _a, _b, user;
    var _c;
    return __generator23(this, function(_d) {
      switch (_d.label) {
        case 0:
          return [4, sessionManager.getSessionItem("id_token")];
        case 1:
          idTokenString = _d.sent();
          _a = jwtVerify;
          _b = [idTokenString];
          return [4, validationDetails.keyProvider()];
        case 2:
          return [4, _a.apply(undefined, _b.concat([_d.sent(), { currentDate: new Date(0) }]))];
        case 3:
          idToken = _d.sent();
          user = {
            family_name: idToken.payload.family_name,
            given_name: idToken.payload.given_name,
            picture: (_c = idToken.payload.picture) !== null && _c !== undefined ? _c : null,
            email: idToken.payload.email,
            id: idToken.payload.sub
          };
          return [2, user];
      }
    });
  });
};
var isTokenExpired = function(token, validationDetails) {
  return __awaiter23(undefined, undefined, undefined, function() {
    var currentUnixTime, tokenPayload, _a, _b, e_2;
    return __generator23(this, function(_c) {
      switch (_c.label) {
        case 0:
          if (!token)
            return [2, true];
          _c.label = 1;
        case 1:
          _c.trys.push([1, 4, , 5]);
          currentUnixTime = Math.floor(Date.now() / 1000);
          _a = jwtVerify;
          _b = [token];
          return [4, validationDetails.keyProvider()];
        case 2:
          return [4, _a.apply(undefined, _b.concat([_c.sent()]))];
        case 3:
          tokenPayload = _c.sent();
          if (tokenPayload.payload.exp === undefined)
            return [2, true];
          return [2, currentUnixTime >= tokenPayload.payload.exp];
        case 4:
          e_2 = _c.sent();
          return [2, true];
        case 5:
          return [2];
      }
    });
  });
};
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/validate-client-secret.js
var validateClientSecret = function(secret) {
  var _a;
  return !!((_a = secret.match("^[a-zA-Z0-9]{40,60}$")) === null || _a === undefined ? undefined : _a.length);
};
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/version.js
var SDK_VERSION = "2.9.1";
var getSDKHeader = function(options) {
  var _a, _b;
  if (options === undefined) {
    options = {};
  }
  var version = (_a = options.frameworkVersion) !== null && _a !== undefined ? _a : SDK_VERSION;
  var framework = (_b = options.framework) !== null && _b !== undefined ? _b : "TypeScript";
  var headerValue = "".concat(framework, "/").concat(version);
  return ["Kinde-SDK", headerValue];
};

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/utilities/remote-jwks-cache.js
var __awaiter24 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator24 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var remoteJwksCache = {};
var getRemoteJwks = function(domain) {
  return __awaiter24(undefined, undefined, undefined, function() {
    var func;
    return __generator24(this, function(_a) {
      if (remoteJwksCache[domain] !== undefined) {
        return [2, remoteJwksCache[domain]];
      }
      func = createRemoteJWKSet(new URL("".concat(domain, "/.well-known/jwks.json")), {
        cacheMaxAge: 1000 * 60 * 60 * 24
      });
      remoteJwksCache[domain] = func;
      return [2, func];
    });
  });
};

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/oauth2-flows/ClientCredentials.js
var __awaiter25 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator25 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var __read4 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === undefined || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
};
var __spreadArray3 = function(to, from, pack) {
  if (pack || arguments.length === 2)
    for (var i = 0, l = from.length, ar;i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar)
          ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var ClientCredentials = function() {
  function ClientCredentials2(config) {
    var _this = this;
    this.config = config;
    var { authDomain, logoutRedirectURL } = config;
    this.logoutEndpoint = "".concat(authDomain, "/logout?redirect=").concat(logoutRedirectURL !== null && logoutRedirectURL !== undefined ? logoutRedirectURL : "");
    this.tokenEndpoint = "".concat(authDomain, "/oauth2/token");
    this.config = config;
    var keyProvider = function() {
      return __awaiter25(_this, undefined, undefined, function() {
        var func, _a;
        return __generator25(this, function(_b) {
          switch (_b.label) {
            case 0:
              if (!(config.jwks !== undefined))
                return [3, 1];
              _a = createLocalJWKSet(config.jwks);
              return [3, 3];
            case 1:
              return [4, getRemoteJwks(authDomain)];
            case 2:
              _a = _b.sent();
              _b.label = 3;
            case 3:
              func = _a;
              return [4, func({ alg: "RS256" })];
            case 4:
              return [2, _b.sent()];
          }
        });
      });
    };
    this.tokenValidationDetails = {
      issuer: config.authDomain,
      audience: config.audience,
      keyProvider
    };
  }
  ClientCredentials2.prototype.getToken = function(sessionManager) {
    return __awaiter25(this, undefined, undefined, function() {
      var accessToken, isTokenExpired2, payload;
      return __generator25(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, getAccessToken(sessionManager)];
          case 1:
            accessToken = _a.sent();
            return [4, isTokenExpired(accessToken, this.tokenValidationDetails)];
          case 2:
            isTokenExpired2 = _a.sent();
            if (accessToken && !isTokenExpired2) {
              return [2, accessToken];
            }
            return [4, this.fetchAccessTokenFor(sessionManager)];
          case 3:
            payload = _a.sent();
            return [4, commitTokenToSession(sessionManager, payload.access_token, "access_token", this.tokenValidationDetails)];
          case 4:
            _a.sent();
            return [2, payload.access_token];
        }
      });
    });
  };
  ClientCredentials2.prototype.fetchAccessTokenFor = function(sessionManager) {
    return __awaiter25(this, undefined, undefined, function() {
      var body, headers, config, response, payload, errorPayload, errorDescription, message2;
      return __generator25(this, function(_a) {
        switch (_a.label) {
          case 0:
            body = this.generateTokenURLParams();
            headers = new Headers;
            headers.append("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
            headers.append.apply(headers, __spreadArray3([], __read4(getSDKHeader({
              frameworkVersion: this.config.frameworkVersion,
              framework: this.config.framework
            })), false));
            config = { method: "POST", headers, body };
            return [4, fetch(this.tokenEndpoint, config)];
          case 1:
            response = _a.sent();
            return [4, response.json()];
          case 2:
            payload = _a.sent();
            errorPayload = payload;
            if (!errorPayload.error)
              return [3, 4];
            return [4, sessionManager.destroySession()];
          case 3:
            _a.sent();
            errorDescription = errorPayload.error_description;
            message2 = errorDescription !== null && errorDescription !== undefined ? errorDescription : errorPayload.error;
            throw new Error(message2);
          case 4:
            return [2, payload];
        }
      });
    });
  };
  ClientCredentials2.prototype.isAuthenticated = function(sessionManager) {
    return __awaiter25(this, undefined, undefined, function() {
      var error_1;
      return __generator25(this, function(_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            return [4, this.getToken(sessionManager)];
          case 1:
            _a.sent();
            return [2, true];
          case 2:
            error_1 = _a.sent();
            return [2, false];
          case 3:
            return [2];
        }
      });
    });
  };
  ClientCredentials2.prototype.generateTokenURLParams = function() {
    if (!validateClientSecret(this.config.clientSecret)) {
      throw new Error("Invalid client secret ".concat(this.config.clientSecret));
    }
    var searchParams = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });
    if (this.config.scope !== undefined) {
      searchParams.append("scope", this.config.scope);
    }
    if (this.config.audience) {
      var audienceArray = Array.isArray(this.config.audience) ? this.config.audience : [this.config.audience];
      audienceArray.forEach(function(aud) {
        searchParams.append("audience", aud);
      });
    }
    return new URLSearchParams(searchParams);
  };
  return ClientCredentials2;
}();
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/oauth2-flows/AuthCodeAbstract.js
var __assign2 = function() {
  __assign2 = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length;i < n; i++) {
      s = arguments[i];
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
    }
    return t;
  };
  return __assign2.apply(this, arguments);
};
var __awaiter26 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator26 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var __rest = function(s, e) {
  var t = {};
  for (var p in s)
    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s);i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
};
var __read5 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === undefined || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
};
var __spreadArray4 = function(to, from, pack) {
  if (pack || arguments.length === 2)
    for (var i = 0, l = from.length, ar;i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar)
          ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var AuthCodeAbstract = function() {
  function AuthCodeAbstract2(config) {
    var _this = this;
    this.config = config;
    var { authDomain, logoutRedirectURL } = config;
    this.logoutEndpoint = "".concat(authDomain, "/logout?redirect=").concat(logoutRedirectURL !== null && logoutRedirectURL !== undefined ? logoutRedirectURL : "");
    this.userProfileEndpoint = "".concat(authDomain, "/oauth2/v2/user_profile");
    this.authorizationEndpoint = "".concat(authDomain, "/oauth2/auth");
    this.tokenEndpoint = "".concat(authDomain, "/oauth2/token");
    var keyProvider = function() {
      return __awaiter26(_this, undefined, undefined, function() {
        var func, _a;
        return __generator26(this, function(_b) {
          switch (_b.label) {
            case 0:
              if (!(config.jwks !== undefined))
                return [3, 1];
              _a = createLocalJWKSet(config.jwks);
              return [3, 3];
            case 1:
              return [4, getRemoteJwks(authDomain)];
            case 2:
              _a = _b.sent();
              _b.label = 3;
            case 3:
              func = _a;
              return [4, func({ alg: "RS256" })];
            case 4:
              return [2, _b.sent()];
          }
        });
      });
    };
    this.tokenValidationDetails = {
      issuer: config.authDomain,
      audience: config.audience,
      keyProvider
    };
  }
  AuthCodeAbstract2.prototype.handleRedirectFromAuthDomain = function(sessionManager, callbackURL) {
    return __awaiter26(this, undefined, undefined, function() {
      var tokens;
      return __generator26(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.exchangeAuthCodeForTokens(sessionManager, callbackURL)];
          case 1:
            tokens = _a.sent();
            return [4, commitTokensToSession(sessionManager, tokens, this.tokenValidationDetails)];
          case 2:
            _a.sent();
            return [2];
        }
      });
    });
  };
  AuthCodeAbstract2.prototype.getToken = function(sessionManager) {
    return __awaiter26(this, undefined, undefined, function() {
      var accessToken, isAccessTokenExpired, refreshToken, tokens, error_1;
      return __generator26(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, getAccessToken(sessionManager)];
          case 1:
            accessToken = _a.sent();
            if (!accessToken) {
              throw new Error("No authentication credential found");
            }
            return [4, isTokenExpired(accessToken, this.tokenValidationDetails)];
          case 2:
            isAccessTokenExpired = _a.sent();
            if (!isAccessTokenExpired) {
              return [2, accessToken];
            }
            return [4, getRefreshToken(sessionManager)];
          case 3:
            refreshToken = _a.sent();
            if (!refreshToken && isNodeEnvironment()) {
              throw Error("Cannot persist session no valid refresh token found");
            }
            _a.label = 4;
          case 4:
            _a.trys.push([4, 6, , 7]);
            return [4, this.refreshTokens(sessionManager)];
          case 5:
            tokens = _a.sent();
            return [2, tokens.access_token];
          case 6:
            error_1 = _a.sent();
            throw new KindeSDKError(KindeSDKErrorCode.FAILED_TOKENS_REFRESH_ATTEMPT, "Failed to refresh tokens owing to: ".concat(error_1.message));
          case 7:
            return [2];
        }
      });
    });
  };
  AuthCodeAbstract2.prototype.isAuthenticated = function(sessionManager) {
    return __awaiter26(this, undefined, undefined, function() {
      var error_2;
      return __generator26(this, function(_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            return [4, this.getToken(sessionManager)];
          case 1:
            _a.sent();
            return [2, true];
          case 2:
            error_2 = _a.sent();
            return [2, false];
          case 3:
            return [2];
        }
      });
    });
  };
  AuthCodeAbstract2.prototype.getUserProfile = function(sessionManager) {
    return __awaiter26(this, undefined, undefined, function() {
      var accessToken, headers, targetURL, config, response, payload;
      return __generator26(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, this.getToken(sessionManager)];
          case 1:
            accessToken = _a.sent();
            headers = new Headers;
            headers.append("Authorization", "Bearer ".concat(accessToken));
            headers.append("Accept", "application/json");
            targetURL = this.userProfileEndpoint;
            config = { method: "GET", headers };
            return [4, fetch(targetURL, config)];
          case 2:
            response = _a.sent();
            return [4, response.json()];
          case 3:
            payload = _a.sent();
            return [2, payload];
        }
      });
    });
  };
  AuthCodeAbstract2.prototype.getCallbackURLParams = function(callbackURL) {
    var searchParams = new URLSearchParams(callbackURL.search);
    var state = searchParams.get("state");
    var error = searchParams.get("error");
    var code = searchParams.get("code");
    if (error) {
      throw new Error("Authorization server reported an error: ".concat(error));
    }
    return [code, state];
  };
  AuthCodeAbstract2.prototype.fetchTokensFor = function(sessionManager, body, useCookies) {
    if (useCookies === undefined) {
      useCookies = false;
    }
    return __awaiter26(this, undefined, undefined, function() {
      var headers, config, response, payload, errorPayload, errorDescription, message2;
      return __generator26(this, function(_a) {
        switch (_a.label) {
          case 0:
            headers = new Headers;
            headers.append("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
            headers.append.apply(headers, __spreadArray4([], __read5(getSDKHeader({
              frameworkVersion: this.config.frameworkVersion,
              framework: this.config.framework
            })), false));
            config = {
              method: "POST",
              headers,
              body,
              credentials: useCookies ? "include" : undefined
            };
            return [4, fetch(this.tokenEndpoint, config)];
          case 1:
            response = _a.sent();
            return [4, response.json()];
          case 2:
            payload = _a.sent();
            errorPayload = payload;
            if (!errorPayload.error)
              return [3, 4];
            return [4, sessionManager.destroySession()];
          case 3:
            _a.sent();
            errorDescription = errorPayload.error_description;
            message2 = errorDescription !== null && errorDescription !== undefined ? errorDescription : errorPayload.error;
            throw new Error(message2);
          case 4:
            return [2, payload];
        }
      });
    });
  };
  AuthCodeAbstract2.prototype.generateAuthURLParams = function(options) {
    var _a, _b;
    if (options === undefined) {
      options = {};
    }
    var searchParams = this.getBaseAuthURLParams();
    var scope = (_a = this.config.scope) !== null && _a !== undefined ? _a : AuthCodeAbstract2.DEFAULT_TOKEN_SCOPES;
    scope = scope.split(" ").includes("openid") ? scope : "".concat(scope, " openid");
    var searchParamsObject = {
      scope
    };
    if (options.start_page) {
      searchParamsObject.start_page = options.start_page;
    }
    if (options.org_code) {
      searchParamsObject.org_code = options.org_code;
    }
    if (options.is_create_org) {
      searchParamsObject.org_name = (_b = options.org_name) !== null && _b !== undefined ? _b : "";
      searchParamsObject.is_create_org = "true";
    }
    if (options.authUrlParams) {
      var _c = options.authUrlParams, lang = _c.lang, loginHint = _c.login_hint, connectionId = _c.connection_id, rest = __rest(_c, ["lang", "login_hint", "connection_id"]);
      searchParamsObject = __assign2(__assign2({}, rest), searchParamsObject);
      if (lang) {
        searchParamsObject.lang = lang;
      }
      if (loginHint) {
        searchParamsObject.login_hint = loginHint;
      }
      if (connectionId) {
        searchParamsObject.connection_id = connectionId;
      }
    }
    for (var key in searchParamsObject) {
      var value = searchParamsObject[key];
      if (typeof value === "object" && value !== null) {
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, String(value));
      }
    }
    if (this.config.audience) {
      var audienceArray = Array.isArray(this.config.audience) ? this.config.audience : [this.config.audience];
      audienceArray.forEach(function(aud) {
        searchParams.append("audience", aud);
      });
    }
    return searchParams;
  };
  AuthCodeAbstract2.DEFAULT_TOKEN_SCOPES = "openid profile email offline";
  return AuthCodeAbstract2;
}();

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/oauth2-flows/AuthorizationCode.js
var __extends20 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter27 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator27 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var __read6 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === undefined || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
};
var AuthorizationCode = function(_super) {
  __extends20(AuthorizationCode2, _super);
  function AuthorizationCode2(config, clientSecret) {
    var _this = _super.call(this, config) || this;
    _this.config = config;
    _this.clientSecret = clientSecret;
    return _this;
  }
  AuthorizationCode2.prototype.createAuthorizationURL = function(sessionManager, options) {
    var _a, _b;
    if (options === undefined) {
      options = {};
    }
    return __awaiter27(this, undefined, undefined, function() {
      var _c, _d, authURL, authParams;
      return __generator27(this, function(_e) {
        switch (_e.label) {
          case 0:
            _c = this;
            if (!((_a = options.state) !== null && _a !== undefined))
              return [3, 1];
            _d = _a;
            return [3, 3];
          case 1:
            return [4, sessionManager.getSessionItem(AuthorizationCode2.STATE_KEY)];
          case 2:
            _d = _e.sent();
            _e.label = 3;
          case 3:
            _c.state = (_b = _d) !== null && _b !== undefined ? _b : generateRandomString();
            return [4, sessionManager.setSessionItem(AuthorizationCode2.STATE_KEY, this.state)];
          case 4:
            _e.sent();
            authURL = new URL(this.authorizationEndpoint);
            authParams = this.generateAuthURLParams(options);
            authURL.search = authParams.toString();
            return [2, authURL];
        }
      });
    });
  };
  AuthorizationCode2.prototype.refreshTokens = function(sessionManager) {
    return __awaiter27(this, undefined, undefined, function() {
      var refreshToken, body, tokens;
      return __generator27(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, getRefreshToken(sessionManager)];
          case 1:
            refreshToken = _a.sent();
            if (!validateClientSecret(this.clientSecret)) {
              throw new Error("Invalid client secret ".concat(this.clientSecret));
            }
            body = new URLSearchParams({
              grant_type: "refresh_token",
              client_id: this.config.clientId,
              client_secret: this.clientSecret,
              refresh_token: refreshToken
            });
            return [4, this.fetchTokensFor(sessionManager, body)];
          case 2:
            tokens = _a.sent();
            return [4, commitTokensToSession(sessionManager, tokens, this.tokenValidationDetails)];
          case 3:
            _a.sent();
            return [2, tokens];
        }
      });
    });
  };
  AuthorizationCode2.prototype.exchangeAuthCodeForTokens = function(sessionManager, callbackURL) {
    return __awaiter27(this, undefined, undefined, function() {
      var code, state, stateKey, storedState, body;
      var _a;
      return __generator27(this, function(_b) {
        switch (_b.label) {
          case 0:
            code = (_a = __read6(this.getCallbackURLParams(callbackURL), 2), _a[0]), state = _a[1];
            stateKey = AuthorizationCode2.STATE_KEY;
            return [4, sessionManager.getSessionItem(stateKey)];
          case 1:
            storedState = _b.sent();
            if (!storedState) {
              throw new Error("Authentication flow: Received: ".concat(state, " | Expected: State not found"));
            }
            if (storedState !== state) {
              throw new Error("Authentication flow: State mismatch. Received: ".concat(state, " | Expected: ").concat(storedState));
            }
            if (!validateClientSecret(this.clientSecret)) {
              throw new Error("Invalid client secret ".concat(this.clientSecret));
            }
            body = new URLSearchParams({
              grant_type: "authorization_code",
              client_id: this.config.clientId,
              client_secret: this.clientSecret,
              redirect_uri: this.config.redirectURL,
              code
            });
            _b.label = 2;
          case 2:
            _b.trys.push([2, , 4, 6]);
            return [4, this.fetchTokensFor(sessionManager, body)];
          case 3:
            return [2, _b.sent()];
          case 4:
            return [4, sessionManager.removeSessionItem(stateKey)];
          case 5:
            _b.sent();
            return [7];
          case 6:
            return [2];
        }
      });
    });
  };
  AuthorizationCode2.prototype.getBaseAuthURLParams = function() {
    return new URLSearchParams({
      state: this.state,
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectURL,
      response_type: "code"
    });
  };
  AuthorizationCode2.STATE_KEY = "ac-state-key";
  return AuthorizationCode2;
}(AuthCodeAbstract);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/oauth2-flows/AuthCodeWithPKCE.js
var __extends21 = function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2)
        if (Object.prototype.hasOwnProperty.call(b2, p))
          d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
  };
}();
var __awaiter28 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator28 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var __read7 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === undefined || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
};
var AuthCodeWithPKCE = function(_super) {
  __extends21(AuthCodeWithPKCE2, _super);
  function AuthCodeWithPKCE2(config) {
    var _this = _super.call(this, config) || this;
    _this.config = config;
    return _this;
  }
  AuthCodeWithPKCE2.prototype.createAuthorizationURL = function(sessionManager, options) {
    var _a;
    if (options === undefined) {
      options = {};
    }
    return __awaiter28(this, undefined, undefined, function() {
      var challengeSetup, challenge, verifier, setItem, authURL, authParams;
      return __generator28(this, function(_b) {
        switch (_b.label) {
          case 0:
            return [4, setupCodeChallenge()];
          case 1:
            challengeSetup = _b.sent();
            challenge = challengeSetup.challenge, verifier = challengeSetup.verifier;
            this.codeChallenge = challenge;
            this.codeVerifier = verifier;
            this.state = (_a = options.state) !== null && _a !== undefined ? _a : generateRandomString();
            setItem = isBrowserEnvironment() ? sessionManager.setSessionItemBrowser : sessionManager.setSessionItem;
            return [4, setItem.call(sessionManager, this.getCodeVerifierKey(this.state), JSON.stringify({ codeVerifier: this.codeVerifier }))];
          case 2:
            _b.sent();
            authURL = new URL(this.authorizationEndpoint);
            authParams = this.generateAuthURLParams(options);
            authURL.search = authParams.toString();
            return [2, authURL];
        }
      });
    });
  };
  AuthCodeWithPKCE2.prototype.refreshTokens = function(sessionManager) {
    return __awaiter28(this, undefined, undefined, function() {
      var refreshToken, body, tokens;
      return __generator28(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, getRefreshToken(sessionManager)];
          case 1:
            refreshToken = _a.sent();
            body = new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
              client_id: this.config.clientId
            });
            return [4, this.fetchTokensFor(sessionManager, body, true)];
          case 2:
            tokens = _a.sent();
            return [4, commitTokensToSession(sessionManager, tokens, this.tokenValidationDetails)];
          case 3:
            _a.sent();
            return [2, tokens];
        }
      });
    });
  };
  AuthCodeWithPKCE2.prototype.exchangeAuthCodeForTokens = function(sessionManager, callbackURL) {
    return __awaiter28(this, undefined, undefined, function() {
      var code, state, storedStateKey, getItem, storedState, authFlowState, body, removeItem;
      var _a;
      return __generator28(this, function(_b) {
        switch (_b.label) {
          case 0:
            code = (_a = __read7(_super.prototype.getCallbackURLParams.call(this, callbackURL), 2), _a[0]), state = _a[1];
            storedStateKey = this.getCodeVerifierKey(state);
            if (!(storedStateKey === null || storedStateKey === undefined ? undefined : storedStateKey.endsWith(state))) {
              throw new Error("Received state does not match stored state");
            }
            getItem = isBrowserEnvironment() ? sessionManager.getSessionItemBrowser : sessionManager.getSessionItem;
            return [4, getItem.call(sessionManager, storedStateKey)];
          case 1:
            storedState = _b.sent();
            if (!storedState) {
              throw new Error("Stored state not found");
            }
            authFlowState = JSON.parse(storedState);
            this.codeVerifier = authFlowState.codeVerifier;
            body = new URLSearchParams({
              redirect_uri: this.config.redirectURL,
              client_id: this.config.clientId,
              code_verifier: this.codeVerifier,
              grant_type: "authorization_code",
              code
            });
            removeItem = isBrowserEnvironment() ? sessionManager.removeSessionItemBrowser : sessionManager.removeSessionItem;
            _b.label = 2;
          case 2:
            _b.trys.push([2, , 4, 6]);
            return [4, this.fetchTokensFor(sessionManager, body)];
          case 3:
            return [2, _b.sent()];
          case 4:
            return [4, removeItem.call(sessionManager, this.getCodeVerifierKey(state))];
          case 5:
            _b.sent();
            return [7];
          case 6:
            return [2];
        }
      });
    });
  };
  AuthCodeWithPKCE2.prototype.getCodeVerifierKey = function(state) {
    return "".concat(AuthCodeWithPKCE2.STATE_KEY, "-").concat(state);
  };
  AuthCodeWithPKCE2.prototype.getBaseAuthURLParams = function() {
    return new URLSearchParams({
      state: this.state,
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectURL,
      response_type: "code",
      code_challenge: this.codeChallenge,
      code_challenge_method: "S256"
    });
  };
  AuthCodeWithPKCE2.STATE_KEY = "acwpf-state-key";
  return AuthCodeWithPKCE2;
}(AuthCodeAbstract);
// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/clients/server/with-auth-utilities.js
var __awaiter29 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator29 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var withAuthUtilities = function(isAuthenticated, validationDetails) {
  var featureFlags = exports_feature_flags, tokenClaims = exports_token_claims;
  var getIntegerFlag2 = function(sessionManager, code, defaultValue) {
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error('Cannot return integer flag "'.concat(code, '", no authentication credential found'));
            }
            return [4, featureFlags.getIntegerFlag(sessionManager, code, validationDetails, defaultValue)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getStringFlag2 = function(sessionManager, code, defaultValue) {
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error('Cannot return string flag "'.concat(code, '", no authentication credential found'));
            }
            return [4, featureFlags.getStringFlag(sessionManager, code, validationDetails, defaultValue)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getBooleanFlag2 = function(sessionManager, code, defaultValue) {
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error('Cannot return boolean flag "'.concat(code, '", no authentication credential found'));
            }
            return [4, featureFlags.getBooleanFlag(sessionManager, code, validationDetails, defaultValue)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getClaimValue2 = function(sessionManager, claim, type) {
    if (type === undefined) {
      type = "access_token";
    }
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error('Cannot return claim "'.concat(claim, '", no authentication credential found'));
            }
            return [4, tokenClaims.getClaimValue(sessionManager, claim, type, validationDetails)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getClaim2 = function(sessionManager, claim, type) {
    if (type === undefined) {
      type = "access_token";
    }
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error('Cannot return claim "'.concat(claim, '", no authentication credential found'));
            }
            return [4, tokenClaims.getClaim(sessionManager, claim, type, validationDetails)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getPermission2 = function(sessionManager, name) {
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error('Cannot return permission "'.concat(name, '", no authentication credential found'));
            }
            return [4, tokenClaims.getPermission(sessionManager, name, validationDetails)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getOrganization2 = function(sessionManager) {
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error("Cannot return user organization, no authentication credential found");
            }
            return [4, tokenClaims.getOrganization(sessionManager, validationDetails)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getUserOrganizations2 = function(sessionManager) {
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error("Cannot return user organizations, no authentication credential found");
            }
            return [4, tokenClaims.getUserOrganizations(sessionManager, validationDetails)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getPermissions2 = function(sessionManager) {
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error("Cannot return user permissions, no authentication credential found");
            }
            return [4, tokenClaims.getPermissions(sessionManager, validationDetails)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getFlag2 = function(sessionManager, code, defaultValue, type) {
    return __awaiter29(undefined, undefined, undefined, function() {
      return __generator29(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error('Cannot return flag "'.concat(code, '", no authentication credential found'));
            }
            return [4, featureFlags.getFlag(sessionManager, code, validationDetails, defaultValue, type)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  return {
    getUserOrganizations: getUserOrganizations2,
    getOrganization: getOrganization2,
    getBooleanFlag: getBooleanFlag2,
    getIntegerFlag: getIntegerFlag2,
    getPermissions: getPermissions2,
    getPermission: getPermission2,
    getClaimValue: getClaimValue2,
    getStringFlag: getStringFlag2,
    getClaim: getClaim2,
    getFlag: getFlag2
  };
};
var with_auth_utilities_default = withAuthUtilities;

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/clients/server/authorization-code.js
var __assign3 = function() {
  __assign3 = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length;i < n; i++) {
      s = arguments[i];
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
    }
    return t;
  };
  return __assign3.apply(this, arguments);
};
var __awaiter30 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator30 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var createAuthorizationCodeClient = function(options, isPKCE) {
  var client = !isPKCE ? new AuthorizationCode(options, options.clientSecret) : new AuthCodeWithPKCE(options);
  var login = function(sessionManager, options2) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.createAuthorizationURL(sessionManager, __assign3({}, options2))];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  var register = function(sessionManager, options2) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.createAuthorizationURL(sessionManager, __assign3(__assign3({}, options2), { start_page: "registration" }))];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  var createOrg = function(sessionManager, options2) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.createAuthorizationURL(sessionManager, __assign3(__assign3({}, options2), { start_page: "registration", is_create_org: true }))];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  var handleRedirectToApp = function(sessionManager, callbackURL) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.handleRedirectFromAuthDomain(sessionManager, callbackURL)];
          case 1:
            _a.sent();
            return [2];
        }
      });
    });
  };
  var isAuthenticated = function(sessionManager) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.isAuthenticated(sessionManager)];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getUserProfile = function(sessionManager) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.getUserProfile(sessionManager)];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getUser = function(sessionManager) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, isAuthenticated(sessionManager)];
          case 1:
            if (!_a.sent()) {
              throw new Error("Cannot get user details, no authentication credential found");
            }
            return [4, getUserFromSession(sessionManager, client.tokenValidationDetails)];
          case 2:
            return [2, _a.sent()];
        }
      });
    });
  };
  var getToken = function(sessionManager) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.getToken(sessionManager)];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  var refreshTokens = function(sessionManager) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.refreshTokens(sessionManager)];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  var logout = function(sessionManager) {
    return __awaiter30(undefined, undefined, undefined, function() {
      return __generator30(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, sessionManager.destroySession()];
          case 1:
            _a.sent();
            return [2, new URL(client.logoutEndpoint)];
        }
      });
    });
  };
  return __assign3(__assign3({}, with_auth_utilities_default(isAuthenticated, client.tokenValidationDetails)), { handleRedirectToApp, isAuthenticated, getUserProfile, createOrg, getToken, refreshTokens, register, getUser, logout, login });
};
var authorization_code_default = createAuthorizationCodeClient;

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/clients/server/client-credentials.js
var __assign4 = function() {
  __assign4 = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length;i < n; i++) {
      s = arguments[i];
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
    }
    return t;
  };
  return __assign4.apply(this, arguments);
};
var __awaiter31 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator31 = function(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : undefined, done: true };
  }
};
var createCCClient = function(options) {
  var client = new ClientCredentials(options);
  var logout = function(sessionManager) {
    return __awaiter31(undefined, undefined, undefined, function() {
      return __generator31(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, sessionManager.destroySession()];
          case 1:
            _a.sent();
            return [2, new URL(client.logoutEndpoint)];
        }
      });
    });
  };
  var getToken = function(sessionManager) {
    return __awaiter31(undefined, undefined, undefined, function() {
      return __generator31(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.getToken(sessionManager)];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  var isAuthenticated = function(sessionManager) {
    return __awaiter31(undefined, undefined, undefined, function() {
      return __generator31(this, function(_a) {
        switch (_a.label) {
          case 0:
            return [4, client.isAuthenticated(sessionManager)];
          case 1:
            return [2, _a.sent()];
        }
      });
    });
  };
  return __assign4(__assign4({}, with_auth_utilities_default(isAuthenticated, client.tokenValidationDetails)), { isAuthenticated, getToken, logout });
};
var client_credentials_default = createCCClient;

// node_modules/@kinde-oss/kinde-typescript-sdk/dist/sdk/clients/server/index.js
var createKindeServerClient = function(grantType, options) {
  if (!isNodeEnvironment()) {
    throw new Error("this method must be invoked in a node.js environment");
  }
  switch (grantType) {
    case GrantType.AUTHORIZATION_CODE: {
      var clientOptions = options;
      return authorization_code_default(clientOptions, false);
    }
    case GrantType.PKCE: {
      var clientOptions = options;
      return authorization_code_default(clientOptions, true);
    }
    case GrantType.CLIENT_CREDENTIALS: {
      var clientOptions = options;
      return client_credentials_default(clientOptions);
    }
    default: {
      throw new Error("Unrecognized grant type provided");
    }
  }
};
// src/kinde.ts
var kindeConfig = {
  authDomain: process.env.KINDE_DOMAIN,
  clientId: process.env.KINDE_CLIENT_ID,
  clientSecret: process.env.KINDE_CLIENT_SECRET,
  redirectURL: process.env.KINDE_REDIRECT_URI,
  logoutRedirectURL: process.env.KINDE_LOGOUT_REDIRECT_URI
};
var kindeClient = createKindeServerClient(GrantType.AUTHORIZATION_CODE, kindeConfig);
var sessionManager = (c) => ({
  async getSessionItem(key) {
    const result = getCookie(c, key);
    return result;
  },
  async setSessionItem(key, value) {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "Lax"
    };
    if (typeof value === "string") {
      setCookie(c, key, value, cookieOptions);
    } else {
      setCookie(c, key, JSON.stringify(value), cookieOptions);
    }
  },
  async removeSessionItem(key) {
    deleteCookie(c, key);
  },
  async destroySession() {
    ["id_token", "access_token", "user", "refresh_token"].forEach((key) => {
      deleteCookie(c, key);
    });
  }
});

// src/authMiddleware.ts
var getUser = createMiddleware(async (c, next) => {
  try {
    const manager = sessionManager(c);
    const authenticated = await kindeClient.isAuthenticated(manager);
    if (!authenticated) {
      return c.json({ message: "not authenticated" }, 401);
    }
    const user = await kindeClient.getUserProfile(manager);
    c.set("user", user);
  } catch (e) {
    console.error(e);
    return c.json({ message: "not authenticated" }, 401);
  }
  await next();
});

// src/db/index.ts
var cachedImpl;
var cachedDb;
var getImpl = async () => {
  if (!cachedImpl) {
    cachedImpl = await Promise.resolve().then(() => (init_index_prod(), exports_index_prod));
  }
  return cachedImpl;
};
var getDb2 = async () => {
  if (!cachedDb) {
    const impl = await getImpl();
    cachedDb = await impl.getDb();
  }
  return cachedDb;
};

// src/db/schema/goals.ts
init_pg_core();
var goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  date: char("date", { length: 10 }).notNull(),
  completed: boolean("completed").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table2) => [index("user_id_idx").on(table2.userId)]);

// src/repositories/goalRepository.ts
var goalSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in the format yyyy-MM-dd"),
  completed: z.boolean()
});
var getGoals = async (userId) => {
  const db2 = await getDb2();
  const goals2 = await db2.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  return goals2;
};
var addGoal = async (goal) => {
  const db2 = await getDb2();
  const created = await db2.insert(goals).values(goal).returning();
  return created[0];
};
var findGoal = async (id) => {
  const db2 = await getDb2();
  const goals2 = await db2.select().from(goals).where(eq(goals.id, id)).limit(1);
  return goals2.length === 0 ? undefined : goals2[0];
};
var deleteGoal = async (id) => {
  const db2 = await getDb2();
  await db2.delete(goals).where(eq(goals.id, id));
};

// src/routes/goals.ts
var goalPostSchema = goalSchema.omit({ id: true, userId: true });
var goalsRoute = new Hono2().get("/", getUser, async (c) => {
  const user = c.var.user;
  return c.json({ goals: await getGoals(user.id) });
}).get("/:id{[0-9]+}", getUser, async (c) => {
  const user = c.var.user;
  const id = Number.parseInt(c.req.param("id"));
  const goal = await findGoal(id);
  if (!goal) {
    return c.json({ message: "Goal not found" }, 404);
  }
  if (goal.userId !== user.id) {
    return c.json({ message: "Not your goal" }, 403);
  }
  return c.json(goal);
}).post("/", getUser, zValidator("json", goalPostSchema), async (c) => {
  const user = c.var.user;
  const goalInput = c.req.valid("json");
  const created = await addGoal({ ...goalInput, userId: user.id });
  return c.json(created, 201);
}).delete("/:id{[0-9]+}", getUser, async (c) => {
  const user = c.var.user;
  const id = Number.parseInt(c.req.param("id"));
  const goal = await findGoal(id);
  if (!goal) {
    return c.json({ message: "Goal not found" }, 404);
  }
  if (goal.userId !== user.id) {
    return c.json({ message: "Not your goal" }, 403);
  }
  await deleteGoal(id);
  c.status(204);
  return c.body("");
});

// src/routes/auth.ts
var authRoute = new Hono2().get("/login", async (c) => {
  const loginUrl = await kindeClient.login(sessionManager(c));
  return c.redirect(loginUrl.toString());
}).get("/register", async (c) => {
  const registerUrl = await kindeClient.register(sessionManager(c));
  return c.redirect(registerUrl.toString());
}).get("/callback", async (c) => {
  const url = new URL(c.req.url);
  await kindeClient.handleRedirectToApp(sessionManager(c), url);
  return c.redirect("/");
}).get("/logout", async (c) => {
  const logoutUrl = await kindeClient.logout(sessionManager(c));
  return c.redirect(logoutUrl.toString());
}).get("/me", getUser, async (c) => {
  const { user } = c.var;
  return c.json({ user });
}).get("/authenticated", async (c) => {
  const authenticated = await kindeClient.isAuthenticated(sessionManager(c));
  return c.json({ authenticated });
});

// src/app.ts
var app = new Hono2;
app.use("*", logger());
app.get("/test", (c) => {
  return c.json({ message: "test result" });
});
var apiRoutes = app.basePath("/api").route("/goals", goalsRoute).route("/", authRoute);
app.get("*", serveStatic2({ root: "./frontend/dist" }));
app.get("*", serveStatic2({ path: "./frontend/dist/index.html" }));
var app_default = app;

// src/index.ts
Bun.serve({
  fetch: app_default.fetch
});
console.log("Server Running");
