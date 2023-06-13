const mongoose = require('mongoose')

mongoose.connect('https://socialapp-backend-production-a743.up.railway.app')
    .then(()=>{console.log('Connection established')})
    .catch(error => handleError(error));

