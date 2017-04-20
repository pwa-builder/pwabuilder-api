module.exports = {
    redis: {
        host: '127.0.0.1',
        port: 6379,
        database: 0
    },
    azure:{
        account_name: 'manifolddev',
        access_key:'y4nxuSBfRtukWKATRZR7Ji3zx+6hEtAGUwKxUQmuUY7q94lp1NqO453nNbiX/tYg7xnPUSojXMY8lQ5xJqClmw=='
    },
    platforms: ['windows10','windows','android','ios','web'],
    images: {
        generationSvcUrl: process.env.IMG_GEN_SVC_URL || 'http://localhost:49080/'
    }
};
