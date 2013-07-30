/*
** © 2013 by Philipp Dunkel. Licensed under MIT-License.
*/

module.exports = Create;

var Memcache = require('memcached');

function Create(url, options, callback) {
  url = Url.parse(url);
  options = Object.create(options);
  options.host = options.host || url.host;
  options.host = Array.isArray(options.host) ? options.host : [ options.host ];
  var store = Object.create(null, {
    options:{ value:options },
    client:{ value: Memcache(options.host), configurable:true }
  });
  Utils.common(store, Utils.bind(get, store), Utils.bind(put, store), Utils.bind(del, store), Utils.bind(key, store));
  setImmediate(function() { callback(null, store); });
}

function get(key, callback) {
  var store = this;
  store.client.get(key, function(err, val) {
    if (err) return callback(err);
    store.decompressor(val)(val, function(err, val) {
      if (err) return callback(err);
      try {
        val = JSON.parse(val);
      } catch(ex) {
        return callback(ex);
      }
      if ('string' === typeof val.storage_type) {
        switch(val.storage_type) {
          case 'string': return callback(null, val.content);
          case 'buffer': return callback(null, new Buffer(val.content, 'ascii'));
          case 'json':
            try {
              val = JSON.parse(val.content);
            } catch(ex) {
              return callback(ex);
            }
            return callback(null, val);
          default: return callback(new Error('invalid storage_type: '+val.storage_type));
        }
      }
      return callback(null, val);
    });
  });
}

function put(key, value, callback) {
  var store = this;
  if (Buffer.isBuffer(value)) {
    value = { storage_type:'buffer', content:value.toString('ascii') };
  } else if ('string' === typeof value) {
    value = { storage_type:'string', content:value };
  }
  value = new Buffer(JSON.stringify(value).trim());
  store.set(key, value, store.options.lifetime, callback);
}

function del(key, callback) {
  this.client.del(key, callback);
}

function key(pre, callback) {
  setImmediate(function() { callback(null, []); });
}