<template>
    <div class="page-home">
        <video id="localVideo" ref="clientVideo" autoplay class="page-home__video page-home__video-client" muted playsinline></video>

        <video id="remoteVideo" ref="partnerVideo" autoplay class="page-home__video page-home__video-partner" playsinline></video>

        <UiCircleBtn class="page-home__btn" @click="callRequest">Позвонить</UiCircleBtn>
    </div>
</template>

<script>
export default {
    data() {
        return {
            socket: null,
            isSocketOpen: false,

            peer: '',

            localStream: '',
            remoteStream: '',

            options: {audio: true, video: true},
            offerOptions: {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
            },
            configuration: {
                iceServers: [
                    {url: 'stun:stun1.l.google.com:19302'},
                    {url: 'stun:stun2.l.google.com:19302'},
                    {url: 'stun:stun3.l.google.com:19302'},
                    {
                        url: 'turn:coturn.sverstal.ru:3478',
                        username: 'tab1',
                        credential: '123456',
                    },
                ],
            },


            peer1: '',
            peer2: ''
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




        messageProcessing(data) {
            const payload = this.getJsonFromString(data.data)

            const info = payload.data
            const eventName = payload.event

            const isOperatorAnsweredTheCall = eventName === 'operator_answered_the_call' //оператор ответил на звонок
            const isMessageEvent = eventName === 'message' // пришло сообщение от терминала


            if (isOperatorAnsweredTheCall) {
                const clientChannel = info['client_channel']
                console.info(`оператор ответил на звонок, id канала ${clientChannel}`)

                setTimeout(() => {
                    const data = {
                        to: clientChannel,
                        message_data: {
                            lol: 'test-terminal'
                        }
                    }
                    this.sendMessage('message_to', data)
                }, 3000);
            }
            if (isMessageEvent) {
                // eslint-disable-next-line no-unused-vars
                const {from: clientChannel, message_data: messageData} = info
                console.info(`пришло сообщение от терминала с id канала: ${clientChannel} на установку webRTC`)

                setTimeout(() => {
                    const data = {
                        to: clientChannel,
                        message_data: {
                            lol: 'test-operator'
                        }
                    }
                    this.sendMessage('message_to', data)
                }, 3000);
            }

        },

        sendMessage(eventName, data) {
            const payload = {
                event: eventName,
                data
            }
            this.socket.send(this.getStringFromJson(payload))
        },

        // async callRequest() {
        //     if (this.isSocketOpen) {
        //
        //         // this.setRTC()
        //         await this.start()
        //         await this.call()
        //         // const payload = {
        //         //     event: 'call_request',
        //         //     data: {
        //         //         p2p: {peer: 'lorem ipsum'}
        //         //     }
        //         // }
        //         // const payloadString = JSON.stringify(payload)
        //         //
        //         // this.socket.send(payloadString)
        //     } else {
        //         alert('Произошел системный сбой, перезагрузите страницу!')
        //     }
        // },

        callRequest() {
            if (this.isSocketOpen) {


                const payload = {
                    event: 'call_request'
                }
                const payloadString = JSON.stringify(payload)

                this.socket.send(payloadString)
            } else {
                alert('Произошел системный сбой, перезагрузите страницу!')
            }
        },

        setRTC() {
            this.peer = new RTCPeerConnection(this.configuration)
            this.peer.onaddstream = e => {
                this.$refs.partnerVideo.srcObject = e.stream
            }
        },
        async start() {
            const stream = await navigator.mediaDevices.getUserMedia(this.options)
            this.$refs.clientVideo.srcObject = stream
            this.localStream = stream
        },

        async call() {
            // Установим состояние кнопок
            console.log('Starting call')
            // Получаем и выводим информацию о медиа-потоках
            const videoTracks = this.localStream.getVideoTracks()
            const audioTracks = this.localStream.getAudioTracks()
            if (videoTracks.length > 0) {
                console.log(`Using video device: ${videoTracks[0].label}`)
            }
            if (audioTracks.length > 0) {
                console.log(`Using audio device: ${audioTracks[0].label}`)
            }

            // Создаем объекты RTCPeerConnection c пустой конфигурацией
            console.log('RTCPeerConnection configuration:', this.configuration)
            this.peer1 = new RTCPeerConnection(this.configuration)
            console.log('Created local peer connection object pc1')
            this.peer2 = new RTCPeerConnection(this.configuration)
            console.log('Created remote peer connection object pc2')

            // Добавляем обработчики на событие добавления ICE кандидата
            this.peer1.addEventListener('icecandidate', e => this.onIceCandidate(this.peer1, e))
            this.peer2.addEventListener('icecandidate', e => this.onIceCandidate(this.peer2, e))

            // Обработчик добавления потока на второе соединение
            // this.peer2.addEventListener('track', gotRemoteStream) //??????

            // Достаем потоки из текущего stream объекта и передаем их в объект RTCPeerConnection
            this.localStream.getTracks().forEach(track => this.peer1.addTrack(track, this.localStream))
            console.log(this.localStream.getTracks())

            // Формируем offer из pc1
            try {
                console.log('формирование офера peer1')
                const offer = await this.peer1.createOffer(this.offerOptions)
                await this.onCreateOfferSuccess(offer)
            } catch (e) {
                console.log(`${e}`)
            }
        },

        async onIceCandidate(peer, event) {
            try {
                await (this.getOtherPeer(peer).addIceCandidate(event.candidate))
                this.onAddIceCandidateSuccess(peer)
            } catch (e) {
                this.onAddIceCandidateError(peer, e)
            }
            console.log(`${this.getName(peer)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`)
        },

        async onCreateOfferSuccess(desc) {
            console.log(`Offer from pc1\n${desc.sdp}`)
            console.log('peer1 setLocalDescription start')
            try {
                await this.peer1.setLocalDescription(desc)
                this.onSetLocalSuccess(this.peer1)
            } catch (e) {
                console.log(`error setting description to pc1 ${e.toString()}`)
            }

            console.log('pc2 setRemoteDescription start')
            try {
                await this.peer2.setRemoteDescription(desc)
                this.onSetRemoteSuccess(this.peer2)
            } catch (e) {
                console.log(`error setting description to pc2 ${e.toString()}`)
            }

            console.log('pc2 createAnswer start')

            /*
              Так как у нас один видео-поток для двух соединений,
              мы формируем объект SDP offer прямо из второго соединения
            */

            try {
                const answer = await this.peer2.createAnswer()
                await this.onCreateAnswerSuccess(answer)
            } catch (e) {
                this.onCreateSessionDescriptionError(e)
            }
        },

        async onCreateAnswerSuccess(desc) {
            console.log(`Answer from pc2:\n${desc.sdp}`)
            console.log('pc2 setLocalDescription start')
            try {
                await this.peer2.setLocalDescription(desc)
                this.onSetLocalSuccess(this.peer2)
            } catch (e) {
                console.log('ощибка!!!')// onSetSessionDescriptionError(e);
            }
            console.log('pc1 setRemoteDescription start')
            try {
                await this.peer1.setRemoteDescription(desc)
                this.onSetRemoteSuccess(this.peer1)
            } catch (e) {
                console.log('ощибка!!!') // onSetSessionDescriptionError(e);
            }
        },


        getName(payload) {
            return (payload === this.peer1) ? 'peer1' : 'peer2'
        },

        getOtherPeer(payload) {
            return (payload === this.peer2) ? this.peer2 : this.peer1
        },


        onSetLocalSuccess(pc) {
            console.log(`${this.getName(pc)} setLocalDescription complete`)
        },

        onSetRemoteSuccess(pc) {
            console.log(`${this.getName(pc)} setRemoteDescription complete`)
        },

        onCreateSessionDescriptionError(error) {
            console.log(`Failed to create session description: ${error.toString()}`)
        },

        onAddIceCandidateSuccess(pc) {
            console.log(`${this.getName(pc)} addIceCandidate success`)
        },

        onAddIceCandidateError(pc, error) {
            console.log(`${this.getName(pc)} failed to add ICE Candidate: ${error.toString()}`)
        },
    },
    mounted() {
        this.socketConnect()

        this.$refs.clientVideo.addEventListener('loadedmetadata', function() {
            console.log(`Local video videoWidth: 300px,  videoHeight: 300px`)
        })

        this.$refs.partnerVideo.addEventListener('loadedmetadata', function() {
            console.log(`Remote video videoWidth: 300px,  videoHeight: 300px`)
        })
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
