const cache = require('memory-cache');

const cacheMiddleware = (req, res, next) => {
  const key = '__express__' + req.originalUrl || req.url;
  console.log('URL de la solicitud:', req.originalUrl);
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    console.log('Respuesta obtenida desde la caché:', key);
    res.send(cachedResponse);
    return;
  }

  res.sendResponse = res.send;
  res.send = (body) => {
    cache.put(key, body);
    res.sendResponse(body);
  };

  next();
};

module.exports = cacheMiddleware;