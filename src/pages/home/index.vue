<template>
    <div class="page-home">
        <video id="localVideo" ref="userVideo" autoplay class="page-home__video page-home__video-client" muted playsinline></video>

        <video id="remoteVideo" ref="partnerVideo" autoplay class="page-home__video page-home__video-partner" playsinline></video>
        <div>
            <UiCircleBtn class="page-home__btn" @click="callRequest">Позвонить</UiCircleBtn>
            <UiBtn @click="testCall">Тестовая кнопка</UiBtn>
        </div>
    </div>
</template>

<script>

export default {
    data() {
        return {
            socket: null,
            isSocketOpen: false,
            testUserId: 'yfduey778',
            peer: '',
            socketRef: '',
            otherUser: '',
            userStream: null,

            clientChannel: '',
            options: {audio: true, video: true},
            offerOptions: {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
            },
            constraints: {
                iceServers: [
                    { url: 'stun:stun1.l.google.com:19302' },
                    { url: 'stun:stun2.l.google.com:19302' },
                    { url: 'stun:stun3.l.google.com:19302' },
                    {
                        url: 'turn:coturn.sverstal.ru:3478',
                        username: 'tab1',
                        credential: '123456',
                    },
                ],
            },
        }
    },
    methods: {
        socketConnect() {
            const callCenterId = 'Q2FsbENlbnRlcjox'
            const type = 'device'
            const url = `wss://vc-dev.enlighted.ru/ws/call-center-channel/${callCenterId}/?type=${type}`

            this.socket = new WebSocket(url)

            this.socket.addEventListener('open', this.socketOpen)
            this.socket.addEventListener('error', this.socketError)
            this.socket.addEventListener('message', this.socketMessage)
            this.socket.addEventListener('close', this.socketClose)
        },
        socketRetryConnect() { //повторная попытка подключения к сокет серверу
            setTimeout(() => {
                this.socketConnect()
            }, 5000)
        },
        socketDisconnect() {
            if (this.socket || this.isSocketOpen) {
                this.socket.close(1000)
                this.isSocketOpen = false
            }
        },
        socketOpen() {
            this.isSocketOpen = true
            console.info('сокет соединение открыто')
        },
        socketError() {
            console.error('ошибка сокет соединения')
            this.socketRetryConnect()
        },
        socketMessage(data) {
            console.info('получены данные по сокет соединению')
            this.messageProcessing(data)
        },
        socketClose() {
            console.info('сокет соединение закрыто')
            this.socketRetryConnect()
        },
        getJsonFromString(payload) {
            return JSON.parse(payload)
        },
        getStringFromJson(payload) {
            return JSON.stringify(payload)
        },

        async messageProcessing(data) {
            const payload = this.getJsonFromString(data.data)

            const info = payload.data
            const eventName = payload.event

            const isOperatorAnsweredTheCall = eventName === 'operator_answered_the_call' //оператор ответил на звонок
            const isMessageEvent = eventName === 'message' // пришло сообщение от терминала
            // const iceCandidate = eventName === 'ice_candidate' // пришел новый ice_candidate от оператора


            if (isOperatorAnsweredTheCall) {
                this.clientChannel = info['client_channel']
                console.info(`оператор ответил на звонок, id канала ${this.clientChannel}`)

                //можно слать запрос на открытие соединения webRTC
                await this.sendRequestToOpenWebRTC()
            }

            if (isMessageEvent) {
                console.log(55)
                console.log(info)
                // eslint-disable-next-line no-unused-vars
                const {from: clientChannel, message_data: messageData} = info
                this.clientChannel = clientChannel
                // console.info(`пришло сообщение от оператора с id канала: ${clientChannel} на установку webRTC`)

                const isIceCandidateEvent = messageData.event === 'ice-candidate'
                const isAnswerEvent = messageData.event === 'answer' //получение answer с терминала


                // console.info(`пришло сообщение от терминала с id каналом: ${this.clientChannel}`)

                if (isIceCandidateEvent) {
                    console.info(`пришел евент ice-candidate от терминала с id каналом: ${this.clientChannel}`)
                    console.info(data)

                    this._handleNewICECandidateMsg()
                }

                if (isAnswerEvent) {
                    console.info(`пришел евент answer от терминала с id каналом: ${this.clientChannel}`)
                    console.info(messageData.data.sdp)
                    const desc = new RTCSessionDescription(messageData.data.sdp);
                    try {
                        console.log(desc)
                    } catch (e) {
                        console.log(e)
                    }
                }
            }

        },
        sendMessage(eventName, data) {
            const payload = {
                event: eventName,
                data
            }
            this.socket.send(this.getStringFromJson(payload))
        },

        async sendRequestToOpenWebRTC() {
            await this._mediaStream()
        },

        async _mediaStream() {
            const stream = await navigator.mediaDevices.getUserMedia(this.options)

            // выхвать try и catch если пользователь запретит доступ к камере
            this.$refs.userVideo.srcObject = stream
            this.userStream = stream

            console.log(this.userStream)

            this._callUser()
        },

        _callUser() {
            this._createPeer();
            console.log(this.userStream)
            this.userStream.getTracks().forEach(track => this.peer.addTrack(track, this.userStream));
        },

        _createPeer() {
            this.peer = new RTCPeerConnection(this.constraints);
            console.log(this.peer)
            this.peer.onicecandidate = e => {
                if (e.candidate) {
                    console.log('отправляем ice кандидата терминалу')
                    const payload = {
                        event: 'ice-candidate',
                        candidate: e.candidate,
                    }
                    this.sendMessage('message_to', payload)
                }
            }

            this.peer.ontrack = e => {
                console.log(6668)
                if (e) {
                    console.log('загружаем видео в partner')
                    console.log(e)
                    this.$refs.partnerVideo.srcObject = e.streams[0];
                }
                else {
                    console.log('_handleTrackEvent не отработал, e пустой!!!')
                }
            }

            // this.peer.addEventListener('track', this._handleTrackEvent())
            this.peer.addEventListener('negotiationneeded', this._createOffer())
        },


        _handleNewICECandidateMsg(incoming) {
            console.log('отработал _handleNewICECandidateMsg')
            console.log(incoming)
            const candidate = new RTCIceCandidate(incoming);

            this.peer.addIceCandidate(candidate)
                .catch(e => console.log(e));
        },






        callRequest() {
            if (this.isSocketOpen) {
                const data = {
                    event: 'call_request'
                }
                this.sendMessage('call_request', data)
            } else {
                alert('Произошел системный сбой, перезагрузите страницу!')
            }
        },

        async _createOffer() { //создаем офера
            try {
                console.log('создаем офер')
                const offer = await this.peer.createOffer()
                await this.peer.setLocalDescription(offer)

                const payload = {
                    target: this.clientChannel,
                    sdp: this.peer.localDescription
                }
                const data = {
                    to: this.clientChannel,
                    message_data: {
                        event: 'offer',
                        data: payload
                    }
                }
                console.log('отправляем OFFER терминалу')
                console.log(data)
                this.sendMessage('message_to', data)
            } catch (e) {
                console.log('оффер не создан и не отправлен')
                console.log(e)

            }

        },

        testCall() {
            const payload = {
                // caller: socketRef.current.id,
                sdp: 'lol'
            }
            const data = {
                to: this.clientChannel,
                message_data: {
                    event: 'offer',
                    data: payload
                }
            }
            console.log(data)
            this.sendMessage('message_to', data)
        }
    },


    mounted() {
        this.socketConnect()
    },
    beforeDestroy() {
        this.socketDisconnect()
    }
}
</script>

<style lang="scss" scoped>
.page-home {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 30px;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 800px;
    margin: 30px auto;
    padding: 30px;
    border-radius: 15px;
    background-color: #fff;
    grid-auto-rows: 260px;
    grid-template-areas:
        'video-client video-partner'
        'btn btn';


    &__video {
        display: flex;
        width: 100%;
        height: 100%;
        border-radius: 15px;
        background-color: #e3dbdb;
        overflow: hidden;

        &-client {
            grid-area: video-client;
        }

        &-partner {
            grid-area: video-partner;
        }
    }

    &__btn {
        width: 80px;
        height: 80px;
        justify-self: center;
        grid-area: btn;
    }
}
</style>
