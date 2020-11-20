<template>
    <div class="page-home">
        <video id="localVideo" ref="userVideo" autoplay class="page-home__video page-home__video-client" muted playsinline></video>

        <video id="remoteVideo" ref="partnerVideo" autoplay class="page-home__video page-home__video-partner" playsinline></video>
        <div class="page-home__btn-box">
            <UiCircleBtn class="page-home__btn" @click="callRequest">Позвонить</UiCircleBtn>
            <UiCircleBtn class="page-home__btn" @click="stopCall" theme="negative">Завершить вызов</UiCircleBtn>
        </div>
    </div>
</template>

<script>

export default {
    data() {
        return {
            socket: null,
            isSocketOpen: false,
            peer: '',
            otherUser: '',
            userStream: null,

            clientChannel: '',
            callID: '',

            options: {audio: true, video: true},
            offerOptions: {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            },
            constraints: {
                iceServers: [
                    { url: 'stun:vc-dev.enlighted.ru:3478' },
                    {
                        url: 'turn:vc-dev.enlighted.ru:3478',
                        username: 'tab1',
                        credential: '123456',
                    },
                ],
            },
        }
    },
    methods: {
        log(title = 'console group title', text = '', color = 'aqua') {
            console.group(`%c ${title}`, `font-size: 13px; color: ${color}; border: 1px solid ${color}`);
            console.info(text);
            console.groupEnd();
        },
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
            this.log('socketOpen', 'Cокет соединение открыто', 'lightgreen')
        },
        socketError() {
            this.log('socketOpen', 'Ошибка сокет соединения', 'red')
            this.socketRetryConnect()
        },
        socketMessage(data) {
            this.messageProcessing(data)
        },
        socketClose() {
            this.log('socketClose', 'Сокет соединение закрыто')
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
            const isEndCallByEvent = eventName === 'end_call_by' //оператор завершил звонок
            const isMessageEvent = eventName === 'message' // пришло сообщение от терминала


            if (isOperatorAnsweredTheCall) {
                this.clientChannel = info['client_channel']
                this.callID = info['call_id']

                this.log('isOperatorAnsweredTheCall', 'Оператор ответил на звонок')

                await this.sendRequestToOpenWebRTC()
            }

            if (isEndCallByEvent) {
                this.log('isEndCallByEvent', 'Оператор завершил звонок')
            }

            if (isMessageEvent) {
                this.clientChannel = info.from
                const messageData = info.message_data
                const data = messageData.data

                const isIceCandidateEvent = messageData.event === 'ice-candidate'
                const isAnswerEvent = messageData.event === 'answer' //получение answer с терминала

                if (isIceCandidateEvent) {
                    this._handleNewICECandidateMsg(data.candidate)
                }

                if (isAnswerEvent) {
                    this.log('isAnswerEvent', 'Пришел евент answer от терминала')
                    const desc = new RTCSessionDescription(data.sdp);
                    try {
                        //передаем answer от оператора d webRTC
                        await this.peer.setRemoteDescription(desc)
                    } catch (e) {
                        this.log('isAnswerEvent', e, 'red')
                    }
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
                if (e.candidate) {

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
                console.log(e)
                if (e) {
                    this.$refs.partnerVideo.srcObject = e.streams[0];
                }
                else {
                    console.log('_handleTrackEvent не отработал, e пустой!!!')
                }
            }

            this.peer.onnegotiationneeded = this._createOffer()
        },

        _handleNewICECandidateMsg(incoming) {
            const candidate = new RTCIceCandidate(incoming);
            //отдаем кандидата в webRTC
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

        stopCall() {
            const data = {
                call_id: this.callID
            }
            this.sendMessage('end_call', data)
        },

        async _createOffer() {
            try {
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
                this.sendMessage('message_to', data)
            } catch (e) {
                this.log('_createOffer', e, 'red')
            }

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
    grid-template-rows: 210px 100px;
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

    &__btn-box {
        display: grid;
        justify-content: center;
        outline: 1px solid red;
        grid-auto-flow: column;
        grid-gap: 30px;
        grid-area: btn;
    }

    &__btn {
        width: 80px;
        height: 80px;
        justify-self: center;
    }
}
</style>
