<template>
    <div class="page-home">
        <UiCircleBtn class="page-home__btn">Позвонить</UiCircleBtn>
    </div>
</template>

<script>
export default {
    methods: {
        socketConnect() {
            const callCenterId = 'Q2FsbENlbnRlcjox'
            const type = 'operator'
            const url = `ws://call-center-channel/${callCenterId}/?type=${type}`

            const socketMessageListener = data => {
                console.log('send message')
                console.log(data)
            }

            const socketOpenListener = () => {
                this.isSocketOpen = true
                console.log('сокет соединение открыто')
            }

            const socketErrorListener = evt => {
                console.log('ошибка сокет соединения')
                console.log(evt)
            }

            const socketCloseListener = () => {
                console.log('сокет соединение закрыто')
                if (this.socket) {
                    this.isSocketOpen = false
                }
                if (!this.isSocketOpen) {
                    this.socket = new WebSocket(url)
                    this.socket.addEventListener('open', socketOpenListener)
                    this.socket.addEventListener('error', socketErrorListener)
                    this.socket.addEventListener('message', socketMessageListener)
                    this.socket.addEventListener('close', socketCloseListener)
                }
            }
            socketCloseListener()
        },
        socketDisconnect() {
            if (this.socket) {
                this.socket.close(1000)
                this.isSocketOpen = false
            }
        },
    },
    mounted() {
        this.socketConnect()
    }
}
</script>

<style scoped lang="scss">
.page-home {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #fff;
    width: 100vw;
    height: 100vh;
    &__btn {
        width: 80px;
        height: 80px;
    }
}
</style>
