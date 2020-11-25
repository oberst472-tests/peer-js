<template>
    <div class="page-terminal">
        <component :is="`div`" :key="componentKey" class="wrap">
            <video id="localVideo" ref="usVid" autoplay class="page-terminal__video page-terminal__video-client" muted playsinline></video>

            <video id="remoteVideo" ref="ptVid" autoplay class="page-terminal__video page-terminal__video-partner" playsinline></video>
            <div class="page-terminal__btn-box">
                <transition name="fadeB" mode="out-in">
                    <UiBtn
                        class="page-terminal__btn"
                        @click="callRequest"
                        v-if="!isCallBtnDisabled"
                        key="btn-1"
                    >
                        Позвонить
                    </UiBtn>
                    <UiBtn
                        v-else
                        class="page-terminal__btn"
                        theme="negative"
                        @click="stopCall"
                        key="btn-2"
                    >
                        Завершить вызов
                    </UiBtn>
                </transition>
            </div>
        </component>
    </div>
</template>

<script>

import {customLog} from '@/utils/console-group'

export default {
    data() {
        return {
            componentKey: 1,
            isCallBtnDisabled: false,
            disableRetryConnection: false,
            socket: null,
            isSocketOpen: false,
            peer: null,
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
                    {urls: 'stun:vc-dev.enlighted.ru:3478'},
                    {
                        urls: 'turn:vc-dev.enlighted.ru:3478',
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
                this.disableRetryConnection = true
            }
        },
        socketOpen() {
            if (!this.disableRetryConnection) {
                this.isSocketOpen = true
                customLog('socketOpen', 'Cокет соединение для Т открыто', 'lightgreen')
            }
        },
        socketError() {
            customLog('socketOpen', 'Ошибка сокет соединения Т', 'red')
            this.socketRetryConnect()
        },
        socketMessage(data) {
            this.messageProcessing(data)
        },
        socketClose() {
            customLog('socketClose', 'Сокет соединение закрыто Т')
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

                customLog('isOperatorAnsweredTheCall', 'Оператор ответил на звонок Т')

                await this.sendRequestToOpenWebRTC()
            }

            if (isEndCallByEvent) {
                customLog('isEndCallByEvent', 'Оператор завершил звонок Т')
                this.reset()
            }

            if (isMessageEvent) {
                this.clientChannel = info.from
                const messageData = info.message_data
                const data = messageData.data

                const isIceCandidateEvent = messageData.event === 'ice-candidate'
                const isAnswerEvent = messageData.event === 'answer' //получение answer с терминала

                if (isIceCandidateEvent) {
                    await this._handleNewICECandidateMsg(data.candidate)
                }

                if (isAnswerEvent) {
                    customLog('isAnswerEvent', 'Пришел евент answer от терминала Т')
                    const desc = new RTCSessionDescription(data.sdp)
                    try {
                        //передаем answer от оператора d webRTC
                        await this.peer.setRemoteDescription(desc)
                    } catch (e) {
                        customLog('isAnswerEvent', e, 'red')
                    }
                }
            }

        },

        async sendRequestToOpenWebRTC() {
            await this._callUser()
        },

        async _callUser() {
            this.$refs.usVid.srcObject = this.userStream
            await this._createPeer()
        },

        async _createPeer() {
            this.peer = await new RTCPeerConnection(this.constraints)
            this.userStream.getTracks().forEach(track => this.peer.addTrack(track, this.userStream))

            this.peer.onicecandidate = e => {
                customLog('onicecandidate1', 'ice кандидат пришел', 'yellow Т')
                customLog('onicecandidate2', e, 'yellow')
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
                    this.$refs.ptVid.srcObject = e.streams[0]
                    customLog('ontrack', 'Монтирование видео партнера Т', 'lightgreen')
                    console.log(this.$refs.ptVid.srcObject)
                } else {
                    customLog('ontrack', 'Видео партнера не смонтировано Т', 'lightgreen')
                }
            }

            this.peer.addEventListener('connectionstatechange', () => {
                switch (this.peer.connectionState) {
                    case 'connected':
                        customLog('connectionstatechange', this.peer.connectionState, 'rebeccapurple')
                        break;
                    case 'disconnected':
                    case 'failed':
                        customLog('connectionstatechange', this.peer.connectionState, 'rebeccapurple')
                        this.reset()
                        break;
                    case 'closed':
                        customLog('connectionstatechange', this.peer.connectionState, 'rebeccapurple')
                        break;
                }
            })


            this.peer.onnegotiationneeded = this._createOffer()
        },

        async _handleNewICECandidateMsg(incoming) {
            const candidate = new RTCIceCandidate(incoming)
            try {
                await this.peer.addIceCandidate(candidate)
            } catch (e) {
                customLog('Ошибка добавления кандидата Т', e, 'red')
            }
        },

        callRequest() {
            if (this.isSocketOpen) {
                const data = {
                    event: 'call_request'
                }
                this.isCallBtnDisabled = true
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
            this.reset()
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
                customLog('_createOffer', e, 'red')
            }

        },
        reset() {
            this.peer.close()
            this.peer.onicecandidate = null
            this.peer.ontrack = null
            // this.userStream.stop()
            this.isCallBtnDisabled = false
            this.peer = null
            this.$refs.usVid.srcObject = null
            this.$refs.ptVid.srcObject = null

            // this.userStream = null

            this.clientChannel = ''
            this.callID = ''
            this.componentKey++
            // setTimeout(() => {
            //     this.userStream = navigator.mediaDevices.getUserMedia(this.options)
            //   }, 500);
        }
    },


    async mounted() {
        this.socketConnect()
        this.userStream = await navigator.mediaDevices.getUserMedia(this.options)
    },
    beforeDestroy() {
        this.socketDisconnect()
    }
}
</script>

<style lang="scss" scoped>
.fadeB-enter-active, .fadeB-leave-active {
    transition: opacity 0.3s;
}
.fadeB-enter, .fadeB-leave-to {
    opacity: 0;
}
.page-terminal {
    box-sizing: border-box;
    width: 100%;
    height: 100vh;
    padding: 30px;
    background-color: #000;
    display: flex;
    align-items: center;

    .wrap {
        padding: 30px;
        margin: 0 auto;
        width: 100%;
        max-width: 800px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-gap: 30px;
        justify-content: center;
        align-items: center;
        grid-template-rows: 210px 100px;
        grid-template-areas:
        'video-client video-partner'
        'btn btn';
    }

    &__video {
        display: flex;
        width: 100%;
        height: 100%;
        border-radius: 15px;
        overflow: hidden;
        object-fit: cover;
        background: repeating-linear-gradient(-45deg, rgba(#e3dbdb, 0.3), rgba(#e3dbdb, 0.3) 25px, rgba(#e3dbdb, 0) 25px, rgba(#e3dbdb, 0) 50px) fixed;

        &-client {
            grid-area: video-client;
        }

        &-partner {
            grid-area: video-partner;
        }
    }

    &__btn-box {
        display: flex;
        justify-content: center;
        grid-area: btn;
    }

    &__btn {
    }
}
</style>
