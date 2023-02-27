const { initializeApp } = require('@keysafe/client')

initializeApp({
    k: {
        id: process.env.KEYSAFE_CUSTOMER_ID || '',
        key: process.env.KEYSAFE_CUSTOMER_KEY || '',
        secret: process.env.KEYSAFE_CUSTOMER_SECRET || '',
    }
})
