const Flatted = require("flatted");
const { createHash } = require('crypto')

module.exports = class KeySafe {
    constructor(id, key, secret) {
        this.id = id;
        this.key = key;
        this.secret = createHash('md5').update(secret).digest('hex');
        console.log('here 02 : Keysafe Object Creation')
        this.session = {
            token: '',
            id: '',
            in: false,
            createdAt: '',
            validFor: ''
        };

        this.request = {
            post: ({ is, func, url }, { headers, body }) => {
                return new Promise((resolve, reject) => {
                    let link = is ? `https://keysafe-api-gateway-apg7mwlj.uc.gateway.dev/v1/${func}` : url;
                    let latency = Date.now()
                    console.log(`FETCH request to : ${link} :: ${new Date(latency).getTime()} ::`);
                    fetch(link, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(body)
                    })
                        .then(async (res) => {
                            latency = Date.now() - latency
                            console.log(`here 04 : fetch response ${res.status} ${func} :: ${new Date(latency).getTime()} ::`)
                            res.status === 200 ? resolve(await res.json()) : reject(await res.json());
                        })
                        .catch(reject)
                });
            }
        };

        this.createSession().then().catch(console.error)
    }

    createSession = (reason = 'fresh') => {
        return new Promise(async (resolve, reject) => {
            console.log('here 03 : create session called')
            let resp;
            try {
                resp = await this.request.post({ is: true, func: 'getToken', url: null }, {
                    headers: {
                        "Authorization": `Basic ${Buffer.from(`${this.key}:${this.secret}`).toString('base64')}`,
                        "X-KEYSAFE-CUSTOMER-ID": this.id,
                        "X-KEYSAFE-CUSTOMER-KEY": this.key,
                        "X-KEYSAFE-CUSTOMER-SECRET": this.secret,
                        "X-KEYSAFE-RUN-TIME": Date.now(),
                        "X-KEYSAFE-SESSION-TOKEN-TYPE": reason,
                        "X-KEYSAFE-SESSION-ID": this.session.id || undefined
                    }
                })

                if (resp['status']) {
                    this.session.token = resp['access_token'];
                    if (reason === 'fresh') {
                        this.session.id = resp['session_id'];
                    }
                    this.session.in = true;
                    this.session.createdAt = Date.now();
                    this.session.validFor = Date.now() + 300000;
                    console.log(`Session status : ${this.session.in}`)
                    console.log(`Session Token : ${this.session.token}`)
                    console.log(resp)
                    resolve(this)
                } else {
                    console.error(resp['status'])
                    throw new Error(resp['status'])
                }
            } catch (error) {
                reject(error)
            }
        });
    }

    refreshSession = async (req, res, next) => {
        this.collectStats(req, {}, "token-expired")
        await this.createSession('expired')
        this.authenticate(req, res, next)
    }

    authenticate = async (req, res, next) => {
        // console.log(this.id, this.key, this.session.in, this.session.token)
        if (!this.session.in) {
            console.log(await this.createSession())
        }
        // this.collectStats(req)
        const auth = req.get('Authorization');
        // console.log(auth)
        const [key, secret] = Buffer.from(auth.split('Basic ')[1], 'base64').toString('ascii').split(':');
        let result;
        try {
            result = await this.request.post({ is: true, func: 'verify', url: null }, {
                headers: {
                    "Authorization": `Bearer ${this.session.token}`,
                    "X-KEYSAFE-CUSTOMER-ID": this.id,
                    "X-KEYSAFE-API-KEY": key,
                    "X-KEYSAFE-API-SECRET": secret,
                    "X-KEYSAFE-RUN-TIME": Date.now(),
                    'X-KEYSAFE-API-URL': req.originalUrl,
                }
            })
        } catch (error) {
            console.error(JSON.stringify(error, null, 2))
            // this.collectStats(req, {
            //     res: {
            //         body: JSON.stringify(error, null, 2),
            //         status: 500
            //     }
            // }, "api-log-error")
            res.status(500).json({ ...error })
        }

        if (result?.status === false) {
            this.refreshSession(req, res, next)
        }

        res.on('finish', () => {
            this.collectStats(req, res, "api-log-finish")
        })

        res.on('error', () => {
            this.collectStats(req, res, "api-log-error")
        })

        if (result?.isVerified) {
            this.collectStats(req, {}, "api-auth-success")
            next()
        } else {
            // this.collectStats(req, {
            //     res: {
            //         body: JSON.stringify({
            //             message: 'API KEY OR SECRET INCORRECT.'
            //         }, null, 2),
            //         status: 400
            //     }
            // }, "")
            console.log(result)
            res.status(400).json({
                message: 'API KEY OR SECRET INCORRECT.'
            })
        }
    }

    collectStats = async (req, { res }, state) => {
        // const data = {
        //     request: {
        //         query: req?.query,
        //         params: req?.params,
        //         baseUrl: req?.baseUrl,
        //         originalUrl: req?.originalUrl,
        //         _parsedUrl: req?._parsedUrl,
        //         url: req?.url,
        //         method: req?.method,
        //         statusCode: req?.statusCode,
        //         statusMessage: req?.statusMessage,
        //         socket: {
        //             bufferSize: req?.socket?.bufferSize,
        //             bytesRead: req?.socket?.bytesRead,
        //             bytesWritten: req?.socket?.bytesWritten,
        //             connecting: req?.socket?.connecting,
        //             destroyed: req?.socket?.destroyed,
        //             localAddress: req?.socket?.localAddress,
        //             localPort: req?.socket?.localPort,
        //             localFamily: req?.socket?.localFamily,
        //             readyState: req?.socket?.readyState,
        //             remoteAddress: req?.socket?.remoteAddress,
        //             remoteFamily: req?.socket?.remoteFamily,
        //             remotePart: req?.socket?.remotePart,
        //             timeout: req?.socket?.timeout,
        //         },
        //         rawHeaders: req?.rawHeaders,
        //         httpVersionMajor: req?.httpVersionMajor,
        //         httpVersionMinor: req?.httpVersionMinor,
        //         httpVersion: req?.httpVersion,
        //     },
        //     response: {
        //         query: res?.query,
        //         params: res?.params,
        //         baseUrl: res?.baseUrl,
        //         originalUrl: res?.originalUrl,
        //         _parsedUrl: res?._parsedUrl,
        //         url: res?.url,
        //         method: res?.method,
        //         statusCode: res?.statusCode,
        //         statusMessage: res?.statusMessage,
        //         socket: {
        //             bufferSize: res?.socket?.bufferSize,
        //             bytesRead: res?.socket?.bytesRead,
        //             bytesWritten: res?.socket?.bytesWritten,
        //             connecting: res?.socket?.connecting,
        //             destroyed: res?.socket?.destroyed,
        //             localAddress: res?.socket?.localAddress,
        //             localPort: res?.socket?.localPort,
        //             localFamily: res?.socket?.localFamily,
        //             readyState: res?.socket?.readyState,
        //             remoteAddress: res?.socket?.remoteAddress,
        //             remoteFamily: res?.socket?.remoteFamily,
        //             remotePart: res?.socket?.remotePart,
        //             timeout: res?.socket?.timeout,
        //         },
        //         rawHeaders: res?.rawHeaders,
        //         httpVersionMajor: res?.httpVersionMajor,
        //         httpVersionMinor: res?.httpVersionMinor,
        //         httpVersion: res?.httpVersion,
        //     },
        //     event: {
        //         state: state || null
        //     },
        //     timestamp: Date.now(),
        // };

        // console.log(data)

        // // let resp;
        // // try {
        // //     resp = await this.request.post({ is: true, func: 'analytics' , url: null}, {
        // //         headers: {
        // //             "X-KEYSAFE-CUSTOMER-ID": this.id,
        // //             "X-KEYSAFE-RUN-TIME": Date.now(),
        // //             "X-KEYSAFE-ANALYTICS-TYPE": state,
        // //             'X-KEYSAFE-ANALYTICS-SESSION-ID': this.session.id
        // //         },
        // //         body: JSON.stringify(data),

        // //     })
        // // } catch (error) {
        // //     console.error(error)
        // // }
        // // console.log(`logged @ ${Date.now()}, documentId : ${JSON.stringify(resp.documentId, null, 2)}`)

        // // console.log(JSON.stringify({
        // //     headers: {
        // //         "X-KEYSAFE-CUSTOMER-ID": this.id,
        // //         "X-KEYSAFE-RUN-TIME": Date.now(),
        // //         "X-KEYSAFE-ANALYTICS-TYPE": state,
        // //         'X-KEYSAFE-ANALYTICS-SESSION-ID': this.session.id
        // //     },
        // //     body: data,
        // // }, null, 2))

        // return
    }

}
