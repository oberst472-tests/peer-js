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
        sendMessage(eventName, data) {
            const payload = {
                event: eventName,
                data
            }
            this.socket.send(this.getStringFromJson(payload))
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
                console.info(`оператор ответил на звонок`)

                //можно слать запрос на открытие соединения webRTC
                await this.sendRequestToOpenWebRTC()
            }


            ////////////
            if (isMessageEvent) {
                this.clientChannel = info.from
                const messageData = info.message_data
                const data = messageData.data

                const isIceCandidateEvent = messageData.event === 'ice-candidate'
                const isAnswerEvent = messageData.event === 'answer' //получение answer с терминала



                if (isIceCandidateEvent) {
                    console.info(`пришел евент ICE-CANDIDATE от терминала`)

                    await this._handleNewICECandidateMsg(data.candidate)
                }

                if (isAnswerEvent) {
                    console.info(`пришел евент answer от терминала с id каналом: ${this.clientChannel}`)
                    const desc = new RTCSessionDescription(data.sdp);
                    await this.peer.setRemoteDescription(desc)
                }
            }

        },

        async sendRequestToOpenWebRTC() {
            await this._mediaStream()
        },

        async _mediaStream() {
            const stream = await navigator.mediaDevices.getUserMedia(this.options)

            // выхвать try и catch если пользователь запретит доступ к камере
            this.$refs.userVideo.srcObject = stream
            this.userStream = stream


            await this._callUser()
        },

        async _callUser() {
            await this._createPeer();
            this.userStream.getTracks().forEach(track => this.peer.addTrack(track, this.userStream));
        },

        async _createPeer() {
            this.peer = await new RTCPeerConnection(this.constraints);

            this.peer.onicecandidate = e => {
                console.log('отработал onicecandidate')
                if (e.candidate) {
                    console.log('отправляем ice кандидата терминалу')

                    const payload = {
                        event: 'ice-candidate',
                        candidate: e.candidate,
                    }

                    const data = {
                        to: this.clientChannel,
                        message_data: {
                            event: 'ice-candidate',
                            data: payload
                        }
                    }

                    this.sendMessage('message_to', data)
                }
            }

            this.peer.ontrack = e => {
                console.log('отработал ontrack')
                if (e) {
                    console.log('загружаем видео в partner')
                    this.$refs.partnerVideo.srcObject = e.streams[0];
                }
                else {
                    console.log('_handleTrackEvent не отработал, e пустой!!!')
                }
            }

            this.peer.onnegotiationneeded = this._createOffer()
        },


       async _handleNewICECandidateMsg(incoming) {
            console.log('отработал _handleNewICECandidateMsg')
            const candidate = await new RTCIceCandidate(incoming);

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
                const offer = await this.peer.createOffer(this.offerOptions)
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
