<template>
    <div class="page-home">
        <UiCircleBtn class="page-home__btn" @click="callRequest">Позвонить</UiCircleBtn>
    </div>
</template>

<script>
export default {
    data() {
        return {
            socket: null,
            isSocketOpen: false
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
        socketOpen() {
            this.isSocketOpen = true
            console.log('сокет соединение открыто')
        },
        socketError() {
            console.log('ошибка сокет соединения')
            //при ошибке пытаемся законнектиться снова
            setTimeout(() => {
                  this.socketConnect()
              }, 5000);
        },
        socketMessage(data) {
            console.log('произошло событие')
            console.log(data)
        },
        socketClose() {
            console.log('сокет соединение закрыто')
        },
        socketDisconnect() {
            if (this.socket) {
                this.socket.close(1000)
                this.isSocketOpen = false
            }
        },


        callRequest() {
            if (this.isSocketOpen) {
                const payload = JSON.stringify({event: 'call_request'})
                this.socket.send(payload)
            }
            else {
                alert('Произошел системный сбой, перезагрузите страницу!')
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
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    background-color: #fff;

    &__btn {
        width: 80px;
        height: 80px;
    }
}
</style>
